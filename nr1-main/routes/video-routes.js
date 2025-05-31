const express = require("express");
const path = require("path");
const fs = require("fs");
const router = express.Router();
const videoQueue = require("../queue/videoQueue");
const winston = require('winston');
const Joi = require('joi');

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

/**
 * Route for getting video information
 * Returns the processed video file if available, otherwise a demo response.
 * Example: GET /videos/:id
 */
router.get("/videos/:id", (req, res) => {
  const { id } = req.params;
  logger.info(`Serving video: ${id}`);
  try {
    const videoPath = path.join(__dirname, "..", "videos", "processed", `${id}.mp4`);
    if (fs.existsSync(videoPath)) {
      res.sendFile(videoPath);
      notifyMonitoring('video_served', { id });
    } else {
      logger.warn(`Video not found: ${id}`);
      notifyMonitoring('video_not_found', { id });
      res.status(404).json({ error: "Video not found" });
    }
  } catch (err) {
    logger.error(`Error serving video ${id}: ${err.message}`);
    notifyMonitoring('video_serve_error', { id, error: err.message });
    res.status(500).json({ error: "Failed to serve video" });
  }
});

/**
 * Route for video processing status
 * Returns a status object for the requested video.
 * Example: GET /status/:id
 */
router.get("/status/:id", (req, res) => {
  const { id } = req.params;
  if (!id || typeof id !== 'string') {
    logger.warn('Invalid status id');
    notifyMonitoring('invalid_status_id', { id });
    return res.status(400).json({ error: 'Invalid id' });
  }
  res.json({
    id: id,
    status: "completed",
    progress: 100,
  });
  notifyMonitoring('status_checked', { id });
});

/**
 * Route for submitting a video processing job
 * Example: POST /videos/process { videoId, url }
 */
router.post("/videos/process", async (req, res) => {
  try {
    const schema = Joi.object({
      videoId: Joi.string().length(11).optional(),
      url: Joi.string().uri().optional(),
    });
    const { error, value } = schema.validate(req.body);
    if (error) {
      logger.warn(`Invalid input: ${error.message}`);
      notifyMonitoring('invalid_process_input', { error: error.message });
      return res.status(400).json({ error: error.message });
    }
    const { videoId, url } = value;
    if (!videoId && !url) {
      logger.warn('Missing videoId or url');
      notifyMonitoring('missing_process_params', {});
      return res.status(400).json({ error: "videoId or url is required" });
    }
    const job = await videoQueue.add("process", { videoId, url });
    logger.info(`Job queued: ${job.id}`);
    notifyMonitoring('job_queued', { jobId: job.id });
    res.json({ success: true, jobId: job.id });
  } catch (error) {
    logger.error(`Error adding job to queue: ${error.message}`);
    notifyMonitoring('job_queue_error', { error: error.message });
    res.status(500).json({ error: "Failed to queue video processing job" });
  }
});

/**
 * Route for checking job status
 * Example: GET /videos/job/:jobId
 */
router.get("/videos/job/:jobId", async (req, res) => {
  try {
    const { jobId } = req.params;
    if (!jobId) {
      logger.warn('Missing jobId');
      notifyMonitoring('missing_jobId', {});
      return res.status(400).json({ error: 'Missing jobId' });
    }
    const job = await videoQueue.getJob(jobId);
    if (!job) {
      logger.warn(`Job not found: ${jobId}`);
      notifyMonitoring('job_not_found', { jobId });
      return res.status(404).json({ error: "Job not found" });
    }
    const state = await job.getState();
    const progress = job._progress || 0;
    logger.info(`Job status: ${jobId} - ${state}`);
    notifyMonitoring('job_status_checked', { jobId, state });
    res.json({
      jobId: job.id,
      state,
      progress,
      result: job.returnvalue || null,
      failedReason: job.failedReason || null,
    });
  } catch (err) {
    logger.error(`Failed to get job status: ${err.message}`);
    notifyMonitoring('job_status_error', { error: err.message });
    res.status(500).json({ error: "Failed to get job status" });
  }
});

// Monitoring/alerting placeholder
function notifyMonitoring(event, details) {
  // Integrate with Datadog, Sentry, etc. in production
  logger.info(`[MONITOR] ${event}: ${JSON.stringify(details)}`);
}

// Advanced clip customization (stub)
router.post('/customize', (req, res) => {
  logger.info('Customize endpoint hit');
  notifyMonitoring('customize_stub', { body: req.body });
  // TODO: Implement real customization logic
  res.json({ success: false, message: 'Customization not implemented.' });
});

// Dashboard analytics (stub)
router.get('/dashboard', (req, res) => {
  logger.info('Dashboard endpoint hit');
  notifyMonitoring('dashboard_stub', {});
  // TODO: Return real dashboard data
  res.json({ success: true, data: { userStats: {}, clipStats: {} } });
});

// Export the router for use in the main server
module.exports = router;
