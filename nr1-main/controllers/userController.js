const asyncHandler = require('../utils/asyncHandler');
const userService = require('../services/userService');
const userValidator = require('../validators/userValidator');
const logger = require('../config/logger');
const { errorResponse } = require('../utils/errorResponse');

exports.signup = asyncHandler(async (req, res) => {
  const { error, value } = userValidator.signup.validate(req.body);
  if (error) {
    logger.warn('Invalid signup input');
    return errorResponse(res, 400, error.message);
  }
  try {
    const result = await userService.signup(value);
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    logger.warn('Signup failed:', err.message);
    return errorResponse(res, 400, err.message);
  }
});

exports.login = asyncHandler(async (req, res) => {
  const { error, value } = userValidator.login.validate(req.body);
  if (error) {
    logger.warn('Invalid login input');
    return errorResponse(res, 400, error.message);
  }
  try {
    const result = await userService.login(value);
    res.json({ success: true, ...result });
  } catch (err) {
    logger.warn('Login failed:', err.message);
    return errorResponse(res, 401, err.message);
  }
});

exports.me = asyncHandler(async (req, res) => {
  res.json({ success: true, ...(await userService.getMe(req.user)) });
});
