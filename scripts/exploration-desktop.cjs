const {app,BrowserWindow,ipcMain}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {createCheckpointStore}=require('./checkpoint-store.cjs');
const {isPublicFile}=require('./public-file.cjs');
const root=path.resolve(__dirname,'..'),test=process.argv.includes('--smoke-test'),warTest=process.argv.includes('--world-war'),hearthfallTest=process.argv.includes('--hearthfall'),combatTest=process.argv.includes('--combat-testing');
// Region construction yields through animation frames. Keep isolated smoke
// checks progressing when Windows covers their window, as in the main host.
if(test)for(const flag of ['disable-renderer-backgrounding','disable-background-timer-throttling','disable-backgrounding-occluded-windows'])app.commandLine.appendSwitch(flag);
if(process.env.AZHORA_TEST_PROFILE){app.setPath('userData',process.env.AZHORA_TEST_PROFILE);app.setPath('sessionData',process.env.AZHORA_TEST_PROFILE);}
let server,win;
app.on('window-all-closed',()=>app.quit());
app.on('will-quit',()=>server?.close());
app.whenReady().then(async()=>{
  // Separate directory and renderer bridge. The legacy save slot is inaccessible.
  const store=createCheckpointStore({directory:path.join(root,'saves','exploration'),memoryOnly:test});
  const warStore=createCheckpointStore({directory:path.join(root,'saves','lizeem-world'),memoryOnly:test});
  const battleStore=createCheckpointStore({directory:path.join(root,'saves','lizeem-world-v2'),memoryOnly:test});
  const interceptionStore=createCheckpointStore({directory:path.join(root,'saves','lizeem-world-v3'),memoryOnly:test});
  const hearthfallStore=createCheckpointStore({directory:path.join(root,'saves','hearthfall'),memoryOnly:test});
  ipcMain.on('azhora:exploration-save',(event,operation,key,value)=>{
    const mode=new URL(event.sender.getURL()).searchParams.get('mode');
    const activeKey=mode==='combat'?null:mode==='hearthfall'?'azhora-hearthfall-v1':mode==='war'?'azhora-lizeem-world-v3':'azhora-exploration-v1';
    event.returnValue=event.sender===win?.webContents&&['azhora-hearthfall-v1','azhora-exploration-v1','azhora-lizeem-world-v1','azhora-lizeem-world-v2','azhora-lizeem-world-v3'].includes(key)&&['get','set'].includes(operation)&&(operation==='get'||key===activeKey)
      ?(key==='azhora-hearthfall-v1'?hearthfallStore:key==='azhora-lizeem-world-v3'?interceptionStore:key==='azhora-lizeem-world-v2'?battleStore:key==='azhora-lizeem-world-v1'?warStore:store).handle(operation,'azhora-road-checkpoint-v1',value):{ok:false,reason:'This mode cannot write that save slot.'};
  });
  server=http.createServer((req,res)=>{
    let pathname;
    try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end();return;}
    if(pathname==='/')pathname='/index.html';
    const file=path.resolve(root,'.'+pathname);
    const allowed=['/index.html','/exploration.html'].includes(pathname)||/^\/(src|assets|vendor)\//.test(pathname);
    if(!allowed||!isPublicFile(root,file)){res.writeHead(403);res.end();return;}
    fs.readFile(file,(error,data)=>{
      if(error){res.writeHead(404);res.end();return;}
      res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');
      res.setHeader('Cache-Control','no-store');res.end(data);
    });
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  win=new BrowserWindow({width:1440,height:960,show:!test,title:'Azhora',backgroundColor:'#193c34',
    webPreferences:{preload:path.join(__dirname,'exploration-preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}});
  win.setMenuBarVisibility(false);
  if(test)win.once('ready-to-show',()=>win.showInactive());
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  const errors=[];
  win.webContents.on('console-message',(_e,level,message)=>{if(level>=3){errors.push(message);if(test)console.log('EXPLORATION_ERROR '+message);}if(test&&message.startsWith('EXPLORATION_'))console.log(message);});
  win.webContents.on('before-input-event',(_event,input)=>{if(input.type==='keyDown'&&(input.key==='F11'||input.alt&&input.key==='Enter'))win.setFullScreen(!win.isFullScreen());});
  await win.loadURL(`http://127.0.0.1:${server.address().port}/?${test?'test=1&':''}${combatTest?'mode=combat'+(test?'&menu=1':''):hearthfallTest?'mode=hearthfall&menu=1':warTest?'war=1':''}`);
  if(test){
    const dir=path.join(root,'tests','artifacts');fs.mkdirSync(dir,{recursive:true});
    try{
      const waitReady=()=>win.webContents.executeJavaScript(`new Promise((resolve,reject)=>{const end=Date.now()+300000;const poll=()=>window.__EXPLORATION__?resolve():window.__EXPLORATION_ERROR__?reject(new Error(window.__EXPLORATION_ERROR__)):Date.now()>end?reject(new Error('Exploration did not initialize')):setTimeout(poll,100);poll();})`);
      if(combatTest){
        await win.webContents.executeJavaScript(`import('./src/dev/checks/combat-testing-smoke.js').then(m=>m.checkCombatMenu())`);
        fs.writeFileSync(path.join(dir,'combat-testing-menu.png'),(await win.webContents.capturePage()).toPNG());
        await win.webContents.executeJavaScript(`document.querySelector('[data-combat-exercise="lesson"]').click()`);
        await waitReady();
        await win.webContents.executeJavaScript(`new Promise(resolve=>{const poll=()=>window.__EXPLORATION__.state().mode==='skirmish'?requestAnimationFrame(()=>requestAnimationFrame(resolve)):setTimeout(poll,50);poll();})`);
        fs.writeFileSync(path.join(dir,'combat-testing-camp.png'),(await win.webContents.capturePage()).toPNG());
        await win.webContents.executeJavaScript(`import('./src/dev/checks/combat-testing-smoke.js').then(m=>m.checkCombatHelp(window.__EXPLORATION__))`);
        fs.writeFileSync(path.join(dir,'combat-testing-help.png'),(await win.webContents.capturePage()).toPNG());
        await win.webContents.executeJavaScript(`document.getElementById('world-skirmish-help').click()`);
        const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/combat-testing-smoke.js').then(m=>m.checkCombatExercises(window.__EXPLORATION__))`);
        fs.writeFileSync(path.join(dir,'combat-testing-checks.json'),JSON.stringify({...result,errors},null,2));console.log(JSON.stringify({...result,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(hearthfallTest){
        fs.writeFileSync(path.join(dir,'hearthfall-main-menu.png'),(await win.webContents.capturePage()).toPNG());
        await win.webContents.executeJavaScript(`document.getElementById('new-hearthfall').click()`);
      }
      await waitReady();
      if(hearthfallTest){
        const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/hearthfall-smoke.js').then(m=>m.checkHearthfall(window.__EXPLORATION__))`);
        fs.writeFileSync(path.join(dir,'hearthfall-feradom.png'),(await win.webContents.capturePage()).toPNG());
        const navigated=new Promise(resolve=>win.webContents.once('did-finish-load',resolve));
        await win.webContents.executeJavaScript(`window.__EXPLORATION__.pause();document.getElementById('return-start').click()`);await navigated;
        const menu=await win.webContents.executeJavaScript(`new Promise((resolve,reject)=>{const end=Date.now()+10000;const poll=()=>{const b=document.querySelector('[data-continue-mode="hearthfall"]');if(b&&!b.disabled)return resolve({visible:!document.getElementById('start-screen').hidden,exploreDisabled:document.getElementById('continue-exploration').disabled,warDisabled:document.querySelector('[data-continue-mode="war"]').disabled});if(Date.now()>end)return reject(Error('Hearthfall continue unavailable'));setTimeout(poll,50);};poll();})`);
        if(!menu.visible||!menu.exploreDisabled||!menu.warDisabled)throw Error('Main menu save isolation failed');
        fs.writeFileSync(path.join(dir,'hearthfall-continue-menu.png'),(await win.webContents.capturePage()).toPNG());
        await win.webContents.executeJavaScript(`document.querySelector('[data-continue-mode="hearthfall"]').click()`);await waitReady();
        const restored=await win.webContents.executeJavaScript(`window.__EXPLORATION__.store.read().data`);
        if(JSON.stringify(restored)!==JSON.stringify(result.saved))throw Error('Hearthfall changed on reload');
        result.checks.push('Exit returns to three-mode menu; only Hearthfall Continue is enabled','Continue restores the isolated checkpoint in a fresh renderer');
        fs.writeFileSync(path.join(dir,'hearthfall-checks.json'),JSON.stringify({...result,errors},null,2));
        console.log(JSON.stringify({...result,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--practice-checks')){
        const before=await win.webContents.executeJavaScript(`import('./src/dev/checks/ovesos-practice-smoke.js').then(m=>m.startPractice(window.__EXPLORATION__))`);
        fs.writeFileSync(path.join(dir,'minora-practice-windup.png'),(await win.webContents.capturePage()).toPNG());
        await win.webContents.executeJavaScript(`import('./src/dev/checks/ovesos-practice-smoke.js').then(m=>m.finishPractice(window.__EXPLORATION__,${JSON.stringify(before)}))`);
        fs.writeFileSync(path.join(dir,'minora-practice-result.png'),(await win.webContents.capturePage()).toPNG());
        await win.webContents.executeJavaScript(`import('./src/dev/checks/ovesos-practice-smoke.js').then(m=>m.retryAndExit(window.__EXPLORATION__,${JSON.stringify(before)}))`);
        await win.webContents.executeJavaScript(`import('./src/dev/checks/ovesos-practice-smoke.js').then(m=>m.startAdvancedPractice(window.__EXPLORATION__))`);
        fs.writeFileSync(path.join(dir,'minora-practice-sweep.png'),(await win.webContents.capturePage()).toPNG());
        const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/ovesos-practice-smoke.js').then(m=>m.finishAdvancedPractice(window.__EXPLORATION__,${JSON.stringify(before)}))`);
        fs.writeFileSync(path.join(dir,'minora-practice-checks.json'),JSON.stringify({...result,errors},null,2));console.log(JSON.stringify({...result,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--scenario-ui-checks')){
        const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/world-war-smoke.js').then(m=>m.checkScenarioTools(window.__EXPLORATION__))`);
        fs.writeFileSync(path.join(dir,'world-war-scenario-buttons.png'),(await win.webContents.capturePage()).toPNG());
        fs.writeFileSync(path.join(dir,'world-war-scenario-ui-checks.json'),JSON.stringify({...result,errors},null,2));console.log(JSON.stringify({...result,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--journey-checks')){
        const setup=await win.webContents.executeJavaScript(`import('./src/dev/checks/ovesos-journey-smoke.js').then(m=>m.startJourney(window.__EXPLORATION__))`);
        await win.webContents.executeJavaScript(`import('./src/dev/checks/ovesos-journey-smoke.js').then(async m=>{await m.rideJourney(window.__EXPLORATION__,'opening-map');await m.checkCampaignBriefing(window.__EXPLORATION__);})`);
        fs.writeFileSync(path.join(dir,'ovesos-journey-opening-map.png'),(await win.webContents.capturePage()).toPNG());
        await win.webContents.executeJavaScript(`import('./src/dev/checks/ovesos-journey-smoke.js').then(m=>m.rideJourney(window.__EXPLORATION__,4))`);
        fs.writeFileSync(path.join(dir,'ovesos-journey-bridge.png'),(await win.webContents.capturePage()).toPNG());
        await win.webContents.executeJavaScript(`import('./src/dev/checks/ovesos-journey-smoke.js').then(async m=>{await m.rideJourney(window.__EXPLORATION__,'fight');m.checkWatchIntro(window.__EXPLORATION__);})`);
        await new Promise(resolve=>setTimeout(resolve,100));fs.writeFileSync(path.join(dir,'ovesos-journey-combat.png'),(await win.webContents.capturePage()).toPNG());
        await win.webContents.executeJavaScript(`import('./src/dev/checks/ovesos-journey-smoke.js').then(async m=>{await m.rideJourney(window.__EXPLORATION__,'review');m.checkWatchResult(window.__EXPLORATION__);})`);
        await new Promise(resolve=>setTimeout(resolve,100));fs.writeFileSync(path.join(dir,'ovesos-journey-review.png'),(await win.webContents.capturePage()).toPNG());
        await win.webContents.executeJavaScript(`import('./src/dev/checks/ovesos-journey-smoke.js').then(m=>m.rideJourney(window.__EXPLORATION__))`);
        const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/ovesos-journey-smoke.js').then(m=>{m.checkRegionalGround(window.__EXPLORATION__);return m.finishJourney(window.__EXPLORATION__,${JSON.stringify(setup.saved)});})`);
        fs.writeFileSync(path.join(dir,'ovesos-journey-result.png'),(await win.webContents.capturePage()).toPNG());
        fs.writeFileSync(path.join(dir,'ovesos-journey-checks.json'),JSON.stringify({...result,errors},null,2));console.log(JSON.stringify({...result,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--journey-survey')){
        const report=await win.webContents.executeJavaScript(`import('./src/dev/checks/ovesos-journey-survey.js').then(m=>m.surveyJourney(window.__EXPLORATION__))`);
        fs.writeFileSync(path.join(dir,'ovesos-journey-survey.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--ovesos-checks')){
        await win.webContents.executeJavaScript(`import('./src/dev/checks/ovesos-skirmish-smoke.js').then(m=>m.prepareOvesos(window.__EXPLORATION__))`);
        fs.writeFileSync(path.join(dir,'world-war-ovesos-fight.png'),(await win.webContents.capturePage()).toPNG());
        const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/ovesos-skirmish-smoke.js').then(m=>m.finishOvesos(window.__EXPLORATION__))`);
        fs.writeFileSync(path.join(dir,'world-war-ovesos-result.png'),(await win.webContents.capturePage()).toPNG());
        const report={...result,errors};fs.writeFileSync(path.join(dir,'world-war-ovesos-checks.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--war-map-checks')){
        const initial=await win.webContents.executeJavaScript(`import('./src/dev/checks/war-map-smoke.js').then(m=>m.checkWarMap(window.__EXPLORATION__))`);
        await new Promise(resolve=>setTimeout(resolve,200));
        fs.writeFileSync(path.join(dir,'world-war-army-map.png'),(await win.webContents.capturePage()).toPNG());
        const tracking=await win.webContents.executeJavaScript(`import('./src/dev/checks/war-map-smoke.js').then(m=>m.checkWarTracking(window.__EXPLORATION__))`);
        fs.writeFileSync(path.join(dir,'world-war-tracking.png'),(await win.webContents.capturePage()).toPNG());
        const report={initial,tracking,errors};fs.writeFileSync(path.join(dir,'world-war-army-map-checks.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));app.exit(errors.length||tracking.frameErrors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--interception-checks')){
        await win.webContents.executeJavaScript(`window.__EXPLORATION__.openDeveloper();document.getElementById('developer-autoplay').scrollIntoView({block:'center'});new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));`);
        fs.writeFileSync(path.join(dir,'world-war-scenario-buttons.png'),(await win.webContents.capturePage()).toPNG());
        const initial=await win.webContents.executeJavaScript(`import('./src/dev/checks/world-war-smoke.js').then(m=>m.checkInterceptionFeedback(window.__EXPLORATION__))`);
        fs.writeFileSync(path.join(dir,'world-war-interception-result.png'),(await win.webContents.capturePage()).toPNG());
        await win.webContents.executeJavaScript('window.__EXPLORATION__.war.withdraw()');
        await win.loadURL(win.webContents.getURL());await waitReady();
        const restored=await win.webContents.executeJavaScript(`import('./src/dev/checks/world-war-smoke.js').then(m=>m.checkWorldWarReload(window.__EXPLORATION__,${JSON.stringify(initial.saved)}))`);
        const report={initial,restored,errors};fs.writeFileSync(path.join(dir,'world-war-interception-checks.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest){
        const initial=await win.webContents.executeJavaScript(`import('./src/dev/checks/world-war-smoke.js').then(m=>m.checkWorldWar(window.__EXPLORATION__))`);
        await new Promise(resolve=>setTimeout(resolve,200));fs.writeFileSync(path.join(dir,'world-war-aftermath.png'),(await win.webContents.capturePage()).toPNG());
        await win.webContents.executeJavaScript(`(async()=>{const h=window.__EXPLORATION__;h.store.save(${JSON.stringify(initial.postEncounter)});await h.loadSaved();})()`);
        await new Promise(resolve=>setTimeout(resolve,200));fs.writeFileSync(path.join(dir,'world-war-skirmish-result.png'),(await win.webContents.capturePage()).toPNG());
        await win.webContents.executeJavaScript(`(async()=>{const h=window.__EXPLORATION__;h.store.save(${JSON.stringify(initial.preBattle)});await h.loadSaved();h.openMap();h.reveal(true);document.querySelector('[data-atlas-view="geopolitical"]').click();document.querySelector('#world-war-battles button').click();})()`);
        await new Promise(resolve=>setTimeout(resolve,400));fs.writeFileSync(path.join(dir,'world-war-map.png'),(await win.webContents.capturePage()).toPNG());
        await win.webContents.executeJavaScript(`window.__EXPLORATION__.resume()`);
        await new Promise(resolve=>setTimeout(resolve,400));fs.writeFileSync(path.join(dir,'world-war-battlefield.png'),(await win.webContents.capturePage()).toPNG());
        await win.webContents.executeJavaScript(`window.__EXPLORATION__.war.join();document.getElementById('fight-attacker').click();`);
        await new Promise(resolve=>setTimeout(resolve,300));fs.writeFileSync(path.join(dir,'world-war-fieldfight.png'),(await win.webContents.capturePage()).toPNG());
        await win.webContents.executeJavaScript(`window.__EXPLORATION__.war.withdraw()`);
        await win.webContents.executeJavaScript(`window.__EXPLORATION__.store.save(${JSON.stringify(initial.saved)})`);
        await win.loadURL(win.webContents.getURL());await waitReady();
        const restored=await win.webContents.executeJavaScript(`import('./src/dev/checks/world-war-smoke.js').then(m=>m.checkWorldWarReload(window.__EXPLORATION__,${JSON.stringify(initial.saved)}))`);
        const report={initial,restored,errors};fs.writeFileSync(path.join(dir,'world-war-checks.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));app.exit(errors.length?1:0);return;
      }
      const initial=await win.webContents.executeJavaScript(`import('./src/dev/checks/exploration-smoke.js').then(m=>m.checkExploration(window.__EXPLORATION__))`);
      fs.writeFileSync(path.join(dir,'exploration.png'),(await win.webContents.capturePage()).toPNG());
      await win.webContents.executeJavaScript('window.__EXPLORATION__.openMap()');
      await new Promise(resolve=>setTimeout(resolve,600));
      fs.writeFileSync(path.join(dir,'exploration-map.png'),(await win.webContents.capturePage()).toPNG());
      await win.webContents.executeJavaScript('window.__EXPLORATION__.openDeveloper()');
      await new Promise(resolve=>setTimeout(resolve,300));
      fs.writeFileSync(path.join(dir,'exploration-developer.png'),(await win.webContents.capturePage()).toPNG());
      for(const mount of ['horse','bat','dragon']){
        await win.webContents.executeJavaScript(`window.__EXPLORATION__.selectMount('${mount}')`);
        await new Promise(resolve=>setTimeout(resolve,600));
        fs.writeFileSync(path.join(dir,`exploration-${mount}.png`),(await win.webContents.capturePage()).toPNG());
      }
      await win.loadURL(win.webContents.getURL());await waitReady();
      const restored=await win.webContents.executeJavaScript(`import('./src/dev/checks/exploration-smoke.js').then(m=>m.checkExplorationReload(window.__EXPLORATION__,${JSON.stringify(initial.saved)}))`);
      const report={initial,restored,errors};fs.writeFileSync(path.join(dir,'exploration-checks.json'),JSON.stringify(report,null,2));
      console.log(JSON.stringify(report,null,2));app.exit(errors.length?1:0);
    }catch(error){console.error(error.stack);fs.writeFileSync(path.join(dir,'exploration-failure.png'),(await win.webContents.capturePage()).toPNG());app.exit(1);}
  }
}).catch(error=>{console.error(error);app.exit(1);});
