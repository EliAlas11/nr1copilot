// Video-related API controller
const Joi = require('joi');
const ytdl = require('ytdl-core');
const path = require('path');
const fs = require('fs');
const { extractVideoId } = require('../utils/extractVideoId');
const { errorResponse } = require('../utils/errorResponse');
const logger = require('../config/logger');
const videoQueue = require('../queue/videoQueue');
const asyncHandler = require('../utils/asyncHandler');
const videoService = require('../services/videoService');
const videoValidator = require('../validators/videoValidator');

const VIDEO_STORAGE_PATH = process.env.VIDEO_STORAGE_PATH || '/opt/render/project/src/nr1-main/videos';
const MAX_DURATION_SEC = 1800;
const MIN_DURATION_SEC = 10;
const processedDir = path.join(VIDEO_STORAGE_PATH, 'processed');
const tempDir = path.join(VIDEO_STORAGE_PATH, 'temp');

// Validate YouTube URL and accessibility
exports.validate = asyncHandler(async (req, res) => {
  const { error, value } = videoValidator.validateUrl.validate(req.body);
  if (error) {
    logger.warn('Invalid validation input');
    return errorResponse(res, 400, 'Invalid input.');
  }
  const result = await videoService.validateYouTubeUrl(value.url);
  res.json({ success: true, ...result });
});

// Get video info
exports.info = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId || videoId.length !== 11) {
    return errorResponse(res, 400, 'Invalid video ID format');
  }
  try {
    const info = await videoService.getVideoInfo(videoId);
    res.json({ success: true, ...info });
  } catch (error) {
    logger.error('Video info error:', error);
    return errorResponse(res, 500, error.message || 'Failed to get video information');
  }
});

// Queue video processing
exports.process = asyncHandler(async (req, res) => {
  const { error, value } = videoValidator.validateProcess.validate(req.body);
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
    const jobId = await videoService.queueVideoProcessing({ videoId, url });
    res.json({ success: true, jobId });
  } catch (error) {
    logger.error('Failed to queue video processing job:', error);
    return errorResponse(res, 500, 'Failed to queue video processing job');
  }
});

// Get job status
exports.checkJobStatus = asyncHandler(async (req, res) => {
  try {
    const status = await videoService.getJobStatus(req.params.jobId);
    res.json(status);
  } catch (error) {
    logger.error('Failed to get job status:', error);
    return errorResponse(res, 500, 'Failed to get job status');
  }
});

// Serve processed video
exports.serve = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const videoPath = videoService.getProcessedVideoPath(id);
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
});

// Serve sample video
exports.sample = asyncHandler(async (req, res) => {
  const samplePath = videoService.getSampleVideoPath();
  if (!fs.existsSync(samplePath)) {
    return errorResponse(res, 404, 'Sample video not found');
  }
  res.setHeader('Content-Type', 'video/mp4');
  fs.createReadStream(samplePath).pipe(res);
});
