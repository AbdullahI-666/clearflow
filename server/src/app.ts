import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
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
import settingsRoutes from './routes/settings.routes.js';
import categoryRoutes from './routes/category.routes.js';
import invoiceRoutes from './routes/invoice.routes.js';
import aiRoutes from './routes/ai.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const possibleDistPaths = [
  path.resolve(process.cwd(), '../client/dist'),
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(__dirname, '../../client/dist'),
  path.resolve(__dirname, '../client/dist')
];
const clientDistPath = possibleDistPaths.find(p => fs.existsSync(path.join(p, 'index.html'))) || possibleDistPaths[0];

const app = express();
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: ENV.CORS_ORIGIN || '*' }));
app.use(generalLimiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve compiled React frontend assets
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
}

// Health Check Endpoint (Render / Uptime monitoring)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'clearflow-unified-server',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

const swaggerSpec = swaggerJsdoc({
  definition: { openapi: '3.0.0', info: { title: 'ClearFlow API', version: '1.0.0' } },
  apis: ['./src/routes/*.js', './src/routes/*.ts']
});
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Mount REST API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/work-orders', workOrderRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/ai', aiRoutes);

// Catch-All Route: Serve React SPA for all frontend routes
app.get(/(.*)/, (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/api-docs') || req.path.startsWith('/socket.io')) {
    return next();
  }
  const indexPath = path.resolve(clientDistPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    const html = fs.readFileSync(indexPath, 'utf8');
    return res.type('html').send(html);
  }
  res.status(200).send(`
    <div style="font-family: system-ui, sans-serif; text-align: center; padding: 4rem; color: #1F2937;">
      <h1 style="color: #0D9488;">ClearFlow Unified Server</h1>
      <p>API is active. Build the frontend with <code>npm run build</code> to serve the web UI.</p>
      <p><a href="/api-docs" style="color: #0D9488;">View OpenAPI Specs (/api-docs)</a></p>
    </div>
  `);
});

app.use(errorHandler);

export default app;
