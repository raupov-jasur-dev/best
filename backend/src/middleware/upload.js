const multer = require('multer');

// Bound memory before controllers run, including spoofed oversized image uploads.
const storage = {
  _handleFile(req,file,cb){
    let size=0,failed=false,chunks=[];
    const limit=(file.fieldname==='video'?50:10)*1024*1024;
    file.stream.on('data',chunk=>{
      if(failed)return;
      size+=chunk.length;req.mediaBytes=(req.mediaBytes || 0)+chunk.length;
      if(size>limit || req.mediaBytes>100*1024*1024){
        failed=true;chunks=[];
        return cb(Object.assign(new Error('Fayl yoki umumiy yuklama hajmi katta.'),{status:400,code:'LIMIT_FILE_SIZE'}));
      }
      chunks.push(chunk);
    });
    file.stream.on('end',()=>{if(!failed)cb(null,{buffer:Buffer.concat(chunks),size});});
    file.stream.on('error',error=>{if(!failed){failed=true;chunks=[];cb(error);}});
  },
  _removeFile(req,file,cb){delete file.buffer;cb(null);}
};

const fileFilter = (req, file, cb) => {
  const allowedImages = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const allowedVideos = ['video/mp4', 'video/webm', 'video/quicktime'];
  const permitted = file.fieldname === 'video' ? allowedVideos : allowedImages;
  if (permitted.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const err = new Error('Rasm uchun JPEG, PNG, WebP, GIF; video uchun MP4, WebM yoki MOV tanlang.'); err.status = 400;
    cb(err, false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 7, fields: 15, parts: 22, fieldSize: 1024 * 1024
  }
});

module.exports = upload;
