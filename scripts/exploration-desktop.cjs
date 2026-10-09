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
  if(test){
    const size=process.argv.find(arg=>arg.startsWith('--test-size='))?.match(/^--test-size=(\d{3,4})x(\d{3,4})$/);
    if(size&&+size[1]>=800&&+size[2]>=500)win.setContentSize(+size[1],+size[2]);
  }
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
        if(process.argv.includes('--session-performance-checks')){
          const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/session-performance-smoke.js').then(m=>m.profileCombat(window.__EXPLORATION__))`);
          fs.writeFileSync(path.join(dir,process.argv.includes('--profile-before')?'combat-performance-before.json':'combat-performance-after.json'),JSON.stringify({...result,errors},null,2));
          console.log(JSON.stringify({...result,errors},null,2));app.exit(errors.length?1:0);return;
        }
        if(process.argv.includes('--allied-cue-checks')){
          const results=[];
          for(const method of ['formation','reaction','breaking']){
            results.push(await win.webContents.executeJavaScript(`import('./src/dev/checks/allied-assault-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`));
            fs.writeFileSync(path.join(dir,'allied-assault-'+method+'.png'),(await win.webContents.capturePage()).toPNG());
          }
          fs.writeFileSync(path.join(dir,'allied-cue-checks.json'),JSON.stringify({results,errors},null,2));console.log(JSON.stringify({checks:results.at(-1).checks,errors},null,2));app.exit(errors.length?1:0);return;
        }
        if(process.argv.includes('--allied-resource-checks')){
          const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/allied-assault-smoke.js').then(async m=>{const a=window.__EXPLORATION__,solo=await m.solo(a),allied=await m.formation(a),cleanup=await m.disposal(a);return {...cleanup,comparison:{solo:solo.render,allied:allied.render}};}).catch(e=>{console.error(e.stack);throw e;})`);
          fs.writeFileSync(path.join(dir,'allied-resource-checks.json'),JSON.stringify({...result,errors},null,2));console.log(JSON.stringify({...result,errors},null,2));app.exit(errors.length?1:0);return;
        }
        await win.webContents.executeJavaScript(`import('./src/dev/checks/combat-testing-smoke.js').then(m=>m.checkCombatHelp(window.__EXPLORATION__))`);
        fs.writeFileSync(path.join(dir,'combat-testing-help.png'),(await win.webContents.capturePage()).toPNG());
        await win.webContents.executeJavaScript(`document.getElementById('world-skirmish-help').click()`);
        const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/combat-testing-smoke.js').then(m=>m.checkCombatExercises(window.__EXPLORATION__))`);
        if(process.argv.includes('--combat-focus-checks')){
          const focus=await win.webContents.executeJavaScript(`import('./src/dev/checks/combat-focus-smoke.js').then(m=>m.checkFocus(window.__EXPLORATION__))`);
          result.checks.push(...focus.checks);fs.writeFileSync(path.join(dir,'combat-focus.png'),(await win.webContents.capturePage()).toPNG());
        }
        if(process.argv.includes('--combat-readability-checks')){
          for(const method of ['thrust','opening','sweep','hurt','comeback','crowd']){
            const cues=await win.webContents.executeJavaScript(`import('./src/dev/checks/combat-readability-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`);
            result.checks.push(...cues.checks);fs.writeFileSync(path.join(dir,'combat-readability-'+method+'.png'),(await win.webContents.capturePage()).toPNG());
          }
        }
        if(process.argv.includes('--allied-assault-checks')){
          result.allied=[];
          for(const method of ['solo','formation','fighting','reaction','breaking','result','passive','disposal']){
            const check=await win.webContents.executeJavaScript(`import('./src/dev/checks/allied-assault-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`);
            result.allied.push({method,...check});fs.writeFileSync(path.join(dir,'allied-assault-'+method+'.png'),(await win.webContents.capturePage()).toPNG());
          }
        }
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
      if(warTest&&process.argv.includes('--allied-retreat-checks')){
        const results=[];
        for(const method of ['rout','evacuated','secure']){
          results.push(await win.webContents.executeJavaScript(`import('./src/dev/checks/allied-assault-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`));
          fs.writeFileSync(path.join(dir,'allied-retreat-'+method+'.png'),(await win.webContents.capturePage()).toPNG());
        }
        fs.writeFileSync(path.join(dir,'allied-retreat-checks.json'),JSON.stringify({results,errors},null,2));console.log(JSON.stringify({checks:results.at(-1).checks,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest&&(process.argv.includes('--allied-campaign-checks')||process.argv.includes('--allied-reaper-checks'))){
        const result=process.argv.includes('--allied-reaper-checks')?{}:await win.webContents.executeJavaScript(`import('./src/dev/checks/allied-assault-smoke.js').then(m=>m.campaign(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`);
        const recovery=await win.webContents.executeJavaScript(`import('./src/dev/checks/allied-assault-smoke.js').then(m=>m.reaper(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`);result.checks=recovery.checks;
        fs.writeFileSync(path.join(dir,'allied-campaign.png'),(await win.webContents.capturePage()).toPNG());
        fs.writeFileSync(path.join(dir,process.argv.includes('--allied-reaper-checks')?'allied-reaper-checks.json':'allied-campaign-checks.json'),JSON.stringify({...result,errors},null,2));console.log(JSON.stringify({checks:result.checks,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--resident-dialogue-checks')){
        const results=[];
        for(const method of ['residents','spellFocus']){
          results.push(await win.webContents.executeJavaScript(`import('./src/dev/checks/resident-dialogue-smoke.js').then(m=>m.${method}(window.__EXPLORATION__))`));
          fs.writeFileSync(path.join(dir,'resident-dialogue-'+method+'.png'),(await win.webContents.capturePage()).toPNG());
        }
        const report={checks:results.flatMap(r=>r.checks),results,errors};fs.writeFileSync(path.join(dir,'resident-dialogue-checks.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));app.exit(errors.length?1:0);return;
      }
      const captureReaper=async()=>{
        // Isolated visual fixture enters through the actual limbo host. It is
        // not a battle simulation check and never writes this fixture to disk.
        await win.webContents.executeJavaScript(`(async()=>{const a=window.__EXPLORATION__,p=a.state().position;a.afterlife.beforeFight();await a.afterlife.died({pending:{battleId:'visual-review'},side:'west',field:{hero:{x:p[0],z:p[2]}},report:'Visual review of the Reaper. The six existing choices are unchanged.'});a.look({yaw:0,pitch:.12,distance:8});await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));})()`);
        fs.writeFileSync(path.join(dir,'reaper-skeleton-room.png'),(await win.webContents.capturePage()).toPNG());
        await win.webContents.executeJavaScript(`(async()=>{const a=window.__EXPLORATION__;a.hold('KeyW',true);for(let i=0;i<16;i++)a.step(.04);a.hold('KeyW',false);a.look({yaw:.25,pitch:.05,distance:4});await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));if(a.state().frameErrors.length)throw Error('Reaper rendering error');})()`);
        fs.writeFileSync(path.join(dir,'reaper-skeleton-close.png'),(await win.webContents.capturePage()).toPNG());
        await win.webContents.executeJavaScript(`window.__EXPLORATION__.afterlife.talk();if(document.querySelectorAll('[data-afterlife]').length!==6)throw Error('Reaper choices changed')`);
        fs.writeFileSync(path.join(dir,'reaper-skeleton-dialogue.png'),(await win.webContents.capturePage()).toPNG());
      };
      if(warTest&&process.argv.includes('--camera-cost-checks')){
        const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/camera-cost-smoke.js').then(m=>m.compareCamera(window.__EXPLORATION__))`);
        fs.writeFileSync(path.join(dir,'camera-cost-checks.json'),JSON.stringify({...result,errors},null,2));console.log(JSON.stringify({...result,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--war-resource-checks')){
        const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/war-resource-smoke.js').then(m=>m.resources())`);
        fs.writeFileSync(path.join(dir,'war-resource-checks.json'),JSON.stringify({...result,errors},null,2));console.log(JSON.stringify({...result,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--first-session-checks')){
        const results=[];
        for(const method of ['departure','ride','battle']){
          results.push(await win.webContents.executeJavaScript(`import('./src/dev/checks/first-session-smoke.js').then(m=>m.${method}(window.__EXPLORATION__,${JSON.stringify(process.argv.includes('--east-side')?'east':'west')})).catch(e=>{console.error(e.stack);throw e;})`));
          fs.writeFileSync(path.join(dir,'first-session-'+method+'.png'),(await win.webContents.capturePage()).toPNG());
        }
        fs.writeFileSync(path.join(dir,'first-session-checks.json'),JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--session-performance-checks')){
        const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/session-performance-smoke.js').then(m=>m.profile(window.__EXPLORATION__))`);
        const label=process.argv.includes('--profile-before')?'before':'after';
        fs.writeFileSync(path.join(dir,'session-performance-'+label+'.json'),JSON.stringify({...result,errors},null,2));
        console.log(JSON.stringify({...result,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--reaper-review-only')){
        await captureReaper();console.log(JSON.stringify({checks:['Reaper player viewpoints captured','Six Reaper choices retained'],errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--battle-story-checks')){
        const results=[];
        for(const method of ['setupBattlefieldEntry','checkFootEntry','checkMountedEntry','checkAcceptedEntry','checkPartialBattleProgress','checkInterceptionReview','checkAssaultBriefing','checkAssaultReview','checkBattleResolution']){
          results.push(await win.webContents.executeJavaScript(`import('./src/dev/checks/battlefield-entry-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).then(r=>JSON.parse(JSON.stringify(r)))`));
          fs.writeFileSync(path.join(dir,'battle-story-'+method+'.png'),(await win.webContents.capturePage()).toPNG());
        }
        for(const method of ['result','taleth','mayor','priest','persisted']){
          results.push(await win.webContents.executeJavaScript(`import('./src/dev/checks/battle-story-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).then(r=>JSON.parse(JSON.stringify(r)))`));
          fs.writeFileSync(path.join(dir,'battle-story-'+method+'.png'),(await win.webContents.capturePage()).toPNG());
        }
        const report={checks:results.flatMap(r=>r.checks),results,errors};fs.writeFileSync(path.join(dir,'battle-story-checks.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--scene-revision-checks')){
        const results=[];
        for(const method of ['residents','handSpell','centralBattle','staffSpell','finish']){
          results.push(await win.webContents.executeJavaScript(`import('./src/dev/checks/scene-revision-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).then(r=>JSON.parse(JSON.stringify(r)))`));
          fs.writeFileSync(path.join(dir,'scene-revision-'+method+'.png'),(await win.webContents.capturePage()).toPNG());
        }
        if(process.argv.includes('--battlefield-checks'))for(const method of ['setupBattlefieldEntry','checkFootEntry','checkMountedEntry','checkAcceptedEntry','checkPartialBattleProgress','checkBattlePhaseCompletion']){
          results.push(await win.webContents.executeJavaScript(`import('./src/dev/checks/battlefield-entry-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).then(r=>JSON.parse(JSON.stringify(r)))`));
        }
        await captureReaper();
        const report={checks:results.flatMap(r=>r.checks),results,errors};fs.writeFileSync(path.join(dir,'scene-revision-checks.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks,performance:results[0].performance,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--council-checks')){
        const results=[];
        for(const [method,image] of [['checkTemple','temple'],['checkMayor','mayor'],['checkCouncilFlags','gates'],['checkBattleMap','battle-map'],['checkBarrier','barrier'],['checkFireball','fireball'],['checkSpellImpact','spell-impact']]){
          const running=win.webContents.executeJavaScript(`import('./src/dev/checks/council-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).then(r=>JSON.parse(JSON.stringify(r)))`);
          if(method==='checkTemple'){
            await win.webContents.executeJavaScript(`new Promise((resolve,reject)=>{const end=Date.now()+10000;const poll=()=>!document.getElementById('loading-screen').hidden?requestAnimationFrame(()=>requestAnimationFrame(resolve)):Date.now()>end?reject(Error('Loading veil not shown')):setTimeout(poll,50);poll();})`);
            fs.writeFileSync(path.join(dir,'council-loading.png'),(await win.webContents.capturePage()).toPNG());
          }
          results.push(await running);
          fs.writeFileSync(path.join(dir,'council-'+image+'.png'),(await win.webContents.capturePage()).toPNG());
        }
        const result={checks:results.flatMap(r=>r.checks),results,errors};fs.writeFileSync(path.join(dir,'council-checks.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({checks:result.checks,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--battlefield-checks')){
        const results=[];
        for(const [method,image] of [['setupBattlefieldEntry','boundary'],['checkFootEntry','foot-entry'],['checkMountedEntry','mounted-entry'],['checkAcceptedEntry','withdrawal'],['checkPartialBattleProgress','partial-progress'],['checkBattlePhaseCompletion','result']]){
          results.push(await win.webContents.executeJavaScript(`import('./src/dev/checks/battlefield-entry-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).then(r=>JSON.parse(JSON.stringify(r)))`));
          fs.writeFileSync(path.join(dir,'battlefield-'+image+'.png'),(await win.webContents.capturePage()).toPNG());
        }
        const result={checks:results.flatMap(r=>r.checks),results,errors};
        fs.writeFileSync(path.join(dir,'battlefield-checks.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({checks:result.checks,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--chronicle-checks')){
        const run=method=>win.webContents.executeJavaScript(`import('./src/dev/checks/chronicle-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).then(r=>JSON.parse(JSON.stringify(r))).catch(e=>{console.error(e.stack||String(e));throw e;})`);
        const results=[];
        await win.webContents.executeJavaScript('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
        fs.writeFileSync(path.join(dir,'chronicle-chamber.png'),(await win.webContents.capturePage()).toPNG());
        for(const [method,image] of [['checkChronicleOpening','empire'],['checkChronicleProgress','west'],['checkChronicleFinish','war'],['finishChronicle','return']]){
          results.push(await run(method));
          fs.writeFileSync(path.join(dir,'chronicle-'+image+'.png'),(await win.webContents.capturePage()).toPNG());
        }
        const result={checks:results.flatMap(r=>r.checks),results,errors};fs.writeFileSync(path.join(dir,'chronicle-checks.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--afterlife-checks')){
        const run=(file,method)=>win.webContents.executeJavaScript(`import('./src/dev/checks/${file}.js').then(m=>m.${method}(window.__EXPLORATION__)).then(r=>JSON.parse(JSON.stringify(r))).catch(e=>{console.error(e.stack||String(e));throw e;})`);
        const results=[];
        results.push(await run('tower-smoke','checkTowerOpening'));results.push(await run('tower-smoke','beginTowerCampaign'));
        if(process.argv.includes('--opening-horse-checks'))for(const method of ['meetBear','rideWithBear']){
          results.push(await run('stable-smoke',method));fs.writeFileSync(path.join(dir,'combat-route-'+method+'.png'),(await win.webContents.capturePage()).toPNG());
        }
        for(const [method,image] of [['setup','frontline'],['firstDeath','arrival'],['conversation','choices'],['retry',null],['ghost','ghost'],['undead','undead'],['tower','tower'],['leaveInLimbo',null]]){
          results.push(await run('afterlife-smoke',method));
          if(image)fs.writeFileSync(path.join(dir,'afterlife-'+image+'.png'),(await win.webContents.capturePage()).toPNG());
        }
        const navigated=new Promise(resolve=>win.webContents.once('did-finish-load',resolve));
        await win.webContents.executeJavaScript(`window.__EXPLORATION__.afterlife.choose('menu')`);await navigated;
        await win.webContents.executeJavaScript(`new Promise((resolve,reject)=>{const end=Date.now()+10000;const poll=()=>{const b=document.querySelector('[data-continue-mode="war"]');if(b&&!b.disabled){b.click();resolve();}else if(Date.now()>end)reject(Error('Limbo Continue unavailable'));else setTimeout(poll,50);};poll();})`);
        await waitReady();results.push(await run('afterlife-smoke','continued'));
        fs.writeFileSync(path.join(dir,'afterlife-continued.png'),(await win.webContents.capturePage()).toPNG());
        const result={checks:results.flatMap(r=>r.checks),results,errors};fs.writeFileSync(path.join(dir,'afterlife-checks.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--tower-checks')){
        const run=method=>win.webContents.executeJavaScript(`import('./src/dev/checks/tower-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).then(r=>JSON.parse(JSON.stringify(r))).catch(e=>{console.error(e.stack||String(e));throw new Error(String(e));})`);
        await win.webContents.executeJavaScript('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
        fs.writeFileSync(path.join(dir,'tower-arrival.png'),(await win.webContents.capturePage()).toPNG());
        const opening=await run('checkTowerOpening');
        fs.writeFileSync(path.join(dir,'tower-briefing.png'),(await win.webContents.capturePage()).toPNG());
        const departure=await run('beginTowerCampaign');
        fs.writeFileSync(path.join(dir,'tower-exterior.png'),(await win.webContents.capturePage()).toPNG());
        if(process.argv.includes('--minora-review-only')){
          await win.webContents.executeJavaScript(`(async()=>{const a=window.__EXPLORATION__;a.war.pause();await a.visit({x:-2414,z:65});a.look({yaw:0,pitch:.08,distance:7});await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));if(!document.getElementById('world-war-report-title').textContent.includes('West Lizeem'))throw Error('Opening report missed the nearby army');})()`);
          fs.writeFileSync(path.join(dir,'minora-integrated-door.png'),(await win.webContents.capturePage()).toPNG());
          await win.webContents.executeJavaScript(`(async()=>{const a=window.__EXPLORATION__;await a.visit({x:-2392,z:70});a.look({yaw:-Math.PI/2,pitch:.3,distance:8});a.hold('KeyW',true);try{for(let i=0;i<240;i++)a.step(.04);}finally{a.hold('KeyW',false);}if(a.state().position[0]<-2350)throw Error('Guild bridge crossing blocked');a.look({yaw:Math.PI/2,pitch:.25,distance:8});await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));if(a.state().frameErrors.length)throw Error('Minora rendering error');})()`);
          fs.writeFileSync(path.join(dir,'minora-integrated-bridge.png'),(await win.webContents.capturePage()).toPNG());
          console.log(JSON.stringify({checks:['Integrated Guild entrance captured from player camera','Opening report prioritizes day-three West march','Player walks across the corrected Guild Footbridge'],errors},null,2));app.exit(errors.length?1:0);return;
        }
        const stableRun=method=>win.webContents.executeJavaScript(`import('./src/dev/checks/stable-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).then(r=>JSON.parse(JSON.stringify(r))).catch(e=>{console.error(e.stack||String(e));throw new Error(String(e));})`);
        const meet=await stableRun('meetBear');
        fs.writeFileSync(path.join(dir,'tower-bear-lesson.png'),(await win.webContents.capturePage()).toPNG());
        const ride=await stableRun('rideWithBear');
        fs.writeFileSync(path.join(dir,'tower-horse.png'),(await win.webContents.capturePage()).toPNG());
        const swim=await win.webContents.executeJavaScript(`import('./src/dev/checks/horse-swim-smoke.js').then(m=>m.checkHorseSwimming(window.__EXPLORATION__)).then(r=>JSON.parse(JSON.stringify(r)))`);
        fs.writeFileSync(path.join(dir,'horse-swimming.png'),(await win.webContents.capturePage()).toPNG());
        if(process.argv.includes('--horse-swim-review-only')){
          for(const [name,yaw] of [['side',0],['reverse',Math.PI]]){
            await win.webContents.executeJavaScript(`window.__EXPLORATION__.look({yaw:${yaw},pitch:.3,distance:5});new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
            fs.writeFileSync(path.join(dir,'horse-swimming-'+name+'.png'),(await win.webContents.capturePage()).toPNG());
          }
          console.log(JSON.stringify({...swim,errors},null,2));app.exit(errors.length?1:0);return;
        }

        const guidanceRun=method=>win.webContents.executeJavaScript(`import('./src/dev/checks/war-guidance-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).then(r=>JSON.parse(JSON.stringify(r))).catch(e=>{console.error(e.stack||String(e));throw new Error(String(e));})`);
        const roadLight=await guidanceRun('roadLight');
        fs.writeFileSync(path.join(dir,'war-road-light.png'),(await win.webContents.capturePage()).toPNG());
        const column=await guidanceRun('column');
        fs.writeFileSync(path.join(dir,'war-marching-column.png'),(await win.webContents.capturePage()).toPNG());
        await guidanceRun('closeColumn');
        fs.writeFileSync(path.join(dir,'war-column-close.png'),(await win.webContents.capturePage()).toPNG());
        const handoff=await guidanceRun('handoff');
        const directions=await stableRun('checkWarDirections');
        fs.writeFileSync(path.join(dir,'tower-minimap-events.png'),(await win.webContents.capturePage()).toPNG());
        const scenarioMap=await stableRun('checkScenarioMap');
        fs.writeFileSync(path.join(dir,'tower-scenario-map.png'),(await win.webContents.capturePage()).toPNG());
        await win.webContents.executeJavaScript('window.__EXPLORATION__.resume()');
        const parked=await stableRun('parkAtTower');
        await win.webContents.executeJavaScript(`window.__EXPLORATION__.visit({x:-2414,z:53}).then(()=>window.__EXPLORATION__.tower.interact())`);
        await win.webContents.executeJavaScript('new Promise(r=>setTimeout(r,200))');
        const returned=await run('returnToTower');
        fs.writeFileSync(path.join(dir,'tower-return.png'),(await win.webContents.capturePage()).toPNG());
        const navigated=new Promise(resolve=>win.webContents.once('did-finish-load',resolve));
        await win.webContents.executeJavaScript(`window.__EXPLORATION__.pause();document.getElementById('return-start').click()`);await navigated;
        await win.webContents.executeJavaScript(`new Promise((resolve,reject)=>{const end=Date.now()+10000;const poll=()=>{const b=document.querySelector('[data-continue-mode="war"]');if(b&&!b.disabled){b.click();resolve();}else if(Date.now()>end)reject(Error('War Continue unavailable'));else setTimeout(poll,50);};poll();})`);await waitReady();
        const continued=await win.webContents.executeJavaScript(`({tower:window.__EXPLORATION__.tower.state(),campaign:window.__EXPLORATION__.war.state().campaign,riding:window.__EXPLORATION__.stable.snapshot(),errors:window.__EXPLORATION__.state().frameErrors})`);
        if(!continued.tower.inside||!continued.tower.briefed||continued.tower.exteriorLoaded||continued.tower.running||JSON.stringify(continued.campaign)!==JSON.stringify(returned.campaign)||continued.errors.length)throw Error('Fresh Continue did not restore the chamber and campaign');
        if(JSON.stringify(continued.riding)!==JSON.stringify(parked.riding))throw Error('Continue lost the parked horse');
        const result={checks:[...opening.checks,...departure.checks,...meet.checks,...ride.checks,...swim.checks,...roadLight.checks,...column.checks,...handoff.checks,...directions.checks,...scenarioMap.checks,...parked.checks,...returned.checks,'Exit to menu and Continue restore inside without rebuilding exterior'],readyMs:opening.initial.readyMs,errors};
        fs.writeFileSync(path.join(dir,'tower-continue.png'),(await win.webContents.capturePage()).toPNG());
        fs.writeFileSync(path.join(dir,'tower-checks.json'),JSON.stringify(result,null,2));
        if(process.argv.includes('--reaper-review'))await captureReaper();
        console.log(JSON.stringify(result,null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest){
        await win.webContents.executeJavaScript(`import('./src/dev/checks/tower-smoke.js').then(m=>m.prepareWarExterior(window.__EXPLORATION__))`);
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
        await win.webContents.executeJavaScript(`import('./src/dev/checks/ovesos-journey-smoke.js').then(async m=>{await m.rideJourney(window.__EXPLORATION__,'rally-brief');await m.checkRallyBriefing(window.__EXPLORATION__);})`);
        fs.writeFileSync(path.join(dir,'ovesos-rally-briefing.png'),(await win.webContents.capturePage()).toPNG());
        await win.webContents.executeJavaScript(`import('./src/dev/checks/ovesos-journey-smoke.js').then(async m=>{await m.rideJourney(window.__EXPLORATION__,'rally-fight');m.checkRallyFight(window.__EXPLORATION__);})`);
        fs.writeFileSync(path.join(dir,'ovesos-rally-fight.png'),(await win.webContents.capturePage()).toPNG());
        await win.webContents.executeJavaScript(`import('./src/dev/checks/ovesos-journey-smoke.js').then(m=>m.rideJourney(window.__EXPLORATION__,'rally-review'))`);
        fs.writeFileSync(path.join(dir,'ovesos-rally-review.png'),(await win.webContents.capturePage()).toPNG());
        await win.webContents.executeJavaScript(`import('./src/dev/checks/ovesos-journey-smoke.js').then(m=>m.rideJourney(window.__EXPLORATION__))`);
        const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/ovesos-journey-smoke.js').then(m=>{m.checkRegionalGround(window.__EXPLORATION__);return m.finishJourney(window.__EXPLORATION__,${JSON.stringify(setup.saved)});})`);
        fs.writeFileSync(path.join(dir,'ovesos-journey-result.png'),(await win.webContents.capturePage()).toPNG());
        await win.webContents.executeJavaScript(`import('./src/dev/checks/ovesos-journey-smoke.js').then(m=>m.checkRallyAftermath(window.__EXPLORATION__))`);
        fs.writeFileSync(path.join(dir,'ovesos-rally-aftermath.png'),(await win.webContents.capturePage()).toPNG());
        const branches=await win.webContents.executeJavaScript(`import('./src/dev/checks/ovesos-journey-smoke.js').then(m=>m.checkRallyChoices(window.__EXPLORATION__))`);result.checks=branches.checks;
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
