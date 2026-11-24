// ClearFlow Unified Server Entrypoint - Enterprise Three-Admin Sync Ready
import http from 'http';
import app from './app.js';
import { env } from './config/env.js';
import { initSocket } from './socket/index.js';
import { seedDemoUsersIfMissing } from './services/auth.service.js';
import { scheduler } from './services/scheduler.service.js';
import { connectDB } from './config/db.js';

const server = http.createServer(app);
initSocket(server);

const port = Number(process.env.PORT || env.PORT || 3000);
const host = '0.0.0.0';

server.listen(port, host, async () => {
  console.log('\n======================================================');
  console.log('       🌟 CLEARFLOW UNIFIED SYSTEM IS READY 🌟        ');
  console.log('======================================================');
  console.log(`🚀 Unified Web App:   http://localhost:${port}`);
  console.log(`🔌 REST API Base:     http://localhost:${port}/api`);
  console.log(`📖 Swagger API Docs:  http://localhost:${port}/api-docs`);
  console.log(`💓 System Health:     http://localhost:${port}/api/health`);
  console.log('======================================================\n');

  // Connect to Supabase PostgreSQL and seed demo data
  await connectDB();
  await seedDemoUsersIfMissing();

  // Start background cron scheduler daemon
  scheduler.startAll();
});

// Graceful process termination & scheduler shutdown
const shutdown = () => {
  console.log('\n[Server] Graceful shutdown initiated...');
  scheduler.stopAll();
  server.close(() => {
    console.log('[Server] HTTP server listener closed.');
    process.exit(0);
  });
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
