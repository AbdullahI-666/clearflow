import { Request, Response } from 'express';
import { dbQuery } from '../config/db.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { isUserDeleted, DELETED_USER_IDS } from '../utils/deletedUsers.js';

export const isTeamDeleted = (t: any): boolean => {
  if (!t) return true;
  if (isUserDeleted(t)) return true;
  const wId = String(t.workerId || '').toLowerCase().trim();
  const wName = String(t.workerName || '').toLowerCase().trim();
  if (wId && (DELETED_USER_IDS.has(wId) || DELETED_USER_IDS.has(wId.replace(/^[cw]#/i, '')))) return true;
  if (wName && DELETED_USER_IDS.has(wName)) return true;

  if (t.assignedClient) {
    const cId = String(t.assignedClient.clientId || '').toLowerCase().trim();
    const cName = String(t.assignedClient.name || '').toLowerCase().trim();
    if (cId && (DELETED_USER_IDS.has(cId) || DELETED_USER_IDS.has(cId.replace(/^[cw]#/i, '')))) return true;
    if (cName && DELETED_USER_IDS.has(cName)) return true;
  }
  if (Array.isArray(t.members)) {
    for (const m of t.members) {
      if (isUserDeleted(m)) return true;
      const mwId = String(m.workerId || m._id || m.id || '').toLowerCase().trim();
      const mwName = String(m.name || '').toLowerCase().trim();
      if (mwId && (DELETED_USER_IDS.has(mwId) || DELETED_USER_IDS.has(mwId.replace(/^[cw]#/i, '')))) return true;
      if (mwName && DELETED_USER_IDS.has(mwName)) return true;
    }
  }
  return false;
};

export const DEFAULT_TEAMS_DATA: any[] = [];

let inMemoryTeams: any[] = [];


export const getAll = async (_req: Request, res: Response) => {
  const rows = await dbQuery(
    `SELECT ft.*, sc.name as category_name
     FROM field_teams ft
     LEFT JOIN service_categories sc ON sc.id = ft.category_id`
  );
  if (rows && rows.length > 0) {
    const mapped = rows.map(t => ({
      _id: t.id,
      name: t.name,
      categoryId: { _id: t.category_id, name: t.category_name },
      zoneLat: Number(t.zone_lat),
      zoneLng: Number(t.zone_lng),
      zoneRadiusKm: Number(t.zone_radius_km),
      isActive: t.is_active,
      activeOrderCount: t.active_order_count,
      averageRating: Number(t.average_rating),
      totalJobsCompleted: t.total_jobs_completed,
      members: [],
    }));
    return res.json(ApiResponse.success(mapped.filter(t => !isTeamDeleted(t)), 'Teams retrieved successfully'));
  }

  // Fallback in-memory: derive teams from MOCK_WORK_ORDERS and IN_MEMORY_USERS
  const activeTeams: any[] = [...inMemoryTeams];
  try {
    const { MOCK_WORK_ORDERS } = await import('../services/workOrder.service.js');
    const { IN_MEMORY_USERS } = await import('../services/auth.service.js');

    const fieldUsers = IN_MEMORY_USERS.filter(u => u.role === 'FieldTeam' && !isUserDeleted(u));
    for (const fu of fieldUsers) {
      const fId = String(fu._id || fu.id || '');
      const fName = fu.name || 'Field Technician';
      const isExisting = activeTeams.some(t => t._id === fId || (t.name && t.name.toLowerCase().includes(fName.toLowerCase())));
      if (!isExisting) {
        const matchingWo = MOCK_WORK_ORDERS.find(wo => {
          const wId = String(wo.assignedWorkerId || (wo as any).workerId || wo.teamId?._id || '').toLowerCase();
          const wName = String(wo.assignedWorker?.name || wo.teamId?.name || '').toLowerCase();
          return wId === fId.toLowerCase() || (fName && wName.includes(fName.toLowerCase()));
        });

        const clientObj = typeof matchingWo?.clientId === 'object' ? matchingWo.clientId : null;
        const clientName = clientObj?.name || (matchingWo?.title?.toLowerCase().includes('ali') ? 'Ali' : 'Registered Client');
        const clientId = clientObj?.clientCode || clientObj?.id || (clientName.toLowerCase().includes('ali') ? 'C#01' : 'C#0001');

        activeTeams.push({
          _id: fId,
          name: matchingWo?.teamId?.name || `${fName} (Technician)`,
          categoryId: matchingWo?.categoryId || { _id: '65f000000000000000000423', name: 'Electrical' },
          zoneLat: 31.4735,
          zoneLng: 74.2698,
          zoneRadiusKm: 10,
          isActive: true,
          activeOrderCount: matchingWo ? 1 : 0,
          averageRating: 5.0,
          totalJobsCompleted: 24,
          members: [
            {
              _id: fId,
              name: fName,
              workerId: fName.toLowerCase().includes('ahmad') ? 'W#01' : 'W#0001',
              phone: fu.phone || '+92 300 0000000'
            }
          ],
          assignedClient: matchingWo ? {
            name: clientName,
            id: clientId,
            clientId: clientObj?._id || clientObj?.id || 'client_id'
          } : undefined,
          assignedSiteAddress: matchingWo?.locationAddress || 'Ali Town, Lahore',
          assignedSiteLat: Number(matchingWo?.locationLat) || 31.4880,
          assignedSiteLng: Number(matchingWo?.locationLng) || 74.2480,
          workOrderCode: matchingWo?.workOrderCode,
        });
      }
    }
  } catch (_) {}

  res.json(ApiResponse.success(activeTeams.filter(t => !isTeamDeleted(t)), 'Teams retrieved successfully'));
};

export const getById = async (req: Request, res: Response) => {
  const { id } = req.params;

  const rows = await dbQuery(
    `SELECT ft.*, sc.name as category_name
     FROM field_teams ft
     LEFT JOIN service_categories sc ON sc.id = ft.category_id
     WHERE ft.id::text = $1 LIMIT 1`,
    [id]
  );
  if (rows && rows.length > 0) {
    const t = rows[0];
    const mapped = {
      _id: t.id,
      name: t.name,
      categoryId: { _id: t.category_id, name: t.category_name },
      zoneLat: Number(t.zone_lat),
      zoneLng: Number(t.zone_lng),
      zoneRadiusKm: Number(t.zone_radius_km),
      isActive: t.is_active,
      activeOrderCount: t.active_order_count,
      averageRating: Number(t.average_rating),
      totalJobsCompleted: t.total_jobs_completed,
      members: [],
    };
    return res.json(ApiResponse.success(mapped, 'Team retrieved successfully'));
  }

  const match = inMemoryTeams.find((t) => t._id === id);
  if (match) return res.json(ApiResponse.success(match, 'Team retrieved successfully'));

  throw new ApiError(404, 'Team not found');
};

export const create = async (req: Request, res: Response) => {
  const { name, categoryId, zoneLat, zoneLng, zoneRadiusKm, memberIds } = req.body;

  const newTeam = {
    _id: '65f0000000000000000' + Math.floor(Math.random() * 899 + 100),
    name: name || 'New Worker',
    categoryId: categoryId || '65f000000000000000000423',
    zoneLat: Number(zoneLat) || 31.4697,
    zoneLng: Number(zoneLng) || 74.2728,
    zoneRadiusKm: Number(zoneRadiusKm) || 10,
    isActive: true,
    activeOrderCount: 0,
    averageRating: 0.0,
    totalJobsCompleted: 0,
    members: memberIds || [],
  };

  inMemoryTeams.push(newTeam as any);

  const insRes = await dbQuery(
    `INSERT INTO field_teams (name, category_id, zone_lat, zone_lng, zone_radius_km, is_active)
     VALUES ($1, $2, $3, $4, $5, true) RETURNING *`,
    [newTeam.name, newTeam.categoryId, newTeam.zoneLat, newTeam.zoneLng, newTeam.zoneRadiusKm]
  );
  if (insRes && insRes.length > 0) {
    const t = insRes[0];
    return res.status(201).json(ApiResponse.created({
      _id: t.id,
      name: t.name,
      categoryId: t.category_id,
      zoneLat: Number(t.zone_lat),
      zoneLng: Number(t.zone_lng),
      zoneRadiusKm: Number(t.zone_radius_km),
      isActive: t.is_active,
    }, 'Team created successfully'));
  }

  res.status(201).json(ApiResponse.created(newTeam, 'Team created successfully'));
};

export const update = async (req: Request, res: Response) => {
  const teamId = req.params.id as string;
  const match = inMemoryTeams.find((t) => t._id === teamId);
  if (match) {
    Object.assign(match, req.body);
  }

  await dbQuery(
    `UPDATE field_teams SET
      name = COALESCE($1, name),
      zone_lat = COALESCE($2, zone_lat),
      zone_lng = COALESCE($3, zone_lng),
      zone_radius_km = COALESCE($4, zone_radius_km),
      updated_at = NOW()
     WHERE id::text = $5`,
    [req.body.name, req.body.zoneLat, req.body.zoneLng, req.body.zoneRadiusKm, teamId]
  );

  res.json(ApiResponse.success(match || inMemoryTeams[0], 'Team updated successfully'));
};

export const deactivate = async (req: Request, res: Response) => {
  const teamId = req.params.id as string;
  const match = inMemoryTeams.find((t) => t._id === teamId);
  if (match) {
    match.isActive = !match.isActive;
  }

  const rows = await dbQuery('SELECT is_active FROM field_teams WHERE id::text = $1', [teamId]);
  if (rows && rows.length > 0) {
    const newStatus = !rows[0].is_active;
    await dbQuery('UPDATE field_teams SET is_active = $1, updated_at = NOW() WHERE id::text = $2', [newStatus, teamId]);
    return res.json(ApiResponse.success({ id: teamId, isActive: newStatus }, `Team ${newStatus ? 'activated' : 'deactivated'} successfully`));
  }

  res.json(ApiResponse.success(match || inMemoryTeams[0], 'Team status updated successfully'));
};

export const remove = async (req: Request, res: Response) => {
  const teamId = req.params.id as string;
  const idx = inMemoryTeams.findIndex((t) => t._id === teamId);
  if (idx !== -1) {
    inMemoryTeams.splice(idx, 1);
  }
  try {
    await dbQuery('DELETE FROM field_teams WHERE id::text = $1', [teamId]);
  } catch (_) {}
  res.json(ApiResponse.success({ id: teamId }, 'Team deleted successfully'));
};

export const getLeads = async (_req: Request, res: Response) => {
  const rows = await dbQuery(
    `SELECT id, name, email, phone FROM users WHERE role = 'FieldTeam' AND is_active = true`
  );
  if (rows && rows.length > 0) {
    const leads = rows.map(r => ({ _id: r.id, name: r.name, email: r.email, phone: r.phone }));
    return res.json(ApiResponse.success(leads, 'Field leads retrieved successfully'));
  }

  try {
    const { IN_MEMORY_USERS } = await import('../services/auth.service.js');
    const leads = IN_MEMORY_USERS
      .filter(u => (u.role === 'FieldTeam' || (u.role as any) === 'Worker') && u.isActive !== false)
      .map(u => ({ _id: u._id, name: u.name, email: u.email, phone: u.phone }));
    return res.json(ApiResponse.success(leads, 'Field leads retrieved successfully'));
  } catch (_) {}

  res.json(ApiResponse.success([], 'Field leads retrieved successfully'));
};
