// Auth routes
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @route POST /auth/login
 * @desc User login
 */
router.post('/login', asyncHandler(authController.login));

/**
 * @route POST /auth/signup
 * @desc User signup
 */
router.post('/signup', asyncHandler(authController.signup));

module.exports = router;
