/**
 * Rasm yuklash:
 *  - freeimage  (tavsiya — Railway da ImgBB bloklangan bo‘lishi mumkin)
 *  - imgbb
 *  - cloudinary (video + rasm)
 *
 * Env:
 *   STORAGE_PROVIDER=freeimage | imgbb | cloudinary
 *   FREEIMAGE_API_KEY=...
 *   IMGBB_API_KEY=...
 *   CLOUDINARY_*
 */
const cloudinary = require('../config/cloudinary');
const { Readable } = require('stream');

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

function getProvider() {
  const forced = (process.env.STORAGE_PROVIDER || '').toLowerCase().trim();
  if (['freeimage', 'imgbb', 'cloudinary'].includes(forced)) return forced;
  if (process.env.FREEIMAGE_API_KEY) return 'freeimage';
  if (process.env.IMGBB_API_KEY) return 'imgbb';
  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) return 'cloudinary';
  return null;
}

function fail(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/** freeimage.host — ImgBB ga o‘xshash API */
async function uploadToFreeimage(file) {
  const key = process.env.FREEIMAGE_API_KEY;
  if (!key) throw fail('FREEIMAGE_API_KEY sozlanmagan. https://freeimage.host/page/api dan oling.');

  const base64 = file.buffer.toString('base64');
  const body = new URLSearchParams();
  body.set('key', key);
  body.set('action', 'upload');
  body.set('source', base64);
  body.set('format', 'json');

  const res = await fetch('https://freeimage.host/api/1/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': BROWSER_UA,
      Accept: 'application/json'
    },
    body: body.toString()
  });

  const json = await res.json().catch(() => ({}));
  // freeimage: status_code 200, success true, image.url
  const ok = json.status_code === 200 || json.success === true || json.status_txt === 'OK';
  const url =
    json?.image?.url ||
    json?.image?.display_url ||
    json?.data?.url ||
    json?.data?.display_url ||
    json?.url;

  if (!ok || !url) {
    const msg =
      json?.error?.message ||
      json?.status_txt ||
      json?.error?.context ||
      JSON.stringify(json).slice(0, 200) ||
      'Freeimage upload failed';
    throw fail('Freeimage: ' + msg);
  }

  return {
    url,
    publicId: json?.image?.url_viewer || json?.image?.name || null,
    provider: 'freeimage'
  };
}

/** ImgBB — ba’zi cloud IP larni bloklaydi */
async function uploadToImgBB(file) {
  const key = process.env.IMGBB_API_KEY;
  if (!key) throw fail('IMGBB_API_KEY sozlanmagan.');

  // Multipart + binary (base64 o‘rniga) — ba’zan yaxshiroq o‘tadi
  const form = new FormData();
  form.append('key', key);
  const blob = new Blob([file.buffer], { type: file.mimetype || 'image/jpeg' });
  form.append('image', blob, file.originalname || 'upload.jpg');

  const res = await fetch('https://api.imgbb.com/1/upload', {
    method: 'POST',
    headers: {
      'User-Agent': BROWSER_UA,
      Accept: 'application/json'
    },
    body: form
  });

  const json = await res.json().catch(() => ({}));
  if (!json.success || !json.data) {
    const msg = json?.error?.message || json?.status_txt || 'ImgBB upload failed';
    // Aniq yordam
    if (/forbidden/i.test(String(msg))) {
      throw fail(
        'ImgBB Railway serverini bloklagan. STORAGE_PROVIDER=freeimage qiling va FREEIMAGE_API_KEY qo‘ying (https://freeimage.host/page/api).'
      );
    }
    throw fail('ImgBB: ' + msg);
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
      return reject(fail('Cloudinary sozlanmagan'));
    }
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || 'bukhara-best',
        resource_type: options.resource_type || 'auto'
      },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    Readable.from(buffer).pipe(stream);
  });
}

async function uploadToCloudinary(file, resourceType = 'image') {
  if (!file?.buffer) return null;
  const result = await uploadBufferCloudinary(file.buffer, { resource_type: resourceType });
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
    throw fail(
      'Rasm storage sozlanmagan. Railway Variables:\n' +
        'STORAGE_PROVIDER=freeimage\n' +
        'FREEIMAGE_API_KEY=...'
    );
  }

  try {
    if (provider === 'freeimage') return await uploadToFreeimage(file);
    if (provider === 'imgbb') return await uploadToImgBB(file);
    return await uploadToCloudinary(file, 'image');
  } catch (e) {
    // ImgBB forbidden bo‘lsa — freeimage ga avtomatik fallback
    if (
      provider === 'imgbb' &&
      process.env.FREEIMAGE_API_KEY &&
      /forbidden|ImgBB/i.test(e.message || '')
    ) {
      console.warn('[upload] ImgBB failed, fallback to freeimage');
      return uploadToFreeimage(file);
    }
    throw e;
  }
}

async function uploadVideo(file) {
  if (!file) return null;
  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
    return uploadToCloudinary(file, 'video');
  }
  throw fail(
    'Video yuklash uchun Cloudinary kerak. Hozircha video maydonini bo‘sh qoldiring — faqat rasm bilan saqlang.'
  );
}

async function deleteMedia(publicId, resourceType = 'image') {
  if (!publicId || String(publicId).startsWith('http')) return;
  try {
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    }
  } catch (e) {
    console.error('deleteMedia:', e.message);
  }
}

module.exports = { uploadImage, uploadVideo, deleteMedia, getProvider };
