// utils/health.js
const IORedis = require('ioredis');
const ffmpeg = require('fluent-ffmpeg');
const { redisUrl, s3Bucket } = require('../config/config');

async function checkDependencies(redisConnectionHealthy) {
  const checks = {};
  // Redis
  try {
    if (redisConnectionHealthy) {
      checks.redis = 'ok';
    } else {
      const redis = new IORedis(redisUrl);
      await redis.ping();
      redis.disconnect();
      checks.redis = 'ok';
    }
  } catch (e) { checks.redis = 'error'; }
  // S3
  try {
    checks.s3 = s3Bucket ? 'configured' : 'missing';
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

module.exports = { checkDependencies };
