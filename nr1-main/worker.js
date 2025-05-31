// BullMQ worker for processing video jobs
const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const path = require('path');
const ytdl = require('ytdl-core');
const fs = require('fs');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Worker: NodeWorker } = require('worker_threads');

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
      // Download video
      const videoUrl = url || `https://www.youtube.com/watch?v=${videoId}`;
      downloadedPath = path.join(tempDir, `${videoId}_original.mp4`);
      if (!fs.existsSync(downloadedPath)) {
        await new Promise((resolve, reject) => {
          const stream = ytdl(videoUrl, {
            quality: 'highest',
            filter: 'audioandvideo',
          });
          const writeStream = fs.createWriteStream(downloadedPath);
          stream.pipe(writeStream);
          stream.on('end', resolve);
          stream.on('error', reject);
          writeStream.on('error', reject);
        });
      }
      // Process video (create viral clip)
      outputPath = path.join(processedDir, `${videoId}_${Date.now()}.mp4`);
      await processInWorker({
        inputPath: downloadedPath,
        outputPath,
        videoId,
        job,
      });
      // After processing, upload to S3
      const s3Key = `processed/${path.basename(outputPath)}`;
      const s3Url = await uploadToS3(outputPath, s3Key);
      return { status: 'done', output: outputPath, s3Url };
    } catch (err) {
      if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      throw err;
    }
  },
  { connection },
);

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});
worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});

// Top-level error handler
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  // TODO: Add alerting/monitoring here
});
process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
  // TODO: Add alerting/monitoring here
});

// TODO: Add retry logic for failed jobs
// TODO: Add monitoring/alerting hooks

module.exports = worker;
