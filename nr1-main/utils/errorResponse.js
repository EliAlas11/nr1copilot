// utils/errorResponse.js
module.exports = function errorResponse(res, status, message) {
  return res.status(status).json({ success: false, error: message });
};
