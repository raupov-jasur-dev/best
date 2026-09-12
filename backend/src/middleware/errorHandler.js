function errorHandler(err, req, res, next) {
  console.error('[error]', err.message || err);
  if (err.stack && process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.errors?.map((e) => e.message) || []
    });
  }
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry',
      errors: err.errors?.map((e) => e.message) || []
    });
  }
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      success: false,
      message: 'Noto‘g‘ri kategoriya yoki bog‘liq ma’lumot'
    });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'Fayl juda katta (max 50MB)' });
  }
  if (err.message && /Only image|file type|ImgBB|IMGBB|Cloudinary|Video yuklash|sozlanmagan/i.test(err.message)) {
    return res.status(err.status || 400).json({ success: false, message: err.message });
  }

  const status = err.status || err.statusCode || 500;
  // Admin uchun xabar yashirmaymiz — aks holda "Internal server error" foydasiz
  const message =
    status >= 500
      ? (err.message || 'Internal server error')
      : (err.message || 'Request failed');

  res.status(status).json({
    success: false,
    message
  });
}

module.exports = errorHandler;
