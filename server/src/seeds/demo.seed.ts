import bcrypt from 'bcryptjs';
import { User } from '../models/user.model.js';
import { FieldTeam } from '../models/fieldTeam.model.js';
import { ServiceCategory } from '../models/serviceCategory.model.js';
import { WorkOrder } from '../models/workOrder.model.js';
import { Settings } from '../models/settings.model.js';
import { Notification } from '../models/notification.model.js';
import { ChatMessage } from '../models/chatMessage.model.js';

export const seedDemo = async () => {
  // Clear existing demo data
  await User.deleteMany({});
  await FieldTeam.deleteMany({});
  await WorkOrder.deleteMany({});
  await Settings.deleteMany({});
  await Notification.deleteMany({});
  await ChatMessage.deleteMany({});

  const passwordHash = await bcrypt.hash('Demo@123', 12);
  const adminPasswordHash = await bcrypt.hash('Admin@123', 12);

  // 1. Create Users
  const admin = await User.create({
    name: 'Alex Morgan',
    email: 'admin@clearflow.com',
    passwordHash: adminPasswordHash,
    role: 'Admin',
    phone: '+1 555 1234567',
    isVerified: true
  });

  const client1 = await User.create({
    name: 'James Chen',
    email: 'james@clearflow.com',
    passwordHash,
    role: 'Client',
    phone: '+1 555 9876543',
    isVerified: true
  });

  const client2 = await User.create({
    name: 'Priya Sharma',
    email: 'priya@clearflow.com',
    passwordHash,
    role: 'Client',
    phone: '+1 555 4567890',
    isVerified: true
  });

  const client3 = await User.create({
    name: 'Dr. Robert Smith',
    email: 'robert.smith@clearflow.com',
    passwordHash,
    role: 'Client',
    phone: '+1 555 5556677',
    isVerified: true
  });

  const fieldLead1 = await User.create({
    name: 'John Doe',
    email: 'john@clearflow.com',
    passwordHash,
    role: 'FieldTeam',
    phone: '+1 555 3456789',
    isVerified: true
  });

  const fieldLead2 = await User.create({
    name: 'Michael Johnson',
    email: 'michael@clearflow.com',
    passwordHash,
    role: 'FieldTeam',
    phone: '+1 555 6789012',
    isVerified: true
  });

  const fieldLead3 = await User.create({
    name: 'David Williams',
    email: 'david@clearflow.com',
    passwordHash,
    role: 'FieldTeam',
    phone: '+1 555 7890123',
    isVerified: true
  });

  // Fetch categories
  const categories = await ServiceCategory.find();
  const cleaningCat = categories.find(c => c.name === 'Cleaning')?._id || categories[0]._id;
  const electricalCat = categories.find(c => c.name === 'Electrical Repair')?._id || categories[1]._id;
  const plumbingCat = categories.find(c => c.name === 'Plumbing')?._id || categories[2]._id;
  const pestCat = categories.find(c => c.name === 'Pest Control')?._id || categories[3]._id;
  const gardeningCat = categories.find(c => c.name === 'Gardening')?._id || categories[4]._id;
  const wasteCat = categories.find(c => c.name === 'General Waste Collection')?._id || categories[5]._id;
  const ewasteCat = categories.find(c => c.name === 'E-Waste Recycling')?._id || categories[6]._id;

  // 2. Create Field Teams
  const teamAlpha = await FieldTeam.create({
    name: 'Alpha Crew (Cleaning)',
    categoryId: cleaningCat,
    members: [fieldLead1._id],
    zoneLat: 31.4704,
    zoneLng: 74.4101, // Zone A
    zoneRadiusKm: 10,
    isActive: true,
    averageRating: 4.8,
    totalJobsCompleted: 42,
    activeOrderCount: 1
  });

  const teamBravo = await FieldTeam.create({
    name: 'Pipe Pros (Plumbing)',
    categoryId: plumbingCat,
    members: [fieldLead2._id],
    zoneLat: 31.5204,
    zoneLng: 74.3587, // Zone B
    zoneRadiusKm: 8,
    isActive: true,
    averageRating: 4.7,
    totalJobsCompleted: 35,
    activeOrderCount: 1
  });

  const teamCharlie = await FieldTeam.create({
    name: 'Voltage Elite (Electrical)',
    categoryId: electricalCat,
    members: [fieldLead3._id],
    zoneLat: 31.4697,
    zoneLng: 74.2728, // Zone C
    zoneRadiusKm: 12,
    isActive: true,
    averageRating: 4.9,
    totalJobsCompleted: 48,
    activeOrderCount: 1
  });

  const teamDelta = await FieldTeam.create({
    name: 'Green Guardians (Waste & Rec.)',
    categoryId: wasteCat,
    members: [fieldLead1._id],
    zoneLat: 31.4800,
    zoneLng: 74.3100, // Zone D
    zoneRadiusKm: 15,
    isActive: true,
    averageRating: 4.6,
    totalJobsCompleted: 29,
    activeOrderCount: 0
  });

  const teamEcho = await FieldTeam.create({
    name: 'Bug Busters (Pest Control)',
    categoryId: pestCat,
    members: [fieldLead2._id],
    zoneLat: 31.5500,
    zoneLng: 74.3400, // Zone E
    zoneRadiusKm: 10,
    isActive: true,
    averageRating: 4.8,
    totalJobsCompleted: 31,
    activeOrderCount: 0
  });

  // 3. Create Settings
  await Settings.create({
    aiConfidenceThreshold: 0.75,
    gpsIntervalSeconds: 30,
    maxActiveOrdersPerTeam: 5,
    maxFailedLoginAttempts: 5
  });

  // 4. Create Work Orders
  const wo1 = await WorkOrder.create({
    workOrderCode: 'WO-2026-0001',
    clientId: client1._id,
    teamId: teamAlpha._id,
    categoryId: cleaningCat,
    status: 'InProgress',
    locationAddress: 'Building A, Lecture Hall 302, Central Facility Complex',
    locationLat: 31.4697,
    locationLng: 74.2728,
    description: 'Deep cleaning required for lecture hall 302 after seminar.',
    urgency: 'Medium',
    beforeImageUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=800',
    assignedAt: new Date(Date.now() - 3600 * 1000 * 2),
    startedAt: new Date(Date.now() - 3600 * 1000 * 1)
  });

  const wo2 = await WorkOrder.create({
    workOrderCode: 'WO-2026-0002',
    clientId: client2._id,
    teamId: teamCharlie._id,
    categoryId: electricalCat,
    status: 'Assigned',
    locationAddress: 'Library Block B, 2nd Floor, Central Facility Complex',
    locationLat: 31.4700,
    locationLng: 74.2730,
    description: 'Circuit breaker tripping repeatedly in reading area.',
    urgency: 'High',
    assignedAt: new Date(Date.now() - 1800 * 1000)
  });

  const wo3 = await WorkOrder.create({
    workOrderCode: 'WO-2026-0003',
    clientId: client1._id,
    teamId: teamBravo._id,
    categoryId: plumbingCat,
    status: 'PendingReview',
    locationAddress: 'Main Cafeteria Washrooms, Ground Floor, Central Facility Complex',
    locationLat: 31.4695,
    locationLng: 74.2725,
    description: 'Primary pipe leakage under sink repaired. Awaiting client review.',
    urgency: 'High',
    beforeImageUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=800',
    afterImageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80&w=800',
    aiConfidenceScore: 0.94,
    aiResult: 'Pass',
    assignedAt: new Date(Date.now() - 3600 * 1000 * 5),
    startedAt: new Date(Date.now() - 3600 * 1000 * 4)
  });

  const wo4 = await WorkOrder.create({
    workOrderCode: 'WO-2026-0004',
    clientId: client3._id,
    teamId: teamAlpha._id,
    categoryId: cleaningCat,
    status: 'Closed',
    locationAddress: 'Faculty Lounge, 4th Floor, Academic Block, Central Facility Complex',
    locationLat: 31.4698,
    locationLng: 74.2729,
    description: 'Weekly carpet shampoo and window cleaning completed.',
    urgency: 'Low',
    beforeImageUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=800',
    afterImageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80&w=800',
    aiConfidenceScore: 0.96,
    aiResult: 'Pass',
    assignedAt: new Date(Date.now() - 3600 * 1000 * 24),
    startedAt: new Date(Date.now() - 3600 * 1000 * 22),
    closedAt: new Date(Date.now() - 3600 * 1000 * 20)
  });

  const wo5 = await WorkOrder.create({
    workOrderCode: 'WO-2026-0005',
    clientId: client2._id,
    categoryId: pestCat,
    status: 'Open',
    locationAddress: 'Science Labs Wing, Basement, Central Facility Complex',
    locationLat: 31.4694,
    locationLng: 74.2722,
    description: 'Pest fumigation requested for storage room before semester start.',
    urgency: 'Medium'
  });

  // 5. Create Sample Chat Messages for WO-2026-0001
  await ChatMessage.create({
    workOrderId: wo1._id,
    senderId: client1._id,
    senderRole: 'Client',
    message: 'Hello John, we have unlocked lecture hall 302 for your team.',
    sentAt: new Date(Date.now() - 3600 * 1000 * 1.8)
  });

  await ChatMessage.create({
    workOrderId: wo1._id,
    senderId: fieldLead1._id,
    senderRole: 'FieldTeam',
    message: 'Thank you James! Alpha crew has arrived on site with equipment.',
    sentAt: new Date(Date.now() - 3600 * 1000 * 1.5)
  });

  // 6. Create Initial Notifications
  await Notification.create({
    userId: client1._id,
    workOrderId: wo1._id,
    type: 'StatusUpdate',
    title: 'Work Order In Progress',
    message: 'Alpha Crew has started work on WO-2026-0001 (Lecture Hall 302).',
    isRead: false,
    channel: 'Both',
    deliveryStatus: 'Delivered',
    sentAt: new Date(Date.now() - 3600 * 1000 * 1)
  });

  await Notification.create({
    userId: admin._id,
    workOrderId: wo3._id,
    type: 'StatusUpdate',
    title: 'AI Verification Passed (94%)',
    message: 'WO-2026-0003 completed by Pipe Pros has passed automated image verification.',
    isRead: false,
    channel: 'Both',
    deliveryStatus: 'Delivered',
    sentAt: new Date(Date.now() - 3600 * 1000 * 3)
  });

  console.log('[Seed] Complete demo data seeded successfully:');
  console.log(' - Users: 1 Admin, 3 Clients, 3 Field Team Leads');
  console.log(' - Teams: 5 Active Field Crews across facility zones');
  console.log(' - Work Orders: 5 Work orders across Open, Assigned, InProgress, PendingReview, Closed');
  console.log(' - Chat Messages and Notifications initialized.');
};
