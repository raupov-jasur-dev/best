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
const { mediaUrl } = require('../utils/validation');
function validateFile(file, video = false) {
  const b = file?.buffer;
  if (!Buffer.isBuffer(b) || b.length < 12) throw fail('Fayl bo‘sh yoki yaroqsiz.');
  const signatures = {
    'image/jpeg': b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
    'image/png': b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),
    'image/gif': /^GIF8[79]a/.test(b.subarray(0,6).toString()),
    'image/webp': b.subarray(0,4).toString() === 'RIFF' && b.subarray(8,12).toString() === 'WEBP',
    'video/mp4': b.subarray(4,8).toString() === 'ftyp',
    'video/quicktime': ['ftyp','moov','mdat','wide'].includes(b.subarray(4,8).toString()),
    'video/webm': b.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]))
  };
  if (!signatures[file.mimetype] || video !== file.mimetype.startsWith('video/')) throw fail('Fayl tarkibi tanlangan turga mos emas.');
  if (b.length > (video ? 50 : 10) * 1024 * 1024) throw fail(video ? 'Video 50 MB dan katta.' : 'Rasm 10 MB dan katta.');
}

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

function getProvider() {
  const forced = (process.env.STORAGE_PROVIDER || '').toLowerCase().trim();
  if (['catbox', 'freeimage', 'imgbb', 'cloudinary'].includes(forced)) return forced;
  // Default: catbox (kalit kerak emas, Render/Railway da ishlaydi)
  if (process.env.FREEIMAGE_API_KEY) return 'freeimage';
  if (process.env.IMGBB_API_KEY) return 'imgbb';
  if (cloudinaryReady()) return 'cloudinary';
  return 'catbox';
}

function cloudinaryReady() { return !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET); }
function fail(message, status = 400, code = 'MEDIA_VALIDATION_ERROR') {
  const err = new Error(message);
  err.status = status;
  err.code = code; err.expose = true;
  return err;
}
function signalFor(signal, ms=45000) { return AbortSignal.any([AbortSignal.timeout(ms), ...(signal ? [signal] : [])]); }
function providerFailure(provider,status){
  const rejected=[400,401,403,413,415,422].includes(status);
  return fail(provider+' javobi tekshirilmadi (HTTP '+status+'). '+(rejected?'Provayder faylni rad etdi. Sozlamalarni tekshiring.':'Yuklash natijasi noaniq; avtomatik qayta yuborilmadi.'),502,rejected?'MEDIA_PROVIDER_REJECTED':'MEDIA_UPLOAD_UNCERTAIN');
}
async function providerFetch(url, options) {
  try { return await fetch(url, options); }
  catch { throw fail('Media provayderi javob bermadi. Yuklash natijasi noaniq; avtomatik qayta yuborilmadi. Qayta urinishdan oldin provayderni tekshiring.',502,'MEDIA_UPLOAD_UNCERTAIN'); }
}
async function verifyDelivery(upload, file, video, signal) {
  const hosts={catbox:['files.catbox.moe'],cloudinary:['res.cloudinary.com'],freeimage:['iili.io','freeimage.host'],imgbb:['i.ibb.co']};
  let url=mediaUrl(upload.url);
  try {
    for(let redirects=0;redirects<4;redirects++) {
      const u=new URL(url);if(!hosts[upload.provider]?.includes(u.hostname)||u.port)throw Error();
      const r=await fetch(url,{headers:{Range:'bytes=0-4095'},redirect:'manual',signal:signalFor(signal,12000)});
      if(r.status>=300&&r.status<400){await r.body?.cancel();url=mediaUrl(new URL(r.headers.get('location'),url).href);continue;}
      if(!r.ok||!r.body) {await r.body?.cancel();throw Error();}
      const reader=r.body.getReader();let bytes=Buffer.alloc(0);
      try {while(bytes.length<12){const part=await reader.read();if(part.done)break;bytes=Buffer.concat([bytes,Buffer.from(part.value).subarray(0,4096-bytes.length)]);}}
      finally{await reader.cancel();}
      const type=(r.headers.get('content-type')||'').split(';')[0].trim();
      if(type.startsWith(video?'image/':'video/'))throw Error();
      validateFile({buffer:bytes,mimetype:type.startsWith(video?'video/':'image/')?type:file.mimetype},video);
      return upload;
    }
  } catch {}
  throw fail('Fayl provayderga yuborildi, ammo media ochilishi tasdiqlanmadi. Maqola saqlanmadi; takroriy yuklashdan oldin provayder holatini tekshiring.',502,'MEDIA_DELIVERY_UNVERIFIED');
}

/**
 * Catbox.moe — anonymous yoki userhash bilan
 * Rasm va video (max ~200MB)
 */
async function uploadToCatbox(file, signal) {
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
    res = await providerFetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      signal: signalFor(signal),
      headers: { 'User-Agent': BROWSER_UA },
      body: form
    });
  } catch (e) {
    throw e;
  }

  let text;try{text=(await res.text()).trim();}catch{throw providerFailure('Catbox',res.status);}
  // Muvaffaqiyat: https://files.catbox.moe/xxxxx.ext
  if (!res.ok || !/^https?:\/\//i.test(text)) {
    throw providerFailure('Catbox',res.status);
  }

  return {
    url: mediaUrl(text),
    publicId: text,
    provider: 'catbox'
  };
}

