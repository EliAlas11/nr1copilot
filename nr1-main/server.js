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

// Set FFmpeg path with error handling
try {
  const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
  ffmpeg.setFfmpegPath(ffmpegPath);
  console.log("✅ FFmpeg configured successfully");
} catch {
  console.warn("⚠️ FFmpeg installer not found, using system FFmpeg");
  // Will use system FFmpeg if available
}

const app = express();
const port = process.env.PORT || 5000;

// Enhanced trust proxy configuration for Replit
app.set("trust proxy", ["loopback", "linklocal", "uniquelocal"]);

// CORS configuration
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);

// Security headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

// Use Helmet for additional security headers
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

// --- Swagger API Docs ---
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Fixed rate limiting for Replit environment
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // increased limit for development
  message: {
    error: "Too many requests from this IP, please try again later.",
    retryAfter: 15 * 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true,
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || "unknown";
  },
  skip: (req) => {
    return (
      req.path === "/health" ||
      req.path.startsWith("/api/videos/") ||
      req.method === "OPTIONS"
    );
  },
});

app.use("/api", limiter);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(compression());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Ensure directories exist
const videosDir = path.join(__dirname, "videos");
const processedDir = path.join(videosDir, "processed");
const tempDir = path.join(videosDir, "temp");

[videosDir, processedDir, tempDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Clean up old files
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
              if (!err) console.log(`🧹 Cleaned up old file: ${file}`);
            });
          }
        });
      });
    });
  });
}

setInterval(cleanupOldFiles, 30 * 60 * 1000);

// Log errors to a file in production
const logStream =
  process.env.NODE_ENV === "production"
    ? fs.createWriteStream(path.join(__dirname, "server.log"), { flags: "a" })
    : null;
if (logStream) {
  app.use(morgan("combined", { stream: logStream }));
}

// ENVIRONMENT VALIDATION
const requiredEnv = [
  // Add more as needed
  // 'AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_S3_BUCKET',
];
const missingEnv = requiredEnv.filter((k) => !process.env[k]);
if (missingEnv.length) {
  console.warn('⚠️ Missing required environment variables:', missingEnv.join(', '));
}

// REDIS/S3/FFMPEG HEALTH CHECKS
function checkDependencies() {
  const checks = {};
  // Redis
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
  // S3
  try {
    if (process.env.AWS_S3_BUCKET) {
      checks.s3 = 'configured';
    } else {
      checks.s3 = 'missing';
    }
  } catch (e) { checks.s3 = 'error'; }
  // FFmpeg
  try {
    ffmpeg.getAvailableFormats((err) => {
      checks.ffmpeg = err ? 'error' : 'ok';
    });
  } catch (e) { checks.ffmpeg = 'error'; }
  return checks;
}
app.get('/health/dependencies', async (req, res) => {
  res.json(checkDependencies());
});

// --- Utility: Async Route Wrapper ---
function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// --- Utility: Standard Error Response ---
function errorResponse(res, status, message) {
  return res.status(status).json({ success: false, error: message });
}

// --- Modularize Video ID Extraction ---
function extractVideoId(url) {
  try {
    if (!url || typeof url !== "string") return null;
    url = url.trim().replace(/\s+/g, "");
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
    logger.error("Video ID extraction error:", error.message);
    return null;
  }
}

