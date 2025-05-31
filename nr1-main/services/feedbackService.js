// services/feedbackService.js
const logger = require('../config/logger');

async function submitFeedback({ feedback, email }) {
  // TODO: Save feedback securely (e.g., to DB or external service)
  logger.info(`Feedback submitted${email ? ' by ' + email : ''}`);
  return { message: 'Feedback received.' };
}

module.exports = { submitFeedback };
