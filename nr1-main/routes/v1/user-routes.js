const express = require('express');
const userController = require('../../controllers/userController');
const auth = require('../../middleware/auth');
const asyncHandler = require('../../utils/asyncHandler');
const router = express.Router();

/**
 * @route POST /user/signup
 * @desc User signup
 */
router.post('/signup', asyncHandler(userController.signup));

/**
 * @route POST /user/login
 * @desc User login
 */
router.post('/login', asyncHandler(userController.login));

/**
 * @route GET /user/me
 * @desc Get current user info
 */
router.get('/me', auth, asyncHandler(userController.me));

module.exports = router;
