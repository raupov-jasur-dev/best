const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
for(const mode of ['prefer','require','verify-ca'])test('production '+mode+' preserves credentials and explicitly verifies TLS',()=>{
  const script="const assert=require('node:assert/strict');const db=require('./backend/src/config/database');assert.equal(db.config.username,'editor');assert.equal(db.config.password,'p@ss:word');assert.equal(db.config.database,'content');assert.equal(typeof db.config.dialectOptions.ssl,'object');assert.notEqual(db.config.dialectOptions.ssl.rejectUnauthorized,false);db.close();";
  const result=spawnSync(process.execPath,['-e',script],{encoding:'utf8',env:{...process.env,NODE_ENV:'production',DATABASE_SSL_REJECT_UNAUTHORIZED:'true',DATABASE_URL:'postgresql://editor:p%40ss%3Aword@example.invalid/content?sslmode='+mode}});
  assert.equal(result.status,0,result.stderr);assert.doesNotMatch(result.stderr,/SECURITY WARNING|weaker security guarantees/);
});
test('explicit production SSL compatibility opt-out is retained',()=>{
  const result=spawnSync(process.execPath,['-e',"const assert=require('node:assert/strict');const db=require('./backend/src/config/database');assert.equal(db.config.dialectOptions.ssl.rejectUnauthorized,false);db.close();"],{encoding:'utf8',env:{...process.env,NODE_ENV:'production',DATABASE_SSL_REJECT_UNAUTHORIZED:'false',DATABASE_URL:'postgresql://editor:qa-only@example.invalid/content'}});
  assert.equal(result.status,0,result.stderr);
});
