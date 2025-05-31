// config/express.js
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const { staticDir, corsOrigins } = require('./config');
const logger = require('./logger');
const path = require('path');

function setupExpress(app) {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https:', 'blob:'],
        styleSrc: ["'self'", 'https:', 'blob:'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'wss:', 'https:'],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: { maxAge: 31536000, includeSubDomains: true },
  }));
  app.use(cors({
    origin: corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }));
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(express.static(path.join(__dirname, '..', staticDir)));
  if (process.env.NODE_ENV === 'production') {
    app.use(morgan('combined', { stream: require('fs').createWriteStream(path.join(__dirname, '..', 'server.log'), { flags: 'a' }) }));
  } else {
    app.use(morgan('dev'));
  }
}

module.exports = setupExpress;
