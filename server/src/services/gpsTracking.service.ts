import mongoose from 'mongoose';
import { GpsLog } from '../models/gpsLog.model.js';
import { FieldTeam } from '../models/fieldTeam.model.js';
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

  if (mongoose.connection.readyState === 1) {
    try {
      const log = await GpsLog.create({
        teamId,
        workOrderId,
        lat,
        lng,
        accuracyMeters: accuracy,
        recordedAt: new Date(),
      });
      await FieldTeam.findByIdAndUpdate(teamId, { zoneLat: lat, zoneLng: lng });
      return log;
    } catch (err) {}
  }

  return newLog;
};

export const getLatestPosition = async (teamId: string) => {
  if (mongoose.connection.readyState === 1) {
    try {
      const pos = await GpsLog.findOne({ teamId }).sort({ recordedAt: -1 });
      if (pos) return pos;
    } catch (err) {}
  }

  const match = inMemoryPositions.find((p) => p.team._id === teamId);
  return match?.latestPosition || inMemoryPositions[0].latestPosition;
};

export const getAllActivePositions = async () => {
  if (mongoose.connection.readyState === 1) {
    try {
      const teams = await FieldTeam.find({ isActive: true });
      if (teams && teams.length > 0) {
        const results = await Promise.all(
          teams.map(async (t) => {
            const latest = await GpsLog.findOne({ teamId: t._id }).sort({ recordedAt: -1 });
            return {
              team: t,
              latestPosition: latest || { lat: t.zoneLat, lng: t.zoneLng, recordedAt: new Date() },
            };
          })
        );
        return results;
      }
    } catch (err) {}
  }

  return inMemoryPositions;
};

export const calculateETA = (teamLat: number, teamLng: number, destLat: number, destLng: number) => {
  const distKm = haversineDistance(teamLat, teamLng, destLat, destLng);
  const avgSpeedKmH = 30;
  const etaMinutes = Math.max(5, Math.round((distKm / avgSpeedKmH) * 60));
  return { distanceKm: Math.round(distKm * 10) / 10, etaMinutes };
};
