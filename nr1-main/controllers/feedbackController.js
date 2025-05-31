// Feedback API controller
const Joi = require('joi');
const logger = require('../config/logger');
const { errorResponse } = require('../utils/errorResponse');

exports.submit = (req, res) => {
  const schema = Joi.object({
    feedback: Joi.string().min(5).max(1000).required(),
    email: Joi.string().email().optional(),
  });
  const { error, value } = schema.validate(req.body);
  if (error) {
    logger.warn('Invalid feedback input');
    return errorResponse(res, 400, 'Invalid feedback input.');
  }
  // TODO: Save feedback securely (do not log content)
  res.json({ success: true, message: 'Feedback received.' });
};
