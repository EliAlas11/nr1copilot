// --- REQUIRED ENVIRONMENT VARIABLES FOR RENDER.COM DEPLOYMENT ---
// MONGODB_URI, REDIS_URL, JWT_SECRET
// (production: AWS_S3_BUCKET, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, VIDEO_STORAGE_PATH, LOG_FILE_PATH)
// Ensure all are set in the Render.com dashboard or .env file
// ----------------------------------------------------------------

// --- NR1 Copilot Professional Backend ---
// This file is auto-cleaned and maintained for best practices.
// Use app.js as the main entry point for new features and routes.
//
// For maintainers: All business logic, validation, and utilities are delegated to /controllers, /services, and /utils.
// Only import and attach modular routes and middleware here. All logging uses logWithLevel.

'use strict';
require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
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
  const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
  const ffmpegPath = ffmpegInstaller.path;
  ffmpeg.setFfmpegPath(ffmpegPath);
  logWithLevel('info', `✅ FFmpeg configured successfully. Path: ${ffmpegPath}`);
} catch (err) {
  logWithLevel('warn', '⚠️ FFmpeg installer not found, using system FFmpeg');
  try {
    const { execSync } = require('child_process');
    const sysPath = execSync('which ffmpeg').toString().trim();
    logWithLevel('info', `ℹ️ System FFmpeg path: ${sysPath}`);
  } catch (e) {
    logWithLevel('error', '❌ FFmpeg not found in system PATH. Video processing will fail.');
    process.exit(1);
  }
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

// --- Logging Stream: Use stdout/stderr by default, file logging only if LOG_TO_FILE=true and path is on persistent disk ---
let logStream = null;
if (process.env.LOG_TO_FILE === 'true' && process.env.LOG_FILE_PATH) {
  try {
    const logPath = process.env.LOG_FILE_PATH;
    logStream = fs.createWriteStream(logPath, { flags: 'a' });
    logWithLevel('info', `✅ File logging enabled at ${logPath}`);
  } catch (err) {
    logWithLevel('error', '❌ Failed to create log file stream:', err);
    logStream = null;
  }
}
if (logStream) {
  app.use(morgan('combined', { stream: logStream }));
} else {
  app.use(morgan('combined'));
  logWithLevel('info', 'ℹ️ Logging to stdout/stderr (Render.com best practice)');
}

// --- Request ID Middleware for Traceability ---
app.use((req, res, next) => {
  req.id = uuidv4();
  res.setHeader('X-Request-Id', req.id);
  next();
});

// --- Health check endpoints ---
app.get('/health/dependencies', async (req, res) => {
  let responded = false;
  const timeout = setTimeout(() => {
    if (!responded) {
      responded = true;
      res.status(500).json({ status: 'error', error: 'Dependency check timeout', requestId: req.id });
    }
  }, 3000); // 3s timeout for Render.com health check
  try {
    const health = await Promise.race([
      checkDependencies(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Dependency check timeout')), 2500)),
    ]);
    if (!responded) {
      clearTimeout(timeout);
      res.status(200).json({ status: 'ok', dependencies: health, requestId: req.id });
      responded = true;
    }
  } catch (e) {
    if (!responded) {
      clearTimeout(timeout);
      res.status(500).json({ status: 'error', error: e.message, requestId: req.id });
      responded = true;
    }
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

// --- Request Metrics ---
let totalRequests = 0;
let serverStartTime = Date.now();

// Count all incoming requests for metrics
app.use((req, res, next) => {
  totalRequests++;
  next();
});

// --- Utility: Timestamped Logging Wrapper ---
function logWithTimestamp(level, ...args) {
  const now = new Date().toISOString();
  logWithLevel(level, `[${now}]`, ...args);
}

// --- Graceful Shutdown with Metrics, Banner, and Timestamped Logs ---
function setupGracefulShutdown(server) {
  let connections = new Set();
  let shuttingDown = false;
  server.on('connection', (conn) => {
    connections.add(conn);
    conn.on('close', () => connections.delete(conn));
  });
  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    const uptime = ((Date.now() - serverStartTime) / 1000).toFixed(1);
    const shutdownStart = Date.now();
    logWithTimestamp('info', '==============================');
    logWithTimestamp('info', `   ⏻ Shutdown (${signal}) requested   `);
    logWithTimestamp('info', '==============================');
    logWithTimestamp('info', `Uptime: ${uptime}s | Total Requests: ${totalRequests}`);
    logWithTimestamp('info', `Active Connections: ${connections.size}`);
    server.close((err) => {
      if (err) {
        logWithTimestamp('error', 'Error closing HTTP server during shutdown:', err);
      } else {
        logWithTimestamp('info', 'HTTP server closed');
      }
      // Close Redis
      if (redisConnection) {
        redisConnection.quit().then(() => {
          logWithTimestamp('info', 'Redis connection closed');
        }).catch((e) => {
          logWithTimestamp('error', 'Error closing Redis connection:', e);
        });
      }
      // Close MongoDB
      try {
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState !== 0) {
          mongoose.connection.close().then(() => {
            logWithTimestamp('info', 'MongoDB connection closed');
          }).catch((e) => {
            logWithTimestamp('error', 'Error closing MongoDB connection:', e);
          });
        }
      } catch (e) {
        logWithTimestamp('warn', 'MongoDB not available for shutdown:', e.message);
      }
      setTimeout(() => {
        logWithTimestamp('info', `Force closing ${connections.size} open connections`);
        for (const conn of connections) conn.destroy();
        const shutdownTime = ((Date.now() - shutdownStart) / 1000).toFixed(2);
        logWithTimestamp('info', `Shutdown completed in ${shutdownTime}s`);
        logWithTimestamp('info', '==============================');
        logWithTimestamp('info', '   💡 NR1 Copilot stopped.         ');
        logWithTimestamp('info', '==============================');
        // Post-shutdown hook (for future: flush logs, notify, etc.)
        if (typeof global.onServerShutdown === 'function') {
          global.onServerShutdown();
        }
        process.exit(0);
      }, 5000);
    });
  };
  ['SIGTERM', 'SIGINT'].forEach((signal) => {
    process.once(signal, () => shutdown(signal));
  });
  process.once('uncaughtException', (err) => {
    logWithTimestamp('error', 'Uncaught Exception:', err);
    shutdown('uncaughtException');
  });
  process.once('unhandledRejection', (reason) => {
    logWithTimestamp('error', 'Unhandled Rejection:', reason);
    shutdown('unhandledRejection');
  });
}
setupGracefulShutdown(server);

// --- Utility: Colorized Banner (if chalk is available) ---
let color = (txt) => txt;
try {
  const chalk = require('chalk');
  color = (txt) => chalk.cyan(txt);
} catch {}

// --- Config Validation and Startup Summary Table ---
const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET',
  'REDIS_URL',
];
const missingVars = requiredEnvVars.filter((k) => !process.env[k]);
if (missingVars.length) {
  const warn = color ? chalk.yellow : (x) => x;
  logWithTimestamp('warn', warn(`⚠️  Missing required environment variables: ${missingVars.join(', ')}`));
}

// --- Robust Environment Variable Validation ---
function validateEnvVars(requiredVars) {
  const missing = requiredVars.filter((v) => !process.env[v]);
  if (missing.length) {
    logWithLevel('error', `❌ Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}
validateEnvVars([
  'MONGODB_URI',
  'REDIS_URL',
  'JWT_SECRET',
  // S3 required for production video storage
  ...(process.env.NODE_ENV === 'production' ? ['AWS_S3_BUCKET', 'AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'] : []),
  // VIDEO_STORAGE_PATH is optional, but warn if not set in production
]);
if (process.env.NODE_ENV === 'production' && !process.env.VIDEO_STORAGE_PATH) {
  logWithLevel('warn', '⚠️ VIDEO_STORAGE_PATH not set. Using default Render.com disk mount.');
}

function printConfigSummary() {
  const summary = [
    { Key: 'Node.js', Value: process.version },
    { Key: 'Platform', Value: process.platform },
    { Key: 'Environment', Value: process.env.NODE_ENV || 'development' },
    { Key: 'Port', Value: port },
    { Key: 'Mongo URI', Value: process.env.MONGODB_URI ? '[set]' : '[not set]' },
    { Key: 'Redis URL', Value: process.env.REDIS_URL ? '[set]' : '[not set]' },
    { Key: 'S3 Bucket', Value: process.env.AWS_S3_BUCKET ? '[set]' : '[not set]' },
    { Key: 'JWT Secret', Value: process.env.JWT_SECRET ? '[set]' : '[not set]' },
  ];
  const sep = color('-----------------------------');
  logWithTimestamp('info', sep);
  logWithTimestamp('info', color('--- Configuration Summary ---'));
  if (typeof console.table === 'function') {
    // Print as a table for beautiful output
    // eslint-disable-next-line no-console
    console.table(summary);
  } else {
    for (const { Key, Value } of summary) {
      logWithTimestamp('info', color(`${Key.padEnd(14)}: ${Value}`));
    }
  }
  logWithTimestamp('info', sep);
}

// --- Centralized Video Storage Path ---
const VIDEO_STORAGE_PATH = process.env.VIDEO_STORAGE_PATH || '/opt/render/project/src/nr1-main/videos';

// --- Ensure video directories exist and are writable ---
function ensureVideoDirs() {
  const videoDirs = [
    VIDEO_STORAGE_PATH,
    path.join(VIDEO_STORAGE_PATH, 'temp'),
    path.join(VIDEO_STORAGE_PATH, 'processed'),
  ];
  for (const dir of videoDirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    try {
      fs.accessSync(dir, fs.constants.W_OK);
    } catch (err) {
      throw new Error(`❌ Directory not writable: ${dir}`);
    }
  }
}
try {
  ensureVideoDirs();
  logWithLevel('info', `✅ Video directories exist and are writable at ${VIDEO_STORAGE_PATH}`);
} catch (err) {
  logWithLevel('error', err.message);
  process.exit(1);
}

// --- FFmpeg Path Validation ---
const { execSync } = require('child_process');
function validateFFmpeg() {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
    logWithLevel('info', '✅ FFmpeg is available in the container.');
  } catch (err) {
    logWithLevel('error', '❌ FFmpeg is not available in the container. Please ensure it is installed.');
    process.exit(1);
  }
}
validateFFmpeg();

// --- Robust Redis Connection Handling ---
let redisConnection;
try {
  redisConnection = new IORedis(process.env.REDIS_URL);
  redisConnection.on('error', (err) => {
    logWithLevel('error', `❌ Redis connection error: ${err.message}`);
  });
  redisConnection.on('connect', () => {
    logWithLevel('info', '✅ Redis connected');
  });
} catch (err) {
  logWithLevel('error', `❌ Failed to connect to Redis: ${err.message}`);
  process.exit(1);
}

// --- Advanced Startup Diagnostics and Banner ---
(async () => {
  const bootStart = Date.now();
  try {
    process.title = 'nr1copilot-backend';
    logWithTimestamp('info', color('=============================='));
    logWithTimestamp('info', color('   🚀 Starting NR1 Copilot...   '));
    logWithTimestamp('info', color('=============================='));
    printConfigSummary();
    await bootstrapServer({
      app,
      server,
      port,
      mongoUri: process.env.MONGODB_URI,
      logWithLevel: logWithTimestamp,
      checkDependencies,
      runtimeBanner: require('./utils/runtime').runtimeBanner,
      printDeprecationWarning: require('./utils/runtime').printDeprecationWarning,
    });
    const bootTime = ((Date.now() - bootStart) / 1000).toFixed(2);
    logWithTimestamp('info', color(`🚀 Server bootstrap complete. Listening on port ${port}`));
    logWithTimestamp('info', color(`Boot time: ${bootTime}s`));
  } catch (err) {
    logWithTimestamp('error', '❌ Fatal error during server bootstrap:', err);
    process.exit(1);
  }
})();
