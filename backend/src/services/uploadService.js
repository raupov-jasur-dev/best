/**
 * Media upload service
 * Supports: ImgBB (images) and Cloudinary (images + video)
 *
 * Env:
 *   STORAGE_PROVIDER=imgbb | cloudinary   (default: auto)
 *   IMGBB_API_KEY=...
 *   CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET
 */

const cloudinary = require('../config/cloudinary');
const { Readable } = require('stream');

function getProvider() {
  const forced = (process.env.STORAGE_PROVIDER || '').toLowerCase();
  if (forced === 'imgbb' || forced === 'cloudinary') return forced;
  if (process.env.IMGBB_API_KEY) return 'imgbb';
  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) return 'cloudinary';
  return 'imgbb'; // prefer imgbb if neither fully set
}

// ---------- ImgBB ----------
async function uploadToImgBB(file) {
  const key = process.env.IMGBB_API_KEY;
  if (!key) {
    throw new Error('IMGBB_API_KEY is not set in environment variables');
  }
  if (!file || !file.buffer) {
    return null;
  }

  const base64 = file.buffer.toString('base64');
  const body = new URLSearchParams();
  body.append('key', key);
  body.append('image', base64);
  if (file.originalname) {
    body.append('name', file.originalname.replace(/\.[^.]+$/, ''));
  }

  const res = await fetch('https://api.imgbb.com/1/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });

  const json = await res.json();
  if (!json.success || !json.data) {
    const msg = json.error?.message || json.status_txt || 'ImgBB upload failed';
    throw new Error(msg);
  }

  return {
    url: json.data.display_url || json.data.url,
    publicId: json.data.delete_url || json.data.id || null,
    provider: 'imgbb'
  };
}

// ---------- Cloudinary ----------
function uploadBufferCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || 'bukhara-best',
        resource_type: options.resource_type || 'auto',
        ...options
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
  if (!file || !file.buffer) return null;
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

// ---------- Public API ----------
async function uploadImage(file, folder = 'bukhara-best/images') {
  if (!file) return null;
  const provider = getProvider();

  if (provider === 'imgbb') {
    return uploadToImgBB(file);
  }
  return uploadToCloudinary(file, 'image', folder);
}

async function uploadVideo(file, folder = 'bukhara-best/videos') {
  if (!file) return null;
  const provider = getProvider();

  // ImgBB does not support video — try Cloudinary if configured, else skip with clear error
  if (provider === 'imgbb') {
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
      return uploadToCloudinary(file, 'video', folder);
    }
    // Fallback: store nothing for video, or throw soft message
    console.warn('Video upload: ImgBB does not support video. Configure Cloudinary or skip video.');
    throw new Error(
      'Video yuklash ImgBB da ishlamaydi. Faqat rasm yuklang yoki Cloudinary sozlang.'
    );
  }
  return uploadToCloudinary(file, 'video', folder);
}

async function deleteMedia(publicId, resourceType = 'image') {
  if (!publicId) return;
  // ImgBB delete_url is a full URL — optional, often not critical
  if (String(publicId).startsWith('http') && String(publicId).includes('imgbb')) {
    try {
      await fetch(publicId);
    } catch (e) {
      console.error('ImgBB delete skip:', e.message);
    }
    return;
  }
  // Cloudinary
  try {
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    }
  } catch (e) {
    console.error('Cloudinary delete error:', e.message);
  }
}

module.exports = {
  uploadImage,
  uploadVideo,
  deleteMedia,
  getProvider
};
