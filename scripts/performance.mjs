import fs from 'node:fs';
import path from 'node:path';
import lighthouse from 'lighthouse';
import net from 'node:net';
import {chromium} from 'playwright';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';

const url=process.env.AUDIT_URL || 'http://127.0.0.1:3100/';
const out=path.resolve('.qa');fs.mkdirSync(out,{recursive:true});
const runs=Math.min(3,Math.max(1,Number.parseInt(process.env.AUDIT_RUNS,10)||1));
const measurements=[];
const port=await new Promise(resolve=>{const server=net.createServer();server.listen(0,'127.0.0.1',()=>{const value=server.address().port;server.close(()=>resolve(value));});});
console.log('Lighthouse: starting the verified Playwright Chromium runtime');
const browser=await chromium.launch({args:['--disable-gpu','--remote-debugging-address=127.0.0.1','--remote-debugging-port='+port],timeout:30000});
try{
  for(const mode of ['mobile','desktop']){
   for(let run=1;run<=runs;run++){
    console.log('Lighthouse: auditing '+mode+' ('+run+'/'+runs+')');
    let deadline;
    const result=await Promise.race([
      lighthouse(url,{port,output:['json','html'],logLevel:'error',disableFullPageScreenshot:true,maxWaitForLoad:45000,onlyCategories:['performance','accessibility','best-practices','seo']},mode==='desktop'?desktopConfig:undefined),
      new Promise((_,reject)=>{deadline=setTimeout(()=>reject(Error('Lighthouse '+mode+' timed out')),180000);})
    ]).finally(()=>clearTimeout(deadline));
    if(!result || result.lhr.runtimeError)throw Error(result?.lhr.runtimeError?.message || 'Lighthouse did not finish');
    fs.writeFileSync(path.join(out,'lighthouse-'+mode+'.json'),result.report[0]);
    fs.writeFileSync(path.join(out,'lighthouse-'+mode+'.html'),result.report[1]);
    if(runs>1){
      fs.writeFileSync(path.join(out,'lighthouse-'+mode+'-'+run+'.json'),result.report[0]);
      fs.writeFileSync(path.join(out,'lighthouse-'+mode+'-'+run+'.html'),result.report[1]);
    }
    const audits=result.lhr.audits;
    const measurement={mode,run,url,fetchTime:result.lhr.fetchTime,benchmarkIndex:result.lhr.environment.benchmarkIndex,
      scores:Object.fromEntries(Object.entries(result.lhr.categories).map(([name,c])=>[name,Math.round(c.score*100)])),
      fcpMs:audits['first-contentful-paint'].numericValue,lcpMs:audits['largest-contentful-paint'].numericValue,cls:audits['cumulative-layout-shift'].numericValue,tbtMs:audits['total-blocking-time'].numericValue};
    measurements.push(measurement);console.log(JSON.stringify(measurement));
   }
  }
  const median=values=>{const sorted=values.toSorted((a,b)=>a-b);return sorted[Math.floor(sorted.length/2)];};
  const summary=Object.fromEntries(['mobile','desktop'].map(mode=>{
    const rows=measurements.filter(m=>m.mode===mode);
    return [mode,{runs:rows.length,scores:Object.fromEntries(Object.keys(rows[0].scores).map(k=>[k,median(rows.map(r=>r.scores[k]))])),
      performanceRange:[Math.min(...rows.map(r=>r.scores.performance)),Math.max(...rows.map(r=>r.scores.performance))],
      lcpMs:median(rows.map(r=>r.lcpMs)),cls:median(rows.map(r=>r.cls)),tbtMs:median(rows.map(r=>r.tbtMs))}];
  }));
  fs.writeFileSync(path.join(out,'performance-summary.json'),JSON.stringify({url,verifiedAt:new Date().toISOString(),summary,measurements},null,2));
  console.log(JSON.stringify({summary}));
}finally{await browser.close();}
