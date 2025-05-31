// Feedback routes
const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');

// Submit feedback
router.post('/', feedbackController.submit);

module.exports = router;
