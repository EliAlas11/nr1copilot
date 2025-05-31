// i18n API controller
const logger = require('../config/logger');

exports.languages = (req, res) => {
  res.json({ success: true, languages: ['en', 'es', 'fr', 'de', 'zh'] });
};
