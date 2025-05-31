// --- NR1 Copilot Professional Backend ---
// This file is auto-cleaned and maintained for best practices.
// Use app.js as the main entry point for new features and routes.
//
// For maintainers: All business logic, validation, and utilities are delegated to /controllers and /utils.
// Only import and attach modular routes and middleware here. All logging uses logWithLevel.

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
const { bootstrapServer } = require('./utils/bootstrap');

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

app.use(securityHeaders);
app.use(helmet(helmetConfig));
app.use(requestLogger);
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors(require('./config/express').corsConfig));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
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

// --- Pure Orchestrator Startup ---
(async () => {
  await bootstrapServer({
    app,
    server,
    port,
    mongoUri,
    logWithLevel,
    checkDependencies,
    runtimeBanner: require('./utils/runtime').runtimeBanner,
    printDeprecationWarning: require('./utils/runtime').printDeprecationWarning,
  });
})();