// Enhanced video info retrieval with better error handling
async function getVideoInfo(videoId) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      console.log("⏰ Video info timeout for:", videoId);
      reject(new Error("Request timeout - video may be unavailable"));
    }, 30000);

    try {
      const url = `https://www.youtube.com/watch?v=${videoId}`;
      console.log("🔍 Getting video info for:", videoId, "URL:", url);

      if (
        !videoId ||
        videoId.length !== 11 ||
        !/^[a-zA-Z0-9_-]+$/.test(videoId)
      ) {
        clearTimeout(timeout);
        console.error("❌ Invalid video ID format:", videoId);
        reject(new Error("Invalid video ID format"));
        return;
      }

      // First validate the URL
      try {
        if (!ytdl.validateURL(url)) {
          clearTimeout(timeout);
          console.error("❌ Invalid YouTube URL:", url);
          reject(new Error("Invalid YouTube URL"));
          return;
        }
      } catch (validateError) {
        clearTimeout(timeout);
        console.error("❌ URL validation error:", validateError);
        reject(
          new Error("Failed to validate YouTube URL: " + validateError.message),
        );
        return;
      }

      console.log("✅ URL validation passed, getting info...");

      ytdl
        .getInfo(url, {
          requestOptions: {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Accept-Language": "en-US,en;q=0.9",
            },
          },
        })
        .then((info) => {
          clearTimeout(timeout);
          console.log("📄 Raw video info received");

          if (!info || !info.videoDetails) {
            console.error("❌ No video details in response");
            reject(new Error("Invalid video information received"));
            return;
          }

          const duration = parseInt(info.videoDetails.lengthSeconds) || 0;
          console.log("⏱️ Video duration:", duration, "seconds");

          if (duration > MAX_DURATION_SEC) {
            reject(
              new Error(
                `Video is too long. Maximum duration is ${MAX_DURATION_SEC / 60} minutes.`,
              ),
            );
            return;
          }

          if (duration < MIN_DURATION_SEC) {
            reject(
              new Error(
                `Video is too short. Minimum duration is ${MIN_DURATION_SEC} seconds.`,
              ),
            );
            return;
          }

          const result = {
            title: info.videoDetails.title || "Unknown Title",
            duration: duration,
            description: info.videoDetails.description || "",
            thumbnails: info.videoDetails.thumbnails || [],
            viewCount: info.videoDetails.viewCount || "0",
            author: info.videoDetails.author?.name || "Unknown Author",
          };

          console.log("✅ Video info retrieved successfully:", result.title);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeout);
          console.error("❌ ytdl.getInfo error:", error);

          let errorMessage = "Failed to get video information";

          // Handle both error objects and strings
          const errorString = error
            ? error.message || error.toString() || JSON.stringify(error)
            : "Unknown error";
          console.error("❌ Error details:", errorString);

          if (errorString) {
            if (
              errorString.includes("Video unavailable") ||
              errorString.includes("unavailable")
            ) {
              errorMessage = "Video is unavailable, private, or deleted";
            } else if (
              errorString.includes("Sign in") ||
              errorString.includes("age")
            ) {
              errorMessage = "Age-restricted video - cannot access";
            } else if (
              errorString.includes("This video is not available") ||
              errorString.includes("not available")
            ) {
              errorMessage = "Video is not available in this region";
            } else if (
              errorString.includes("Private video") ||
              errorString.includes("private")
            ) {
              errorMessage = "This is a private video";
            } else if (
              errorString.includes("429") ||
              errorString.includes("Too Many Requests")
            ) {
              errorMessage = "Too many requests - please try again later";
            } else if (
              errorString.includes("403") ||
              errorString.includes("Forbidden")
            ) {
              errorMessage = "Access forbidden - video may be restricted";
            } else if (
              errorString.includes("404") ||
              errorString.includes("Not Found")
            ) {
              errorMessage = "Video not found or URL is invalid";
            } else if (
              errorString.includes("network") ||
              errorString.includes("ENOTFOUND")
            ) {
              errorMessage = "Network error - please check your connection";
            } else {
              errorMessage = `Failed to access video: ${errorString}`;
            }
          } else {
            errorMessage =
              "Unknown error occurred while getting video information";
          }

          reject(new Error(errorMessage));
        });
    } catch (error) {
      clearTimeout(timeout);
      console.error("❌ Video info setup error:", error);
      reject(
        new Error(
          "Failed to initialize video info request: " +
            (error.message || "Unknown error"),
        ),
      );
    }
  });
}

// API Routes

