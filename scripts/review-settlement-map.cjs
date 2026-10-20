// Save-free map review in a hidden Electron window. --live checks the public CDN.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { isPublicFile } = require('./public-file.cjs');
const root = path.resolve(__dirname, '..'), out = path.join(root, 'tests/artifacts');
const live = process.argv.includes('--live'), errors = [], failures = [];
const sites = [
  ['Central Lond', 'stonefist', 'lond-town'], ['North Nonoth', 'nonth-town'], ['North Thoth', 'thoth-town'],
  ['North Orsa', 'orsa-town'], ['North Riesov', 'riesov-town'], ['West Witherst', 'witherst-town'],
  ['South Ganun', 'ganun-town'], ['North Endevor', 'endevor-town'], ['West Pyros', 'pyra'],
];
fs.mkdirSync(out, { recursive: true });
app.setPath('userData', fs.mkdtempSync(path.join(out, '.settlement-map-review-')));
for (const flag of ['disable-renderer-backgrounding', 'disable-background-timer-throttling', 'disable-backgrounding-occluded-windows']) app.commandLine.appendSwitch(flag);
let server;
app.on('will-quit', () => server?.close());
const page = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/src/ui/map/world-map.css"><style>
*{box-sizing:border-box}body{margin:0;background:#1d1711;color:#eadbb4;font-family:Georgia}#world-map{height:100vh;padding:20px}h1{margin:0 0 16px;font-size:26px}#atlas-traveler-button{display:none}
</style></head><body><main id="world-map"><h1>Azhora · Settlements</h1><div class="atlas-toolbar"><button id="atlas-fit">Whole map</button><button id="atlas-izol">Drent</button><button id="atlas-traveler-button">Where I am</button><span class="atlas-spacer"></span><button id="atlas-out">−</button><output id="atlas-zoom"></output><button id="atlas-in">+</button></div><div id="atlas-viewport" tabindex="0"><img id="atlas-image"><div id="atlas-traveler" hidden><b hidden></b><i></i><span></span></div><div id="atlas-loading">Loading</div></div></main><script type="module">
try {
 const {createWorldMap}=await import('/src/ui/map/world-map.js');
 const {SUBREGIONS}=await import('/src/ui/map/map-fog.js');
 const {TRANSFORM}=await import('/src/world/terrain/region-world.js');
 const map=createWorldMap();map.setChart({reveal:true,status:[],marks:SUBREGIONS.map(p=>({id:p.id,name:p.name,kind:'area',...TRANSFORM.worldToAtlas(p.x,p.z)}))});map.open();
 if(!await map.ready)throw Error('Map failed to load');window.azhoraMap=map;
}catch(e){window.__ERROR__=e.stack;console.error(e);}
</script></body></html>`;
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1500, height: 1000, show: false, webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, backgroundThrottling: false } });
  win.setMenuBarVisibility(false);
  win.webContents.on('console-message', (_event, level, message) => { if (level >= 3) errors.push(message); });
  win.webContents.session.webRequest.onErrorOccurred(details => failures.push({ url: details.url, error: details.error }));
  const frame = () => win.webContents.executeJavaScript('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
  try {
    if (!live) {
      server = http.createServer((req, res) => {
        const route = new URL(req.url, 'http://localhost').pathname;
        if (route === '/') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(page); return; }
        const file = path.resolve(root, '.' + route);
        if (!isPublicFile(root, file) || !/^\/(src|vendor|assets)\//.test(route)) { res.writeHead(403); res.end(); return; }
        fs.readFile(file, (error, data) => {
          if (error) { res.writeHead(404); res.end(); return; }
          res.setHeader('Content-Type', ({ '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' })[path.extname(file)] || 'application/octet-stream'); res.end(data);
        });
      });
      await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    }
    await win.loadURL(live ? 'https://www.mcrombie.com/game-azhora-map' : `http://127.0.0.1:${server.address().port}`);
    await win.webContents.executeJavaScript(`new Promise((resolve,reject)=>{const end=Date.now()+120000;const poll=()=>{if(window.__ERROR__)reject(Error(window.__ERROR__));else if(window.azhoraMap)resolve(true);else if(Date.now()>end)reject(Error('Map review timed out'));else setTimeout(poll,100)};poll()})`);
    const result = { live, base: await win.webContents.executeJavaScript('document.baseURI'), views: [], errors, failures };
    for (const [region, ...ids] of sites) {
      await win.webContents.executeJavaScript(`window.azhoraMap.focus(${JSON.stringify(region)})`); await frame();
      // DOM positions update before the hidden window's compositor presents them.
      await new Promise(resolve => setTimeout(resolve, 350));
      const badges = await win.webContents.executeJavaScript(`(${JSON.stringify(ids)}).map(id=>{
        const elements=[...document.querySelectorAll('[data-place-id]')].filter(el=>el.dataset.placeId===id),el=elements[0],box=el?.getBoundingClientRect(),viewport=document.querySelector('#atlas-viewport').getBoundingClientRect();
        return {id,count:elements.length,text:el?.textContent,subtitle:el?.querySelector('small')?.textContent,hidden:el?.hidden,city:el?.classList.contains('city'),onscreen:box&&box.right>viewport.left&&box.left<viewport.right&&box.bottom>viewport.top&&box.top<viewport.bottom};
      })`);
      for (const badge of badges) if (badge.count !== 1 || badge.hidden || !badge.city || !badge.subtitle || !badge.onscreen) throw Error('Settlement badge failed: ' + JSON.stringify(badge));
      fs.writeFileSync(path.join(out, `settlement-map-${live ? 'live-' : ''}${ids[0]}.png`), (await win.webContents.capturePage()).toPNG());
      result.views.push({ region, badges });
    }
    if (!live) {
      await win.webContents.executeJavaScript('window.azhoraMap.setChart({reveal:false,cells:[],glimpsed:[],labels:[]})'); await frame();
      const leaked = await win.webContents.executeJavaScript(`(${JSON.stringify(sites.flatMap(([, ...ids]) => ids))}).filter(id=>!document.querySelector('[data-place-id="'+id+'"]').hidden)`);
      if (leaked.length) throw Error('Undiscovered settlements leaked: ' + leaked.join(', '));
      result.discovery = 'All ten badges hidden until discovered';
    }
    fs.writeFileSync(path.join(out, live ? 'settlement-map-live.json' : 'settlement-map-review.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result));app.exit(errors.length || failures.length ? 1 : 0);
  } catch (error) { console.error(error);console.error(JSON.stringify({ errors, failures }));app.exit(1); }
});
