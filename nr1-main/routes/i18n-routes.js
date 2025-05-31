// i18n routes
const express = require('express');
const router = express.Router();
const i18nController = require('../controllers/i18nController');

router.get('/languages', i18nController.languages);

module.exports = router;
