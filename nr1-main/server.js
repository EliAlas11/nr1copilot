// --- NR1 Copilot Professional Backend ---
// This file is auto-cleaned and maintained for best practices.
// Use app.js as the main entry point for new features and routes.
//
// For maintainers: All business logic, validation, and utilities are delegated to /controllers and /utils.
// Only import and attach modular routes and middleware here. All logging uses logWithLevel.

require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const winston = require('winston');
const http = require('http');
const { Server } = require('socket.io');
const IORedis = require('ioredis');
const { QueueEvents } = require('bullmq');
const morgan = require('morgan');
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const swaggerDocument = YAML.load(path.join(__dirname, 'swagger.yaml'));
const mongoose = require('mongoose');
// Modular route imports
const userRoutes = require('./routes/v1/user-routes');
const videoRoutes = require('./routes/video-routes');
const analyticsRoutes = require('./routes/analytics-routes');
const feedbackRoutes = require('./routes/feedback-routes');
const i18nRoutes = require('./routes/i18n-routes');
const authRoutes = require('./routes/auth-routes');
const { logWithLevel } = require('./utils/logger');
const { checkDependencies } = require('./utils/health');

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
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https:', 'blob:'],
      styleSrc: ["'self'", 'https:', 'blob:'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'wss:', 'https:'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: { maxAge: 31536000, includeSubDomains: true },
}));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests from this IP, please try again later.', retryAfter: 15 * 60 },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true,
  keyGenerator: (req) => req.ip || req.connection.remoteAddress || 'unknown',
  skip: (req) => req.path === '/health' || req.path.startsWith('/api/videos/') || req.method === 'OPTIONS',
});
// Remove generic /api limiter, use only advanced per-route limiters for best practice modularity
// app.use('/api', limiter); // Removed

// Add request logging for observability
app.use((req, res, next) => {
  logWithLevel('info', `[REQUEST]`, req.method, req.originalUrl, 'from', req.ip);
  next();
});
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());
app.use(express.static(path.join(__dirname, 'public')));
const logStream = process.env.NODE_ENV === 'production' ? fs.createWriteStream(path.join(__dirname, 'server.log'), { flags: 'a' }) : null;
if (logStream) app.use(morgan('combined', { stream: logStream }));

// Health check endpoints
app.get('/health/dependencies', async (req, res) => { res.json(checkDependencies()); });

// Attach modular routes
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/videos', videoRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/feedback', feedbackRoutes);
app.use('/api/v1/i18n', i18nRoutes);
app.use('/api/v1/auth', authRoutes);

// --- Socket.io WebSocket server for real-time job progress updates ---
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });
const videoQueueEvents = new QueueEvents('video-processing', {
  connection: new IORedis(process.env.REDIS_URL || 'redis://localhost:6379'),
});
videoQueueEvents.on('progress', ({ jobId, data }) => { io.emit(`job-progress-${jobId}`, data); });
videoQueueEvents.on('completed', ({ jobId, returnvalue }) => { io.emit(`job-completed-${jobId}`, returnvalue); });
videoQueueEvents.on('failed', ({ jobId, failedReason }) => { io.emit(`job-failed-${jobId}`, failedReason); });

// --- MongoDB connection ---
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/nr1main';
mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => logWithLevel('info', '✅ MongoDB connected'))
  .catch((err) => {
    logWithLevel('error', '❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
if (!process.env.JWT_SECRET) {
  logWithLevel('error', 'JWT_SECRET is required in environment');
  process.exit(1);
}

// --- Bootstrap and Diagnostics ---
const { bootstrapDiagnostics, gracefulShutdown } = require('./utils/bootstrap');

(async () => {
  await bootstrapDiagnostics({
    port,
    env: process.env.NODE_ENV,
    mongoUri,
    redisUrl: process.env.REDIS_URL,
    s3Bucket: process.env.AWS_S3_BUCKET,
    jwtSet: !!process.env.JWT_SECRET,
  });
  server.listen(port, () => {
    logWithLevel('info', `🚀 Server running on http://localhost:${port}`);
  });
})();

gracefulShutdown(server, mongoose, logWithLevel);

// Print deprecation warning at the end
setTimeout(() => {
  logWithLevel('warn', 'server.js is deprecated. Please use app.js as the main entry point for the new professional backend.');
}, 1000);
