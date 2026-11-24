import { dbQuery } from '../config/db.js';
import { haversineDistance } from '../utils/haversine.js';
import { MOCK_WORK_ORDERS } from './workOrder.service.js';
import { DEFAULT_TEAMS_DATA } from '../controllers/team.controller.js';
import * as notifService from './notification.service.js';
import { emitWorkOrderUpdate } from '../socket/index.js';

/**
 * Smart Team Assignment Service
 * Scores teams by: 50% proximity (Haversine), 30% workload, 20% rating (Matching FYP Work Plan)
 */
export const autoAssign = async (workOrderId: string) => {
  // Try Supabase DB first
  const woRows = await dbQuery('SELECT * FROM work_orders WHERE id=$1 OR work_order_code=$1 LIMIT 1', [workOrderId]);
  if (woRows && woRows.length > 0) {
    const wo = woRows[0];
    let teamRows = await dbQuery(
      `SELECT * FROM field_teams WHERE category_id=$1 AND is_active=true AND active_order_count < 5`,
      [wo.category_id]
    );
    if (!teamRows || teamRows.length === 0) {
      teamRows = await dbQuery(
        'SELECT * FROM field_teams WHERE category_id=$1 AND is_active=true',
        [wo.category_id]
      );
    }
    if (!teamRows || teamRows.length === 0) {
      teamRows = await dbQuery('SELECT * FROM field_teams WHERE is_active=true');
    }

    if (teamRows && teamRows.length > 0) {
      let bestTeam: any = null;
      let bestScore = -1;
      const scoringResults: any[] = [];

      for (const team of teamRows) {
        const distance = haversineDistance(team.zone_lat, team.zone_lng, wo.location_lat, wo.location_lng);
        const proximityScore = 1 / (distance + 1);
        const workloadScore = 1 / (1 + team.active_order_count);
        const ratingScore = (team.average_rating || 4.8) / 5;
        const compositeScore = 0.5 * proximityScore + 0.3 * workloadScore + 0.2 * ratingScore;
        scoringResults.push({
          teamId: team.id, name: team.name,
          proximityScore: Math.round(proximityScore * 100) / 100,
          workloadScore: Math.round(workloadScore * 100) / 100,
          ratingScore: Math.round(ratingScore * 100) / 100,
          compositeScore: Math.round(compositeScore * 100) / 100,
          distance: Math.round(distance * 100) / 100,
        });
        if (compositeScore > bestScore) { bestScore = compositeScore; bestTeam = team; }
      }

      if (bestTeam) {
        const scores = scoringResults.find(s => s.teamId === bestTeam.id);
        await dbQuery(
          `INSERT INTO assignments (work_order_id, team_id, method, proximity_score, workload_score, rating_score, composite_score, assigned_at)
           VALUES ($1,$2,'Auto',$3,$4,$5,$6,NOW()) ON CONFLICT (work_order_id) DO UPDATE SET team_id=$2, method='Auto', assigned_at=NOW()`,
          [wo.id, bestTeam.id, scores?.proximityScore ?? 0, scores?.workloadScore ?? 0, scores?.ratingScore ?? 0, scores?.compositeScore ?? 0]
        );
        await dbQuery(
          `UPDATE work_orders SET team_id=$1, status='Assigned', assigned_at=NOW(), updated_at=NOW() WHERE id=$2`,
          [bestTeam.id, wo.id]
        );
        await dbQuery(
          'UPDATE field_teams SET active_order_count = active_order_count + 1 WHERE id=$1',
          [bestTeam.id]
        );
        return { bestTeam, scores: scoringResults };
      }
    }
  }

  // In-memory fallback dispatch dynamically matching category
  const memWo = MOCK_WORK_ORDERS.find((w) => w._id === workOrderId || w.workOrderCode === workOrderId);
  if (memWo) {
    const catId = typeof memWo.categoryId === 'object' ? (memWo.categoryId as any)?._id : memWo.categoryId;
    const assignedTeam = DEFAULT_TEAMS_DATA.find((t) => t.categoryId === catId) || DEFAULT_TEAMS_DATA[0];
    memWo.teamId = assignedTeam as any;
    memWo.status = 'Assigned' as any;
    return { bestTeam: assignedTeam, scores: [] };
  }

  return null;
};

/**
 * Admin override of team assignment
 */
export const override = async (
  workOrderId: string,
  newTeamId: string,
  adminId: string,
  reason: string
) => {
  const newTeamObj = DEFAULT_TEAMS_DATA.find((t) => t._id === newTeamId) || DEFAULT_TEAMS_DATA[0];

  // Update memory store
  const memWo = MOCK_WORK_ORDERS.find((w) => w._id === workOrderId || w.workOrderCode === workOrderId);
  if (memWo) {
    memWo.teamId = newTeamObj as any;
    memWo.status = 'Assigned' as any;
  }

  let finalWo: any = memWo;

  // Try Supabase DB for override persistence
  const woRows = await dbQuery('SELECT * FROM work_orders WHERE id=$1 OR work_order_code=$1 LIMIT 1', [workOrderId]);
  if (woRows && woRows.length > 0) {
    const wo = woRows[0];
    if (wo.team_id) {
      await dbQuery('UPDATE field_teams SET active_order_count = active_order_count - 1 WHERE id=$1', [wo.team_id]);
    }
    await dbQuery('UPDATE field_teams SET active_order_count = active_order_count + 1 WHERE id=$1', [newTeamId]);
    await dbQuery(
      'UPDATE work_orders SET team_id=$1, assigned_at=NOW(), updated_at=NOW() WHERE id=$2',
      [newTeamId, wo.id]
    );
    await dbQuery(
      `INSERT INTO assignments (work_order_id, team_id, method, overridden_by, override_reason, assigned_at)
       VALUES ($1,$2,'Manual',$3,$4,NOW())
       ON CONFLICT (work_order_id) DO UPDATE SET team_id=$2, method='Manual', overridden_by=$3, override_reason=$4, assigned_at=NOW()`,
      [wo.id, newTeamId, adminId, reason]
    );
  }

  const clientId = finalWo?.clientId?._id || finalWo?.clientId || '65f000000000000000000002';
  const woCode = finalWo?.workOrderCode || 'WO';
  const teamName = newTeamObj?.name || 'Field Crew';

  // Broadcast real-time work order update
  emitWorkOrderUpdate(workOrderId, {
    status: 'Assigned',
    teamId: newTeamObj,
  });

  // Notify client that admin accepted/assigned the request
  try {
    await notifService.create({
      userId: clientId,
      workOrderId,
      type: 'NewAssignment',
      title: 'Service Request Accepted & Assigned',
      message: `Your service request ${woCode} has been accepted by Admin and assigned to ${teamName}.`,
      metadata: { workOrderId, workOrderCode: woCode, teamName },
    });

    // Notify field team of assignment
    await notifService.create({
      roles: ['FieldTeam'],
      workOrderId,
      type: 'NewAssignment',
      title: 'New Service Assignment',
      message: `You have been assigned to service request ${woCode} (${reason || 'Admin Assignment'}).`,
      metadata: { workOrderId, workOrderCode: woCode, teamName },
    });
  } catch (err) {
    console.error('Failed to notify client of assignment:', err);
  }

  return finalWo || { _id: workOrderId, teamId: newTeamObj, status: 'Assigned' };
};
