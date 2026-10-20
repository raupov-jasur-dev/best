function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  let status = err.status || err.statusCode || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'Request failed';
  if (err.name === 'SequelizeValidationError') { status = 400; code = 'VALIDATION_ERROR'; message = 'Maydon qiymatlarini tekshiring.'; }
  if (err.name === 'SequelizeUniqueConstraintError') { status = 409; code = 'CONFLICT'; message = 'Bu qiymat allaqachon mavjud.'; }
  if (err.name === 'SequelizeForeignKeyConstraintError') { status = 409; code = 'RELATED_RECORDS'; message = 'Bog‘liq yozuvlar mavjud. Kategoriyani tekshiring.'; }
  if (err.name === 'MulterError') { status = 400; code = err.code; message = err.code === 'LIMIT_FILE_SIZE' ? 'Fayl 50 MB dan oshmasligi kerak.' : 'Fayllar soni yoki maydonini tekshiring.'; }
  if (status >= 500 && !err.expose) message = 'Xizmat vaqtincha mavjud emas. Keyinroq qayta urinib ko‘ring.';
  if (status >= 500) console.error('[request-error]', err.name || 'Error', status);
  res.status(status).json({ success: false, code, message });
}
module.exports = errorHandler;
