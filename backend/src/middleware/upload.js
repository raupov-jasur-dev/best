const multer = require('multer');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedImages = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const allowedVideos = ['video/mp4', 'video/webm', 'video/quicktime'];
  if (allowedImages.includes(file.mimetype) || allowedVideos.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image (jpeg, png, webp, gif) and video (mp4, webm) files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

module.exports = upload;
