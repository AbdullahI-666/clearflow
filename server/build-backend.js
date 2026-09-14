import fs from 'fs';
import path from 'path';

const BASE = 'C:\\Users\\ikram\\.gemini\\antigravity\\scratch\\clearflow\\server\\src';

const dirs = [
  'services', 'controllers', 'validators', 'routes', 'socket', 'seeds'
];

dirs.forEach(d => fs.mkdirSync(path.join(BASE, d), { recursive: true }));

const files = {
  // --- SERVICES ---
  'services/auth.service.ts': `
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import User from '../models/user.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ENV } from '../config/env.js';

export const register = async (name, email, password, role, phone) => {
  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(400, 'Email already exists');
  const passwordHash = await bcrypt.hash(password, 12);
  const verificationToken = 'verify-' + Date.now();
  const user = await User.create({ name, email, passwordHash, role, phone, verificationToken });
  console.log('Verification URL:', \`http://localhost:3000/verify-email/\${verificationToken}\`);
  return user;
};

export const login = async (email, password) => {
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) throw new ApiError(401, 'Invalid credentials');
  if (!user.isVerified) throw new ApiError(403, 'Email not verified');
  if (user.lockUntil && user.lockUntil > new Date()) throw new ApiError(403, 'Account locked');
  
  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= 5) user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();
    throw new ApiError(401, 'Invalid credentials');
  }
  
  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();

  const secret = new TextEncoder().encode(ENV.JWT_SECRET || 'secret');
  const token = await new SignJWT({ id: user._id, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1d')
    .sign(secret);
    
  return { user, token };
};

export const verifyEmail = async (token) => {
  const user = await User.findOne({ verificationToken: token });
  if (!user) throw new ApiError(400, 'Invalid token');
  user.isVerified = true;
  user.verificationToken = undefined;
  await user.save();
  return user;
};

export const forgotPassword = async (email) => {
  const user = await User.findOne({ email });
  if (!user) return; // Silent success
  user.resetPasswordToken = 'reset-' + Date.now();
  user.resetPasswordExpiry = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();
  console.log('Reset URL:', \`http://localhost:3000/reset-password/\${user.resetPasswordToken}\`);
};

export const resetPassword = async (token, newPassword) => {
  const user = await User.findOne({ resetPasswordToken: token, resetPasswordExpiry: { $gt: new Date() } });
  if (!user) throw new ApiError(400, 'Invalid or expired token');
  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpiry = undefined;
  await user.save();
};
`,
  'services/workOrder.service.ts': `
import WorkOrder from '../models/workOrder.model.js';
import Rating from '../models/rating.model.js';
import { ApiError } from '../utils/ApiError.js';
import { generateWorkOrderCode } from '../utils/generateCode.js';
import { autoAssign } from './assignment.service.js';
import { generateReport } from './pdf.service.js';

export const create = async (clientId, data) => {
  const code = generateWorkOrderCode();
  const wo = await WorkOrder.create({ ...data, code, client: clientId, status: 'Open' });
  await autoAssign(wo._id);
  return wo.populate(['client', 'category']);
};

export const getAll = async (filters, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  const data = await WorkOrder.find(filters).skip(skip).limit(limit).populate(['client', 'team', 'category']);
  const total = await WorkOrder.countDocuments(filters);
  return { data, total, page, limit };
};

export const getById = async (id) => {
  const wo = await WorkOrder.findById(id).populate(['client', 'team', 'category']);
  if (!wo) throw new ApiError(404, 'Work order not found');
  return wo;
};

export const updateStatus = async (id, status, userId) => {
  const wo = await WorkOrder.findById(id);
  if (!wo) throw new ApiError(404, 'Work order not found');
  wo.status = status;
  if (status === 'Assigned') wo.assignedAt = new Date();
  if (status === 'InProgress') wo.startedAt = new Date();
  if (status === 'Closed') wo.closedAt = new Date();
  await wo.save();
  return wo;
};

export const uploadBeforeImage = async (id, imageUrl) => {
  const wo = await WorkOrder.findById(id);
  if (!wo) throw new ApiError(404, 'Work order not found');
  wo.beforeImageUrl = imageUrl;
  await wo.save();
  return wo;
};

export const uploadAfterImage = async (id, imageUrl) => {
  const wo = await WorkOrder.findById(id);
  if (!wo) throw new ApiError(404, 'Work order not found');
  wo.afterImageUrl = imageUrl;
  // Mock AI check
  const pass = Math.random() > 0.2;
  wo.status = pass ? 'PendingReview' : 'Flagged';
  await wo.save();
  return wo;
};

export const submitRating = async (woId, clientId, stars, comment) => {
  const wo = await WorkOrder.findById(woId);
  if (!wo) throw new ApiError(404, 'Work order not found');
  const rating = await Rating.create({ workOrder: woId, client: clientId, team: wo.team, stars, comment });
  wo.status = 'Closed';
  await wo.save();
  await generateReport(woId);
  return rating;
};
`,
  'services/assignment.service.ts': `
import Assignment from '../models/assignment.model.js';
import WorkOrder from '../models/workOrder.model.js';
import FieldTeam from '../models/fieldTeam.model.js';
import { haversineDistance } from '../utils/haversine.js';

export const autoAssign = async (workOrderId) => {
  const wo = await WorkOrder.findById(workOrderId);
  if (!wo) return;
  
  const teams = await FieldTeam.find({ categories: wo.category, status: 'Active' });
  if (!teams.length) return;

  let bestTeam = null;
  let bestScore = -1;

  for (const team of teams) {
    const proximity = team.lastLocation ? (100 - Math.min(100, haversineDistance(team.lastLocation.lat, team.lastLocation.lng, wo.location.lat, wo.location.lng))) : 50;
    const workload = 1 / (1 + team.activeOrderCount);
    const ratingScore = team.avgRating / 5;
    const score = (0.4 * proximity) + (0.3 * workload * 100) + (0.3 * ratingScore * 100);
    
    if (score > bestScore) {
      bestScore = score;
      bestTeam = team;
    }
  }

  if (bestTeam) {
    await Assignment.create({ workOrder: wo._id, team: bestTeam._id, score: bestScore });
    wo.team = bestTeam._id;
    wo.status = 'Assigned';
    await wo.save();
    bestTeam.activeOrderCount += 1;
    await bestTeam.save();
  }
};

export const override = async (workOrderId, newTeamId, adminId, reason) => {
  const wo = await WorkOrder.findById(workOrderId);
  const oldTeamId = wo.team;
  if (oldTeamId) {
    const oldTeam = await FieldTeam.findById(oldTeamId);
    if (oldTeam) {
      oldTeam.activeOrderCount = Math.max(0, oldTeam.activeOrderCount - 1);
      await oldTeam.save();
    }
  }
  
  const newTeam = await FieldTeam.findById(newTeamId);
  if (newTeam) {
    newTeam.activeOrderCount += 1;
    await newTeam.save();
  }
  
  wo.team = newTeamId;
  await wo.save();
  
  await Assignment.create({ workOrder: workOrderId, team: newTeamId, overrideReason: reason, overriddenBy: adminId });
  return wo;
};
`,
  'services/gpsTracking.service.ts': `
import GpsLog from '../models/gpsLog.model.js';
import FieldTeam from '../models/fieldTeam.model.js';
import { haversineDistance } from '../utils/haversine.js';

export const updateLocation = async (teamId, lat, lng, accuracy, workOrderId) => {
  const log = await GpsLog.create({ team: teamId, lat, lng, accuracy, workOrder: workOrderId });
  await FieldTeam.findByIdAndUpdate(teamId, { lastLocation: { lat, lng, timestamp: new Date() } });
  return log;
};

export const getLatestPosition = async (teamId) => {
  return await GpsLog.findOne({ team: teamId }).sort('-createdAt');
};

export const getAllActivePositions = async () => {
  const teams = await FieldTeam.find({ status: 'Active' });
  return teams.map(t => ({ teamId: t._id, location: t.lastLocation }));
};

export const calculateETA = (teamLat, teamLng, destLat, destLng) => {
  const distKm = haversineDistance(teamLat, teamLng, destLat, destLng);
  return Math.round((distKm / 30) * 60); // 30 km/h assumed
};
`,
  'services/pdf.service.ts': `
import WorkOrder from '../models/workOrder.model.js';
import Invoice from '../models/invoice.model.js';
import { generateInvoiceCode } from '../utils/generateCode.js';

export const generateReport = async (workOrderId) => {
  const wo = await WorkOrder.findById(workOrderId);
  const pdfUrl = \`https://res.cloudinary.com/demo/image/upload/sample_report_\${workOrderId}.pdf\`;
  wo.reportUrl = pdfUrl;
  await wo.save();
  return pdfUrl;
};

export const generateInvoice = async (workOrderId) => {
  const wo = await WorkOrder.findById(workOrderId).populate('category');
  if (!wo.category.isPaid) return null;
  const code = generateInvoiceCode();
  const amount = 500; // Mock amount
  const invoice = await Invoice.create({ workOrder: workOrderId, client: wo.client, amount, code, status: 'Unpaid' });
  return invoice;
};
`,
  'services/notification.service.ts': `
import Notification from '../models/notification.model.js';

export const create = async (userId, type, title, message, workOrderId, channel = 'Both') => {
  const notif = await Notification.create({ user: userId, type, title, message, workOrder: workOrderId, channel });
  console.log(\`Push Notif to \${userId}: \${title}\`);
  if (channel === 'Both' || channel === 'Email') {
    console.log(\`Email Notif to \${userId}: \${message}\`);
  }
  return notif;
};

export const getByUser = async (userId) => {
  return await Notification.find({ user: userId }).sort('-createdAt');
};

export const markRead = async (id) => {
  return await Notification.findByIdAndUpdate(id, { isRead: true }, { new: true });
};

export const markAllRead = async (userId) => {
  await Notification.updateMany({ user: userId }, { isRead: true });
};
`,
  'services/analytics.service.ts': `
import WorkOrder from '../models/workOrder.model.js';
import FieldTeam from '../models/fieldTeam.model.js';

export const getDashboard = async (from, to, category) => {
  const match = { createdAt: { $gte: new Date(from), $lte: new Date(to) } };
  if (category) match.category = category;

  const total = await WorkOrder.countDocuments(match);
  const closed = await WorkOrder.countDocuments({ ...match, status: 'Closed' });
  const completionRate = total ? (closed / total) * 100 : 0;

  return { total, closed, completionRate };
};

export const getTeamPerformance = async (from, to) => {
  return await FieldTeam.find({}, 'name avgRating activeOrderCount zone');
};

export const getPrediction = async () => {
  return { forecast: [12, 15, 14, 18, 22, 20, 19] }; // Mock
};

export const exportData = async (format, from, to) => {
  return { url: \`https://demo.com/export.\${format}\` };
};
`,
  'services/chat.service.ts': `
import ChatMessage from '../models/chatMessage.model.js';

export const getMessages = async (workOrderId) => {
  return await ChatMessage.find({ workOrder: workOrderId }).sort('createdAt');
};

export const sendMessage = async (workOrderId, senderId, senderRole, message) => {
  return await ChatMessage.create({ workOrder: workOrderId, sender: senderId, senderRole, message });
};

export const markAsRead = async (workOrderId, userId) => {
  await ChatMessage.updateMany({ workOrder: workOrderId, sender: { $ne: userId } }, { isRead: true });
};
`,
  // --- CONTROLLERS ---
  'controllers/auth.controller.ts': `
import * as authService from '../services/auth.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const register = async (req, res) => {
  const { name, email, password, role, phone } = req.body;
  const user = await authService.register(name, email, password, role, phone);
  res.status(201).json(new ApiResponse(201, user, 'User registered'));
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  res.json(new ApiResponse(200, result, 'Login successful'));
};

export const verifyEmail = async (req, res) => {
  const user = await authService.verifyEmail(req.params.token);
  res.json(new ApiResponse(200, user, 'Email verified'));
};

export const forgotPassword = async (req, res) => {
  await authService.forgotPassword(req.body.email);
  res.json(new ApiResponse(200, null, 'Reset link sent'));
};

export const resetPassword = async (req, res) => {
  await authService.resetPassword(req.params.token, req.body.password);
  res.json(new ApiResponse(200, null, 'Password reset successful'));
};
`,
  'controllers/workOrder.controller.ts': `
import * as woService from '../services/workOrder.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const create = async (req, res) => {
  const wo = await woService.create(req.user.id, req.body);
  res.status(201).json(new ApiResponse(201, wo, 'Work order created'));
};

export const getAll = async (req, res) => {
  const { page, limit, ...filters } = req.query;
  const result = await woService.getAll(filters, Number(page), Number(limit));
  res.json(new ApiResponse(200, result, 'Work orders retrieved'));
};

export const getById = async (req, res) => {
  const wo = await woService.getById(req.params.id);
  res.json(new ApiResponse(200, wo, 'Work order retrieved'));
};

export const updateStatus = async (req, res) => {
  const wo = await woService.updateStatus(req.params.id, req.body.status, req.user.id);
  res.json(new ApiResponse(200, wo, 'Status updated'));
};

export const assignOverride = async (req, res) => {
  const { teamId, reason } = req.body;
  const { override } = await import('../services/assignment.service.js');
  const wo = await override(req.params.id, teamId, req.user.id, reason);
  res.json(new ApiResponse(200, wo, 'Assignment overridden'));
};

export const uploadBeforeImage = async (req, res) => {
  const wo = await woService.uploadBeforeImage(req.params.id, req.body.imageUrl);
  res.json(new ApiResponse(200, wo, 'Before image uploaded'));
};

export const uploadAfterImage = async (req, res) => {
  const wo = await woService.uploadAfterImage(req.params.id, req.body.imageUrl);
  res.json(new ApiResponse(200, wo, 'After image uploaded'));
};

export const submitRating = async (req, res) => {
  const { stars, comment } = req.body;
  const rating = await woService.submitRating(req.params.id, req.user.id, stars, comment);
  res.json(new ApiResponse(200, rating, 'Rating submitted'));
};
`,
  'controllers/team.controller.ts': `
import FieldTeam from '../models/fieldTeam.model.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const getAll = async (req, res) => {
  const teams = await FieldTeam.find().populate('members categories');
  res.json(new ApiResponse(200, teams, 'Teams retrieved'));
};

export const create = async (req, res) => {
  const team = await FieldTeam.create(req.body);
  res.status(201).json(new ApiResponse(201, team, 'Team created'));
};

export const update = async (req, res) => {
  const team = await FieldTeam.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(new ApiResponse(200, team, 'Team updated'));
};

export const deactivate = async (req, res) => {
  const team = await FieldTeam.findByIdAndUpdate(req.params.id, { status: 'Inactive' }, { new: true });
  res.json(new ApiResponse(200, team, 'Team deactivated'));
};
`,
  'controllers/tracking.controller.ts': `
import * as trackingService from '../services/gpsTracking.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const updateLocation = async (req, res) => {
  const { lat, lng, accuracy, workOrderId } = req.body;
  const log = await trackingService.updateLocation(req.user.teamId, lat, lng, accuracy, workOrderId);
  res.json(new ApiResponse(200, log, 'Location updated'));
};

export const getAllPositions = async (req, res) => {
  const positions = await trackingService.getAllActivePositions();
  res.json(new ApiResponse(200, positions, 'Positions retrieved'));
};

export const getTeamPosition = async (req, res) => {
  const position = await trackingService.getLatestPosition(req.params.teamId);
  res.json(new ApiResponse(200, position, 'Team position retrieved'));
};
`,
  'controllers/chat.controller.ts': `
import * as chatService from '../services/chat.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const getMessages = async (req, res) => {
  const messages = await chatService.getMessages(req.params.workOrderId);
  res.json(new ApiResponse(200, messages, 'Messages retrieved'));
};

export const sendMessage = async (req, res) => {
  const msg = await chatService.sendMessage(req.params.workOrderId, req.user.id, req.user.role, req.body.message);
  res.status(201).json(new ApiResponse(201, msg, 'Message sent'));
};
`,
  'controllers/notification.controller.ts': `
import * as notifService from '../services/notification.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const getAll = async (req, res) => {
  const notifs = await notifService.getByUser(req.user.id);
  res.json(new ApiResponse(200, notifs, 'Notifications retrieved'));
};

export const markRead = async (req, res) => {
  const notif = await notifService.markRead(req.params.id);
  res.json(new ApiResponse(200, notif, 'Notification marked read'));
};

export const markAllRead = async (req, res) => {
  await notifService.markAllRead(req.user.id);
  res.json(new ApiResponse(200, null, 'All marked read'));
};
`,
  'controllers/analytics.controller.ts': `
import * as analyticsService from '../services/analytics.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const getDashboard = async (req, res) => {
  const { from, to, category } = req.query;
  const data = await analyticsService.getDashboard(from, to, category);
  res.json(new ApiResponse(200, data, 'Dashboard data retrieved'));
};

export const getPrediction = async (req, res) => {
  const data = await analyticsService.getPrediction();
  res.json(new ApiResponse(200, data, 'Prediction retrieved'));
};

export const exportData = async (req, res) => {
  const { format, from, to } = req.query;
  const result = await analyticsService.exportData(format, from, to);
  res.json(new ApiResponse(200, result, 'Export generated'));
};
`,
  'controllers/report.controller.ts': `
import * as pdfService from '../services/pdf.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const getReport = async (req, res) => {
  const url = await pdfService.generateReport(req.params.id);
  res.json(new ApiResponse(200, { url }, 'Report generated'));
};

export const getInvoice = async (req, res) => {
  const invoice = await pdfService.generateInvoice(req.params.id);
  res.json(new ApiResponse(200, invoice, 'Invoice generated'));
};
`,
  'controllers/user.controller.ts': `
import User from '../models/user.model.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const updateProfile = async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(new ApiResponse(200, user, 'Profile updated'));
};

export const deactivate = async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  res.json(new ApiResponse(200, user, 'User deactivated'));
};
`,
  // --- VALIDATORS ---
  'validators/auth.validator.ts': `
import { body } from 'express-validator';
export const registerValidator = [
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('name').notEmpty(),
  body('role').isIn(['Client', 'FieldTeam', 'Admin'])
];
export const loginValidator = [body('email').isEmail(), body('password').notEmpty()];
export const forgotPasswordValidator = [body('email').isEmail()];
export const resetPasswordValidator = [body('password').isLength({ min: 6 })];
`,
  'validators/workOrder.validator.ts': `
import { body } from 'express-validator';
export const createWorkOrderValidator = [
  body('title').notEmpty(),
  body('categoryId').notEmpty(),
  body('location.lat').isNumeric(),
  body('location.lng').isNumeric()
];
export const updateStatusValidator = [body('status').isIn(['Open', 'Assigned', 'InProgress', 'PendingReview', 'Closed', 'Flagged'])];
export const ratingValidator = [body('stars').isInt({ min: 1, max: 5 })];
`,
  'validators/team.validator.ts': `
import { body } from 'express-validator';
export const createTeamValidator = [body('name').notEmpty(), body('zone').notEmpty()];
export const updateTeamValidator = [body('name').optional(), body('zone').optional()];
`,
  // --- ROUTES ---
  'routes/auth.routes.ts': `
import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { registerValidator, loginValidator, forgotPasswordValidator, resetPasswordValidator } from '../validators/auth.validator.js';

const router = Router();
router.post('/register', registerValidator, validate, authController.register);
router.post('/login', loginValidator, validate, authController.login);
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/forgot-password', forgotPasswordValidator, validate, authController.forgotPassword);
router.post('/reset-password/:token', resetPasswordValidator, validate, authController.resetPassword);
export default router;
`,
  'routes/workOrder.routes.ts': `
import { Router } from 'express';
import * as woController from '../controllers/workOrder.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createWorkOrderValidator, updateStatusValidator, ratingValidator } from '../validators/workOrder.validator.js';

const router = Router();
router.use(authenticate);
router.post('/', authorize(['Client']), createWorkOrderValidator, validate, woController.create);
router.get('/', woController.getAll);
router.get('/:id', woController.getById);
router.patch('/:id/status', authorize(['FieldTeam', 'Admin']), updateStatusValidator, validate, woController.updateStatus);
router.patch('/:id/assign', authorize(['Admin']), woController.assignOverride);
router.post('/:id/images/before', authorize(['FieldTeam']), woController.uploadBeforeImage);
router.post('/:id/images/after', authorize(['FieldTeam']), woController.uploadAfterImage);
router.post('/:id/rating', authorize(['Client']), ratingValidator, validate, woController.submitRating);
export default router;
`,
  'routes/team.routes.ts': `
import { Router } from 'express';
import * as teamController from '../controllers/team.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createTeamValidator, updateTeamValidator } from '../validators/team.validator.js';

const router = Router();
router.use(authenticate, authorize(['Admin']));
router.get('/', teamController.getAll);
router.post('/', createTeamValidator, validate, teamController.create);
router.patch('/:id', updateTeamValidator, validate, teamController.update);
router.patch('/:id/deactivate', teamController.deactivate);
export default router;
`,
  'routes/tracking.routes.ts': `
import { Router } from 'express';
import * as trackingController from '../controllers/tracking.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';

const router = Router();
router.use(authenticate);
router.post('/update', authorize(['FieldTeam']), trackingController.updateLocation);
router.get('/all', authorize(['Admin']), trackingController.getAllPositions);
router.get('/:teamId', authorize(['Client', 'Admin']), trackingController.getTeamPosition);
export default router;
`,
  'routes/chat.routes.ts': `
import { Router } from 'express';
import * as chatController from '../controllers/chat.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);
router.get('/:workOrderId', chatController.getMessages);
router.post('/:workOrderId', chatController.sendMessage);
export default router;
`,
  'routes/notification.routes.ts': `
import { Router } from 'express';
import * as notifController from '../controllers/notification.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);
router.get('/', notifController.getAll);
router.patch('/:id/read', notifController.markRead);
router.patch('/read-all', notifController.markAllRead);
export default router;
`,
  'routes/analytics.routes.ts': `
import { Router } from 'express';
import * as analyticsController from '../controllers/analytics.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';

const router = Router();
router.use(authenticate, authorize(['Admin']));
router.get('/', analyticsController.getDashboard);
router.get('/predict', analyticsController.getPrediction);
router.get('/export', analyticsController.exportData);
export default router;
`,
  'routes/report.routes.ts': `
import { Router } from 'express';
import * as reportController from '../controllers/report.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';

const router = Router();
router.use(authenticate, authorize(['Client', 'Admin']));
router.get('/:id/pdf', reportController.getReport);
router.get('/:id/invoice', reportController.getInvoice);
export default router;
`,
  'routes/user.routes.ts': `
import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';

const router = Router();
router.use(authenticate);
router.patch('/:id', userController.updateProfile);
router.patch('/:id/deactivate', authorize(['Admin']), userController.deactivate);
export default router;
`,
  // --- SOCKET ---
  'socket/index.ts': `
import { Server } from 'socket.io';
import { jwtVerify } from 'jose';
import { ENV } from '../config/env.js';
import chatHandler from './chat.handler.js';
import gpsHandler from './gps.handler.js';

export const initSocket = (httpServer) => {
  const io = new Server(httpServer, { cors: { origin: '*' } });
  
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Auth missing'));
      const secret = new TextEncoder().encode(ENV.JWT_SECRET || 'secret');
      const { payload } = await jwtVerify(token, secret);
      socket.user = payload;
      next();
    } catch (err) {
      next(new Error('Auth failed'));
    }
  });

  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);
    chatHandler(io, socket);
    gpsHandler(io, socket);
    socket.on('disconnect', () => console.log('Socket disconnected:', socket.id));
  });
};
`,
  'socket/chat.handler.ts': `
export default (io, socket) => {
  socket.on('chat:join', (workOrderId) => {
    socket.join(\`chat_\${workOrderId}\`);
  });
  socket.on('chat:message', (data) => {
    io.to(\`chat_\${data.workOrderId}\`).emit('chat:message', data);
  });
};
`,
  'socket/gps.handler.ts': `
export default (io, socket) => {
  if (socket.user.role === 'Admin') socket.join('admin:tracking');
  socket.on('gps:update', (data) => {
    if (socket.user.role === 'FieldTeam') {
      io.to('admin:tracking').emit('gps:update', { teamId: socket.user.id, ...data });
    }
  });
};
`,
  // --- SEEDS ---
  'seeds/categories.seed.ts': `
import mongoose from 'mongoose';
import ServiceCategory from '../models/serviceCategory.model.js';
import { ENV } from '../config/env.js';

export const seedCategories = async () => {
  await mongoose.connect(ENV.MONGO_URI);
  await ServiceCategory.deleteMany({});
  const categories = [
    { name: 'Cleaning', isPaid: true, isWaste: false },
    { name: 'Electrical Repair', isPaid: true, isWaste: false },
    { name: 'Plumbing', isPaid: true, isWaste: false },
    { name: 'Pest Control', isPaid: true, isWaste: false },
    { name: 'Gardening', isPaid: true, isWaste: false },
    { name: 'General Waste Collection', isPaid: false, isWaste: true },
    { name: 'E-Waste Recycling', isPaid: false, isWaste: true }
  ];
  await ServiceCategory.insertMany(categories);
  console.log('Categories seeded');
  await mongoose.disconnect();
};
`,
  'seeds/demo.seed.ts': `
import mongoose from 'mongoose';
import { ENV } from '../config/env.js';

export const seedDemo = async () => {
  await mongoose.connect(ENV.MONGO_URI);
  console.log('Demo seeded');
  await mongoose.disconnect();
};
`,
  'seeds/run.ts': `
import { seedCategories } from './categories.seed.js';
import { seedDemo } from './demo.seed.js';

const run = async () => {
  await seedCategories();
  await seedDemo();
  console.log('All seeds completed');
  process.exit(0);
};
run();
`,
  // --- ENTRY POINTS ---
  'app.ts': `
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { ENV } from './config/env.js';
import { generalLimiter } from './middleware/rateLimiter.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';

import authRoutes from './routes/auth.routes.js';
import workOrderRoutes from './routes/workOrder.routes.js';
import teamRoutes from './routes/team.routes.js';
import trackingRoutes from './routes/tracking.routes.js';
import chatRoutes from './routes/chat.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import reportRoutes from './routes/report.routes.js';
import userRoutes from './routes/user.routes.js';

const app = express();
app.use(helmet());
app.use(cors({ origin: ENV.CORS_ORIGIN || '*' }));
app.use(generalLimiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const swaggerSpec = swaggerJsdoc({
  definition: { openapi: '3.0.0', info: { title: 'ClearFlow API', version: '1.0.0' } },
  apis: ['./src/routes/*.js', './src/routes/*.ts']
});
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/auth', authRoutes);
app.use('/api/work-orders', workOrderRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);

app.use(errorHandler);

export default app;
`,
  'server.ts': `
import http from 'http';
import mongoose from 'mongoose';
import app from './app.js';
import { ENV } from './config/env.js';
import { initSocket } from './socket/index.js';

const server = http.createServer(app);
initSocket(server);

mongoose.connect(ENV.MONGO_URI || 'mongodb://localhost/clearflow').then(() => {
  console.log('Connected to MongoDB');
  const port = ENV.PORT || 5000;
  server.listen(port, () => {
    console.log(\`Server running on port \${port}\`);
  });
}).catch(err => {
  console.error('Failed to connect to DB', err);
  process.exit(1);
});
`
};

for (const [relPath, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(BASE, relPath), content.trim() + '\\n');
}
console.log('All files generated successfully.');
