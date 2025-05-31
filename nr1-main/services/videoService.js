// services/videoService.js
// All business logic for video operations
const ytdl = require('ytdl-core');
const path = require('path');
const fs = require('fs');
const { extractVideoId } = require('../utils/extractVideoId');
const logger = require('../config/logger');
const videoQueue = require('../queue/videoQueue');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Worker: NodeWorker } = require('worker_threads');

const MAX_DURATION_SEC = 1800;
const MIN_DURATION_SEC = 10;
const VIDEO_STORAGE_PATH = process.env.VIDEO_STORAGE_PATH || '/opt/render/project/src/nr1-main/videos';
const processedDir = path.join(VIDEO_STORAGE_PATH, 'processed');
const tempDir = path.join(VIDEO_STORAGE_PATH, 'temp');
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

async function validateYouTubeUrl(url) {
  const videoId = extractVideoId(url);
  if (!videoId) return { isValid: false, videoId: null, canAccess: false, warning: 'Invalid YouTube URL format' };
  let canAccess = false;
  let accessError = null;
  try {
    const testUrl = `https://www.youtube.com/watch?v=${videoId}`;
    let isValid = false;
    try { isValid = ytdl.validateURL(testUrl); } catch (e) { accessError = 'Invalid YouTube URL format'; }
    if (isValid) {
      try { await ytdl.getBasicInfo(testUrl); canAccess = true; } catch (basicInfoError) { accessError = basicInfoError.message || 'Video may not be accessible'; }
    }
  } catch (testError) { accessError = testError.message || 'Unknown error'; }
  return { isValid: canAccess, videoId, canAccess, warning: accessError };
}

async function getVideoInfo(videoId) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  if (!ytdl.validateURL(url)) throw new Error('Invalid YouTube URL');
  const info = await ytdl.getInfo(url);
  const duration = parseInt(info.videoDetails.lengthSeconds) || 0;
  if (duration > MAX_DURATION_SEC) throw new Error(`Video is too long. Maximum duration is ${MAX_DURATION_SEC / 60} minutes.`);
  if (duration < MIN_DURATION_SEC) throw new Error(`Video is too short. Minimum duration is ${MIN_DURATION_SEC} seconds.`);
  return {
    title: info.videoDetails.title || 'Unknown Title',
    duration,
    description: info.videoDetails.description || '',
    thumbnails: info.videoDetails.thumbnails || [],
    viewCount: info.videoDetails.viewCount || '0',
    author: info.videoDetails.author?.name || 'Unknown Author',
  };
}

async function queueVideoProcessing({ videoId, url }) {
  if (!videoQueue) throw new Error('Queue unavailable: Redis is not connected.');
  const job = await videoQueue.add('process', { videoId, url });
  return job.id;
}

async function getJobStatus(jobId) {
  if (!videoQueue) throw new Error('Queue unavailable: Redis is not connected.');
  const job = await videoQueue.getJob(jobId);
  if (!job) throw new Error('Job not found');
  const state = await job.getState();
  const progress = job._progress || 0;
  return {
    jobId: job.id,
    state,
    progress,
    result: job.returnvalue || null,
    failedReason: job.failedReason || null,
  };
}

function getProcessedVideoPath(id) {
  return path.join(processedDir, `${id}.mp4`);
}

function getSampleVideoPath() {
  return path.join(processedDir, 'sample.mp4');
}

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

function processInWorker(data) {
  return new Promise((resolve, reject) => {
    const worker = new NodeWorker(path.join(__dirname, '../videoWorkerThread.js'), {
      workerData: data,
    });
    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
    });
  });
}

async function processVideoJob({ videoId, url, job }) {
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
      jobId: job?.id,
    });
    // Upload to S3 if configured
    let s3Url = null;
    if (S3_BUCKET) {
      const s3Key = `processed/${path.basename(outputPath)}`;
      s3Url = await uploadToS3(outputPath, s3Key);
    }
    return { status: 'done', output: outputPath, s3Url };
  } catch (err) {
    if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    throw err;
  }
}

module.exports = {
  validateYouTubeUrl,
  getVideoInfo,
  queueVideoProcessing,
  getJobStatus,
  getProcessedVideoPath,
  getSampleVideoPath,
  processVideoJob,
};
