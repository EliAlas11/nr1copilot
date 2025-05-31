// Analytics routes
const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @route GET /analytics
 * @desc Get analytics dashboard
 */
router.get('/', asyncHandler(analyticsController.dashboard));

module.exports = router;
