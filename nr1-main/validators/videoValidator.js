// validators/videoValidator.js
const Joi = require('joi');

const validateUrl = Joi.object({ url: Joi.string().uri().required() });
const validateProcess = Joi.object({
  videoId: Joi.string().length(11).optional(),
  url: Joi.string().uri().optional(),
});

module.exports = {
  validateUrl,
  validateProcess,
};
