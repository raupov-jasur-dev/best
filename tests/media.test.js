const {test,beforeEach,afterEach}=require('node:test');
const assert=require('node:assert/strict');
const {Writable}=require('node:stream');
process.env.NODE_ENV='test';
const service=require('../backend/src/services/uploadService'),cloud=require('../backend/src/config/cloudinary');
const originalFetch=global.fetch,originalStream=cloud.uploader.upload_stream,originalChunked=cloud.uploader.upload_chunked_stream;
const keys=['STORAGE_PROVIDER','CLOUDINARY_CLOUD_NAME','CLOUDINARY_API_KEY','CLOUDINARY_API_SECRET','FREEIMAGE_API_KEY'];
const env=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
const image=()=>({buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aK1sAAAAASUVORK5CYII=','base64'),mimetype:'image/png',originalname:'test.png'});
const video=()=>({buffer:Buffer.from('000000206674797069736f6d0000020069736f6d69736f32617663316d703431','hex'),mimetype:'video/mp4',originalname:'test.mp4'});
beforeEach(()=>{process.env.STORAGE_PROVIDER='catbox';for(const k of keys.filter(k=>k!=='STORAGE_PROVIDER'))process.env[k]='';});
afterEach(()=>{global.fetch=originalFetch;cloud.uploader.upload_stream=originalStream;cloud.uploader.upload_chunked_stream=originalChunked;for(const k of keys){if(env[k]===undefined)delete process.env[k];else process.env[k]=env[k];}});
function delivery(file){return new Response(file.buffer,{status:206,headers:{'Content-Type':file.mimetype}});}
test('image and video URLs are returned only after bounded range delivery checks',async()=>{
 for(const [file,upload]of [[image(),service.uploadImage],[video(),service.uploadVideo]]){
  let posts=0,reads=0;global.fetch=async(url,o)=>{if(o.method==='POST'){posts++;return new Response('https://files.catbox.moe/test.bin');}reads++;assert.equal(o.headers.Range,'bytes=0-4095');assert.ok(o.signal);return delivery(file);};
  assert.equal((await upload(file)).provider,'catbox');assert.equal(posts,1);assert.equal(reads,1);
 }
});
test('provider success with inaccessible or HTML media never reports upload success',async()=>{
 for(const reply of [()=>new Response('no',{status:404}),()=>new Response('<html>provider error</html>',{headers:{'Content-Type':'text/html'}})]){
  let posts=0;global.fetch=async(url,o)=>o.method==='POST'?(posts++,new Response('https://files.catbox.moe/test.png')):reply();
  await assert.rejects(service.uploadImage(image()),{code:'MEDIA_DELIVERY_UNVERIFIED',status:502});assert.equal(posts,1);
 }
});
test('delivery validation blocks foreign/private hosts without fetching them',async()=>{
 let calls=0;global.fetch=async()=>{calls++;return new Response('https://127.0.0.1/private.png');};
 await assert.rejects(service.uploadImage(image()),{code:'MEDIA_DELIVERY_UNVERIFIED'});assert.equal(calls,1);
});
test('timeout is uncertain and does not blindly retry or switch providers',async()=>{
 let calls=0;global.fetch=async()=>{calls++;throw new DOMException('Timed out','TimeoutError');};
 await assert.rejects(service.uploadVideo(video()),{code:'MEDIA_UPLOAD_UNCERTAIN'});assert.equal(calls,1);
 global.fetch=async(url,o)=>o.method==='POST'?new Response('https://files.catbox.moe/recovered.mp4'):delivery(video());
 assert.equal((await service.uploadVideo(video())).url,'https://files.catbox.moe/recovered.mp4');
});
test('HTTP provider rejection overrides a misleading success URL',async()=>{
 process.env.STORAGE_PROVIDER='freeimage';process.env.FREEIMAGE_API_KEY='offline-key';global.fetch=async()=>new Response(JSON.stringify({image:{url:'https://iili.io/test.png'}}),{status:403});
 await assert.rejects(service.uploadImage(image()),{code:'MEDIA_PROVIDER_REJECTED',expose:true});
});
test('invalid, mismatched and oversized media is rejected before network calls',async()=>{
 global.fetch=async()=>{throw Error('Must not fetch');};
 for(const file of [{...image(),buffer:Buffer.from('<html>not media</html>')},{...image(),mimetype:'video/mp4'},{...image(),buffer:Buffer.alloc(10*1024*1024+1)}])await assert.rejects(service.uploadImage(file),{status:400});
 const large=Buffer.alloc(50*1024*1024+1);video().buffer.copy(large);await assert.rejects(service.uploadVideo({...video(),buffer:large}),{status:400});
});
test('Cloudinary requires the API secret and never falls back blindly',async()=>{
 process.env.STORAGE_PROVIDER='cloudinary';process.env.CLOUDINARY_CLOUD_NAME='offline';process.env.CLOUDINARY_API_KEY='offline';
 await assert.rejects(service.uploadVideo(video()),{code:'MEDIA_NOT_CONFIGURED'});
 process.env.CLOUDINARY_API_SECRET='offline';let calls=0;
 cloud.uploader.upload_stream=(o,cb)=>new Writable({write(c,e,next){next();},final(next){calls++;cb(Error('provider details must stay private'));next();}});
 global.fetch=async()=>{throw Error('Must not silently use Catbox');};
 await assert.rejects(service.uploadVideo(video()),{code:'MEDIA_UPLOAD_UNCERTAIN'});assert.equal(calls,1);
});
test('large Cloudinary videos use signed chunked streaming and browser-compatible MP4',async()=>{
 process.env.STORAGE_PROVIDER='cloudinary';for(const k of ['CLOUDINARY_CLOUD_NAME','CLOUDINARY_API_KEY','CLOUDINARY_API_SECRET'])process.env[k]='offline';
 let chunks=0;cloud.uploader.upload_chunked_stream=(options,callback)=>{assert.equal(options.resource_type,'video');assert.equal(options.chunk_size,6*1024*1024);assert.equal(options.format,'mp4');assert.equal(options.video_codec,'h264');return new Writable({write(c,e,next){chunks++;next();},final(next){callback(null,{secure_url:'https://res.cloudinary.com/offline/test.mp4',public_id:'offline/test'});next();}});};
 const buffer=Buffer.alloc(7*1024*1024);video().buffer.copy(buffer);global.fetch=async()=>delivery(video());
 assert.equal((await service.uploadVideo({...video(),buffer})).provider,'cloudinary');assert.ok(chunks);
});
test('confirmed image rejection can use an already configured Cloudinary account',async()=>{
 process.env.STORAGE_PROVIDER='freeimage';process.env.FREEIMAGE_API_KEY='offline';for(const k of ['CLOUDINARY_CLOUD_NAME','CLOUDINARY_API_KEY','CLOUDINARY_API_SECRET'])process.env[k]='offline';
 cloud.uploader.upload_stream=(options,callback)=>new Writable({write(c,e,next){next();},final(next){callback(null,{secure_url:'https://res.cloudinary.com/offline/image.png',public_id:'offline/image'});next();}});
 let posts=0;global.fetch=async(url,o)=>{if(o.method==='POST'){posts++;assert.equal(new URL(url).hostname,'freeimage.host');return new Response('{}',{status:403});}return delivery(image());};
 assert.equal((await service.uploadImage(image())).provider,'cloudinary');assert.equal(posts,1);
});
test('a 2xx response without a URL or a 5xx response never triggers a duplicate fallback',async()=>{
 process.env.STORAGE_PROVIDER='freeimage';process.env.FREEIMAGE_API_KEY='offline';for(const k of ['CLOUDINARY_CLOUD_NAME','CLOUDINARY_API_KEY','CLOUDINARY_API_SECRET'])process.env[k]='offline';
 cloud.uploader.upload_stream=()=>{throw Error('Must not fall back on uncertain delivery');};
 for(const status of [200,500]){let calls=0;global.fetch=async()=>{calls++;return new Response('{}',{status});};await assert.rejects(service.uploadImage(image()),{code:'MEDIA_UPLOAD_UNCERTAIN'});assert.equal(calls,1);}
});
