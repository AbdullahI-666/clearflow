import { dbQuery } from '../config/db.js';
import { haversineDistance } from '../utils/haversine.js';

export const DEFAULT_POSITIONS = [
  {
    team: {
      _id: '65f000000000000000000301',
      name: 'Alpha Crew (Cleaning)',
      zoneLat: 31.4697,
      zoneLng: 74.2728,
      zoneRadiusKm: 5,
      isActive: true,
      activeOrderCount: 1,
      averageRating: 4.9,
    },
    latestPosition: {
      lat: 31.4697,
      lng: 74.2728,
      accuracyMeters: 5,
      recordedAt: new Date(),
    },
  },
  {
    team: {
      _id: '65f000000000000000000302',
      name: 'Pipe Pros (Plumbing)',
      zoneLat: 31.4650,
      zoneLng: 74.2800,
      zoneRadiusKm: 6,
      isActive: true,
      activeOrderCount: 1,
      averageRating: 4.8,
    },
    latestPosition: {
      lat: 31.4650,
      lng: 74.2800,
      accuracyMeters: 6,
      recordedAt: new Date(),
    },
  },
  {
    team: {
      _id: '65f000000000000000000303',
      name: 'Voltage Elite (Electrical)',
      zoneLat: 31.5100,
      zoneLng: 74.3450,
      zoneRadiusKm: 8,
      isActive: true,
      activeOrderCount: 0,
      averageRating: 4.7,
    },
    latestPosition: {
      lat: 31.5100,
      lng: 74.3450,
      accuracyMeters: 4,
      recordedAt: new Date(),
    },
  },
  {
    team: {
      _id: '65f000000000000000000304',
      name: 'Green Thumb (Gardening)',
      zoneLat: 31.4850,
      zoneLng: 74.3200,
      zoneRadiusKm: 7,
      isActive: true,
      activeOrderCount: 0,
      averageRating: 4.9,
    },
    latestPosition: {
      lat: 31.4850,
      lng: 74.3200,
      accuracyMeters: 8,
      recordedAt: new Date(),
    },
  },
  {
    team: {
      _id: '65f000000000000000000305',
      name: 'Delta Waste (Recycling)',
      zoneLat: 31.4720,
      zoneLng: 74.4000,
      zoneRadiusKm: 10,
      isActive: true,
      activeOrderCount: 1,
      averageRating: 4.6,
    },
    latestPosition: {
      lat: 31.4720,
      lng: 74.4000,
      accuracyMeters: 5,
      recordedAt: new Date(),
    },
  },
];

let inMemoryPositions = [...DEFAULT_POSITIONS];
let telemetryStatusMap: Record<string, boolean> = {};

export const setTelemetryStatus = (teamId: string, isActive: boolean) => {
  telemetryStatusMap[teamId] = isActive;
  telemetryStatusMap['global'] = isActive;
};

export const getTelemetryStatus = (teamId?: string): boolean => {
  if (teamId && telemetryStatusMap[teamId] !== undefined) {
    return telemetryStatusMap[teamId];
  }
  if (telemetryStatusMap['global'] !== undefined) {
    return telemetryStatusMap['global'];
  }
  return true;
};

export const updateLocation = async (teamId: string, lat: number, lng: number, accuracy?: number, workOrderId?: string) => {
  const newLog = {
    _id: 'gps_' + Date.now(),
    teamId,
    workOrderId,
    lat,
    lng,
    accuracyMeters: accuracy || 5,
    recordedAt: new Date(),
  };

  const existing = inMemoryPositions.find((p) => p.team._id === teamId);
  if (existing) {
    existing.latestPosition = newLog;
    existing.team.zoneLat = lat;
    existing.team.zoneLng = lng;
  }

  // Persist to Supabase (best effort)
  dbQuery(
    'INSERT INTO gps_logs (team_id, work_order_id, lat, lng, accuracy_meters, recorded_at) VALUES ($1,$2,$3,$4,$5,NOW())',
    [teamId, workOrderId || null, lat, lng, accuracy || 5]
  );
  dbQuery('UPDATE field_teams SET zone_lat=$1, zone_lng=$2 WHERE id::text=$3', [lat, lng, teamId]);

  return newLog;
};

