function errorHandler(err, req, res, next) {
  console.error(err);
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.errors.map(e => e.message)
    });
  }
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry',
      errors: err.errors.map(e => e.message)
    });
  }
  if (err.message && err.message.includes('Only image')) {
    return res.status(400).json({ success: false, message: err.message });
  }
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
}

module.exports = errorHandler;
