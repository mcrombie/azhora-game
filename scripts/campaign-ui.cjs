// Dedicated UI preview host. Does not load main.cjs, game code or game saves.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
if (!process.versions.electron) {
  const candidates = [path.join(root, 'node_modules/electron/dist/electron.exe')];
  for (let dir=root, i=0; i<8; i++) { candidates.push(path.resolve(dir,'../world-builder/map/node_modules/electron/dist/electron.exe'));dir=path.dirname(dir); }
  const electron = candidates.find(p=>fs.existsSync(p));
  if (!electron) { console.error('Electron was not found. Run npm install in the Azhora project.');process.exit(1); }
  const env = {...process.env};delete env.ELECTRON_RUN_AS_NODE;
  const child = require('node:child_process').spawn(electron,[__filename,...process.argv.slice(2)],{cwd:root,env,stdio:'inherit',windowsHide:process.argv.includes('--test')});
  child.on('error',error=>{console.error(error);process.exit(1);});child.on('exit',code=>process.exit(code??1));
} else {
  const {app,BrowserWindow}=require('electron');
  const http=require('node:http');
  const testing=process.argv.includes('--test');
  const profileBase=path.join(root,'tests/.electron-profiles');fs.mkdirSync(profileBase,{recursive:true});
  app.setPath('userData',fs.mkdtempSync(path.join(profileBase,'campaign-ui-')));
  let server;
  app.whenReady().then(async()=>{
    server=http.createServer((req,res)=>{
      let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end();return;}
      if(pathname==='/')pathname='/prototypes/campaign/index.html';
      const file=path.resolve(root,'.'+pathname);
      const allowed=file.startsWith(path.join(root,'prototypes/campaign')+path.sep)||['azhora-world-map.svg','azhora-world-map.json'].some(n=>file===path.join(root,'assets',n));
      if(!allowed||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('Not found');return;}
      const type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'}[path.extname(file)]||'application/octet-stream';
      res.writeHead(200,{'Content-Type':`${type}; charset=utf-8`,'Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);
    });
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const url=`http://127.0.0.1:${server.address().port}/prototypes/campaign/`;
    const win=new BrowserWindow({width:1460,height:980,minWidth:720,minHeight:600,show:!testing,title:'Azhora · Campaign UI prototype',backgroundColor:'#cfd6c4',autoHideMenuBar:true,webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:!testing}});
    win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
    win.webContents.on('will-navigate',(event,target)=>{if(!target.startsWith(url))event.preventDefault();});
    const errors=[];win.webContents.on('console-message',(_e,level,message)=>{if(level>=3)errors.push(message);});
    await win.loadURL(url+'index.html');
    console.log(`Campaign UI preview: ${url}index.html`);
    if(testing){
      try {
        await win.webContents.executeJavaScript(`new Promise((resolve,reject)=>{let n=0;const t=setInterval(()=>{if(window.campaignUIPreview?.ready){clearInterval(t);resolve(true);}else if(++n>200){clearInterval(t);reject(Error('Preview did not become ready'));}},50);})`);
        const result=await win.webContents.executeJavaScript(`import('./smoke.js').then(m=>m.runChecks())`);
        const point=await win.webContents.executeJavaScript(`(()=>{const p=document.querySelector('.hit[data-region="Elagos"]'),b=p.getBBox();const c=new DOMPoint(b.x+b.width/2,b.y+b.height/2).matrixTransform(p.getScreenCTM());return {x:Math.round(c.x),y:Math.round(c.y)};})()`);
        win.webContents.sendInputEvent({type:'mouseDown',...point,button:'left',clickCount:1});
        win.webContents.sendInputEvent({type:'mouseUp',...point,button:'left',clickCount:1});
        await new Promise(resolve=>setTimeout(resolve,100));
        if(await win.webContents.executeJavaScript(`window.campaignUIPreview.getState().selected`)!=='Elagos')throw Error('Clicking authored map geometry did not select Elagos');
        result.push('Native mouse click selects the authored map region');
        await win.webContents.executeJavaScript(`document.getElementById('reset').click();document.getElementById('toast').hidden=true`);
        const output=path.join(root,'tests/artifacts/campaign-ui');fs.mkdirSync(output,{recursive:true});
        const settle=()=>win.webContents.executeJavaScript(`new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);
        await settle();
        await new Promise(resolve=>setTimeout(resolve,300));
        fs.writeFileSync(path.join(output,'whole-atlas.png'),(await win.webContents.capturePage()).toPNG());
        await win.webContents.executeJavaScript(`document.getElementById('focus-north').click()`);
        await settle();
        await new Promise(resolve=>setTimeout(resolve,250));
        fs.writeFileSync(path.join(output,'northern-front.png'),(await win.webContents.capturePage()).toPNG());
        await win.webContents.executeJavaScript(`window.campaignUIPreview.goStage(3);window.campaignUIPreview.selectRegion('Yunethre',{focus:true});document.querySelector('[data-layer="control"]').click()`);
        await settle();
        await new Promise(resolve=>setTimeout(resolve,250));
        fs.writeFileSync(path.join(output,'invasion.png'),(await win.webContents.capturePage()).toPNG());
        await win.webContents.executeJavaScript(`document.getElementById('reset').click();document.getElementById('focus-island').click();document.getElementById('toast').hidden=true`);
        await settle();
        await new Promise(resolve=>setTimeout(resolve,200));
        fs.writeFileSync(path.join(output,'ithzel-conflict.png'),(await win.webContents.capturePage()).toPNG());
        win.setSize(980,760);
        await new Promise(resolve=>setTimeout(resolve,300));
        const overflow=await win.webContents.executeJavaScript(`document.documentElement.scrollWidth>innerWidth`);
        if(overflow)throw Error('Compact layout overflows horizontally');
        result.push('Compact desktop layout fits without horizontal overflow');
        fs.writeFileSync(path.join(output,'compact.png'),(await win.webContents.capturePage()).toPNG());
        if(errors.length)throw Error(errors.join('\n'));
        console.log(JSON.stringify({checks:result,screenshots:output,consoleErrors:errors},null,2));app.exit(0);
      }catch(error){console.error(error);app.exit(1);}
    }
  }).catch(error=>{console.error(error);app.exit(1);});
  app.on('window-all-closed',()=>app.quit());
  app.on('will-quit',()=>server?.close());
}
