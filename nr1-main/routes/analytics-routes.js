// Analytics routes
const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

router.get('/', analyticsController.dashboard);

module.exports = router;