// Enhanced validation endpoint
app.post("/api/validate", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: "URL is required",
      });
    }

    console.log("🔍 Validating URL:", url);

    const videoId = extractVideoId(url);

    if (!videoId) {
      return res.json({
        success: true,
        isValid: false,
        videoId: null,
        error: "Invalid YouTube URL format",
      });
    }

    // Test if video is accessible
    let canAccess = false;
    let accessError = null;

    try {
      const testUrl = `https://www.youtube.com/watch?v=${videoId}`;

      // First check URL validity
      let isValid = false;
      try {
        isValid = ytdl.validateURL(testUrl);
      } catch (validateError) {
        console.warn("⚠️ URL validation failed:", validateError);
        accessError = "Invalid YouTube URL format";
      }

      if (isValid) {
        try {
          await ytdl.getBasicInfo(testUrl, {
            requestOptions: {
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              },
            },
          });
          canAccess = true;
        } catch (basicInfoError) {
          console.warn("⚠️ Basic info fetch failed:", basicInfoError);
          if (basicInfoError && basicInfoError.message) {
            if (basicInfoError.message.includes("Video unavailable")) {
              accessError = "Video is unavailable, private, or deleted";
            } else if (basicInfoError.message.includes("Sign in")) {
              accessError = "Age-restricted video - cannot process";
            } else {
              accessError =
                "Video may not be accessible: " + basicInfoError.message;
            }
          } else {
            accessError = "Video may not be accessible (unknown error)";
          }
        }
      }
    } catch (testError) {
      console.warn("⚠️ Video access test failed:", testError);
      accessError =
        "Failed to test video accessibility: " +
        (testError.message || "Unknown error");
    }

    res.json({
      success: true,
      isValid: canAccess,
      videoId: videoId,
      canAccess,
      warning: accessError,
    });
  } catch (error) {
    console.error("❌ Validation error:", error);
    res.status(500).json({
      success: false,
      error: "Validation failed: " + (error.message || "Unknown error"),
    });
  }
});

// Video info endpoint
app.get("/api/info/:videoId", async (req, res) => {
  try {
    const { videoId } = req.params;

    if (!videoId || videoId.length !== 11) {
      return res.status(400).json({
        success: false,
        error: "Invalid video ID format",
      });
    }

    console.log("📄 Getting info for video ID:", videoId);
    const info = await getVideoInfo(videoId);

    res.json({
      success: true,
      ...info,
    });
  } catch (error) {
    console.error(
      "❌ Video info error for ID:",
      req.params.videoId,
      "Error:",
      error,
    );

    let statusCode = 500;
    let errorMessage = "Failed to get video information";

    if (error && error.message) {
      errorMessage = error.message;
      if (
        error.message.includes("unavailable") ||
        error.message.includes("private")
      ) {
        statusCode = 404;
      } else if (
        error.message.includes("too long") ||
        error.message.includes("too short")
      ) {
        statusCode = 400;
      } else if (error.message.includes("timeout")) {
        statusCode = 408;
      }
    } else {
      console.error("❌ Empty error object received");
      errorMessage = "Unknown error occurred while getting video information";
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
    });
  }
});

// Main processing endpoint (now queues job)
app.post("/api/process", async (req, res) => {
  try {
    if (!videoQueue) {
      logger.error('Queue unavailable: Redis is not connected.');
      return res.status(503).json({ success: false, error: 'Queue unavailable: Redis is not connected.' });
    }
    const schema = Joi.object({
      videoId: Joi.string().length(11).optional(),
      url: Joi.string().uri().optional(),
    });
    const { error, value } = schema.validate(req.body);
    if (error) {
      logger.warn(`Invalid input: ${error.message}`);
      return res.status(400).json({ success: false, error: error.message });
    }
    let videoId = value.videoId;
    const { url } = value;
    if (url && !videoId) {
      videoId = extractVideoId(url);
    }
    if (!videoId || typeof videoId !== 'string' || videoId.length !== 11) {
      logger.warn('Invalid YouTube URL or video ID');
      return res.status(400).json({
        success: false,
        error: "Valid YouTube URL or video ID is required",
      });
    }
    // Add job to BullMQ queue
    const job = await videoQueue.add("process", { videoId, url });
    res.json({ success: true, jobId: job.id });
  } catch (error) {
    logger.error(`Failed to queue video processing job: ${error.message}`);
    res
      .status(500)
      .json({ success: false, error: "Failed to queue video processing job" });
  }
});

