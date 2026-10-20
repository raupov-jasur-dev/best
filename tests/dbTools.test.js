const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs'),path=require('path');
const {hash,fingerprint,verifyReceipt}=require('../scripts/dbTools');
let dir,file,receiptPath,receipt,previousDatabase;
before(()=>{
  const root=path.resolve('.qa');fs.mkdirSync(root,{recursive:true});
  dir=fs.mkdtempSync(path.join(root,'backup-test-'));
  if(path.dirname(dir)!==root)throw Error('Invalid temporary backup path');
  previousDatabase=process.env.DATABASE_URL;process.env.DATABASE_URL='postgresql://qa:qa@127.0.0.1:5432/isolated_receipt_test';
  file=path.join(dir,'isolated.dump');receiptPath=path.join(dir,'isolated.dump.json');
  fs.writeFileSync(file,'Isolated backup receipt fixture, no production records.');
  receipt={file,sha256:hash(file),databaseFingerprint:fingerprint(),createdAt:new Date().toISOString(),restoreVerified:true};
});
after(()=>{
  if(previousDatabase===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=previousDatabase;
  for(const target of [file,receiptPath])if(target && fs.existsSync(target))fs.unlinkSync(target);
  if(dir)fs.rmdirSync(dir);
});
function check(changes={}){fs.writeFileSync(receiptPath,JSON.stringify({...receipt,...changes}));return ()=>verifyReceipt(receiptPath);}
test('backup gate accepts a fresh verified receipt only for the matching source',()=>{
  assert.equal(check()().sha256,receipt.sha256);
  assert.throws(check({databaseFingerprint:'another-database'}));
  assert.throws(()=>verifyReceipt());
});
test('backup gate rejects invalid, missing, future and expired dates',()=>{
  for(const createdAt of [undefined,'invalid',new Date(Date.now()+300000).toISOString(),new Date(Date.now()-86401000).toISOString()])assert.throws(check({createdAt}));
});
test('backup gate requires a real restore verification boolean',()=>{
  for(const restoreVerified of [undefined,false,'false','true',1])assert.throws(check({restoreVerified}));
});
test('backup gate detects a changed dump checksum',()=>{
  const contents=fs.readFileSync(file);fs.appendFileSync(file,'changed');
  assert.throws(check());fs.writeFileSync(file,contents);assert.doesNotThrow(check());
});
