// Feedback routes
const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @route POST /feedback
 * @desc Submit feedback
 */
router.post('/', asyncHandler(feedbackController.submit));

module.exports = router;
