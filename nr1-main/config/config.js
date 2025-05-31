// config/config.js
// Required env vars: MONGODB_URI, REDIS_URL, JWT_SECRET, (production: AWS_S3_BUCKET, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, VIDEO_STORAGE_PATH, LOG_FILE_PATH)
require('dotenv').config();

const ENV = process.env.NODE_ENV || 'development';

module.exports = {
  env: ENV,
  port: process.env.PORT || 5000,
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  s3Bucket: process.env.AWS_S3_BUCKET,
  corsOrigins: ENV === 'production' ? [process.env.CORS_ORIGIN || 'https://yourdomain.com'] : '*',
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: ENV === 'production' ? 100 : 1000,
  },
  advancedRateLimit: {
    windowMs: 10 * 60 * 1000,
    max: ENV === 'production' ? 30 : 300,
  },
  staticDir: 'public',
  logFilePath: process.env.LOG_FILE_PATH,
  maxVideoDuration: 1800, // 30 min
  minVideoDuration: 10, // 10 sec
  videoStoragePath: process.env.VIDEO_STORAGE_PATH || '/opt/render/project/src/nr1-main/videos',
  requiredEnv: [
    // Add required env vars for production
    // 'REDIS_URL', 'AWS_S3_BUCKET', ...
  ],
};
