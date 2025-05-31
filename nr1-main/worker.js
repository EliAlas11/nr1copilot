// BullMQ worker for processing video jobs
const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const path = require('path');
const fs = require('fs');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Worker: NodeWorker } = require('worker_threads');
const videoService = require('./services/videoService');
const logger = require('./config/logger');

// ENVIRONMENT VALIDATION
const requiredEnv = [
  // 'AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_S3_BUCKET',
];
const missingEnv = requiredEnv.filter((k) => !process.env[k]);
if (missingEnv.length) {
  console.warn('⚠️ Missing required environment variables:', missingEnv.join(', '));
}

// Harden Redis connection
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

const videosDir = path.join(__dirname, 'videos');
const processedDir = path.join(videosDir, 'processed');
const tempDir = path.join(videosDir, 'temp');

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: process.env.AWS_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined,
});
const S3_BUCKET = process.env.AWS_S3_BUCKET;

async function uploadToS3(filePath, key) {
  const fileStream = fs.createReadStream(filePath);
  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: fileStream,
      ContentType: 'video/mp4',
      ACL: 'public-read',
    }),
  );
  return `https://${S3_BUCKET}.s3.amazonaws.com/${key}`;
}

// Offload CPU-intensive video processing to a worker thread
function processInWorker(data) {
  return new Promise((resolve, reject) => {
    const worker = new NodeWorker(path.join(__dirname, 'videoWorkerThread.js'), {
      workerData: data,
    });
    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
    });
  });
}

const worker = new Worker(
  'video-processing',
  async (job) => {
    const { videoId, url } = job.data;
    let downloadedPath = null;
    let outputPath = null;
    try {
      // Delegate to videoService for all processing
      const result = await videoService.processVideoJob({ videoId, url, job });
      return result;
    } catch (err) {
      logger.error(`Job ${job.id} failed:`, err);
      if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      throw err;
    }
  },
  { connection },
);

worker.on('completed', (job) => {
  logger.info(`Job ${job.id} completed`);
  // Add audit logging/monitoring here
});
worker.on('failed', (job, err) => {
  logger.error(`Job ${job.id} failed:`, err);
  // Add alerting/monitoring here
});

process.on('uncaughtException', (err) => {
  logger.error('❌ Uncaught Exception:', err);
  // Add alerting/monitoring here
});
process.on('unhandledRejection', (reason) => {
  logger.error('❌ Unhandled Rejection:', reason);
  // Add alerting/monitoring here
});

// TODO: Add retry logic for failed jobs
// TODO: Add monitoring/alerting hooks

module.exports = worker;
