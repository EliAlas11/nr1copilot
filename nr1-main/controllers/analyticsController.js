// Analytics API controller
const logger = require('../config/logger');
const asyncHandler = require('../utils/asyncHandler');
const analyticsService = require('../services/analyticsService');

exports.dashboard = asyncHandler(async (req, res) => {
  const data = await analyticsService.getDashboard();
  res.json({ success: true, data });
});
