/**
 * ImgBB (rasm) + ixtiyoriy Cloudinary (video)
 */
const cloudinary = require('../config/cloudinary');
const { Readable } = require('stream');

function getProvider() {
  const forced = (process.env.STORAGE_PROVIDER || '').toLowerCase();
  if (forced === 'imgbb' || forced === 'cloudinary') return forced;
  if (process.env.IMGBB_API_KEY) return 'imgbb';
  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) return 'cloudinary';
  return null;
}

async function uploadToImgBB(file) {
  const key = process.env.IMGBB_API_KEY;
  if (!key) {
    const err = new Error('IMGBB_API_KEY sozlanmagan. Railway Variables ga qo‘ying.');
    err.status = 400;
    throw err;
  }
  if (!file?.buffer) return null;

  // 1) base64 usuli
  const base64 = file.buffer.toString('base64');
  const params = new URLSearchParams();
  params.set('key', key);
  params.set('image', base64);
  if (file.originalname) {
    params.set('name', String(file.originalname).replace(/\.[^.]+$/, '').slice(0, 80));
  }

  let res;
  try {
    res = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
  } catch (e) {
    const err = new Error('ImgBB ga ulanishda xato: ' + e.message);
    err.status = 502;
    throw err;
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success || !json.data) {
    const msg =
      json?.error?.message ||
      json?.status_txt ||
      json?.error ||
      `ImgBB xato (${res.status})`;
    const err = new Error(String(msg));
    err.status = 400;
    throw err;
  }

  return {
    url: json.data.display_url || json.data.url,
    publicId: json.data.delete_url || json.data.id || null,
    provider: 'imgbb'
  };
}

function uploadBufferCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
      const err = new Error('Cloudinary sozlanmagan');
      err.status = 400;
      return reject(err);
    }
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || 'bukhara-best',
        resource_type: options.resource_type || 'auto'
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
    Readable.from(buffer).pipe(stream);
  });
}

async function uploadToCloudinary(file, resourceType = 'image', folder = 'bukhara-best') {
  if (!file?.buffer) return null;
  const result = await uploadBufferCloudinary(file.buffer, {
    folder,
    resource_type: resourceType
  });
  return {
    url: result.secure_url,
    publicId: result.public_id,
    provider: 'cloudinary'
  };
}

async function uploadImage(file) {
  if (!file) return null;
  const provider = getProvider();
  if (!provider) {
    const err = new Error(
      'Rasm yuklash sozlanmagan. Railway ga IMGBB_API_KEY qo‘ying (STORAGE_PROVIDER=imgbb).'
    );
    err.status = 400;
    throw err;
  }
  if (provider === 'imgbb') return uploadToImgBB(file);
  return uploadToCloudinary(file, 'image');
}

async function uploadVideo(file) {
  if (!file) return null;
  // Video: Cloudinary bo'lsa undan, aks holda aniq xabar
  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
    return uploadToCloudinary(file, 'video');
  }
  const err = new Error(
    'Video yuklash uchun Cloudinary kerak. Hozircha faqat rasm yuklang yoki video maydonini bo‘sh qoldiring.'
  );
  err.status = 400;
  throw err;
}

async function deleteMedia(publicId, resourceType = 'image') {
  if (!publicId) return;
  if (String(publicId).startsWith('http')) return;
  try {
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    }
  } catch (e) {
    console.error('deleteMedia:', e.message);
  }
}

module.exports = { uploadImage, uploadVideo, deleteMedia, getProvider };
