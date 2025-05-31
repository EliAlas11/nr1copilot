// Video-related API controller
const Joi = require('joi');
const ytdl = require('ytdl-core');
const path = require('path');
const fs = require('fs');
const { extractVideoId } = require('../utils/extractVideoId');
const { errorResponse } = require('../utils/errorResponse');
const logger = require('../config/logger');
const videoQueue = require('../queue/videoQueue');

const MAX_DURATION_SEC = 1800;
const MIN_DURATION_SEC = 10;
const processedDir = path.join(__dirname, '../videos/processed');

// Validate YouTube URL and accessibility
exports.validate = async (req, res) => {
  const schema = Joi.object({ url: Joi.string().uri().required() });
  const { error, value } = schema.validate(req.body);
  if (error) {
    logger.warn('Invalid validation input');
    return errorResponse(res, 400, 'Invalid input.');
  }
  const { url } = value;
  logger.info('Validating URL:', url);
  const videoId = extractVideoId(url);
  if (!videoId) {
    return res.json({ success: true, isValid: false, videoId: null, error: 'Invalid YouTube URL format' });
  }
  let canAccess = false;
  let accessError = null;
  try {
    const testUrl = `https://www.youtube.com/watch?v=${videoId}`;
    let isValid = false;
    try { isValid = ytdl.validateURL(testUrl); } catch (e) { accessError = 'Invalid YouTube URL format'; }
    if (isValid) {
      try {
        await ytdl.getBasicInfo(testUrl);
        canAccess = true;
      } catch (basicInfoError) {
        accessError = basicInfoError.message || 'Video may not be accessible';
      }
    }
  } catch (testError) {
    accessError = testError.message || 'Unknown error';
  }
  res.json({ success: true, isValid: canAccess, videoId, canAccess, warning: accessError });
};

// Get video info
exports.info = async (req, res) => {
  const { videoId } = req.params;
  if (!videoId || videoId.length !== 11) {
    return errorResponse(res, 400, 'Invalid video ID format');
  }
  try {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    if (!ytdl.validateURL(url)) {
      return errorResponse(res, 400, 'Invalid YouTube URL');
    }
    const info = await ytdl.getInfo(url);
    const duration = parseInt(info.videoDetails.lengthSeconds) || 0;
    if (duration > MAX_DURATION_SEC) {
      return errorResponse(res, 400, `Video is too long. Maximum duration is ${MAX_DURATION_SEC / 60} minutes.`);
    }
    if (duration < MIN_DURATION_SEC) {
      return errorResponse(res, 400, `Video is too short. Minimum duration is ${MIN_DURATION_SEC} seconds.`);
    }
    res.json({
      success: true,
      title: info.videoDetails.title || 'Unknown Title',
      duration,
      description: info.videoDetails.description || '',
      thumbnails: info.videoDetails.thumbnails || [],
      viewCount: info.videoDetails.viewCount || '0',
      author: info.videoDetails.author?.name || 'Unknown Author',
    });
  } catch (error) {
    logger.error('Video info error:', error);
    return errorResponse(res, 500, error.message || 'Failed to get video information');
  }
};

// Queue video processing
exports.process = async (req, res) => {
  if (!videoQueue) {
    logger.error('Queue unavailable: Redis is not connected.');
    return errorResponse(res, 503, 'Queue unavailable: Redis is not connected.');
  }
  const schema = Joi.object({
    videoId: Joi.string().length(11).optional(),
    url: Joi.string().uri().optional(),
  });
  const { error, value } = schema.validate(req.body);
  if (error) {
    logger.warn('Invalid process input');
    return errorResponse(res, 400, error.message);
  }
  let videoId = value.videoId;
  const { url } = value;
  if (url && !videoId) {
    videoId = extractVideoId(url);
  }
  if (!videoId || typeof videoId !== 'string' || videoId.length !== 11) {
    logger.warn('Invalid YouTube URL or video ID');
    return errorResponse(res, 400, 'Valid YouTube URL or video ID is required');
  }
  try {
    const job = await videoQueue.add('process', { videoId, url });
    res.json({ success: true, jobId: job.id });
  } catch (error) {
    logger.error('Failed to queue video processing job:', error);
    return errorResponse(res, 500, 'Failed to queue video processing job');
  }
};

// Get job status
exports.job = async (req, res) => {
  if (!videoQueue) {
    logger.error('Queue unavailable: Redis is not connected.');
    return errorResponse(res, 503, 'Queue unavailable: Redis is not connected.');
  }
  try {
    const job = await videoQueue.getJob(req.params.jobId);
    if (!job) return errorResponse(res, 404, 'Job not found');
    const state = await job.getState();
    const progress = job._progress || 0;
    res.json({
      jobId: job.id,
      state,
      progress,
      result: job.returnvalue || null,
      failedReason: job.failedReason || null,
    });
  } catch (error) {
    logger.error('Failed to get job status:', error);
    return errorResponse(res, 500, 'Failed to get job status');
  }
};

// Serve processed video
exports.serve = (req, res) => {
  const { id } = req.params;
  const videoPath = path.join(processedDir, `${id}.mp4`);
  if (!fs.existsSync(videoPath)) {
    return errorResponse(res, 404, 'Video not found');
  }
  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;
  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    if (start >= fileSize || end >= fileSize) {
      return errorResponse(res, 416, 'Range not satisfiable');
    }
    const chunksize = end - start + 1;
    const file = fs.createReadStream(videoPath, { start, end });
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Content-Length': chunksize,
    });
    file.pipe(res);
  } else {
    res.writeHead(200, { 'Content-Length': fileSize });
    fs.createReadStream(videoPath).pipe(res);
  }
};

// Serve sample video
exports.sample = (req, res) => {
  const samplePath = path.join(processedDir, 'sample.mp4');
  if (fs.existsSync(samplePath)) {
    const stat = fs.statSync(samplePath);
    res.writeHead(200, {
      'Content-Length': stat.size,
      'Content-Type': 'video/mp4',
    });
    fs.createReadStream(samplePath).pipe(res);
  } else {
    errorResponse(res, 404, 'Sample video not available');
  }
};
