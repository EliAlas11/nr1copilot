// Auth API controller
const Joi = require('joi');
const logger = require('../config/logger');
const { errorResponse } = require('../utils/errorResponse');
const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/authService');

exports.login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  res.json({ success: false, ...result });
});

exports.signup = asyncHandler(async (req, res) => {
  const result = await authService.signup(req.body);
  res.json({ success: false, ...result });
});
