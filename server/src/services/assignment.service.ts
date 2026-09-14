import mongoose from 'mongoose';
import { Assignment } from '../models/assignment.model.js';
import { WorkOrder } from '../models/workOrder.model.js';
import { FieldTeam } from '../models/fieldTeam.model.js';
import { haversineDistance } from '../utils/haversine.js';
import { Notification } from '../models/notification.model.js';
import { MOCK_WORK_ORDERS } from './workOrder.service.js';
import { DEFAULT_TEAMS_DATA } from '../controllers/team.controller.js';

/**
 * Smart Team Assignment Service
 * Scores teams by: 50% proximity (Haversine), 30% workload, 20% rating (Matching FYP Work Plan)
 */
export const autoAssign = async (workOrderId: string) => {
  if (mongoose.connection.readyState === 1) {
    try {
      const wo = await WorkOrder.findById(workOrderId);
      if (!wo) return null;

      const teams = await FieldTeam.find({
        categoryId: wo.categoryId,
        isActive: true,
      });

      if (!teams.length) return null;

      let bestTeam: any = null;
      let bestScore = -1;
      const scoringResults: any[] = [];

      for (const team of teams) {
        const distance = haversineDistance(
          team.zoneLat,
          team.zoneLng,
          wo.locationLat,
          wo.locationLng
        );
        const proximityScore = 1 / (distance + 1);
        const workloadScore = 1 / (1 + team.activeOrderCount);
        const ratingScore = (team.averageRating || 4.8) / 5;

        // Formula from FYP Guide Section 4.5: 0.5 proximity + 0.3 workload + 0.2 rating
        const compositeScore =
          0.5 * proximityScore + 0.3 * workloadScore + 0.2 * ratingScore;

        scoringResults.push({
          teamId: team._id,
          name: team.name,
          proximityScore: Math.round(proximityScore * 100) / 100,
          workloadScore: Math.round(workloadScore * 100) / 100,
          ratingScore: Math.round(ratingScore * 100) / 100,
          compositeScore: Math.round(compositeScore * 100) / 100,
          distance: Math.round(distance * 100) / 100,
        });

        if (compositeScore > bestScore) {
          bestScore = compositeScore;
          bestTeam = team;
        }
      }

      if (bestTeam) {
        const scores = scoringResults.find(
          (s) => s.teamId.toString() === bestTeam._id.toString()
        );

        await Assignment.create({
          workOrderId: wo._id,
          teamId: bestTeam._id,
          method: 'Auto',
          proximityScore: scores?.proximityScore ?? 0,
          workloadScore: scores?.workloadScore ?? 0,
          ratingScore: scores?.ratingScore ?? 0,
          compositeScore: scores?.compositeScore ?? 0,
          assignedAt: new Date(),
        });

        wo.teamId = bestTeam._id;
        wo.status = 'Assigned';
        wo.assignedAt = new Date();
        await wo.save();

        bestTeam.activeOrderCount += 1;
        await bestTeam.save();

        return { bestTeam, scores: scoringResults };
      }
    } catch (err) {}
  }

  // In-memory fallback dispatch
  const memWo = MOCK_WORK_ORDERS.find((w) => w._id === workOrderId || w.workOrderCode === workOrderId);
  if (memWo) {
    const assignedTeam = DEFAULT_TEAMS_DATA[0];
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

  if (mongoose.connection.readyState === 1) {
    try {
      const wo = await WorkOrder.findById(workOrderId);
      if (wo) {
        const oldTeamId = wo.teamId;

        if (oldTeamId) {
          await FieldTeam.findByIdAndUpdate(oldTeamId, { $inc: { activeOrderCount: -1 } });
        }

        await FieldTeam.findByIdAndUpdate(newTeamId, { $inc: { activeOrderCount: 1 } });

        wo.teamId = newTeamId as any;
        wo.assignedAt = new Date();
        await wo.save();

        await Assignment.findOneAndUpdate(
          { workOrderId },
          {
            teamId: newTeamId,
            method: 'Manual',
            overriddenBy: adminId,
            overrideReason: reason,
            assignedAt: new Date(),
          },
          { upsert: true, new: true }
        );

        return wo;
      }
    } catch (err) {}
  }

  return memWo || { _id: workOrderId, teamId: newTeamObj, status: 'Assigned' };
};
