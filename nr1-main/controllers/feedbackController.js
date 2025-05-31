// Feedback API controller
const logger = require('../config/logger');
const { errorResponse } = require('../utils/errorResponse');
const asyncHandler = require('../utils/asyncHandler');
const feedbackService = require('../services/feedbackService');
const feedbackValidator = require('../validators/feedbackValidator');

exports.submit = asyncHandler(async (req, res) => {
  const { error, value } = feedbackValidator.submit.validate(req.body);
  if (error) {
    logger.warn('Invalid feedback input');
    return errorResponse(res, 400, 'Invalid feedback input.');
  }
  const result = await feedbackService.submitFeedback(value);
  res.json({ success: true, ...result });
});
