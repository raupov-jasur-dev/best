/**
 * Media upload — Catbox (asosiy), freeimage, imgbb, cloudinary
 *
 * Catbox: API kalit KERAK EMAS, rasm + video ishlaydi
 * https://catbox.moe/tools.php
 *
 * Env:
 *   STORAGE_PROVIDER=catbox | freeimage | imgbb | cloudinary
 *   CATBOX_USERHASH=   (ixtiyoriy — akkauntga bog‘lash)
 */
const cloudinary = require('../config/cloudinary');
const { Readable } = require('stream');

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

function getProvider() {
  const forced = (process.env.STORAGE_PROVIDER || '').toLowerCase().trim();
  if (['catbox', 'freeimage', 'imgbb', 'cloudinary'].includes(forced)) return forced;
  // Default: catbox (kalit kerak emas, Render/Railway da ishlaydi)
  if (process.env.FREEIMAGE_API_KEY) return 'freeimage';
  if (process.env.IMGBB_API_KEY) return 'imgbb';
  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) return 'cloudinary';
  return 'catbox';
}

function fail(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/**
 * Catbox.moe — anonymous yoki userhash bilan
 * Rasm va video (max ~200MB)
 */
async function uploadToCatbox(file) {
  if (!file?.buffer) return null;

  const form = new FormData();
  form.append('reqtype', 'fileupload');
  if (process.env.CATBOX_USERHASH) {
    form.append('userhash', process.env.CATBOX_USERHASH);
  }
  const blob = new Blob([file.buffer], {
    type: file.mimetype || 'application/octet-stream'
  });
  form.append('fileToUpload', blob, file.originalname || 'upload.bin');

  let res;
  try {
    res = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      headers: { 'User-Agent': BROWSER_UA },
      body: form
    });
  } catch (e) {
    throw fail('Catbox ulanish xatosi: ' + e.message, 502);
  }

  const text = (await res.text()).trim();
  // Muvaffaqiyat: https://files.catbox.moe/xxxxx.ext
  if (!res.ok || !/^https?:\/\//i.test(text)) {
    throw fail(
      'Catbox xato: ' + (text.slice(0, 200) || res.status) +
        '. Fayl hajmini tekshiring yoki keyinroq qayta urinib ko‘ring.'
    );
  }

  return {
    url: text,
    publicId: text,
    provider: 'catbox'
  };
}

async function uploadToFreeimage(file) {
  const key = process.env.FREEIMAGE_API_KEY;
  if (!key) throw fail('FREEIMAGE_API_KEY sozlanmagan');

  const body = new URLSearchParams();
  body.set('key', key);
  body.set('action', 'upload');
  body.set('source', file.buffer.toString('base64'));
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
  const url =
    json?.image?.url || json?.image?.display_url || json?.data?.url || json?.url;
  if (!url) {
    const msg = json?.error?.message || json?.status_txt || 'Freeimage failed';
    if (/forbidden/i.test(String(msg))) {
      throw fail('Freeimage bloklagan. STORAGE_PROVIDER=catbox qiling (kalit kerak emas).');
    }
    throw fail('Freeimage: ' + msg);
  }
  return { url, publicId: url, provider: 'freeimage' };
}

async function uploadToImgBB(file) {
  const key = process.env.IMGBB_API_KEY;
  if (!key) throw fail('IMGBB_API_KEY sozlanmagan');

  const form = new FormData();
  form.append('key', key);
  form.append(
    'image',
    new Blob([file.buffer], { type: file.mimetype || 'image/jpeg' }),
    file.originalname || 'upload.jpg'
  );

  const res = await fetch('https://api.imgbb.com/1/upload', {
    method: 'POST',
    headers: { 'User-Agent': BROWSER_UA, Accept: 'application/json' },
    body: form
  });
  const json = await res.json().catch(() => ({}));
  if (!json.success || !json.data) {
    const msg = json?.error?.message || json?.status_txt || 'ImgBB failed';
    if (/forbidden/i.test(String(msg))) {
      throw fail('ImgBB bloklagan. STORAGE_PROVIDER=catbox qiling.');
    }
    throw fail('ImgBB: ' + msg);
  }
  return {
    url: json.data.display_url || json.data.url,
    publicId: json.data.delete_url || json.data.id,
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

  try {
    if (provider === 'catbox') return await uploadToCatbox(file);
    if (provider === 'freeimage') return await uploadToFreeimage(file);
    if (provider === 'imgbb') return await uploadToImgBB(file);
    if (provider === 'cloudinary') return await uploadToCloudinary(file, 'image');
    return await uploadToCatbox(file);
  } catch (e) {
    // Bloklangan provayder → catbox fallback
    if (provider !== 'catbox' && /forbidden|blok/i.test(e.message || '')) {
      console.warn('[upload] fallback → catbox:', e.message);
      return uploadToCatbox(file);
    }
    throw e;
  }
}

async function uploadVideo(file) {
  if (!file) return null;
  const provider = getProvider();

  // Video: catbox yoki cloudinary
  if (provider === 'cloudinary' || (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && provider !== 'catbox')) {
    try {
      return await uploadToCloudinary(file, 'video');
    } catch (e) {
      console.warn('[upload] cloudinary video fail, try catbox');
    }
  }
  return uploadToCatbox(file);
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
