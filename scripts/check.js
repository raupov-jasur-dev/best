const fs=require('fs'),path=require('path'),{spawnSync}=require('child_process');
let files=0,failures=0;
for(const base of ['backend/src','frontend-vercel/assets/js','scripts','tests']){
  if(!fs.existsSync(base))continue;
  for(const name of fs.readdirSync(base,{recursive:true}))if(/\.(js|cjs|mjs)$/.test(name)){
    const file=path.join(base,name);files++;
    const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(r.status){failures++;console.error(file,r.stderr);}
  }
}
for(const file of ['frontend-vercel/build.js','playwright.config.js'])if(fs.existsSync(file)){files++;const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(r.status){failures++;console.error(r.stderr);}}
console.log(files+' JavaScript files checked; '+failures+' failures.');process.exitCode=failures?1:0;
