// Only public values are read. Backend environment and credentials are never copied.
const fs=require('fs'),path=require('path');
function publicUrl(value,name){
  if(!value)throw Error(name+' is required');
  const u=new URL(value);
  if(u.username || u.password || u.search || u.hash || !['https:','http:'].includes(u.protocol) || /YOUR-|placeholder/i.test(value))throw Error(name+' must be a public URL without credentials');
  if(u.protocol!=='https:' && !['localhost','127.0.0.1'].includes(u.hostname))throw Error(name+' must use HTTPS');
  return u.origin;
}
const api=publicUrl(process.env.PUBLIC_API_URL,'PUBLIC_API_URL');
const site=publicUrl(process.env.PUBLIC_SITE_URL || 'https://buxara-best.vercel.app','PUBLIC_SITE_URL');
const source=fs.realpathSync(__dirname),out=path.resolve(source,'dist');
if(path.dirname(out)!==source || path.basename(out)!=='dist' || (fs.existsSync(out) && fs.lstatSync(out).isSymbolicLink()))throw Error('Unsafe build output directory');
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
for(const name of ['index.html','category.html','search.html','post.html','404.html','assets','admin'])fs.cpSync(path.join(__dirname,name),path.join(out,name),{recursive:true});
fs.writeFileSync(path.join(out,'config.js'),'window.__API_URL__ = '+JSON.stringify(api)+';\n');
for(const name of ['index.html','category.html','search.html','post.html','404.html']){
  const file=path.join(out,name);fs.writeFileSync(file,fs.readFileSync(file,'utf8').replaceAll('https://buxara-best.vercel.app',site));
}
fs.writeFileSync(path.join(out,'robots.txt'),'User-agent: *\nDisallow: /admin\n');
console.log('Static build validated: public config and allowlisted assets only.');
