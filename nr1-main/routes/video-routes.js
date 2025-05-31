const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');

/**
 * Route for validating YouTube URL
 * Example: POST /videos/validate { url }
 */
router.post('/validate', videoController.validate);

/**
 * Route for getting video information
 * Example: GET /videos/info/:videoId
 */
router.get('/info/:videoId', videoController.info);

/**
 * Route for submitting a video processing job
 * Example: POST /videos/process { videoId, url }
 */
router.post('/process', videoController.process);

/**
 * Route for checking job status
 * Example: GET /videos/job/:jobId
 */
router.get('/job/:jobId', videoController.checkJobStatus);

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