// Job status endpoint
app.get("/api/job/:jobId", async (req, res) => {
  try {
    if (!videoQueue) {
      logger.error('Queue unavailable: Redis is not connected.');
      return res.status(503).json({ error: 'Queue unavailable: Redis is not connected.' });
    }
    const job = await videoQueue.getJob(req.params.jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });
    const state = await job.getState();
    const progress = job._progress || 0;
    res.json({
      jobId: job.id,
      state,
      progress,
      result: job.returnvalue || null,
      failedReason: job.failedReason || null,
    });
  } catch {
    res.status(500).json({ error: "Failed to get job status" });
  }
});

// Video serving endpoint
app.get("/api/videos/:id", (req, res) => {
  const { id } = req.params;
  const videoPath = path.join(processedDir, `${id}.mp4`);

  if (!fs.existsSync(videoPath)) {
    return res.status(404).json({
      error: "Video not found",
    });
  }

  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  res.setHeader("Content-Type", "video/mp4");
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Cache-Control", "public, max-age=3600");

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize || end >= fileSize) {
      return res.status(416).json({ error: "Range not satisfiable" });
    }

    const chunksize = end - start + 1;
    const file = fs.createReadStream(videoPath, { start, end });

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Content-Length": chunksize,
    });

    file.pipe(res);
  } else {
    res.writeHead(200, {
      "Content-Length": fileSize,
    });

    fs.createReadStream(videoPath).pipe(res);
  }
});

// Sample video endpoint
app.get("/api/videos/sample", (req, res) => {
  const samplePath = path.join(processedDir, "sample.mp4");

  if (fs.existsSync(samplePath)) {
    const stat = fs.statSync(samplePath);
    res.writeHead(200, {
      "Content-Length": stat.size,
      "Content-Type": "video/mp4",
    });
    fs.createReadStream(samplePath).pipe(res);
  } else {
    res.status(404).json({ error: "Sample video not available" });
  }
});

// Homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "Server is running properly",
    timestamp: new Date().toISOString(),
    port: port,
    environment: process.env.NODE_ENV || "development",
  });
});

// --- Professional API stubs for new features ---
const router = express.Router();

// User authentication (stub)
router.post('/api/auth/login', (req, res) => {
  // TODO: Implement real authentication
  res.json({ success: false, message: 'Login not implemented.' });
});
router.post('/api/auth/signup', (req, res) => {
  // TODO: Implement real signup
  res.json({ success: false, message: 'Signup not implemented.' });
});

// Analytics dashboard (stub)
router.get('/api/analytics', (req, res) => {
  // TODO: Return real analytics
  res.json({ success: true, data: { totalClips: 0, users: 0, downloads: 0 } });
});

// Feedback (stub)
router.post('/api/feedback', (req, res) => {
  // TODO: Save feedback
  res.json({ success: true, message: 'Feedback received (stub).' });
});

// Language/i18n (stub)
router.get('/api/languages', (req, res) => {
  res.json({ success: true, languages: ['en', 'es', 'fr', 'de', 'zh'] });
});

// Attach router to app
app.use(router);

// --- Professional improvements start ---

// 1. Define video duration limits (customize as needed)
const MAX_DURATION_SEC = 1800; // 30 minutes
const MIN_DURATION_SEC = 10;   // 10 seconds

// 2. Import videoQueue if not already
let videoQueue;
let redisConnectionHealthy = false;
try {
  const IORedis = require('ioredis');
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const redis = new IORedis(redisUrl);
  await redis.ping();
  redis.disconnect();
  videoQueue = require('./queue/videoQueue');
  redisConnectionHealthy = true;
  logger.info('✅ Redis connection established.');
} catch (err) {
  logger.error('❌ Failed to connect to Redis:', err.message);
  if (process.env.NODE_ENV === 'production') {
    logger.error('Redis is required in production. Exiting.');
    process.exit(1);
  } else {
    logger.warn('Redis unavailable. Queue features will be disabled.');
    videoQueue = null;
  }
}

