// BullMQ queue setup for video processing
const { Queue } = require("bullmq");
const IORedis = require("ioredis");

let connection;
try {
  connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379");
  connection.on('error', (err) => {
    console.warn('⚠️ Redis connection error:', err.message);
  });
} catch (e) {
  console.error('❌ Failed to connect to Redis:', e.message);
  // TODO: Add fallback or degrade gracefully
}

const videoQueue = new Queue("video-processing", { connection });

// TODO: Add retry logic for failed jobs
// TODO: Add monitoring/alerting hooks

module.exports = videoQueue;
