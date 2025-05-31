// BullMQ queue setup for video processing
const IORedis = require('ioredis');

function createVideoQueue(connection) {
  const { Queue } = require('bullmq');
  const queue = new Queue('video-processing', { connection });
  // Add monitoring/alerting hooks here if needed
  return queue;
}

let connection;
try {
  connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');
  connection.on('error', (err) => {
    console.warn('⚠️ Redis connection error:', err.message);
  });
} catch (e) {
  console.error('❌ Failed to connect to Redis:', e.message);
  // TODO: Add fallback or degrade gracefully
}

const videoQueue = createVideoQueue(connection);

// TODO: Add retry logic for failed jobs
// TODO: Add monitoring/alerting hooks

module.exports = videoQueue;
module.exports.createVideoQueue = createVideoQueue;