async function uploadToFreeimage(file, signal) {
  const key = process.env.FREEIMAGE_API_KEY;
  if (!key) throw fail('Freeimage API key sozlanmagan.',503,'MEDIA_NOT_CONFIGURED');

  const body = new URLSearchParams();
  body.set('key', key);
  body.set('action', 'upload');
  body.set('source', file.buffer.toString('base64'));
  body.set('format', 'json');

  const res = await providerFetch('https://freeimage.host/api/1/upload', {
    method: 'POST',
    signal: signalFor(signal),
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
  if (!res.ok || !url) throw providerFailure('Freeimage',res.status);
  return { url: mediaUrl(url), publicId: url, provider: 'freeimage' };
}

async function uploadToImgBB(file, signal) {
  const key = process.env.IMGBB_API_KEY;
  if (!key) throw fail('ImgBB API key sozlanmagan.',503,'MEDIA_NOT_CONFIGURED');

  const form = new FormData();
  form.append('key', key);
  form.append(
    'image',
    new Blob([file.buffer], { type: file.mimetype || 'image/jpeg' }),
    file.originalname || 'upload.jpg'
  );

  const res = await providerFetch('https://api.imgbb.com/1/upload', {
    method: 'POST',
    signal: signalFor(signal),
    headers: { 'User-Agent': BROWSER_UA, Accept: 'application/json' },
    body: form
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success || !json.data) throw providerFailure('ImgBB',res.status);
  return {
    url: mediaUrl(json.data.display_url || json.data.url),
    publicId: json.data.id,
    provider: 'imgbb'
  };
}

function uploadBufferCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    if (!cloudinaryReady()) {
      return reject(fail('Cloudinary cloud name, API key va API secret sozlanmagan.',503,'MEDIA_NOT_CONFIGURED'));
    }
    const signal=signalFor(options.signal,90000);let stream,done=false;
    const finish=(error,result)=>{if(done)return;done=true;signal.removeEventListener('abort',abort);error?reject(error):resolve(result);};
    const abort=()=>{finish(fail('Cloudinary yuklash natijasi noaniq. Avtomatik qayta yuborilmadi.',502,'MEDIA_UPLOAD_UNCERTAIN'));stream?.destroy();};
    signal.addEventListener('abort',abort,{once:true});if(signal.aborted)return abort();
    const method=options.resource_type==='video'&&buffer.length>6*1024*1024?'upload_chunked_stream':'upload_stream';
    stream = cloudinary.uploader[method](
      {
        folder: options.folder || 'bukhara-best',
        resource_type: options.resource_type || 'auto', timeout:60000, chunk_size:6*1024*1024,
        ...(options.resource_type==='video'?{format:'mp4',video_codec:'h264',audio_codec:'aac'}:{})
      },
      (err, result) => {if(result?.done===false)return;finish(err?fail('Cloudinary faylni saqlamadi. Provayder sozlamasi yoki holatini tekshiring.',502,'MEDIA_UPLOAD_UNCERTAIN'):null,result);}
    );
    stream.on('error',()=>finish(fail('Cloudinary ulanishi uzildi. Avtomatik qayta yuborilmadi.',502,'MEDIA_UPLOAD_UNCERTAIN')));
    Readable.from(buffer).pipe(stream);
  });
}

async function uploadToCloudinary(file, resourceType = 'image', signal) {
  if (!file?.buffer) return null;
  const result = await uploadBufferCloudinary(file.buffer, { resource_type: resourceType, signal });
  if(!result?.secure_url||!result?.public_id)throw fail('Cloudinary media manzilini qaytarmadi.',502,'MEDIA_UPLOAD_UNCERTAIN');
  return {
    url: mediaUrl(result.secure_url),
    publicId: result.public_id,
    provider: 'cloudinary'
  };
}

async function uploadImage(file, signal) {
  if (!file) return null;
  validateFile(file);
  const provider = getProvider();

  try {
    const up=provider==='catbox'?await uploadToCatbox(file,signal):provider==='freeimage'?await uploadToFreeimage(file,signal):provider==='imgbb'?await uploadToImgBB(file,signal):await uploadToCloudinary(file,'image',signal);
    return await verifyDelivery(up,file,false,signal);
  } catch (e) {
    if (provider !== 'cloudinary' && e.code==='MEDIA_PROVIDER_REJECTED' && cloudinaryReady()) {
      return verifyDelivery(await uploadToCloudinary(file,'image',signal),file,false,signal);
    }
    console.warn('[media-upload]',provider,e.code||'MEDIA_ERROR');
    throw e;
  }
}

async function uploadVideo(file, signal) {
  if (!file) return null;
  validateFile(file, true);
  const provider = getProvider();

  // Video: catbox yoki cloudinary
  const up=provider==='cloudinary'||(cloudinaryReady()&&provider!=='catbox')?await uploadToCloudinary(file,'video',signal):await uploadToCatbox(file,signal);
  return verifyDelivery(up,file,true,signal);
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

module.exports = { uploadImage, uploadVideo, deleteMedia, getProvider, validateFile };
