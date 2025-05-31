const express = require('express');
const userController = require('../../controllers/userController');
const auth = require('../../middleware/auth');
const router = express.Router();

router.post('/signup', userController.signup);
router.post('/login', userController.login);
router.get('/me', auth, userController.me);

module.exports = router;
