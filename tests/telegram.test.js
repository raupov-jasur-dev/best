const {test,after}=require('node:test');
const assert=require('node:assert/strict');
process.env.NODE_ENV='test';process.env.TELEGRAM_DRY_RUN='false';
process.env.TELEGRAM_BOT_TOKEN='isolated-test-token';process.env.TELEGRAM_CHANNEL_ID='isolated-test-channel';
const {sendToTelegram}=require('../backend/src/services/telegramService');
const originalFetch=global.fetch;
after(()=>{global.fetch=originalFetch;});
const news={id:999,title:'Sinov: video',status:'published',video:'https://files.catbox.moe/test.mp4'};
test('Telegram uses multipart after an explicit URL size rejection',async()=>{
  let calls=0;
  global.fetch=async(url,options)=>{
    calls++;
    if(calls===1){assert.match(url,/api.telegram.org/);return new Response(JSON.stringify({ok:false,description:'Bad Request: file is too big'}),{status:400});}
    if(calls===2){assert.equal(url,news.video);return new Response(Buffer.from([0,0,0,20,102,116,121,112,109,112,52,50,0,0,0,0]),{status:200,headers:{'Content-Type':'video/mp4'}});}
    assert.match(url,/sendVideo$/);assert(options.body instanceof FormData);assert.equal(options.body.get('supports_streaming'),'true');assert.equal(options.body.get('video').type,'video/mp4');
    return new Response(JSON.stringify({ok:true,result:{message_id:999}}),{status:200});
  };
  const result=await sendToTelegram(news);assert.equal(result.status,'published');assert.equal(calls,3);global.fetch=originalFetch;
});
test('Telegram never blindly retries an ambiguous timeout',async()=>{
  let calls=0;global.fetch=async()=>{calls++;throw Error('Simulated timeout');};
  const result=await sendToTelegram(news);assert.equal(result.status,'failed');assert.equal(result.uncertain,true);assert.equal(calls,1);global.fetch=originalFetch;
});
test('Telegram fallback refuses unapproved media hosts',async()=>{
  let calls=0;global.fetch=async(url)=>{calls++;assert.match(url,/api.telegram.org/);return new Response(JSON.stringify({ok:false,description:'Bad Request: failed to get HTTP URL content'}),{status:400});};
  const result=await sendToTelegram({...news,video:'https://127.0.0.1/private.mp4'});assert.equal(result.status,'failed');assert.equal(result.uncertain,false);assert.equal(calls,1);global.fetch=originalFetch;
});
test('draft channel publishing always skips the network',async()=>{
  global.fetch=async()=>{throw Error('Draft must not call any service');};
  const result=await sendToTelegram({...news,status:'draft'});assert.equal(result.status,'skipped');global.fetch=originalFetch;
});
