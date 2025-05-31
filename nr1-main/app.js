// app.js
// Main entry for the professional backend
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { port, env, redisUrl, requiredEnv } = require('./config/config');
const logger = require('./config/logger');
const setupExpress = require('./config/express');
const { checkDependencies } = require('./utils/health');
const asyncHandler = require('./utils/asyncHandler');
const errorResponse = require('./utils/errorResponse');
const extractVideoId = require('./utils/extractVideoId');
const Queue = require('bullmq').Queue;
const IORedis = require('ioredis');
const Joi = require('joi');
const path = require('path');
const helmet = require('helmet');

// Validate required env vars
const missingVars = requiredEnv.filter((k) => !process.env[k]);
if (missingVars.length) {
  logger.error(`Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

const app = express();
setupExpress(app);

// Hardened static file serving
app.use(
  helmet(),
  express.static(path.join(__dirname, 'public'), {
    index: 'index.html',
    setHeaders: (res, filePath) => {
      // Cache static assets for 1 year, but not HTML
      if (/\.(js|css|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|eot)$/.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else if (/\.html$/.test(filePath)) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
    extensions: ['html'],
    fallthrough: false, // Do not allow access outside public
  })
);

// Redis/Queue setup
let videoQueue;
let redisConnectionHealthy = false;
try {
  const redis = new IORedis(redisUrl);
  redis.ping().then(() => {
    redis.disconnect();
    videoQueue = new Queue('video-processing', { connection: new IORedis(redisUrl) });
    redisConnectionHealthy = true;
    logger.info('✅ Redis connection established.');
  }).catch((err) => {
    logger.error('❌ Failed to connect to Redis:', err.message);
    if (env === 'production') process.exit(1);
  });
} catch (err) {
  logger.error('❌ Redis setup error:', err.message);
  if (env === 'production') process.exit(1);
}

// Health endpoints
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: env,
    port,
  });
});
app.get('/health/dependencies', asyncHandler(async (req, res) => {
  res.json(await checkDependencies(redisConnectionHealthy));
}));

// API routes (to be modularized further)
app.use('/api/videos', videoRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api', i18nRoutes);

// Centralized error handler
app.use((err, req, res, next) => {
  logger.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

server.listen(port, () => {
  logger.info(`🚀 Server running on http://localhost:${port}`);
});