// 3. Enforce required environment variables at startup
const requiredEnvVars = [
  // Add your required env vars here, e.g. 'REDIS_URL', 'AWS_S3_BUCKET'
];
const missingVars = requiredEnvVars.filter((k) => !process.env[k]);
if (missingVars.length) {
  logger.error(`Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

// 4. Restrict CORS in production
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.CORS_ORIGIN || 'https://yourdomain.com']
  : '*';
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
}));

// 5. Use winston logger everywhere (replace all console.log/warn/error)
function log(level, ...args) {
  logger.log(level, args.map(a => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' '));
}

// 6. Restrict static file serving to a public directory
app.use(express.static(path.join(__dirname, 'public')));

// 7. Fix error handler signature
app.use((err, req, res, next) => {
  logger.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 8. Add Joi validation to all input endpoints (example for feedback)
router.post('/api/feedback', (req, res) => {
  const schema = Joi.object({
    feedback: Joi.string().min(5).max(1000).required(),
    email: Joi.string().email().optional(),
  });
  const { error, value } = schema.validate(req.body);
  if (error) {
    logger.warn('Invalid feedback input');
    return res.status(400).json({ success: false, error: 'Invalid feedback input.' });
  }
  // TODO: Save feedback securely (do not log content)
  res.json({ success: true, message: 'Feedback received (stub).' });
});

// 9. Fix health check async logic
async function checkDependenciesAsync() {
  const checks = {};
  // Redis
  try {
    if (redisConnectionHealthy) {
      checks.redis = 'ok';
    } else {
      checks.redis = 'error';
    }
  } catch (e) { checks.redis = 'error'; }
  // S3
  try {
    checks.s3 = process.env.AWS_S3_BUCKET ? 'configured' : 'missing';
  } catch (e) { checks.s3 = 'error'; }
  // FFmpeg
  try {
    await new Promise((resolve, reject) => {
      ffmpeg.getAvailableFormats((err) => {
        if (err) reject(err); else resolve();
      });
    });
    checks.ffmpeg = 'ok';
  } catch (e) { checks.ffmpeg = 'error'; }
  return checks;
}
app.get('/health/dependencies', async (req, res) => {
  res.json(await checkDependenciesAsync());
});

// 10. Add SIGINT and uncaught exception handlers
process.on('SIGINT', () => {
  logger.info('🛑 SIGINT received, shutting down gracefully');
  cleanupOldFiles();
  process.exit(0);
});
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
  process.exit(1);
});
// --- Professional improvements end ---

// Centralized error handler
app.use((err, req, res, next) => {
  logger.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("🛑 SIGTERM received, shutting down gracefully");
  cleanupOldFiles();
  process.exit(0);
});

// Socket.io WebSocket server for real-time job progress updates
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// BullMQ job events
const videoQueueEvents = new QueueEvents("video-processing", {
  connection: new IORedis(process.env.REDIS_URL || "redis://localhost:6379"),
});

videoQueueEvents.on("progress", ({ jobId, data }) => {
  io.emit(`job-progress-${jobId}`, data);
});
videoQueueEvents.on("completed", ({ jobId, returnvalue }) => {
  io.emit(`job-completed-${jobId}`, returnvalue);
});
videoQueueEvents.on("failed", ({ jobId, failedReason }) => {
  io.emit(`job-failed-${jobId}`, failedReason);
});

// Advanced rate limiting and abuse detection
const advancedLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 30, // lower limit for sensitive endpoints
  message: {
    error: "Too many requests. Please slow down.",
  },
  keyGenerator: (req) => req.ip,
  skip: (req) => req.path === "/health" || req.method === "OPTIONS",
  handler: (req, res) => {
    // Log abuse attempts
    console.warn("Rate limit exceeded:", req.ip, req.originalUrl);
    res.status(429).json({ error: "Too many requests. Please slow down." });
  },
});
app.use("/api/process", advancedLimiter);

// Setup winston logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level}]: ${message}`)
  ),
  transports: [
    new winston.transports.Console(),
    ...(process.env.NODE_ENV === 'production' ? [new winston.transports.File({ filename: 'server.log' })] : [])
  ]
});

// --- Extended Health Endpoint ---
app.get('/health/extended', asyncHandler(async (req, res) => {
  const checks = await checkDependenciesAsync();
  const uptime = process.uptime();
  const memory = process.memoryUsage();
  let queueLength = null;
  if (videoQueue) {
    try {
      queueLength = await videoQueue.count();
    } catch {}
  }
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime,
    memory,
    queueLength,
    dependencies: checks,
  });
}));

// Start server
server.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
  cleanupOldFiles();
});
