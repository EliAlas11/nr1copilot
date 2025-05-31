// config/logger.js
const winston = require('winston');
const { env, logFile } = require('./config');

const logger = winston.createLogger({
  level: env === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console({ format: winston.format.simple() }),
    ...(env === 'production' ? [new winston.transports.File({ filename: logFile })] : []),
  ],
});

module.exports = logger;
