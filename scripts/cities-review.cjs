const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {isPublicFile}=require('./public-file.cjs');
const root=path.resolve(__dirname,'..'),test=process.argv.includes('--smoke-test');
if(process.env.AZHORA_TEST_PROFILE)app.setPath('userData',process.env.AZHORA_TEST_PROFILE);
for(const flag of ['disable-renderer-backgrounding','disable-background-timer-throttling','disable-backgrounding-occluded-windows'])app.commandLine.appendSwitch(flag);
let server;app.on('window-all-closed',()=>app.quit());app.on('will-quit',()=>server?.close());
app.whenReady().then(async()=>{
  server=http.createServer((req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname;
    const file=path.resolve(root,'.'+(pathname==='/'?'/prototypes/cities/index.html':pathname));
    if(!isPublicFile(root,file)||!/^\/(src|vendor|assets|prototypes\/cities)\//.test(pathname==='/'?'/prototypes/cities/index.html':pathname)){res.writeHead(403);res.end();return;}
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');res.end(data);});
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const win=new BrowserWindow({width:1440,height:1000,show:!test,title:'Cities — Capital Review',webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}});win.setMenuBarVisibility(false);
  const errors=[];win.webContents.on('console-message',(_e,level,message)=>{if(level>=3)errors.push(message);});
  await win.loadURL(`http://127.0.0.1:${server.address().port}/`);
  if(!test)return;
  try{
    const out=path.join(root,'tests/artifacts');fs.mkdirSync(out,{recursive:true});const results={};
    const requested=process.argv.find(arg=>arg.startsWith('--cities='))?.split('=')[1]?.split(',')??['aevis','nylon','selemis','pyra','mithala'];
    for(const city of requested){
      await win.loadURL(`http://127.0.0.1:${server.address().port}/?city=${city}`);
      await win.webContents.executeJavaScript(`new Promise((resolve,reject)=>{const end=Date.now()+180000;const poll=()=>window.__CITY_REVIEW__?resolve():window.__CITY_REVIEW_ERROR__?reject(Error(window.__CITY_REVIEW_ERROR__)):Date.now()>end?reject(Error('City review timed out')):setTimeout(poll,100);poll();})`);
      const views=await win.webContents.executeJavaScript('window.__CITY_REVIEW__.views');
      for(const view of views){
        await win.webContents.executeJavaScript(`window.__CITY_REVIEW__.view('${view}');new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
        fs.writeFileSync(path.join(out,`city-${city}-${view}.png`),(await win.webContents.capturePage()).toPNG());
      }
      results[city]=await win.webContents.executeJavaScript('({metrics:window.__CITY_REVIEW__.metrics,stats:window.__CITY_REVIEW__.stats(),placements:window.__CITY_REVIEW__.placements})');
      console.log(city+': '+JSON.stringify(results[city].metrics));
    }
    fs.writeFileSync(path.join(out,'cities-review.json'),JSON.stringify({results,errors},null,2));console.log(JSON.stringify({errors}));app.exit(errors.length?1:0);
  }catch(error){console.error(error);app.exit(1);}
});
