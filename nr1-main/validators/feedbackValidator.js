// validators/feedbackValidator.js
const Joi = require('joi');

const submit = Joi.object({
  feedback: Joi.string().min(5).max(1000).required(),
  email: Joi.string().email().optional(),
});

module.exports = { submit };
