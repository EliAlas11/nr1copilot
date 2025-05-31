// services/i18nService.js
const logger = require('../config/logger');

async function getLanguages() {
  // TODO: Replace with real i18n data source
  logger.info('Languages requested');
  return ['en', 'es', 'fr', 'de', 'zh'];
}

module.exports = { getLanguages };
