// utils/asyncHandler.js
// Universal async error handler for Express routes
module.exports = function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
