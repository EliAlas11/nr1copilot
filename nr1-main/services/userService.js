// services/userService.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

function signToken(user) {
  return jwt.sign({ id: user._id, email: user.email, roles: user.roles }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

async function signup({ email, password }) {
  if (!email || !password) throw new Error('Email and password required');
  const existing = await User.findOne({ email });
  if (existing) throw new Error('Email already registered');
  const user = await User.create({ email, password });
  const token = signToken(user);
  logger.info(`User signup: ${email}`);
  return { token };
}

async function login({ email, password }) {
  if (!email || !password) throw new Error('Email and password required');
  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password))) throw new Error('Invalid credentials');
  user.lastLogin = new Date();
  await user.save();
  const token = signToken(user);
  logger.info(`User login: ${email}`);
  return { token };
}

async function getMe(user) {
  return { user };
}

module.exports = { signup, login, getMe };
