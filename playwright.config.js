const {defineConfig}=require('@playwright/test');
// The host exports NO_COLOR while Playwright explicitly colors worker output.
delete process.env.NO_COLOR;
module.exports=defineConfig({
  testDir:'./tests/browser',fullyParallel:false,workers:1,timeout:180000,retries:0,expect:{timeout:40000},
  reporter:[['list'],['json',{outputFile:'.qa/browser-results.json'}]],
  use:{baseURL:'http://127.0.0.1:3100',browserName:'chromium',launchOptions:{args:['--disable-gpu']},trace:'retain-on-failure',screenshot:'only-on-failure'},
  webServer:{command:'node tests/server.js',url:'http://127.0.0.1:3100/health',reuseExistingServer:true,timeout:300000},
  projects:[{name:'desktop',use:{viewport:{width:1440,height:1000}}},{name:'tablet',use:{viewport:{width:768,height:1024}}},{name:'mobile',use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}}]
});
