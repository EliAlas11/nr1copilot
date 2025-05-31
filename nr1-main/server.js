// --- NR1 Copilot Professional Backend ---
// This file is auto-cleaned and maintained for best practices.
// Use app.js as the main entry point for new features and routes.
//
// For maintainers: Always use logWithLevel for logging, keep all security, audit, and modularization best practices.

require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const winston = require('winston');
const Joi = require('joi');
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
const userRoutes = require('./routes/v1/user-routes');

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
app.use('/api', limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());
app.use(express.static(path.join(__dirname, 'public')));
const videosDir = path.join(__dirname, 'videos');
const processedDir = path.join(videosDir, 'processed');
const tempDir = path.join(videosDir, 'temp');
[videosDir, processedDir, tempDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});
function cleanupOldFiles() {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  [processedDir, tempDir].forEach((dir) => {
    fs.readdir(dir, (err, files) => {
      if (err) return;
      files.forEach((file) => {
        const filePath = path.join(dir, file);
        fs.stat(filePath, (err, stats) => {
          if (err) return;
          if (now - stats.mtime.getTime() > oneHour) {
            fs.unlink(filePath, (err) => {
              if (!err) logWithLevel('info', `🧹 Cleaned up old file: ${file}`);
            });
          }
        });
      });
    });
  });
}
setInterval(cleanupOldFiles, 30 * 60 * 1000);
const logStream = process.env.NODE_ENV === 'production' ? fs.createWriteStream(path.join(__dirname, 'server.log'), { flags: 'a' }) : null;
if (logStream) app.use(morgan('combined', { stream: logStream }));
const requiredEnv = [];
const missingEnv = requiredEnv.filter((k) => !process.env[k]);
if (missingEnv.length) logWithLevel('warn', '⚠️ Missing required environment variables:', missingEnv.join(', '));
function checkDependencies() {
  const checks = {};
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const redis = new IORedis(redisUrl);
    checks.redis = 'connecting';
    redis.ping().then(() => {
      checks.redis = 'ok';
      redis.disconnect();
    }).catch(() => {
      checks.redis = 'unreachable';
      redis.disconnect();
    });
  } catch (e) { checks.redis = 'error'; }
  try {
    if (process.env.AWS_S3_BUCKET) checks.s3 = 'configured';
    else checks.s3 = 'missing';
  } catch (e) { checks.s3 = 'error'; }
  try {
    ffmpeg.getAvailableFormats((err) => { checks.ffmpeg = err ? 'error' : 'ok'; });
  } catch (e) { checks.ffmpeg = 'error'; }
  return checks;
}
app.get('/health/dependencies', async (req, res) => { res.json(checkDependencies()); });
function asyncHandler(fn) { return function (req, res, next) { Promise.resolve(fn(req, res, next)).catch(next); }; }
function errorResponse(res, status, message) { return res.status(status).json({ success: false, error: message }); }
function extractVideoId(url) {
  try {
    if (!url || typeof url !== 'string') return null;
    url = url.trim().replace(/\s+/g, '');
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
      /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
      /(?:m\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
      /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
      /[?&]v=([a-zA-Z0-9_-]{11})/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1] && match[1].length === 11) return match[1];
    }
    return null;
  } catch (error) {
    logWithLevel('error', 'Video ID extraction error:', error.message);
    return null;
  }
}
async function getVideoInfo(videoId) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      logWithLevel('info', '⏰ Video info timeout for:', videoId);
      reject(new Error('Request timeout - video may be unavailable'));
    }, 30000);
    try {
      const url = `https://www.youtube.com/watch?v=${videoId}`;
      logWithLevel('info', '🔍 Getting video info for:', videoId, 'URL:', url);
      if (!videoId || videoId.length !== 11 || !/^[a-zA-Z0-9_-]+$/.test(videoId)) {
        clearTimeout(timeout);
        logWithLevel('error', '❌ Invalid video ID format:', videoId);
        reject(new Error('Invalid video ID format'));
        return;
      }
      try {
        if (!ytdl.validateURL(url)) {
          clearTimeout(timeout);
          logWithLevel('error', '❌ Invalid YouTube URL:', url);
          reject(new Error('Invalid YouTube URL'));
          return;
        }
      } catch (validateError) {
        clearTimeout(timeout);
        logWithLevel('error', '❌ URL validation error:', validateError);
        reject(new Error('Failed to validate YouTube URL: ' + validateError.message));
        return;
      }
      logWithLevel('info', '✅ URL validation passed, getting info...');
      ytdl.getInfo(url, {
        requestOptions: {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        },
      })
        .then((info) => {
          clearTimeout(timeout);
          if (!info || !info.videoDetails) {
            logWithLevel('error', '❌ No video details in response');
            reject(new Error('Invalid video information received'));
            return;
          }
          const duration = parseInt(info.videoDetails.lengthSeconds) || 0;
          logWithLevel('info', '⏱️ Video duration:', duration, 'seconds');
          if (duration > 60 * 15) {
            reject(new Error('Video is too long. Maximum duration is 15 minutes.'));
            return;
          }
          if (duration < 10) {
            reject(new Error('Video is too short. Minimum duration is 10 seconds.'));
            return;
          }
          const result = {
            title: info.videoDetails.title || 'Unknown Title',
            duration: duration,
            description: info.videoDetails.description || '',
            thumbnails: info.videoDetails.thumbnails || [],
            viewCount: info.videoDetails.viewCount || '0',
            author: info.videoDetails.author?.name || 'Unknown Author',
          };
          logWithLevel('info', '✅ Video info retrieved successfully:', result.title);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeout);
          logWithLevel('error', '❌ ytdl.getInfo error:', error);
          let errorMessage = 'Failed to get video information';
          const errorString = error ? error.message || error.toString() || JSON.stringify(error) : 'Unknown error';
          logWithLevel('error', '❌ Error details:', errorString);
          if (errorString) {
            if (errorString.includes('Video unavailable') || errorString.includes('unavailable')) {
              errorMessage = 'Video is unavailable, private, or deleted';
            } else if (errorString.includes('Sign in') || errorString.includes('age')) {
              errorMessage = 'Age-restricted video - cannot access';
            } else if (errorString.includes('This video is not available') || errorString.includes('not available')) {
              errorMessage = 'Video is not available in this region';
            } else if (errorString.includes('Private video') || errorString.includes('private')) {
              errorMessage = 'This is a private video';
            } else if (errorString.includes('429') || errorString.includes('Too Many Requests')) {
              errorMessage = 'Too many requests - please try again later';
            } else if (errorString.includes('403') || errorString.includes('Forbidden')) {
              errorMessage = 'Access forbidden - video may be restricted';
            } else if (errorString.includes('404') || errorString.includes('Not Found')) {
              errorMessage = 'Video not found or URL is invalid';
            } else if (errorString.includes('network') || errorString.includes('ENOTFOUND')) {
              errorMessage = 'Network error - please check your connection';
            } else {
              errorMessage = `Failed to access video: ${errorString}`;
            }
          } else {
            errorMessage = 'Unknown error occurred while getting video information';
          }
          reject(new Error(errorMessage));
        });
    } catch (error) {
      clearTimeout(timeout);
      logWithLevel('error', '❌ Video info setup error:', error);
      reject(new Error('Failed to initialize video info request: ' + (error.message || 'Unknown error')));
    }
  });
}
// --- API and Route Attachments ---
// Use modular routes and controllers for all business logic.
app.use('/api/v1/user', userRoutes);
// ...add more modular routes as needed...
// --- Socket.io WebSocket server for real-time job progress updates ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});
const videoQueueEvents = new QueueEvents('video-processing', {
  connection: new IORedis(process.env.REDIS_URL || 'redis://localhost:6379'),
});
videoQueueEvents.on('progress', ({ jobId, data }) => { io.emit(`job-progress-${jobId}`, data); });
videoQueueEvents.on('completed', ({ jobId, returnvalue }) => { io.emit(`job-completed-${jobId}`, returnvalue); });
videoQueueEvents.on('failed', ({ jobId, failedReason }) => { io.emit(`job-failed-${jobId}`, failedReason); });
const advancedLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: (req, res) => (req.user ? 100 : 30),
  message: { error: 'Too many requests. Please slow down.' },
  keyGenerator: (req) => (req.user && req.user.id ? `user:${req.user.id}` : `ip:${req.ip}`),
  skip: (req) => req.path === '/health' || req.method === 'OPTIONS',
  handler: (req, res) => {
    logWithLevel('warn', 'Rate limit exceeded:', req.ip, req.originalUrl, req.user ? `user:${req.user.id}` : 'guest');
    res.status(429).json({ error: 'Too many requests. Please slow down.' });
  },
});
app.use(['/api/v1/videos/process', '/api/v1/feedback', '/api/v1/analytics', '/api/v1/user/login', '/api/v1/user/signup'], advancedLimiter);
function auditLog(action) {
  return (req, res, next) => {
    const user = req.user ? req.user.email : 'guest';
    logWithLevel('info', `[AUDIT]`, action, 'by', user, 'from', req.ip, 'at', new Date().toISOString());
    next();
  };
}
app.use('/api/v1/user/login', auditLog('login'));
app.use('/api/v1/user/signup', auditLog('signup'));
app.use('/api/v1/feedback', auditLog('feedback'));
app.use('/api/v1/analytics', auditLog('analytics'));
app.use('/api/v1/videos/process', auditLog('video_process'));
function logWithLevel(level, ...args) {
  const safeArgs = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : a));
  logger[level](safeArgs.join(' '));
}
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
server.listen(port, () => {
  logWithLevel('info', `🚀 Server running on http://localhost:${port}`);
  cleanupOldFiles();
});
logWithLevel('warn', 'server.js is deprecated. Please use app.js as the main entry point for the new professional backend.');
require('./app');
