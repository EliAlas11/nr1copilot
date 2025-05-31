// i18n routes
const express = require('express');
const router = express.Router();
const i18nController = require('../controllers/i18nController');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @route GET /i18n/languages
 * @desc Get supported languages
 */
router.get('/languages', asyncHandler(i18nController.languages));

module.exports = router;
