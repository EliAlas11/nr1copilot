const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @route POST /videos/validate
 * @desc Validate YouTube URL
 */
router.post('/validate', asyncHandler(videoController.validate));

/**
 * @route GET /videos/info/:videoId
 * @desc Get video information
 */
router.get('/info/:videoId', asyncHandler(videoController.info));

/**
 * @route POST /videos/process
 * @desc Submit a video processing job
 */
router.post('/process', asyncHandler(videoController.process));

/**
 * @route GET /videos/job/:jobId
 * @desc Check job status
 */
router.get('/job/:jobId', asyncHandler(videoController.checkJobStatus));

/**
 * @route GET /videos/serve/:id
 * @desc Serve processed video
 */
router.get('/serve/:id', asyncHandler(videoController.serve));

/**
 * @route GET /videos/sample
 * @desc Serve sample video
 */
router.get('/sample', asyncHandler(videoController.sample));

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
