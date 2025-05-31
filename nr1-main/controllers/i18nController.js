// i18n API controller
const logger = require('../config/logger');
const asyncHandler = require('../utils/asyncHandler');
const i18nService = require('../services/i18nService');

exports.languages = asyncHandler(async (req, res) => {
  const languages = await i18nService.getLanguages();
  res.json({ success: true, languages });
});
