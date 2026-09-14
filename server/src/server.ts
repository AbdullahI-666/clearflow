import http from 'http';
import mongoose from 'mongoose';
import app from './app.js';
import { env } from './config/env.js';
import { initSocket } from './socket/index.js';
import { seedDemoUsersIfMissing } from './services/auth.service.js';

// Disable query buffering so unhandled database timeouts never freeze API requests
mongoose.set('bufferCommands', false);

const server = http.createServer(app);
initSocket(server);

const port = env.PORT || 3000;

server.listen(port, () => {
  console.log('\n======================================================');
  console.log('       🌟 CLEARFLOW UNIFIED SYSTEM IS READY 🌟        ');
  console.log('======================================================');
  console.log(`🚀 Unified Web App:   http://localhost:${port}`);
  console.log(`🔌 REST API Base:     http://localhost:${port}/api`);
  console.log(`📖 Swagger API Docs:  http://localhost:${port}/api-docs`);
  console.log(`💓 System Health:     http://localhost:${port}/api/health`);
  console.log('======================================================\n');
});

mongoose.connect(env.MONGODB_URI, {
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
}).then(async () => {
  console.log('✅ [ClearFlow Backend] Connected to MongoDB Atlas');
  await seedDemoUsersIfMissing();
}).catch(err => {
  console.warn('⚠️  [ClearFlow Backend] MongoDB Connection Notice:', err.message || err);
  console.log('ℹ️  [ClearFlow Backend] Operating in High-Availability In-Memory Demo Mode');
});
