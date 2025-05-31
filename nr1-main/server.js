// --- NR1 Copilot Professional Backend ---
// This file is auto-cleaned and maintained for best practices.
// Use app.js as the main entry point for new features and routes.
//
// For maintainers: All business logic, validation, and utilities are delegated to /controllers, /services, and /utils.
// Only import and attach modular routes and middleware here. All logging uses logWithLevel.

'use strict';
require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const { Server } = require('socket.io');
const IORedis = require('ioredis');
const { QueueEvents } = require('bullmq');
const morgan = require('morgan');
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const swaggerDocument = YAML.load(path.join(__dirname, 'swagger.yaml'));
const http = require('http');
const { logWithLevel } = require('./utils/logger');
const { checkDependencies } = require('./utils/health');
const { bootstrapServer } = require('./utils/bootstrap');
const { v4: uuidv4 } = require('uuid');

// Modular route imports
const userRoutes = require('./routes/v1/user-routes');
const videoRoutes = require('./routes/video-routes');
const analyticsRoutes = require('./routes/analytics-routes');
const feedbackRoutes = require('./routes/feedback-routes');
const i18nRoutes = require('./routes/i18n-routes');
const authRoutes = require('./routes/auth-routes');

// Set FFmpeg path with error handling
try {
  const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
  ffmpeg.setFfmpegPath(ffmpegPath);
  logWithLevel('info', '✅ FFmpeg configured successfully');
} catch {
  logWithLevel('warn', '⚠️ FFmpeg installer not found, using system FFmpeg');
}

const app = express();
const port = process.env.PORT || 5000;
app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);

// --- Modular Middleware and Config Attachments ---
const { limiter, requestLogger, securityHeaders, helmetConfig } = require('./config/express');

// Attach security and performance middleware
app.use(securityHeaders);
app.use(require('helmet')(helmetConfig));
app.use(requestLogger);
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(require('cors')(require('./config/express').corsConfig));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use(express.static(path.join(__dirname, 'public')));
const logStream = process.env.NODE_ENV === 'production' ? fs.createWriteStream(path.join(__dirname, 'server.log'), { flags: 'a' }) : null;
if (logStream) app.use(morgan('combined', { stream: logStream }));

// --- Request ID Middleware for Traceability ---
app.use((req, res, next) => {
  req.id = uuidv4();
  res.setHeader('X-Request-Id', req.id);
  next();
});

// --- Health check endpoints ---
app.get('/health/dependencies', async (req, res) => {
  try {
    const health = await checkDependencies();
    res.status(200).json({ status: 'ok', dependencies: health, requestId: req.id });
  } catch (e) {
    res.status(500).json({ status: 'error', error: e.message, requestId: req.id });
  }
});

// --- Root Health Endpoint ---
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    version: require('../package.json').version,
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

// --- Security Headers for Static Files ---
app.use((req, res, next) => {
  if (req.url.startsWith('/public/')) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  }
  next();
});

// --- Attach modular routes ---
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/videos', videoRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/feedback', feedbackRoutes);
app.use('/api/v1/i18n', i18nRoutes);
app.use('/api/v1/auth', authRoutes);

// --- Catch-all 404 Handler (after all routes) ---
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    requestId: req.id,
    path: req.originalUrl,
  });
});

// --- Global Error Handler ---
app.use((err, req, res, next) => {
  logWithLevel('error', `Request ${req.id} failed:`, err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    requestId: req.id,
  });
});

// --- Socket.io WebSocket server for real-time job progress updates ---
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });
const videoQueueEvents = new QueueEvents('video-processing', {
  connection: new IORedis(process.env.REDIS_URL || 'redis://localhost:6379'),
});
videoQueueEvents.on('progress', ({ jobId, data }) => { io.emit(`job-progress-${jobId}`, data); });
videoQueueEvents.on('completed', ({ jobId, returnvalue }) => { io.emit(`job-completed-${jobId}`, returnvalue); });
videoQueueEvents.on('failed', ({ jobId, failedReason }) => { io.emit(`job-failed-${jobId}`, failedReason); });

// --- Graceful Shutdown with In-Flight Request Draining ---
function setupGracefulShutdown(server) {
  let connections = new Set();
  server.on('connection', (conn) => {
    connections.add(conn);
    conn.on('close', () => connections.delete(conn));
  });
  const shutdown = async () => {
    logWithLevel('info', 'Received shutdown signal, closing server...');
    server.close(() => {
      logWithLevel('info', 'HTTP server closed');
      setTimeout(() => {
        logWithLevel('info', `Force closing ${connections.size} open connections`);
        for (const conn of connections) conn.destroy();
        process.exit(0);
      }, 5000);
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
setupGracefulShutdown(server);

// --- Advanced Startup Diagnostics and Banner ---
(async () => {
  try {
    logWithLevel('info', '==============================');
    logWithLevel('info', '   🚀 Starting NR1 Copilot...   ');
    logWithLevel('info', '==============================');
    await bootstrapServer({
      app,
      server,
      port,
      mongoUri: process.env.MONGO_URI,
      logWithLevel,
      checkDependencies,
      runtimeBanner: require('./utils/runtime').runtimeBanner,
      printDeprecationWarning: require('./utils/runtime').printDeprecationWarning,
    });
    logWithLevel('info', `🚀 Server bootstrap complete. Listening on port ${port}`);
  } catch (err) {
    logWithLevel('error', '❌ Fatal error during server bootstrap:', err);
    process.exit(1);
  }
})();
