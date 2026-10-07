const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {isPublicFile}=require('./public-file.cjs');
const root=path.resolve(__dirname,'..'),test=process.argv.includes('--smoke-test');
const profile=process.env.AZHORA_TEST_PROFILE??path.join(app.getPath('appData'),'Azhora Lizeem');
app.setPath('userData',profile);app.setPath('sessionData',profile);
let server;
app.on('window-all-closed',()=>app.quit());app.on('will-quit',()=>server?.close());
app.whenReady().then(async()=>{
  server=http.createServer((req,res)=>{
    let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end();return;}
    if(pathname==='/')pathname='/lizeem.html';const file=path.resolve(root,'.'+pathname);
    if(!(pathname==='/lizeem.html'||/^\/(src|assets)\//.test(pathname)||['/vendor/three.module.js','/vendor/three.core.js'].includes(pathname))||!isPublicFile(root,file)){res.writeHead(403);res.end();return;}
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404);res.end();return;}
      res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');
      res.setHeader('Cache-Control','no-store');res.end(data);
    });
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const win=new BrowserWindow({width:1440,height:960,show:!test,title:'Azhora - The East-West War',backgroundColor:'#142d29',
    webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}});
  win.setMenuBarVisibility(false);if(test)win.once('ready-to-show',()=>win.showInactive());
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  const errors=[];win.webContents.on('console-message',(_e,level,message)=>{if(level>=3)errors.push(message);if(test&&message.startsWith('LIZEEM_'))console.log(message);});
  win.webContents.on('before-input-event',(_event,input)=>{if(input.type==='keyDown'&&(input.key==='F11'||input.alt&&input.key==='Enter'))win.setFullScreen(!win.isFullScreen());});
  await win.loadURL(`http://127.0.0.1:${server.address().port}/lizeem.html${test?'?test=1':''}`);
  if(test){
    const dir=path.join(root,'tests','artifacts');fs.mkdirSync(dir,{recursive:true});
    try{
      await win.webContents.executeJavaScript(`new Promise((resolve,reject)=>{const end=Date.now()+30000;const poll=()=>window.__LIZEEM__?resolve():window.__LIZEEM_ERROR__?reject(Error(window.__LIZEEM_ERROR__)):Date.now()>end?reject(Error('Scenario failed to start')):setTimeout(poll,50);poll();})`);
      await new Promise(resolve=>setTimeout(resolve,300));fs.writeFileSync(path.join(dir,'lizeem-opening.png'),(await win.webContents.capturePage()).toPNG());
      const report=await win.webContents.executeJavaScript(`import('./src/dev/checks/lizeem-smoke.js').then(m=>m.checkLizeem(window.__LIZEEM__))`);
      await new Promise(resolve=>setTimeout(resolve,300));fs.writeFileSync(path.join(dir,'lizeem-intervention.png'),(await win.webContents.capturePage()).toPNG());
      await win.webContents.executeJavaScript(`window.__LIZEEM__.reset(1731);window.__LIZEEM__.advance(5);const select=document.getElementById('selected-army');select.value='1';select.dispatchEvent(new Event('change'));document.getElementById('army-inspector').open=true;`);
      await new Promise(resolve=>setTimeout(resolve,300));fs.writeFileSync(path.join(dir,'lizeem-army.png'),(await win.webContents.capturePage()).toPNG());
      await win.webContents.executeJavaScript(`window.__LIZEEM__.reset(1731);document.getElementById('hero-destination').value='caricas';document.getElementById('hero-travel').click();document.getElementById('hero-watch').click();window.__LIZEEM__.advance(100);document.getElementById('hero-encounter').click();document.getElementById('fight-attacker').click();`);
      await new Promise(resolve=>setTimeout(resolve,1500));fs.writeFileSync(path.join(dir,'lizeem-encounter.png'),(await win.webContents.capturePage()).toPNG());
      const result={...report,errors};fs.writeFileSync(path.join(dir,'lizeem-checks.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));app.exit(errors.length?1:0);
    }catch(error){console.error(error.stack);fs.writeFileSync(path.join(dir,'lizeem-failure.png'),(await win.webContents.capturePage()).toPNG());app.exit(1);}
  }
}).catch(error=>{console.error(error);app.exit(1);});