export const getLatestPosition = async (teamId: string) => {
  const rows = await dbQuery(
    'SELECT * FROM gps_logs WHERE team_id::text=$1 ORDER BY recorded_at DESC LIMIT 1',
    [teamId]
  );
  if (rows && rows.length > 0) return rows[0];

  const match = inMemoryPositions.find((p) => p.team._id === teamId);
  return match?.latestPosition || inMemoryPositions[0].latestPosition;
};

export const getAllActivePositions = async () => {
  const teamRows = await dbQuery('SELECT * FROM field_teams WHERE is_active=true');
  if (teamRows && teamRows.length > 0) {
    const results = await Promise.all(
      teamRows.map(async (t) => {
        const posRows = await dbQuery(
          'SELECT * FROM gps_logs WHERE team_id=$1 ORDER BY recorded_at DESC LIMIT 1',
          [t.id]
        );
        const latest = posRows && posRows.length > 0 ? posRows[0] : { lat: t.zone_lat, lng: t.zone_lng, recordedAt: new Date() };
        return { team: { ...t, _id: t.id, zoneLat: t.zone_lat, zoneLng: t.zone_lng }, latestPosition: latest };
      })
    );
    return results;
  }

  return inMemoryPositions;
};

export const calculateETA = (teamLat: number, teamLng: number, destLat: number, destLng: number) => {
  const distKm = haversineDistance(teamLat, teamLng, destLat, destLng);
  const avgSpeedKmH = 30;
  const etaMinutes = Math.max(5, Math.round((distKm / avgSpeedKmH) * 60));
  return { distanceKm: Math.round(distKm * 10) / 10, etaMinutes };
};

/**
 * Permanently purge GPS tracking data, in-memory live coordinates, and fleet positions when a user is deleted
 */
export const removeTrackingForUser = async (userId: string, name?: string, email?: string, strippedId?: string) => {
  const normName = (name || '').toLowerCase().trim();
  const rawId = (userId || '').replace(/^[CW]#/i, '');

  // 1. Remove from inMemoryPositions
  inMemoryPositions = inMemoryPositions.filter(p => {
    const tId = String(p.team?._id || '');
    const tName = String(p.team?.name || '').toLowerCase();
    const isMatch = 
      tId === userId || 
      (rawId && tId.includes(rawId)) ||
      (normName && tName.includes(normName));
    return !isMatch;
  });

  // 2. Clear telemetryStatusMap
  delete telemetryStatusMap[userId];
  if (rawId) delete telemetryStatusMap[rawId];

  // 3. Remove from database
  try {
    await dbQuery(`
      DELETE FROM gps_logs 
      WHERE team_id::text = $1 
         OR team_id::text IN (
           SELECT id::text FROM field_teams 
           WHERE leader_id::text = $1 
              OR name ILIKE $2
         )
    `, [userId, `%${normName || rawId}%`]);

    await dbQuery(`
      DELETE FROM field_teams 
      WHERE leader_id::text = $1 
         OR id::text = $1
         OR name ILIKE $2
    `, [userId, `%${normName || rawId}%`]);
  } catch (_) {}

  // 4. Also clean up in DEFAULT_TEAMS_DATA in team controller
  try {
    const teamCtrl = await import('../controllers/team.controller.js');
    if (teamCtrl && teamCtrl.DEFAULT_TEAMS_DATA) {
      for (let i = teamCtrl.DEFAULT_TEAMS_DATA.length - 1; i >= 0; i--) {
        const t = teamCtrl.DEFAULT_TEAMS_DATA[i];
        const isMatch = 
          t._id === userId || 
          t.workerId === userId || 
          (rawId && (t.workerId?.includes(rawId) || t._id?.includes(rawId))) ||
          (normName && (t.workerName?.toLowerCase().includes(normName) || t.name?.toLowerCase().includes(normName))) ||
          (t.assignedClient && (t.assignedClient.clientId === userId || (normName && t.assignedClient.name?.toLowerCase().includes(normName)))) ||
          (Array.isArray(t.members) && t.members.some((m: any) => m._id === userId || (normName && m.name?.toLowerCase().includes(normName))));
        if (isMatch) {
          teamCtrl.DEFAULT_TEAMS_DATA.splice(i, 1);
        }
      }
    }
  } catch (_) {}
};
