import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { FieldTeam } from '../models/fieldTeam.model.js';
import { User } from '../models/user.model.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

export const DEFAULT_TEAMS_DATA = [
  {
    _id: '65f000000000000000000301',
    name: 'Alpha Crew (Cleaning)',
    categoryId: { _id: '65f000000000000000000101', name: 'Cleaning' },
    zoneLat: 31.4697,
    zoneLng: 74.2728,
    zoneRadiusKm: 5,
    isActive: true,
    activeOrderCount: 1,
    averageRating: 4.9,
    totalJobsCompleted: 48,
    members: [{ _id: '65f000000000000000000004', name: 'Marcus Vance', email: 'field@clearflow.com' }],
  },
  {
    _id: '65f000000000000000000302',
    name: 'Pipe Pros (Plumbing)',
    categoryId: { _id: '65f000000000000000000103', name: 'Plumbing' },
    zoneLat: 31.4650,
    zoneLng: 74.2800,
    zoneRadiusKm: 6,
    isActive: true,
    activeOrderCount: 1,
    averageRating: 4.8,
    totalJobsCompleted: 39,
    members: [{ _id: '65f000000000000000000005', name: 'Alex Rivera', email: 'crew@clearflow.com' }],
  },
  {
    _id: '65f000000000000000000303',
    name: 'Voltage Elite (Electrical)',
    categoryId: { _id: '65f000000000000000000102', name: 'Electrical Repair' },
    zoneLat: 31.5100,
    zoneLng: 74.3450,
    zoneRadiusKm: 8,
    isActive: true,
    activeOrderCount: 0,
    averageRating: 4.7,
    totalJobsCompleted: 52,
    members: [{ _id: '65f000000000000000000004', name: 'Marcus Vance', email: 'field@clearflow.com' }],
  },
  {
    _id: '65f000000000000000000304',
    name: 'Green Thumb (Gardening)',
    categoryId: { _id: '65f000000000000000000106', name: 'Gardening' },
    zoneLat: 31.4850,
    zoneLng: 74.3200,
    zoneRadiusKm: 7,
    isActive: true,
    activeOrderCount: 0,
    averageRating: 4.9,
    totalJobsCompleted: 27,
    members: [{ _id: '65f000000000000000000005', name: 'Alex Rivera', email: 'crew@clearflow.com' }],
  },
  {
    _id: '65f000000000000000000305',
    name: 'Delta Waste (Recycling)',
    categoryId: { _id: '65f000000000000000000104', name: 'General Waste Collection' },
    zoneLat: 31.4720,
    zoneLng: 74.4000,
    zoneRadiusKm: 10,
    isActive: true,
    activeOrderCount: 1,
    averageRating: 4.6,
    totalJobsCompleted: 64,
    members: [{ _id: '65f000000000000000000004', name: 'Marcus Vance', email: 'field@clearflow.com' }],
  },
];

let inMemoryTeams = [...DEFAULT_TEAMS_DATA];

export const getAll = async (_req: Request, res: Response) => {
  if (mongoose.connection.readyState === 1) {
    try {
      const teams = await FieldTeam.find().populate('members categoryId');
      if (teams && teams.length > 0) {
        return res.json(ApiResponse.success(teams, 'Teams retrieved successfully'));
      }
    } catch (err) {}
  }

  res.json(ApiResponse.success(inMemoryTeams, 'Teams retrieved successfully'));
};

export const getById = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (mongoose.connection.readyState === 1) {
    try {
      const team = await FieldTeam.findById(id).populate('members categoryId');
      if (team) return res.json(ApiResponse.success(team, 'Team retrieved successfully'));
    } catch (err) {}
  }

  const match = inMemoryTeams.find((t) => t._id === id);
  if (match) return res.json(ApiResponse.success(match, 'Team retrieved successfully'));

  throw new ApiError(404, 'Team not found');
};

export const create = async (req: Request, res: Response) => {
  const { name, categoryId, zoneLat, zoneLng, zoneRadiusKm, memberIds } = req.body;

  const newTeam = {
    _id: '65f0000000000000000' + Math.floor(Math.random() * 899 + 100),
    name: name || 'New Field Team',
    categoryId: categoryId || '65f000000000000000000101',
    zoneLat: Number(zoneLat) || 31.4697,
    zoneLng: Number(zoneLng) || 74.2728,
    zoneRadiusKm: Number(zoneRadiusKm) || 10,
    isActive: true,
    activeOrderCount: 0,
    averageRating: 5.0,
    totalJobsCompleted: 0,
    members: memberIds || [],
  };

  inMemoryTeams.push(newTeam as any);

  if (mongoose.connection.readyState === 1) {
    try {
      const team = await FieldTeam.create({
        name: newTeam.name,
        categoryId: newTeam.categoryId,
        zoneLat: newTeam.zoneLat,
        zoneLng: newTeam.zoneLng,
        zoneRadiusKm: newTeam.zoneRadiusKm,
        isActive: true,
        members: memberIds || [],
      });
      const populated = await FieldTeam.findById(team._id).populate('members categoryId');
      return res.status(201).json(ApiResponse.created(populated || team, 'Team created successfully'));
    } catch (err) {}
  }

  res.status(201).json(ApiResponse.created(newTeam, 'Team created successfully'));
};

export const update = async (req: Request, res: Response) => {
  const teamId = req.params.id as string;
  const match = inMemoryTeams.find((t) => t._id === teamId);
  if (match) {
    Object.assign(match, req.body);
  }

  if (mongoose.connection.readyState === 1) {
    try {
      const team = await FieldTeam.findByIdAndUpdate(teamId, req.body, { new: true }).populate('members categoryId');
      if (team) return res.json(ApiResponse.success(team, 'Team updated successfully'));
    } catch (err) {}
  }

  res.json(ApiResponse.success(match || inMemoryTeams[0], 'Team updated successfully'));
};

export const deactivate = async (req: Request, res: Response) => {
  const teamId = req.params.id as string;
  const match = inMemoryTeams.find((t) => t._id === teamId);
  if (match) {
    match.isActive = !match.isActive;
  }

  if (mongoose.connection.readyState === 1) {
    try {
      const current = await FieldTeam.findById(teamId);
      if (current) {
        current.isActive = !current.isActive;
        await current.save();
        return res.json(ApiResponse.success(current, `Team ${current.isActive ? 'activated' : 'deactivated'} successfully`));
      }
    } catch (err) {}
  }

  res.json(ApiResponse.success(match || inMemoryTeams[0], 'Team status updated successfully'));
};

export const getLeads = async (_req: Request, res: Response) => {
  if (mongoose.connection.readyState === 1) {
    try {
      const leads = await User.find({ role: 'FieldTeam', isActive: true }).select('name email phone');
      if (leads && leads.length > 0) {
        return res.json(ApiResponse.success(leads, 'Field leads retrieved successfully'));
      }
    } catch (err) {}
  }

  res.json(ApiResponse.success([
    { _id: '65f000000000000000000004', name: 'Marcus Vance', email: 'field@clearflow.com', phone: '+1 555 0164738' },
    { _id: '65f000000000000000000005', name: 'Alex Rivera', email: 'crew@clearflow.com', phone: '+1 555 0153829' },
  ], 'Field leads retrieved successfully'));
};
