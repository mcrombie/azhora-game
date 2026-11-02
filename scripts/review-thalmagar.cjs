// Hidden, save-free visual checks of the real map and region-70 scenery.
// Run with Electron; --live checks the published map shell and its CDN modules.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { isPublicFile } = require('./public-file.cjs');
const root = path.resolve(__dirname, '..'), out = path.join(root, 'tests/artifacts');
const live = process.argv.includes('--live'), errors = [];
fs.mkdirSync(out, { recursive: true });
app.setPath('userData', fs.mkdtempSync(path.join(out, '.thalmagar-review-')));
for (const flag of ['disable-renderer-backgrounding', 'disable-background-timer-throttling', 'disable-backgrounding-occluded-windows']) app.commandLine.appendSwitch(flag);
let server;
app.on('will-quit', () => server?.close());
const head = `<meta charset="utf-8"><script type="importmap">{"imports":{"three":"/vendor/three.module.js"}}</script>`;
const mapPage = `<!doctype html><html><head>${head}<link rel="stylesheet" href="/src/ui/map/world-map.css"><style>
*{box-sizing:border-box}body{margin:0;background:#1d1711;color:#eadbb4;font-family:Georgia}#world-map{height:100vh;padding:20px}h1{margin:0 0 16px;font-size:26px}#atlas-traveler-button{display:none}
</style></head><body><main id="world-map"><h1>Azhora · Cape Thalmagar</h1><div class="atlas-toolbar"><button id="atlas-fit">Whole map</button><button id="atlas-izol">Drent</button><button id="atlas-traveler-button">Where I am</button><span class="atlas-spacer"></span><button id="atlas-out">−</button><output id="atlas-zoom"></output><button id="atlas-in">+</button></div><div id="atlas-viewport" tabindex="0"><img id="atlas-image"><div id="atlas-traveler" hidden><b hidden></b><i></i><span></span></div><div id="atlas-loading">Loading</div></div></main><script type="module">
try {
 const {createWorldMap}=await import('/src/ui/map/world-map.js');
 const {SUBREGIONS}=await import('/src/ui/map/map-fog.js');
 const {TRANSFORM}=await import('/src/world/terrain/region-world.js');
 const map=createWorldMap();map.setChart({reveal:true,status:[],marks:SUBREGIONS.map(p=>({id:p.id,name:p.name,kind:'area',...TRANSFORM.worldToAtlas(p.x,p.z)}))});map.open();
 if(!await map.ready)throw Error('Map failed to load');window.azhoraMap=map;window.__READY__=true;
}catch(e){window.__ERROR__=e.stack;console.error(e);}
</script></body></html>`;
const scenePage = `<!doctype html><html><head>${head}<style>body{margin:0;overflow:hidden;background:#b7c5bd}#caption{position:absolute;left:24px;top:18px;color:#f4e7c5;font:24px Georgia;text-shadow:0 2px 3px #172c24}</style></head><body><div id="caption">Cape Thalmagar · The Dark Wizard’s Tower</div><script type="module">
try {
 const THREE=await import('three'),{createWorld}=await import('/src/world.js');
 const scene=new THREE.Scene();scene.background=new THREE.Color('#b7c5bd');scene.fog=new THREE.Fog('#b7c5bd',1000,3300);
 scene.add(new THREE.HemisphereLight('#d9e6e5','#56614a',2));const sun=new THREE.DirectionalLight('#ffedc6',2.4);sun.position.set(-3300,900,-1900);sun.target.position.set(-3100,40,-2600);scene.add(sun,sun.target);
 const world=createWorld(scene,{loadingMode:'fast',initialRegion:70});await world.loading.ensureRegion(70);world.loading.stop();
 const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(1);renderer.setClearColor('#b7c5bd');document.body.append(renderer.domElement);
 const camera=new THREE.PerspectiveCamera(47,innerWidth/innerHeight,.5,6500);
 window.__VIEW__=(close=false)=>{camera.position.set(close?-2980:-2780,close?198:305,close?-2330:-2100);camera.lookAt(-3100,close?130:65,-2600);renderer.render(scene,camera);};window.__VIEW__();
 window.__STATS__={calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,fortressMeshes:world?scene.getObjectByName('The Black Fortress').children.length:0};window.__READY__=true;
}catch(e){window.__ERROR__=e.stack;console.error(e);}
</script></body></html>`;
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1500, height: 1000, show: false, webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, backgroundThrottling: false } });
  win.setMenuBarVisibility(false);
  win.webContents.on('console-message', (_event, level, message) => { if (level >= 3) errors.push(message); });
  const wait = expression => win.webContents.executeJavaScript(`new Promise((resolve,reject)=>{const end=Date.now()+120000;const poll=()=>{if(window.__ERROR__)reject(Error(window.__ERROR__));else if(${expression})resolve(true);else if(Date.now()>end)reject(Error('Review timeout'));else setTimeout(poll,100)};poll()})`);
  const frame = () => win.webContents.executeJavaScript('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
  const shot = async name => { await frame(); fs.writeFileSync(path.join(out, name + '.png'), (await win.webContents.capturePage()).toPNG()); };
  try {
    if (!live) {
      server = http.createServer((req, res) => {
        const route = new URL(req.url, 'http://localhost').pathname;
        if (route === '/' || route === '/scene') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(route === '/' ? mapPage : scenePage); return; }
        const file = path.resolve(root, '.' + route);
        if (!isPublicFile(root, file) || !/^\/(src|vendor|assets)\//.test(route)) { res.writeHead(403); res.end(); return; }
        fs.readFile(file, (error, data) => {
          if (error) { res.writeHead(404); res.end(); return; }
          res.setHeader('Content-Type', ({ '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' })[path.extname(file)] || 'application/octet-stream'); res.end(data);
        });
      });
      await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    }
    const url = live ? 'https://www.mcrombie.com/game-azhora-map' : `http://127.0.0.1:${server.address().port}`;
    await win.loadURL(url); await wait('window.azhoraMap');
    await frame();
    await win.webContents.executeJavaScript("window.azhoraMap.focus('Cape Thalmagar')"); await shot(live ? 'thalmagar-map-live' : 'thalmagar-map-cape');
    const marker = await win.webContents.executeJavaScript(`(()=>{const el=document.querySelector('[data-place-id="thalmagar-black-fortress"]');return {text:el?.textContent,hidden:el?.hidden,subtitle:el?.querySelector('small')?.textContent,base:document.baseURI}})()`);
    if (marker.hidden || marker.subtitle !== "Dark Wizard's Tower") throw Error('The public-style fortress badge is missing: ' + JSON.stringify(marker));
    if (!live) {
      await win.webContents.executeJavaScript("window.azhoraMap.setChart({reveal:false,cells:[],glimpsed:[],labels:[]})");await shot('thalmagar-map-undiscovered');
      const hidden = await win.webContents.executeJavaScript("document.querySelector('[data-place-id=\"thalmagar-black-fortress\"]').hidden");
      if (!hidden) throw Error('Undiscovered fortress marker leaked');
      await win.loadURL(url + '/scene'); await wait('window.__READY__');await shot('thalmagar-built-cape');
      await win.webContents.executeJavaScript('window.__VIEW__(true)');await shot('thalmagar-dark-tower');
    }
    const result = { live, marker, errors, ...(live ? {} : { stats: await win.webContents.executeJavaScript('window.__STATS__') }) };
    fs.writeFileSync(path.join(out, live ? 'thalmagar-live-review.json' : 'thalmagar-review.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result));app.exit(errors.length ? 1 : 0);
  } catch (error) { console.error(error);console.error(JSON.stringify(errors));app.exit(1); }
});
