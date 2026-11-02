const {app,BrowserWindow,ipcMain,nativeImage}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {createCheckpointStore}=require('./checkpoint-store.cjs');
const {isPublicFile}=require('./public-file.cjs');
const root=path.resolve(__dirname,'..'),test=process.argv.includes('--smoke-test'),foodWorldTest=process.argv.includes('--food-world'),warTest=process.argv.includes('--world-war'),hearthfallTest=process.argv.includes('--hearthfall'),combatTest=process.argv.includes('--combat-testing');
const yunethreTest=process.argv.includes('--yunethre');
const oremindiTest=process.argv.includes('--oremindi');
const exploreLoadingTest=process.argv.includes('--explore-loading-checks');
const scenarioReview=process.argv.includes('--scenario-playthrough-review');
// Older feature checks start at their tower fixture; the arrival check uses
// the same new-game path players use, including the locked preparation door.
const caricasRedesign=process.argv.includes('--caricas-redesign-checks');
const uguthTrainingReview=process.argv.includes('--uguth-training-checks');
const uguthMarkerReview=process.argv.includes('--uguth-marker-checks');
const doorReview=process.argv.includes('--stillroom-door-checks'),arrivalTest=process.argv.includes('--stillroom-arrival-checks')||doorReview||caricasRedesign||uguthMarkerReview||uguthTrainingReview;
const canerdFixture=process.argv.includes('--canerd-life-checks')||process.argv.includes('--weather-checks');
const testQuery=test?'test=1&'+(process.argv.includes('--combat-hero-visibility-checks')||process.argv.includes('--campaign-map-time-checks')||process.argv.includes('--field-battle-checks')||process.argv.includes('--harbor-checks')||process.argv.includes('--tree-observation-checks')||process.argv.includes('--tree-scenery-review')||process.argv.includes('--taleth-guidance-checks')?'preview=adventure-war&':'')+(arrivalTest||scenarioReview?'menu=1&':exploreLoadingTest?'fixture=tower&menu=1&':canerdFixture?'fixture=canerd&load=fast&':'fixture=tower&load=fast&'):'';
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
  const foodWorldStore=createCheckpointStore({directory:path.join(root,'saves','lizeem-food-world-v1'),memoryOnly:test});
  const yunethreStore=createCheckpointStore({directory:path.join(root,'saves','yunethre'),memoryOnly:test});
  const oremindiStore=createCheckpointStore({directory:path.join(root,'saves','oremindi'),memoryOnly:test});
  const hearthfallStore=createCheckpointStore({directory:path.join(root,'saves','hearthfall'),memoryOnly:test});
  // A fixed preference slot shared by all launch modes. Loopback HTTP ports
  // change between launches, so browser localStorage alone is not durable here.
  const soundStore=createCheckpointStore({directory:path.join(root,'saves','sound'),memoryOnly:test});
  const arrivalStore=createCheckpointStore({directory:path.join(root,'saves','stillroom-arrival'),memoryOnly:test});
  const practiceStore=createCheckpointStore({directory:path.join(root,'saves','stillroom-practice'),memoryOnly:test});
  const birdLifeStore=createCheckpointStore({directory:path.join(root,'saves','bird-life-list'),memoryOnly:test});
  const treeLifeStore=createCheckpointStore({directory:path.join(root,'saves','tree-life-list'),memoryOnly:test});
  const personalStores={'azhora-stillroom-practice-v1':practiceStore,'azhora-bird-life-list-v1':birdLifeStore,'azhora-tree-life-list-v1':treeLifeStore};
  ipcMain.on('azhora:exploration-save',(event,operation,key,value)=>{
    if(Object.hasOwn(personalStores,key)&&event.sender===win?.webContents&&['get','set'].includes(operation)){
      event.returnValue=operation==='set'&&(typeof value!=='string'||value.length>8192)?{ok:false,reason:'Invalid personal record.'}:
        personalStores[key].handle(operation,'azhora-road-checkpoint-v1',value);return;
    }
    if(key==='azhora-stillroom-arrival-v1'&&event.sender===win?.webContents&&['get','set'].includes(operation)){
      const mode=new URL(event.sender.getURL()).searchParams.get('mode');
      event.returnValue=operation==='set'&&(mode!=='war'||typeof value!=='string'||value.length>4096)
        ?{ok:false,reason:'Invalid Stillroom checkpoint.'}:arrivalStore.handle(operation,'azhora-road-checkpoint-v1',value);return;
    }
    if(key==='azhora-sound-v1'&&event.sender===win?.webContents&&['get','set'].includes(operation)){
      event.returnValue=operation==='set'&&(typeof value!=='string'||value.length>256)?{ok:false,reason:'Invalid sound preferences.'}:
        soundStore.handle(operation,'azhora-road-checkpoint-v1',value);return;
    }
    const mode=new URL(event.sender.getURL()).searchParams.get('mode');
    const activeKey=mode==='oremindi'?'azhora-oremindi-v1':mode==='yunethre'?'azhora-yunethre-v1':mode==='food-world'?'azhora-lizeem-food-world-v1':mode==='combat'?null:mode==='hearthfall'?'azhora-hearthfall-v1':mode==='war'?'azhora-lizeem-world-v3':'azhora-exploration-v1';
    event.returnValue=event.sender===win?.webContents&&['azhora-oremindi-v1','azhora-yunethre-v1','azhora-lizeem-food-world-v1','azhora-hearthfall-v1','azhora-exploration-v1','azhora-lizeem-world-v1','azhora-lizeem-world-v2','azhora-lizeem-world-v3'].includes(key)&&['get','set'].includes(operation)&&(operation==='get'||key===activeKey)
      ?(key==='azhora-oremindi-v1'?oremindiStore:key==='azhora-yunethre-v1'?yunethreStore:key==='azhora-lizeem-food-world-v1'?foodWorldStore:key==='azhora-hearthfall-v1'?hearthfallStore:key==='azhora-lizeem-world-v3'?interceptionStore:key==='azhora-lizeem-world-v2'?battleStore:key==='azhora-lizeem-world-v1'?warStore:store).handle(operation,'azhora-road-checkpoint-v1',value):{ok:false,reason:'This mode cannot write that save slot.'};
  });
  server=http.createServer((req,res)=>{
    let pathname;
    try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end();return;}
    if(pathname==='/')pathname='/index.html';
    const file=path.resolve(root,'.'+pathname);
    const allowed=['/index.html','/exploration.html'].includes(pathname)||/^\/(src|assets|vendor)\//.test(pathname)||(test&&/^\/tests\/artifacts\/lookout-reference\/landscape\.(json|bin\.gz)$/.test(pathname));
    if(!allowed||!isPublicFile(root,file)){res.writeHead(403);res.end();return;}
    fs.readFile(file,(error,data)=>{
      if(error){res.writeHead(404);res.end();return;}
      res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');
      res.setHeader('Cache-Control','no-store');res.end(data);
    });
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  win=new BrowserWindow({width:1440,height:960,show:!test,title:'Azhora',backgroundColor:'#193c34',
    webPreferences:{preload:path.join(__dirname,'exploration-preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false,offscreen:test&&process.argv.includes('--internal-review')}});
  win.setMenuBarVisibility(false);
  if(test){
    const size=process.argv.find(arg=>arg.startsWith('--test-size='))?.match(/^--test-size=(\d{3,4})x(\d{3,4})$/);
    if(size&&+size[1]>=800&&+size[2]>=500)win.setContentSize(+size[1],+size[2]);
  }
  if(test&&!process.argv.includes('--internal-review'))win.once('ready-to-show',()=>win.showInactive());
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  const errors=[];
  win.webContents.on('console-message',(_e,level,message)=>{if(level>=3){errors.push(message);if(test)console.log('EXPLORATION_ERROR '+message);}if(test&&message.startsWith('EXPLORATION_'))console.log(message);});
  win.webContents.on('before-input-event',(_event,input)=>{if(input.type==='keyDown'&&(input.key==='F11'||input.alt&&input.key==='Enter'))win.setFullScreen(!win.isFullScreen());});
  await win.loadURL(`http://127.0.0.1:${server.address().port}/?${testQuery}${(process.argv.includes('--campaign-allegiance-menu-checks')||process.argv.includes('--tower-allegiance-checks')||process.argv.includes('--tower-floors-checks')||process.argv.includes('--guild-expansion-checks')||process.argv.includes('--guild-bird-checks')||process.argv.includes('--snero-window-checks')||process.argv.includes('--army-marker-checks')||process.argv.includes('--tower-training-checks')||process.argv.includes('--unified-war-checks'))?'menu=1&':''}${(process.argv.includes('--campaign-directive-checks')||process.argv.includes('--minora-civic-checks'))?'mode=war&preview=adventure-war&campaign-side=west&':''}${process.argv.includes('--adventure-war-checks')?'mode=war&preview=adventure-war&':''}${process.argv.includes('--opening-clock-checks')?'mode=war&preview=shared-clock-opening&':''}${(process.argv.includes('--campaign-autoplay-checks')||process.argv.includes('--autoplay-takeover-checks')||process.argv.includes('--autoplay-modal-checks')||process.argv.includes('--autoplay-realtime-checks')||process.argv.includes('--autoplay-resilience-checks'))?'autoplay='+(process.argv.includes('--east-side')?'east':'west')+'&':''}${(process.argv.includes('--lookout-performance-checks')||process.argv.includes('--lookout-preview-checks')||process.argv.includes('--lookout-landscape-checks')||process.argv.includes('--lookout-tour-checks')||process.argv.includes('--lookout-life-checks'))?'preview=unattended-lookout&':''}${process.argv.includes('--lookout-door-checks')?'preview=unattended-lookout&':''}${oremindiTest?'mode=oremindi':yunethreTest?'mode=yunethre':foodWorldTest?'mode=food-world':combatTest?'mode=combat'+(test?'&menu=1':''):hearthfallTest?'mode=hearthfall'+(test?'':'&menu=1'):warTest?'war=1':''}`);
  if(test){
    const dir=path.join(root,'tests','artifacts');fs.mkdirSync(dir,{recursive:true});
    try{
      const waitReady=(timeout=300000)=>win.webContents.executeJavaScript(`new Promise((resolve,reject)=>{const end=Date.now()+${timeout};const poll=()=>window.__EXPLORATION__?resolve():window.__EXPLORATION_ERROR__?reject(new Error(window.__EXPLORATION_ERROR__)):Date.now()>end?reject(new Error('Exploration did not initialize')):setTimeout(poll,100);poll();})`);
      if(oremindiTest&&process.argv.includes('--oremindi-cinematic-checks')){
        const results=[],deadline=setTimeout(()=>{console.error('EXPLORATION_OREMINDI_CINEMATIC_TIMEOUT');app.exit(1);},600000);
        try{
          await waitReady(600000);
          for(const stage of ['column','gate','standards','messenger','complete']){
            console.log('EXPLORATION_OREMINDI_CINEMATIC_STAGE '+stage);
            const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/oremindi-cinematic-checks.js').then(m=>m.review(window.__EXPLORATION__,${JSON.stringify(stage)}))`);
            results.push(result);fs.writeFileSync(path.join(dir,'oremindi-cinematic-'+stage+'.png'),(await win.webContents.capturePage()).toPNG());
            fs.writeFileSync(path.join(dir,'oremindi-cinematic-checks.json'),JSON.stringify({results,errors},null,2));
          }
          console.log('EXPLORATION_OREMINDI_CINEMATIC_COMPLETE '+JSON.stringify({stages:results.length,errors}));app.exit(errors.length?1:0);return;
        }finally{clearTimeout(deadline);}
      }
      if(oremindiTest&&process.argv.includes('--oremindi-refuge-checks')){
        const results=[],deadline=setTimeout(()=>{console.error('EXPLORATION_OREMINDI_REFUGE_TIMEOUT');app.exit(1);},600000);
        try{
          await waitReady(600000);
          for(const stage of ['tower-lake','lookout-mountains','lookout-lake','alpine-wildlife','traverse']){
            console.log('EXPLORATION_OREMINDI_REFUGE_STAGE '+stage);
            const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/oremindi-refuge-visual.js').then(m=>m.review(window.__EXPLORATION__,${JSON.stringify(stage)}))`);
            results.push(result);fs.writeFileSync(path.join(dir,'oremindi-refuge-'+stage+'.png'),(await win.webContents.capturePage()).toPNG());
            fs.writeFileSync(path.join(dir,'oremindi-refuge-checks.json'),JSON.stringify({results,errors},null,2));
          }
          console.log('EXPLORATION_OREMINDI_REFUGE_COMPLETE '+JSON.stringify({stages:results.length,errors}));app.exit(errors.length?1:0);return;
        }finally{clearTimeout(deadline);}
      }
      if(oremindiTest){
        const results=[],deadline=setTimeout(()=>{fs.writeFileSync(path.join(dir,'oremindi-checks-timeout.json'),JSON.stringify({reason:'Chapter 3 review exceeded ten minutes',results,errors},null,2));console.error('EXPLORATION_OREMINDI_TIMEOUT');app.exit(1);},600000);
        try{
          await waitReady(600000);
          for(const stage of ['opening','refuge-exterior','refuge','lookout','rangers','combat-controls','combat-return','ambush-briefing','ambush-result','proof','rendezvous','battle-result','report','journal','map']){
            console.log('EXPLORATION_OREMINDI_STAGE '+stage);
            const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/oremindi-checks.js').then(m=>m.review(window.__EXPLORATION__,${JSON.stringify(stage)}))`);
            results.push(result);fs.writeFileSync(path.join(dir,'oremindi-'+stage+'.png'),(await win.webContents.capturePage()).toPNG());
            fs.writeFileSync(path.join(dir,'oremindi-checks.json'),JSON.stringify({results,errors},null,2));
          }
          const expected=await win.webContents.executeJavaScript('window.__EXPLORATION__.store.read().data');
          await win.loadURL(win.webContents.getURL());await waitReady(600000);
          const restored=await win.webContents.executeJavaScript(`import('./src/dev/checks/oremindi-checks.js').then(m=>m.restored(window.__EXPLORATION__,${JSON.stringify({chapter:expected.chapter,history:expected.history})}))`);
          fs.writeFileSync(path.join(dir,'oremindi-restored.png'),(await win.webContents.capturePage()).toPNG());
          fs.writeFileSync(path.join(dir,'oremindi-checks.json'),JSON.stringify({results,restored,errors},null,2));
          console.log('EXPLORATION_OREMINDI_COMPLETE '+JSON.stringify({stages:results.length,restored:restored.reported,errors}));app.exit(errors.length?1:0);return;
        }finally{clearTimeout(deadline);}
      }
      if(yunethreTest&&(process.argv.includes('--yunethre-cavalry-checks')||process.argv.includes('--yunethre-camp-checks'))){
        await waitReady();const results=[];
        const campOnly=process.argv.includes('--yunethre-camp-checks');
        for(const stage of campOnly?['camp','conversation','bane']:['camp','conversation','briefing','controls','field','result','mounted-return','campaign']){
          const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/yunethre-cavalry-smoke.js').then(m=>m.review(window.__EXPLORATION__,${JSON.stringify(stage)}))`);
          results.push(result);console.log('EXPLORATION_CAVALRY '+JSON.stringify(result));
          fs.writeFileSync(path.join(dir,'yunethre-cavalry-'+stage+'.png'),(await win.webContents.capturePage()).toPNG());
        }
        fs.writeFileSync(path.join(dir,campOnly?'yunethre-camp-checks.json':'yunethre-cavalry-checks.json'),JSON.stringify({results,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(yunethreTest&&process.argv.includes('--laketown-checks')){
        await waitReady();const results=[];
        for(const stage of ['town','conversation','rowan','waterfront','fishing']){
          const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/laketown-smoke.js').then(m=>m.review(window.__EXPLORATION__,${JSON.stringify(stage)}))`);
          results.push(result);console.log('EXPLORATION_LAKETOWN '+JSON.stringify(result));
          fs.writeFileSync(path.join(dir,'laketown-'+stage+'.png'),(await win.webContents.capturePage()).toPNG());
        }
        fs.writeFileSync(path.join(dir,'laketown-checks.json'),JSON.stringify({results,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(yunethreTest&&process.argv.includes('--yunethre-journal-checks')){
        await waitReady();const results=[];
        for(const stage of ['initial','progress','chapter-two','chapter-one','celder']){
          const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/yunethre-journal-smoke.js').then(m=>m.review(window.__EXPLORATION__,${JSON.stringify(stage)}))`);
          results.push(result);console.log('EXPLORATION_YUNETHRE_JOURNAL '+JSON.stringify(result));
          fs.writeFileSync(path.join(dir,'yunethre-journal-'+stage+'.png'),(await win.webContents.capturePage()).toPNG());
        }
        fs.writeFileSync(path.join(dir,'yunethre-journal.json'),JSON.stringify({results,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(yunethreTest&&process.argv.includes('--yunethre-resident-checks')){
        await waitReady();
        const result=await win.webContents.executeJavaScript("import('./src/dev/checks/yunethre-residents-smoke.js').then(m=>m.conversations(window.__EXPLORATION__))");
        fs.writeFileSync(path.join(dir,'yunethre-residents.png'),(await win.webContents.capturePage()).toPNG());
        fs.writeFileSync(path.join(dir,'yunethre-residents.json'),JSON.stringify({result,errors},null,2));
        console.log('EXPLORATION_YUNETHRE_RESIDENTS '+JSON.stringify({result,errors}));app.exit(errors.length?1:0);return;
      }
      if(yunethreTest&&process.argv.includes('--yunethre-art-checks')){
        await waitReady();const results=[];
        for(const name of ['departure','map','town','fields','camp','celder']){
          const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/yunethre-art-smoke.js').then(m=>m.visit(window.__EXPLORATION__,${JSON.stringify(name)}))`);
          results.push(result);console.log('EXPLORATION_YUNETHRE_ART '+JSON.stringify(result));
          fs.writeFileSync(path.join(dir,'yunethre-art-'+name+'.png'),(await win.webContents.capturePage()).toPNG());
        }
        fs.writeFileSync(path.join(dir,'yunethre-art-checks.json'),JSON.stringify({results,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(yunethreTest&&process.argv.includes('--yunethre-horse-checks')){
        await waitReady();
        const result=await win.webContents.executeJavaScript("import('./src/dev/checks/yunethre-autoplay-smoke.js').then(m=>m.horseReview(window.__EXPLORATION__))");
        fs.writeFileSync(path.join(dir,'yunethre-horse-review.png'),(await win.webContents.capturePage()).toPNG());
        fs.writeFileSync(path.join(dir,'yunethre-horse-review.json'),JSON.stringify({result,errors},null,2));
        console.log('EXPLORATION_YUNETHRE_HORSE '+JSON.stringify({result,errors}));app.exit(errors.length?1:0);return;
      }
      if(yunethreTest&&process.argv.includes('--yunethre-autoplay-checks')){
        await waitReady();const results=[];
        for(let i=0;i<50;i++){
          const result=await win.webContents.executeJavaScript("import('./src/dev/checks/yunethre-autoplay-smoke.js').then(m=>m.next(window.__EXPLORATION__))");
          results.push(result);console.log('EXPLORATION_YUNETHRE_AUTOPLAY '+JSON.stringify(result));
          fs.writeFileSync(path.join(dir,'yunethre-autoplay-checks.json'),JSON.stringify({results,errors},null,2));
          fs.writeFileSync(path.join(dir,'yunethre-autoplay-'+i+'.png'),(await win.webContents.capturePage()).toPNG());
          if(result.done){
            const horse=await win.webContents.executeJavaScript("import('./src/dev/checks/yunethre-autoplay-smoke.js').then(m=>m.horse(window.__EXPLORATION__))");
            fs.writeFileSync(path.join(dir,'yunethre-horse-summon.png'),(await win.webContents.capturePage()).toPNG());
            const savedHorse=await win.webContents.executeJavaScript("import('./src/dev/checks/yunethre-autoplay-smoke.js').then(m=>m.saveHorse(window.__EXPLORATION__))");
            await win.reload();await waitReady();
            const restored=await win.webContents.executeJavaScript("import('./src/dev/checks/yunethre-autoplay-smoke.js').then(m=>m.restored(window.__EXPLORATION__))");
            if(JSON.stringify(savedHorse)!==JSON.stringify(restored.horse))throw Error('The summoned horse changed on reload');
            fs.writeFileSync(path.join(dir,'yunethre-autoplay-checks.json'),JSON.stringify({results,horse,restored,errors},null,2));
            console.log('EXPLORATION_YUNETHRE_RESTORED '+JSON.stringify(restored));app.exit(errors.length?1:0);return;
          }
        }
        throw Error('Chapter 2 autoplay did not finish within its milestone budget');
      }
      if(yunethreTest){
        await waitReady();const results=[];
        for(const name of ['tower','laketown','centaurs','canerd','peace','accession','handoff']){
          const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/yunethre-chapter-smoke.js').then(m=>m[${JSON.stringify(name)}](window.__EXPLORATION__))`);
          results.push({name,...result});console.log('YUNETHRE '+name+' '+JSON.stringify(result));
          await win.webContents.executeJavaScript('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
          fs.writeFileSync(path.join(dir,'yunethre-'+name+'.png'),(await win.webContents.capturePage()).toPNG());
        }
        await win.reload();await waitReady();
        const restored=await win.webContents.executeJavaScript("import('./src/dev/checks/yunethre-chapter-smoke.js').then(m=>m.restored(window.__EXPLORATION__))");
        fs.writeFileSync(path.join(dir,'yunethre-checks.json'),JSON.stringify({results,restored,errors},null,2));
        console.log('YUNETHRE restored '+JSON.stringify(restored));app.exit(errors.length?1:0);return;
      }
      if(scenarioReview){
        const results=[],file=path.join(dir,'scenario-playthrough-review.json');
        if(process.argv.includes('--resume-review')){
          const previous=JSON.parse(fs.readFileSync(file,'utf8')),index=previous.results.findLastIndex(r=>r.checkpoint),saved=previous.results[index];
          if(!saved)throw Error('No real playthrough checkpoint to resume');
          results.push(...previous.results.slice(0,index+1));
          interceptionStore.handle('set','azhora-road-checkpoint-v1',JSON.stringify(saved.checkpoint));
          await win.reload();
          await new Promise(r=>setTimeout(r,1500));
          await win.webContents.executeJavaScript(`import('./src/dev/checks/scenario-playthrough-review.js').then(m=>m.resumeReview(${JSON.stringify(saved.reviewState)}))`);
        }
        try{
          for(let n=results.length;n<100;n++){
            const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/scenario-playthrough-review.js').then(m=>m.next()).then(v=>JSON.parse(JSON.stringify(v)))`);
            results.push(result);fs.writeFileSync(file,JSON.stringify({results,errors,complete:result.done},null,2));
            fs.writeFileSync(path.join(dir,'scenario-review-'+String(n).padStart(2,'0')+'-'+result.label+'.png'),(await win.webContents.capturePage()).toPNG());
            console.log('SCENARIO_REVIEW '+JSON.stringify({n,label:result.label,next:result.stage,detail:result.detail,clock:result.clock?.elapsedSeconds,position:result.position,winner:result.campaign?.winner}));
            if(result.done){app.exit(errors.length?1:0);return;}
          }
          throw Error('Scenario review exceeded stage allowance');
        }catch(error){
          console.log('SCENARIO_REVIEW_FAILURE '+error.message);
          const diagnostic=await win.webContents.executeJavaScript(`import('./src/dev/checks/scenario-playthrough-review.js').then(m=>JSON.parse(JSON.stringify(m.diagnostic())))`);
          fs.writeFileSync(file,JSON.stringify({results,errors,complete:false,failure:error.message,diagnostic},null,2));
          fs.writeFileSync(path.join(dir,'scenario-review-blocked.png'),(await win.webContents.capturePage()).toPNG());throw error;
        }
      }
      if(uguthTrainingReview||process.argv.includes('--stillroom-arrival-checks')){
        const results=[];
        for(const name of ['begin','introduction','refuge','activities','challenge','uguthStance','uguth','retry','staff','block','dodge','fireball','militia','handoff','portal','taleth','returnVisit']){
          if(name==='taleth')await waitReady();
          const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/uguth-training-smoke.js').then(m=>m.${name}())`);
          results.push({name,...result});console.log('UGUTH_TRAINING '+name+' '+JSON.stringify(result));
          await win.webContents.executeJavaScript('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
          fs.writeFileSync(path.join(dir,'uguth-training-'+name+'.png'),(await win.webContents.capturePage()).toPNG());
          fs.writeFileSync(path.join(dir,'uguth-training-checks.json'),JSON.stringify({results,errors,complete:name==='returnVisit'},null,2));
        }
        app.exit(errors.length?1:0);return;
      }
      if(arrivalTest){
        const results=[],prefix=uguthMarkerReview?'uguth-marker':caricasRedesign?'caricas-redesign':doorReview?'stillroom-door':'stillroom-arrival';
        const run=async name=>{
          const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/${uguthMarkerReview?'uguth-marker':'stillroom-arrival'}-smoke.js').then(m=>m.${name}()).catch(e=>{console.error(e.stack);throw e;})`);
          results.push({name,...result});console.log('STILLROOM_ARRIVAL '+name+' '+JSON.stringify(result));
          fs.writeFileSync(path.join(dir,prefix+'-checks.json'),JSON.stringify({results,errors,complete:false},null,2));
          await win.webContents.executeJavaScript('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
          fs.writeFileSync(path.join(dir,prefix+'-'+name+'.png'),(await win.webContents.capturePage()).toPNG());
        };
        if(uguthMarkerReview){
          for(const name of ['handoff','nearby','cleared'])await run(name);
          fs.writeFileSync(path.join(dir,prefix+'-checks.json'),JSON.stringify({results,errors,complete:true},null,2));app.exit(errors.length?1:0);return;
        }
        if(caricasRedesign){
          for(const name of ['begin','introduction','skip','portal'])await run(name);
          await waitReady();for(const name of ['tower','openingWest'])await run(name);
          for(const name of ['town','minoraRoad','residents','bridge','map','battle']){
            const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/caricas-redesign-smoke.js').then(m=>m.${name}(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`);
            results.push({name,...result});console.log('CARICAS_REDESIGN '+name+' '+JSON.stringify(result));
            fs.writeFileSync(path.join(dir,prefix+'-'+name+'.png'),(await win.webContents.capturePage()).toPNG());
          }
          fs.writeFileSync(path.join(dir,prefix+'-checks.json'),JSON.stringify({results,errors,complete:true},null,2));app.exit(errors.length?1:0);return;
        }
        if(doorReview){
          for(const name of ['begin','introduction','refuge','doorApproach','doorSide','doorClose','lockedDoor','skip','doorApproved'])await run(name);
          fs.writeFileSync(path.join(dir,prefix+'-checks.json'),JSON.stringify({results,errors,complete:true},null,2));app.exit(errors.length?1:0);return;
        }
        for(const name of ['begin','introduction','refuge','lockedDoor','lesson','guard','goblin','goblinFallen','goblinReport','wolf','save'])await run(name);
        const menu=new URL(win.webContents.getURL());menu.searchParams.set('menu','1');await win.loadURL(menu.href);
        for(const name of ['continued','failed','bandit','militia','approval','advanced','portal'])await run(name);
        await waitReady();for(const name of ['tower','returnDoor','bird','openingWest'])await run(name);
        // A second fresh journey verifies that the temporary skip grants an
        // explicit exemption without recording invented victories.
        await win.loadURL(menu.href);for(const name of ['begin','introduction','skip','portal'])await run(name);
        await waitReady();await run('tower');await run('openingEast');
        fs.writeFileSync(path.join(dir,prefix+'-checks.json'),JSON.stringify({results,errors,complete:true},null,2));app.exit(errors.length?1:0);return;
      }
      if(process.argv.includes('--frontier-trial-design-review')||process.argv.includes('--expedition-trial-design-review')){
        const expedition=process.argv.includes('--expedition-trial-design-review');
        const info=await win.webContents.executeJavaScript(`import('./src/dev/checks/frontier-trial-design-review.js').then(m=>{window.__frontierReview=m.showFrontierTrialDesigns(${expedition});return window.__frontierReview.info;})`);
        await win.webContents.executeJavaScript('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
        fs.writeFileSync(path.join(dir,expedition?'expedition-trial-design-review.png':'frontier-trial-design-review.png'),(await win.webContents.capturePage()).toPNG());
        console.log('FRONTIER_TRIAL_DESIGNS '+JSON.stringify({info,errors}));app.exit(errors.length?1:0);return;
      }
      if(process.argv.includes('--advanced-trial-design-review')){
        const info=await win.webContents.executeJavaScript(`import('./src/dev/checks/advanced-trial-design-review.js').then(m=>{window.__advancedReview=m.showAdvancedTrialDesigns();return window.__advancedReview.info;})`);
        const dir=path.join(root,'tests','artifacts');fs.mkdirSync(dir,{recursive:true});
        await win.webContents.executeJavaScript('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
        fs.writeFileSync(path.join(dir,'advanced-trial-design-review.png'),(await win.webContents.capturePage()).toPNG());
        console.log('ADVANCED_TRIAL_DESIGNS '+JSON.stringify(info));app.exit(errors.length?1:0);return;
      }
      if(process.argv.includes('--orc-design-review')){
        const info=await win.webContents.executeJavaScript(`import('./src/dev/checks/orc-design-review.js').then(m=>{window.__orcReview=m.showOrcDesigns();return window.__orcReview.info;})`);
        await win.webContents.executeJavaScript('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
        fs.writeFileSync(path.join(dir,'orc-design-review.png'),(await win.webContents.capturePage()).toPNG());
        await win.webContents.executeJavaScript('window.__orcReview.dispose();delete window.__orcReview');
        console.log('ORC_DESIGN_REVIEW '+JSON.stringify({info,errors}));app.exit(errors.length?1:0);return;
      }
      if(process.argv.includes('--lookout-door-checks')){
        await waitReady();const results=[];
        for(const method of ['entrance','descent']){
          const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/lookout-door-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`);
          results.push({method,...result});fs.writeFileSync(path.join(dir,'lookout-door-'+method+'.png'),(await win.webContents.capturePage()).toPNG());
        }
        fs.writeFileSync(path.join(dir,'lookout-door-checks.json'),JSON.stringify({results,errors},null,2));console.log('LOOKOUT_DOOR '+JSON.stringify({results,errors}));app.exit(errors.length?1:0);return;
      }
      if(process.argv.includes('--music-checks')){
        win.webContents.setAudioMuted(true);await waitReady();
        const results=await win.webContents.executeJavaScript(`import('./src/dev/checks/music-smoke.js').then(m=>m.opening(window.__EXPLORATION__))`,true);
        const prefix=foodWorldTest?'food-music':warTest?'war-music':'explore-music';
        fs.writeFileSync(path.join(dir,prefix+'-settings.png'),(await win.webContents.capturePage()).toPNG());
        if(foodWorldTest||warTest){
          await win.webContents.executeJavaScript(`import('./src/dev/checks/music-smoke.js').then(m=>m.nowPlaying(window.__EXPLORATION__))`);
          fs.writeFileSync(path.join(dir,prefix+'-now-playing.png'),(await win.webContents.capturePage()).toPNG());
        }
        const preview=await win.webContents.executeJavaScript(`import('./src/dev/checks/music-smoke.js').then(m=>m.renderPreview())`);
        fs.writeFileSync(path.join(dir,'music-first-pass.wav'),Buffer.from(preview.wav,'base64'));delete preview.wav;
        const maximum=await win.webContents.executeJavaScript(`import('./src/dev/checks/music-smoke.js').then(m=>m.renderPreview({settings:{music:1,nature:1},encode:false}))`);
        if(process.argv.includes('--extended-music')){
          const pieces=[];
          for(const track of ['tower','country','night','battle','stillroom','duel']){
            const piece=await win.webContents.executeJavaScript(`import('./src/dev/checks/music-smoke.js').then(m=>m.renderPreview({track:'${track}',settings:{music:1,nature:1},encode:true}))`);
            fs.writeFileSync(path.join(dir,'music-expanded-'+track+'.wav'),Buffer.from(piece.wav,'base64'));delete piece.wav;pieces.push({track,...piece});
            console.log('EXTENDED_MUSIC '+JSON.stringify({track,seconds:piece.seconds,peak:piece.peak,maxVoices:piece.state.maxVoices}));
          }
          fs.writeFileSync(path.join(dir,'music-expanded.json'),JSON.stringify(pieces,null,2));
        }
        results.checks.push('Maximum music and nature volumes render without clipping');
        const menu=new URL(win.webContents.getURL());menu.searchParams.set('menu','1');await win.loadURL(menu.href);
        const restored=await win.webContents.executeJavaScript(`document.querySelector('#start-screen [data-audio="music"]')?.value`);
        if(restored!=='23')throw Error('Sound preferences did not survive returning to the launcher');
        results.checks.push('Preferences survive page disposal and launcher reload');
        fs.writeFileSync(path.join(dir,prefix+'-checks.json'),JSON.stringify({results,preview,maximum,errors,complete:true},null,2));
        console.log('EXPLORATION_MUSIC '+JSON.stringify({checks:results.checks.length,preview,maximumPeak:maximum.peak,errors}));app.exit(errors.length?1:0);return;
      }
      if(exploreLoadingTest){
        const results=[],prefix='explore-loading';
        const run=async(method,args='')=>{
          const value=await win.webContents.executeJavaScript(`import('./src/dev/checks/explore-loading-smoke.js').then(m=>m.${method}(${args})).catch(e=>{console.error(e.stack);throw e;})`);
          results.push({method,...value});console.log('EXPLORATION_LOADING_STAGE '+method+' '+JSON.stringify({checks:value.checks?.length,readyMs:value.readyMs}));
          fs.writeFileSync(path.join(dir,prefix+'-checks.json'),JSON.stringify({results,errors,complete:false},null,2));return value;
        };
        const capture=async name=>{await win.webContents.executeJavaScript('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');fs.writeFileSync(path.join(dir,prefix+'-'+name+'.png'),(await win.webContents.capturePage()).toPNG());};
        await run('menu');await capture('menu');
        await run('choose');await capture('fast-choice');
        await win.webContents.executeJavaScript(`import('./src/dev/checks/explore-loading-smoke.js').then(m=>m.selectFast())`);
        await waitReady();const fast=await run('fast','window.__EXPLORATION__');await capture('fast');
        const reloadURL=new URL(win.webContents.getURL());reloadURL.searchParams.set('menu','1');reloadURL.searchParams.delete('load');await win.loadURL(reloadURL.href);
        await run('menu');await run('choose','true');await capture('full-choice');
        // Full prepares every supported region; allow the real loading process
        // to finish on slower review machines without bypassing the countdown.
        await waitReady(900000);await run('full',`window.__EXPLORATION__,${JSON.stringify(fast.saved)}`);await capture('full-distant');
        fs.writeFileSync(path.join(dir,prefix+'-checks.json'),JSON.stringify({results,errors,complete:true},null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--unified-war-checks')){
        const profile=process.argv.includes('--unified-war-profile'),reload=process.argv.includes('--unified-war-continue'),clockOnly=process.argv.includes('--unified-war-clock'),minoraOnly=process.argv.includes('--unified-war-minora'),bearOnly=process.argv.includes('--unified-war-bear'),results=[],prefix=profile?'unified-war-profile':reload?'unified-war-continue':clockOnly?'unified-war-clock':minoraOnly?'unified-war-minora':bearOnly?'unified-war-bear':'unified-war';
        results.push({method:'menu',...await win.webContents.executeJavaScript(`import('./src/dev/checks/unified-war-smoke.js').then(m=>m.menu())`)});await waitReady();
        for(const method of (profile?['openingTower','departure','lookout','legacyLookout','reviewedLookout','groundProfile','caricasProfile']:reload?['openingTower','departure','openingMarch','laterMarch']:clockOnly?['openingTower','departure','stationaryClock']:minoraOnly?['openingTower','departure','minoraRoutes','minoraOpening','minoraEast','minoraRetreat']:bearOnly?['openingTower','bearArrival','bearOffer','bearAccept','bearOwnership']:['openingTower','departure','stationaryClock','farmland','openingMarch','report','firstBattle','laterMarch','roadside','lookout','finish'])){
          const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/unified-war-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`);
          results.push({method,...result});console.log('EXPLORATION_UNIFIED_WAR '+method+' '+JSON.stringify({checks:result.checks?.length,elapsed:result.clock?.elapsedSeconds,mode:result.mode,profile:result.profile}));
          fs.writeFileSync(path.join(dir,prefix+'-checks.json'),JSON.stringify({results,errors,complete:false},null,2));
          await win.webContents.executeJavaScript('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
          fs.writeFileSync(path.join(dir,prefix+'-'+method+'.png'),(await win.webContents.capturePage()).toPNG());
        }
        if(reload)for(const [prepare,verify]of [['prepareReload','continued'],['prepareLegacyReload','continuedLegacy']]){
          const expected=await win.webContents.executeJavaScript(`import('./src/dev/checks/unified-war-smoke.js').then(m=>m.${prepare}(window.__EXPLORATION__))`);
          const reloadURL=new URL(win.webContents.getURL());reloadURL.searchParams.set('menu','1');await win.loadURL(reloadURL.href);
          await win.webContents.executeJavaScript(`new Promise((resolve,reject)=>{const end=Date.now()+30000;const poll=()=>document.querySelector('[data-continue-mode="war"]')&&!document.querySelector('[data-continue-mode="war"]').disabled?resolve():Date.now()>end?reject(Error('Continue menu unavailable')):setTimeout(poll,50);poll();})`);
          results.push({method:'continueMenu',...await win.webContents.executeJavaScript(`import('./src/dev/checks/unified-war-smoke.js').then(m=>m.continueMenu())`)});await waitReady();
          const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/unified-war-smoke.js').then(m=>m.${verify}(window.__EXPLORATION__,${JSON.stringify(expected)}))`);
          results.push({method:verify,...result});console.log('EXPLORATION_UNIFIED_WAR '+verify+' '+JSON.stringify({checks:result.checks?.length,elapsed:result.clock?.elapsedSeconds,mode:result.mode}));
          fs.writeFileSync(path.join(dir,prefix+'-checks.json'),JSON.stringify({results,errors,complete:false},null,2));fs.writeFileSync(path.join(dir,prefix+'-'+verify+'.png'),(await win.webContents.capturePage()).toPNG());
        }
        fs.writeFileSync(path.join(dir,prefix+'-checks.json'),JSON.stringify({results,errors,complete:true},null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--snero-window-checks')){
        const results=[],prefix='snero-windows';
        await win.webContents.executeJavaScript(`import('./src/dev/checks/snero-window-smoke.js').then(m=>m.menu('war'))`);await waitReady();
        for(const [name,method,args] of [['opening','opening',[]],['drent','view',['drent']],['drent-left','view',['drent',-1.1]],['drent-right','view',['drent',1.1]],['drent-close','view',['drent',0,1]],['north','view',['cold-stones']],['south','view',['azhor-stones']],['west','view',['west-oremindi']],['finish','finish',[]]]){
          const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/snero-window-smoke.js').then(m=>m.${method}(window.__EXPLORATION__,...${JSON.stringify(args)})).then(r=>JSON.parse(JSON.stringify(r))).catch(e=>{console.error(e.stack);throw e;})`);
          results.push({method:name,...result});console.log('EXPLORATION_WINDOWS '+name+' '+JSON.stringify({checks:result.checks.length,cpuMs:result.windows.lastRenderMs,active:result.windows.views.filter(v=>v.active).map(v=>({id:v.id,loadMs:v.loadMs,drawCalls:v.drawCalls,triangles:v.triangles}))}));
          fs.writeFileSync(path.join(dir,prefix+'-checks.json'),JSON.stringify({results,errors,complete:false},null,2));
          fs.writeFileSync(path.join(dir,prefix+'-'+name+'.png'),(await win.webContents.capturePage()).toPNG());
        }
        fs.writeFileSync(path.join(dir,prefix+'-checks.json'),JSON.stringify({results,errors,complete:true},null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--guild-bird-checks')){
        const results=[],prefix='guild-birds';
        await win.webContents.executeJavaScript(`import('./src/dev/checks/guild-birds-smoke.js').then(m=>m.menu('war'))`);await waitReady();
        for(const id of ['opening','taleth','senro','hadrin','veyra','nessa','odran','helba','neris','oris','maelon','bolbur','finish']){
          const method=['opening','finish'].includes(id)?id:'review';
          const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/guild-birds-smoke.js').then(m=>m.${method}(window.__EXPLORATION__,'${id}')).then(r=>JSON.parse(JSON.stringify(r))).catch(e=>{console.error(e.stack);throw e;})`);
          results.push({method:id,...result});console.log('EXPLORATION_GUILD_BIRDS '+id+' '+JSON.stringify({checks:result.checks.length,render:result.render}));
          fs.writeFileSync(path.join(dir,prefix+'-checks.json'),JSON.stringify({results,errors,complete:false},null,2));
          fs.writeFileSync(path.join(dir,prefix+'-'+id+'.png'),(await win.webContents.capturePage()).toPNG());
        }
        fs.writeFileSync(path.join(dir,prefix+'-checks.json'),JSON.stringify({results,errors,complete:true},null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--guild-expansion-checks')){
        const hairReview=process.argv.includes('--guild-hair-checks'),dreamReview=process.argv.includes('--guild-dream-checks'),gardenReview=process.argv.includes('--guild-garden-checks'),mirrorReview=process.argv.includes('--guild-mirror-checks'),sanctuaryReview=process.argv.includes('--guild-sanctuary-only');
        const sanctuarySpecies=process.argv.find(a=>a.startsWith('--guild-sanctuary-species='))?.split('=')[1];
        const results=[],prefix=mirrorReview?'guild-mirror':gardenReview?'guild-garden':dreamReview?'guild-dream':hairReview?'guild-hair':sanctuaryReview?(sanctuarySpecies?'guild-sanctuary-detail':'guild-sanctuary'):'guild-expansion';
        await win.webContents.executeJavaScript(`import('./src/dev/checks/guild-expansion-smoke.js').then(m=>m.menu('war'))`);await waitReady();
        const stages=dreamReview?[['opening','opening'],['across','dreamRoom','across'],['ceiling','dreamRoom','ceiling'],['leave','dreamLeave']]:hairReview?[['opening','opening'],['nessa','hairReview',{id:'nessa'}],['nessa-above','hairReview',{id:'nessa',pitch:.8}],['veyra','hairReview',{id:'veyra'}],['helba','hairReview',{id:'helba'}]]:process.argv.includes('--guild-sanctuary-only')?[['setup','sanctuarySetup'],['sanctuary','sanctuary'],...['woodland','grassland','alpine','wetland'].map(id=>[id,'habitat',id]),['finish','finish']]:[['opening','opening'],...['veyra','nessa','odran','helba','neris','oris','maelon','bolbur'].flatMap(id=>[[id,id],[id+'-demo','demonstration']]),['sanctuary','sanctuary'],...['woodland','grassland','alpine','wetland'].map(id=>[id,'habitat',id]),['finish','finish']];
        const reviewStages=gardenReview?[['opening','opening'],['across','gardenRoom','across'],['beds','gardenRoom','beds'],['fungi','gardenRoom','fungi'],['canopy','gardenRoom','canopy'],['paths','gardenPaths'],['demonstration','demonstration']]:stages;
        const selectedStages=sanctuaryReview&&sanctuarySpecies?[['setup','setup'],['entry','enter'],[sanctuarySpecies,'animal',sanctuarySpecies]]:sanctuaryReview?[['setup','setup'],['entry','enter'],['north-trail','trail',0],['south-trail','trail',1],...['american-bison','moose','elk','white-tailed-deer','american-black-bear','gray-wolf','red-fox','raccoon','north-american-beaver','north-american-river-otter','bald-eagle','wild-turkey'].map(id=>[id,'animal',id]),['return','saveReturn']]:mirrorReview?[['opening','opening'],...['plain','elf','goblin','mask','restore'].map(kind=>[kind,'review',kind]),['walking','walking'],['hidden','hidden'],['leave','leave']]:reviewStages;
        for(const [name,method,arg] of selectedStages){
          const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/${sanctuaryReview?'guild-sanctuary':mirrorReview?'guild-mirror':'guild-expansion'}-smoke.js').then(m=>m.${method}(window.__EXPLORATION__,${JSON.stringify(arg??null)})).then(r=>JSON.parse(JSON.stringify(r))).catch(e=>{console.error(e.stack);throw e;})`);
          results.push({method:name,...result});console.log('EXPLORATION_GUILD_EXPANSION '+name+' '+JSON.stringify({checks:result.checks?.length,render:result.render}));
          fs.writeFileSync(path.join(dir,prefix+'-checks.json'),JSON.stringify({results,errors,complete:false},null,2));
          fs.writeFileSync(path.join(dir,prefix+'-'+name+'.png'),(await win.webContents.capturePage()).toPNG());
        }
        fs.writeFileSync(path.join(dir,prefix+'-checks.json'),JSON.stringify({results,errors,complete:true},null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--tower-floors-checks')){
        const results=[],prefix='tower-floors';
        results.push({method:'menu',...await win.webContents.executeJavaScript(`import('./src/dev/checks/tower-floors-smoke.js').then(m=>m.menu('war'))`)});await waitReady();
        if(process.argv.includes('--tower-sign-review')){
          const sheet=await win.webContents.executeJavaScript(`import('./src/dev/checks/tower-floors-smoke.js').then(m=>m.landingSignSheet())`);
          fs.writeFileSync(path.join(dir,'guild-sign-sheet.png'),Buffer.from(sheet.split(',')[1],'base64'));
          for(const id of ['helba','odran','nessa','veyra','senro','taleth','hadrin','neris','oris','maelon','bolbur']){
            const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/tower-floors-smoke.js').then(m=>m.landingSignReview(window.__EXPLORATION__,'${id}'))`);
            results.push({method:id,...result});fs.writeFileSync(path.join(dir,`guild-sign-${id}.png`),(await win.webContents.capturePage()).toPNG());
          }
          fs.writeFileSync(path.join(dir,'guild-sign-review.json'),JSON.stringify({results,errors,complete:true},null,2));app.exit(errors.length?1:0);return;
        }
        if(process.argv.includes('--tower-stair-window-review')){
          for(const args of [{floor:'helba',view:'up'},{floor:'helba',view:'wall'},{floor:'helba',view:'down'},{floor:'taleth',view:'up'},{floor:'maelon',view:'up'}]){
            const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/tower-floors-smoke.js').then(m=>m.stairWindowReview(window.__EXPLORATION__,${JSON.stringify(args)}))`);
            results.push({method:args.floor+'-'+args.view,...result});
            fs.writeFileSync(path.join(dir,`stair-window-${args.floor}-${args.view}.png`),(await win.webContents.capturePage()).toPNG());
          }
          fs.writeFileSync(path.join(dir,'stair-window-review.json'),JSON.stringify({results,errors,complete:true},null,2));app.exit(errors.length?1:0);return;
        }
        const stages=process.argv.includes('--tower-threshold-checks')?['opening','thresholds','thresholdLeft','thresholdRight']:process.argv.includes('--tower-conversation-checks')?['opening','conversationVeyra','conversationSnero','conversationHadrin','conversationReturnView','conversationBear']:['opening','stairway','lower','lowerConversation','senroDetails','sneroNorth','sneroSouth','sneroEast','sneroWest','senroLuggage','upper','upperConversation','workshop','workshopBench','workshopArmor','workshopBroom','returnAndRegressions'];
        for(const method of stages){
          const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/tower-floors-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`);
          results.push({method,...result});console.log('EXPLORATION_TOWER_FLOORS '+method+' '+JSON.stringify({checks:result.checks?.length,render:result.render}));
          fs.writeFileSync(path.join(dir,prefix+'-checks.json'),JSON.stringify({results,errors,complete:false},null,2));
          await win.webContents.executeJavaScript('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
          fs.writeFileSync(path.join(dir,prefix+'-'+method+'.png'),(await win.webContents.capturePage()).toPNG());
        }
        fs.writeFileSync(path.join(dir,prefix+'-checks.json'),JSON.stringify({results,errors,complete:true},null,2));app.exit(errors.length?1:0);return;
      }
      if((warTest||foodWorldTest)&&process.argv.includes('--tower-training-checks')){
        const results=[],prefix=foodWorldTest?'food-world-tower-training':'tower-training';
        results.push({method:'menu',...await win.webContents.executeJavaScript(`import('./src/dev/checks/tower-training-smoke.js').then(m=>m.menu('${foodWorldTest?'food-world':'war'}'))`)});await waitReady();
        for(const method of ['opening','lobbyView','staffReady','staff','fireballReady','fireball','counter','sparringFailure','returnAndRepeat','committed','concluded',...(process.argv.includes('--tower-training-lookout')?['lookout']:[]),'finish']){
          const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/tower-training-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`);
          results.push({method,...result});console.log('EXPLORATION_TOWER_TRAINING '+method+' '+JSON.stringify({...result,checks:result.checks?.length}));
          fs.writeFileSync(path.join(dir,prefix+'-checks.json'),JSON.stringify({results,errors,complete:false},null,2));
          fs.writeFileSync(path.join(dir,prefix+'-'+method+'.png'),(await win.webContents.capturePage()).toPNG());
        }
        fs.writeFileSync(path.join(dir,prefix+'-checks.json'),JSON.stringify({results,errors,complete:true},null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--army-marker-checks')){
        const results=[],prefix='army-marker';
        results.push({method:'menu',...await win.webContents.executeJavaScript(`import('./src/dev/checks/army-marker-smoke.js').then(m=>m.menu())`)});await waitReady();
        for(const method of ['prepare','westDeparture','westMarch','westPhysical','westBattle','eastDeparture','eastMarch','eastPhysical','eastBattle']){
          const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/army-marker-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`);
          results.push({method,...result});console.log('EXPLORATION_ARMY_MARKER '+method+' '+JSON.stringify({...result,checks:result.checks?.length}));
          fs.writeFileSync(path.join(dir,prefix+'-checks.json'),JSON.stringify({results,errors,complete:false},null,2));
          fs.writeFileSync(path.join(dir,prefix+'-'+method+'.png'),(await win.webContents.capturePage()).toPNG());
        }
        fs.writeFileSync(path.join(dir,prefix+'-checks.json'),JSON.stringify({results,errors,complete:true},null,2));app.exit(errors.length?1:0);return;
      }
      if((warTest||foodWorldTest)&&process.argv.includes('--tower-allegiance-checks')){
        const prefix=foodWorldTest?'food-world-tower-allegiance':'tower-allegiance',results=[];
        const menu=await win.webContents.executeJavaScript(`import('./src/dev/checks/tower-allegiance-smoke.js').then(m=>m.menu('${foodWorldTest?'food-world':'war'}'))`);
        results.push({method:'menu',...menu});await waitReady();
        for(const method of ['explore','history','westChoice','eastChoice',...(process.argv.includes('--tower-exterior')?['exterior']:[])]){
          const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/tower-allegiance-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`);
          results.push({method,...result});console.log('EXPLORATION_TOWER_ALLEGIANCE '+method+' '+JSON.stringify({...result,checks:result.checks?.length}));
          fs.writeFileSync(path.join(dir,prefix+'-checks.json'),JSON.stringify({results,errors,complete:false},null,2));
          fs.writeFileSync(path.join(dir,prefix+'-'+method+'.png'),(await win.webContents.capturePage()).toPNG());
        }
        fs.writeFileSync(path.join(dir,prefix+'-checks.json'),JSON.stringify({results,errors,complete:true},null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--campaign-allegiance-menu-checks')){
        const menu=await win.webContents.executeJavaScript(`import('./src/dev/checks/campaign-directive-smoke.js').then(m=>m.menu())`);
        await win.webContents.executeJavaScript('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
        fs.writeFileSync(path.join(dir,'campaign-allegiance-menu.png'),(await win.webContents.capturePage()).toPNG());
        if(process.argv.includes('--campaign-allegiance-menu-only')){
          fs.writeFileSync(path.join(dir,'campaign-allegiance-menu-only.json'),JSON.stringify({menu,errors},null,2));
          console.log(JSON.stringify({checks:menu.checks,errors}));app.exit(errors.length?1:0);return;
        }
        await waitReady();
        const launched=await win.webContents.executeJavaScript(`import('./src/dev/checks/campaign-directive-smoke.js').then(m=>m.menuLaunch(window.__EXPLORATION__))`);
        fs.writeFileSync(path.join(dir,'campaign-allegiance-start.png'),(await win.webContents.capturePage()).toPNG());
        fs.writeFileSync(path.join(dir,'campaign-allegiance-menu-checks.json'),JSON.stringify({menu,launched,errors},null,2));
        console.log(JSON.stringify({checks:launched.checks,errors}));app.exit(errors.length?1:0);return;
      }
      if(combatTest){
        await win.webContents.executeJavaScript(`import('./src/dev/checks/combat-testing-smoke.js').then(m=>m.checkCombatMenu())`);
        fs.writeFileSync(path.join(dir,'combat-testing-menu.png'),(await win.webContents.capturePage()).toPNG());
        if(!process.argv.includes('--combat-tempo-checks'))await win.webContents.executeJavaScript(`document.getElementById('combat-tempo').value='classic';document.getElementById('combat-tempo').dispatchEvent(new Event('change'))`);
        const trialControls=process.argv.includes('--trial-controls-checks'),trialMusic=process.argv.includes('--trial-music-checks');
        const firstExercise=process.argv.includes('--combat-trials-checks')||process.argv.includes('--advanced-trials-checks')||process.argv.includes('--frontier-trials-checks')||trialControls||trialMusic?'trials':'lesson';
        await win.webContents.executeJavaScript(`document.querySelector('[data-combat-exercise="${firstExercise}"]').click()`);
        await waitReady();
        await win.webContents.executeJavaScript(`new Promise(resolve=>{const poll=()=>window.__EXPLORATION__.state().mode==='skirmish'?requestAnimationFrame(()=>requestAnimationFrame(resolve)):setTimeout(poll,50);poll();})`);
        fs.writeFileSync(path.join(dir,'combat-testing-camp.png'),(await win.webContents.capturePage()).toPNG());
        if(trialMusic){
          win.webContents.setAudioMuted(true);
          const results=await win.webContents.executeJavaScript(`import('./src/dev/checks/trial-music-smoke.js').then(m=>m.check(window.__EXPLORATION__))`,true);
          fs.writeFileSync(path.join(dir,'trial-music-menu.png'),(await win.webContents.capturePage()).toPNG());
          const preview=await win.webContents.executeJavaScript(`import('./src/dev/checks/music-smoke.js').then(m=>m.renderPreview({stillroom:true}))`);
          fs.writeFileSync(path.join(dir,'stillroom-music-pass.wav'),Buffer.from(preview.wav,'base64'));delete preview.wav;
          const maximum=await win.webContents.executeJavaScript(`import('./src/dev/checks/music-smoke.js').then(m=>m.renderPreview({stillroom:true,settings:{music:1,nature:1},encode:false}))`);
          fs.writeFileSync(path.join(dir,'trial-music-checks.json'),JSON.stringify({results,preview,maximum,errors,complete:true},null,2));
          console.log('TRIAL_MUSIC '+JSON.stringify({checks:results.checks.length,preview,maximumPeak:maximum.peak,errors}));app.exit(errors.length?1:0);return;
        }
        if(process.argv.includes('--frontier-trials-checks')){
          const known=await win.webContents.executeJavaScript(`import('./src/gameplay/combat/combat-trials.js').then(m=>m.COMBAT_TRIALS.map(t=>t.id))`),selection=process.argv.find(a=>a.startsWith('--trial-check-ids='))?.split('=')[1],ids=selection?selection.split(','):known,results=[];
          if(ids.some(id=>!known.includes(id)))throw Error('Unknown selected trial ID');
          const report=selection?'selected-trials-native.json':'frontier-trials-native.json';
          for(const id of ids){
            const inspect=await win.webContents.executeJavaScript(`import('./src/dev/checks/frontier-trials-smoke.js').then(m=>m.inspect(window.__EXPLORATION__,${JSON.stringify(id)}))`);
            fs.writeFileSync(path.join(dir,'trial-'+id+'.png'),(await win.webContents.capturePage()).toPNG());
            const finish=await win.webContents.executeJavaScript(`import('./src/dev/checks/frontier-trials-smoke.js').then(m=>m.finish(window.__EXPLORATION__,${JSON.stringify(id)}))`);
            results.push({id,inspect,finish});console.log('FRONTIER_TRIAL '+JSON.stringify(finish));
            fs.writeFileSync(path.join(dir,report),JSON.stringify({results,errors,complete:false},null,2));
          }
          fs.writeFileSync(path.join(dir,report),JSON.stringify({results,errors,complete:true},null,2));app.exit(errors.length?1:0);return;
        }
        if(process.argv.includes('--advanced-trials-checks')){
          const results=[];
          for(const method of ['elf','dwarf','mage','troll','knight','interruptAndFinish']){
            const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/advanced-trials-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`);
            results.push({method,...result});console.log('ADVANCED_TRIALS '+method+' '+result.checks.length);
            fs.writeFileSync(path.join(dir,'advanced-trials-checks.json'),JSON.stringify({results,errors,complete:false},null,2));
            fs.writeFileSync(path.join(dir,'advanced-trials-'+method+'.png'),(await win.webContents.capturePage()).toPNG());
          }
          fs.writeFileSync(path.join(dir,'advanced-trials-checks.json'),JSON.stringify({results,errors,complete:true},null,2));app.exit(errors.length?1:0);return;
        }
        if(process.argv.includes('--combat-trials-checks')||trialControls){
          const results=[],report=trialControls?'trial-controls-native.json':'combat-trials-native.json';
          for(const method of trialControls?['room','chooseOpponent','fireballControls','controlsCleanup']:['room','goblin','wolf','bandit','militia','raider','soldier','warrior','veteran','orcVeteran','ogre','ogreStomp','result','cleanup','statsMenu','statsBriefing','statsRounds','statsCleanup','militiaWeapons','chooseOpponent','fireballControls','controlsCleanup']){
            const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/combat-trials-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`);
            results.push({method,...result});console.log('COMBAT_TRIALS '+method+' '+JSON.stringify(result));
            fs.writeFileSync(path.join(dir,report),JSON.stringify({results,errors,complete:false},null,2));
            fs.writeFileSync(path.join(dir,'combat-trials-'+method+'.png'),(await win.webContents.capturePage()).toPNG());
          }
          fs.writeFileSync(path.join(dir,report),JSON.stringify({results,errors,complete:true},null,2));app.exit(errors.length?1:0);return;
        }
        if(process.argv.includes('--combat-tempo-checks')){
          const results=[];
          for(const method of ['warning','opening','comparison','menu']){
            const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/combat-tempo-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`);
            results.push({method,...result});console.log('COMBAT_TEMPO '+method+' '+JSON.stringify(result));
            fs.writeFileSync(path.join(dir,'combat-tempo-native.json'),JSON.stringify({results,errors,complete:false},null,2));
            fs.writeFileSync(path.join(dir,'combat-tempo-'+method+'.png'),(await win.webContents.capturePage()).toPNG());
          }
          fs.writeFileSync(path.join(dir,'combat-tempo-native.json'),JSON.stringify({results,errors,complete:true},null,2));app.exit(errors.length?1:0);return;
        }
        if(process.argv.includes('--session-performance-checks')){
          const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/session-performance-smoke.js').then(m=>m.profileCombat(window.__EXPLORATION__))`);
          fs.writeFileSync(path.join(dir,process.argv.includes('--profile-before')?'combat-performance-before.json':'combat-performance-after.json'),JSON.stringify({...result,errors},null,2));
          console.log(JSON.stringify({...result,errors},null,2));app.exit(errors.length?1:0);return;
        }
        if(process.argv.includes('--assault-comparison-checks')){
          const results=[];
          for(const method of ['prepare','transition','result','compare']){
            const check=await win.webContents.executeJavaScript(`import('./src/dev/checks/assault-comparison-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`);
            if(check)results.push(check);
            fs.writeFileSync(path.join(dir,'assault-comparison-'+method+'.png'),(await win.webContents.capturePage()).toPNG());
          }
          fs.writeFileSync(path.join(dir,'assault-comparison-checks.json'),JSON.stringify({results,errors},null,2));console.log(JSON.stringify({checks:results.at(-1).checks,runs:results.at(-1).runs,errors},null,2));app.exit(errors.length?1:0);return;
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
      await waitReady();
      if(warTest&&process.argv.includes('--stable-care-checks')){
        const results=[];
        for(const method of ['greeting','departure','rounds','contact']){
          const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/stable-care-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`);
          results.push({method,...result});console.log('STABLE_CARE '+method+' '+JSON.stringify(result));
          fs.writeFileSync(path.join(dir,'stable-care-checks.json'),JSON.stringify({results,errors,complete:false},null,2));
          fs.writeFileSync(path.join(dir,'stable-care-'+method+'.png'),(await win.webContents.capturePage()).toPNG());
        }
        fs.writeFileSync(path.join(dir,'stable-care-checks.json'),JSON.stringify({results,errors,complete:true},null,2));app.exit(errors.length?1:0);return;
      }
      if((warTest||foodWorldTest)&&process.argv.includes('--livestock-checks')){
        const results=[];
        for(const method of ['prepare','grazing','collision','paused']){
          const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/livestock-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`);
          results.push({method,...result});console.log('EXPLORATION_LIVESTOCK '+method+' '+JSON.stringify(result));
          fs.writeFileSync(path.join(dir,'livestock-checks.json'),JSON.stringify({results,errors,complete:false},null,2));
          fs.writeFileSync(path.join(dir,'livestock-'+method+'.png'),(await win.webContents.capturePage()).toPNG());
        }
        fs.writeFileSync(path.join(dir,'livestock-checks.json'),JSON.stringify({results,errors,complete:true},null,2));app.exit(errors.length?1:0);return;
      }
      if((warTest||foodWorldTest)&&process.argv.includes('--farm-clearance-checks')){
        const results=[];
        for(const method of ['prepare','whiteBridge','whiteApproach','upper','lower']){
          const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/farm-clearance-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`);
          results.push({method,...result});console.log('EXPLORATION_FARM_CLEARANCE '+method+' '+JSON.stringify(result));
          fs.writeFileSync(path.join(dir,'farm-clearance-checks.json'),JSON.stringify({results,errors,complete:false},null,2));
          fs.writeFileSync(path.join(dir,'farm-clearance-'+method+'.png'),(await win.webContents.capturePage()).toPNG());
        }
        fs.writeFileSync(path.join(dir,'farm-clearance-checks.json'),JSON.stringify({results,errors,complete:true},null,2));app.exit(errors.length?1:0);return;
      }
      if((warTest||foodWorldTest)&&process.argv.includes('--lizeem-bridge-checks')){
        const results=[],prefix=foodWorldTest?'food-lizeem-bridges':'world-lizeem-bridges';
        for(const method of ['prepare','upper','lower','routes',...(process.argv.includes('--bridges-only')?[]:['openingWest','laterEast','retreat'])]){
          const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/lizeem-crossings-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`);
          results.push({method,...result});console.log('EXPLORATION_BRIDGES '+method+' '+JSON.stringify({checks:result.checks?.length,routes:result.routes}));
          fs.writeFileSync(path.join(dir,prefix+'-checks.json'),JSON.stringify({results,errors,complete:false},null,2));
          fs.writeFileSync(path.join(dir,prefix+'-'+method+'.png'),(await win.webContents.capturePage()).toPNG());
        }
        fs.writeFileSync(path.join(dir,prefix+'-checks.json'),JSON.stringify({results,errors,complete:true},null,2));app.exit(errors.length?1:0);return;
      }
      if((warTest||foodWorldTest)&&process.argv.includes('--marching-column-checks')){
        const results=[],prefix=(foodWorldTest?'food-world-marching':'world-war-marching')+(process.argv.includes('--convoy-only')?'-convoy':'');
        const methods=process.argv.includes('--convoy-only')?['prepare','convoy','laterEast','westApproach','westVictory','westResult','finish']:process.argv.includes('--roadside-only')?['prepare','alliedApproach','eastApproach','eastBattle','westApproach','westBattle','finish']:
          ['prepare','openingWest','openingEast','laterWest','laterEast','easternPlain','retreat','convoy',...(process.argv.includes('--columns-only')?[]:['alliedApproach','westApproach','westBattle','eastApproach','eastBattle']),'finish'];
        for(const method of methods){
          const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/marching-columns-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`);
          results.push({method,...result});console.log('EXPLORATION_MARCHING '+method+' '+JSON.stringify({...result,checks:result.checks?.length}));
          fs.writeFileSync(path.join(dir,prefix+'-checks.json'),JSON.stringify({results,errors,complete:false},null,2));
          fs.writeFileSync(path.join(dir,prefix+'-'+method+'.png'),(await win.webContents.capturePage()).toPNG());
        }
        fs.writeFileSync(path.join(dir,prefix+'-checks.json'),JSON.stringify({results,errors,complete:true},null,2));app.exit(errors.length?1:0);return;
      }
      if((warTest||foodWorldTest)&&process.argv.includes('--horse-jump-checks')){
        const results=[],prefix=foodWorldTest?'food-world-horse-jump':'horse-jump';
        for(const method of ['prepare','normalApex','normalLanding','developerApex','developerLanding','water']){
          const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/horse-jump-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`);
          results.push({method,...result});console.log('EXPLORATION_HORSE_JUMP '+method+' '+JSON.stringify(result));
          fs.writeFileSync(path.join(dir,prefix+'-'+method+'.png'),(await win.webContents.capturePage()).toPNG());
        }
        fs.writeFileSync(path.join(dir,prefix+'-checks.json'),JSON.stringify({results,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(foodWorldTest){
        const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/food-world-smoke.js').then(m=>m.checkFoodWorld(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`);
        fs.writeFileSync(path.join(dir,'food-world-map.png'),(await win.webContents.capturePage()).toPNG());
        for(const id of ['isareos','nethereum','caricas','ovesos','nesdor']){
          await win.webContents.executeJavaScript(`import('./src/dev/checks/food-world-smoke.js').then(m=>m.viewFoodRegion(window.__EXPLORATION__,'${id}'))`);
          fs.writeFileSync(path.join(dir,'food-world-'+id+'.png'),(await win.webContents.capturePage()).toPNG());
        }
        result.demo=[await win.webContents.executeJavaScript(`import('./src/dev/checks/food-world-smoke.js').then(m=>m.startFoodDemo(window.__EXPLORATION__))`)];
        for(let index=1;index<=6;index++){
          result.demo.push(await win.webContents.executeJavaScript(`import('./src/dev/checks/food-world-smoke.js').then(m=>m.foodDemoStage(window.__EXPLORATION__,${index}))`));
          fs.writeFileSync(path.join(dir,'food-demo-'+index+'.png'),(await win.webContents.capturePage()).toPNG());
        }
        result.demoRestored=await win.webContents.executeJavaScript(`import('./src/dev/checks/food-world-smoke.js').then(m=>m.finishFoodDemo(window.__EXPLORATION__))`);
        result.battle=await win.webContents.executeJavaScript(`import('./src/dev/checks/food-world-smoke.js').then(m=>m.enterFoodBattle(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`);
        fs.writeFileSync(path.join(dir,'food-world-battle.png'),(await win.webContents.capturePage()).toPNG());
        fs.writeFileSync(path.join(dir,'food-world-checks.json'),JSON.stringify({...result,errors},null,2));
        console.log(JSON.stringify({...result,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--minora-river-checks')){
        const results=[];
        await win.webContents.executeJavaScript(`import('./src/dev/checks/minora-river-smoke.js').then(m=>m.prepare(window.__EXPLORATION__))`);
        const names=process.argv.includes('--river-exterior-only')?['waterfront','bridge','galley']:['waterfront','bridge','galley','lookout'];
        for(const name of names){
          results.push({name,...await win.webContents.executeJavaScript(`import('./src/dev/checks/minora-river-smoke.js').then(m=>m.${name}(window.__EXPLORATION__))`)});
          fs.writeFileSync(path.join(dir,`minora-river-${name}.png`),(await win.webContents.capturePage()).toPNG());
        }
        fs.writeFileSync(path.join(dir,'minora-river.json'),JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results,errors}));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--river-connections-checks')){
        const results=[];
        await win.webContents.executeJavaScript(`import('./src/dev/checks/river-connections-smoke.js').then(m=>m.prepare(window.__EXPLORATION__))`);
        for(let i=0;i<7;i++){
          const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/river-connections-smoke.js').then(m=>m.view(window.__EXPLORATION__,${i}))`);
          results.push(result);fs.writeFileSync(path.join(dir,`river-confluence-${i}.png`),(await win.webContents.capturePage()).toPNG());
        }
        fs.writeFileSync(path.join(dir,'river-connections.json'),JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results,errors}));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--settlement-quality-checks')){
        const results=[],tag=process.argv.includes('--profile-before')?'before':'after';
        await win.webContents.executeJavaScript(`import('./src/dev/checks/settlement-quality-smoke.js').then(m=>m.prepare(window.__EXPLORATION__))`);
        for(const name of ['minora','caricas','nethereum','nethereumWide','nesdor','nesdorInn','nesdorWide','ovesos','ovesosWide','isareos']){
          const r=await win.webContents.executeJavaScript(`import('./src/dev/checks/settlement-quality-smoke.js').then(m=>m.view(window.__EXPLORATION__,'${name}')).catch(e=>{console.error(e.stack);throw e;})`);
          results.push({name,...r});console.log('SETTLEMENT_PROFILE '+JSON.stringify({name,...r}));
          fs.writeFileSync(path.join(dir,`settlement-${tag}-${name}.png`),(await win.webContents.capturePage()).toPNG());
        }
        fs.writeFileSync(path.join(dir,`settlement-${tag}.json`),JSON.stringify({results,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(process.argv.includes('--frontier-terrain-checks')){
        const results=[],tag=process.argv.includes('--profile-before')?'before':'after';
        for(const name of ['laketown','camp','meneth','menethGround','vastos','vastosGround','lotharn','lotharnGround']){
          const r=await win.webContents.executeJavaScript(`import('./src/dev/checks/frontier-terrain-smoke.js').then(m=>m.view(window.__EXPLORATION__,'${name}')).catch(e=>{console.error(e.stack);throw e;})`);
          results.push(r);console.log('TERRAIN_PROFILE '+JSON.stringify(r));
          fs.writeFileSync(path.join(dir,`frontier-${tag}-${name}.png`),(await win.webContents.capturePage()).toPNG());
        }
        fs.writeFileSync(path.join(dir,`frontier-${tag}.json`),JSON.stringify({results,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest&&(process.argv.includes('--caricas-polish-checks')||process.argv.includes('--countryside-polish-checks'))){
        const results=[],tag=process.argv.includes('--profile-before')?'before':'after';
        const rural=process.argv.includes('--countryside-polish-checks'),prefix=rural?'countryside':'caricas';
        for(const method of ['prepare',...(rural?['river','nethereum','nesdor','ovesos','isareos',...(tag==='after'?['navigation','riverAccess']:[])]:['approach','square','granary','overview',...(tag==='after'?['navigation']:[])])]){
          const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/caricas-polish-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`);
          if(result){results.push({method,...result});console.log('CARICAS_PROFILE '+JSON.stringify({method,...result}));}
          fs.writeFileSync(path.join(dir,`${prefix}-${tag}-${method}.png`),(await win.webContents.capturePage()).toPNG());
        }
        fs.writeFileSync(path.join(dir,`${prefix}-${tag}.json`),JSON.stringify({results,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(hearthfallTest){
        const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/hearthfall-smoke.js').then(m=>m.checkHearthfall(window.__EXPLORATION__))`);
        fs.writeFileSync(path.join(dir,'hearthfall-feradom.png'),(await win.webContents.capturePage()).toPNG());
        const navigated=new Promise(resolve=>win.webContents.once('did-finish-load',resolve));
        await win.webContents.executeJavaScript(`window.__EXPLORATION__.pause();document.getElementById('return-start').click()`);await navigated;
        const menu=await win.webContents.executeJavaScript(`new Promise((resolve,reject)=>{const end=Date.now()+10000;const poll=()=>{const b=document.getElementById('new-exploration');if(b?.onclick)return resolve({visible:!document.getElementById('start-screen').hidden,exploreDisabled:document.getElementById('continue-exploration').disabled,warDisabled:document.querySelector('[data-continue-mode="war"]').disabled,hearthfallHidden:!document.querySelector('[data-start-mode="hearthfall"],[data-continue-mode="hearthfall"]')});if(Date.now()>end)return reject(Error('Main menu unavailable'));setTimeout(poll,50);};poll();})`);
        if(!menu.visible||!menu.exploreDisabled||!menu.warDisabled||!menu.hearthfallHidden)throw Error('Main menu save isolation failed');
        fs.writeFileSync(path.join(dir,'hearthfall-continue-menu.png'),(await win.webContents.capturePage()).toPNG());
        const hearthfallURL=new URL(win.webContents.getURL());hearthfallURL.searchParams.set('mode','hearthfall');hearthfallURL.searchParams.delete('menu');await win.loadURL(hearthfallURL.href);await waitReady();
        const restored=await win.webContents.executeJavaScript(`window.__EXPLORATION__.store.read().data`);
        if(JSON.stringify(restored)!==JSON.stringify(result.saved))throw Error('Hearthfall changed on reload');
        result.checks.push('Exit returns to three-choice menu without exposing Hearthfall','Direct test launch restores the isolated checkpoint in a fresh renderer');
        fs.writeFileSync(path.join(dir,'hearthfall-checks.json'),JSON.stringify({...result,errors},null,2));
        console.log(JSON.stringify({...result,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest&&(process.argv.includes('--taleth-story-checks')||process.argv.includes('--taleth-lookout-checks'))){
        const results=[];
        const methods=process.argv.includes('--taleth-lookout-checks')?['settled','river','politics','east','complete']:['battle','letter','summons','river','politics','east','complete'];
        for(const method of methods){
          results.push(await win.webContents.executeJavaScript(`import('./src/dev/checks/taleth-story-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`));
          fs.writeFileSync(path.join(dir,'taleth-story-'+method+'.png'),(await win.webContents.capturePage()).toPNG());
        }
        const navigated=new Promise(resolve=>win.webContents.once('did-finish-load',resolve));
        await win.webContents.executeJavaScript(`document.getElementById('return-start').click()`);await navigated;
        await win.webContents.executeJavaScript(`new Promise((resolve,reject)=>{const end=Date.now()+10000;const poll=()=>{const b=document.querySelector('[data-continue-mode="war"]');if(b&&!b.disabled){b.click();resolve();}else if(Date.now()>end)reject(Error('Lookout Continue unavailable'));else setTimeout(poll,50);};poll();})`);
        await waitReady();results.push(await win.webContents.executeJavaScript(`import('./src/dev/checks/taleth-story-smoke.js').then(m=>m.continued(window.__EXPLORATION__))`));
        fs.writeFileSync(path.join(dir,'taleth-story-continued.png'),(await win.webContents.capturePage()).toPNG());
        fs.writeFileSync(path.join(dir,'taleth-story-checks.json'),JSON.stringify({results,errors},null,2));console.log(JSON.stringify({checks:[...new Set(results.flatMap(r=>r.checks))],errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--battle-review-checks')){
        const results=[],run=async method=>{const r=await win.webContents.executeJavaScript(`import('./src/dev/checks/battle-review-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`);results.push(r);fs.writeFileSync(path.join(dir,'battle-review-'+method+'.png'),(await win.webContents.capturePage()).toPNG());};
        for(const method of ['stable','briefing','victory'])await run(method);
        for(const [width,height] of [[1024,600],[390,844],[844,390]]){win.setContentSize(width,height);await new Promise(r=>setTimeout(r,150));await run('layout');fs.writeFileSync(path.join(dir,`battle-review-${width}x${height}.png`),(await win.webContents.capturePage()).toPNG());}
        win.setContentSize(1280,720);await new Promise(r=>setTimeout(r,150));
        for(let i=0;i<6;i++){win.webContents.sendInputEvent({type:'keyDown',keyCode:'Tab'});win.webContents.sendInputEvent({type:'keyUp',keyCode:'Tab'});await new Promise(r=>setTimeout(r,20));await run('layout');}
        await win.webContents.executeJavaScript(`document.getElementById('world-skirmish-continue').focus()`);
        win.webContents.sendInputEvent({type:'keyDown',keyCode:'Return'});win.webContents.sendInputEvent({type:'keyUp',keyCode:'Return'});
        for(const method of ['continued','soldiers','mounted'])await run(method);
        fs.writeFileSync(path.join(dir,'battle-review.json'),JSON.stringify({results,errors},null,2));console.log(JSON.stringify({checks:results.at(-1).checks,errors},null,2));app.exit(errors.length?1:0);return;
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
      if(warTest&&process.argv.includes('--surrounding-map-checks')){
        const results=[];
        for(const method of ['before','countries','nomads','stability']){
          const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/surrounding-map-smoke.js').then(m=>m.${method}(window.__EXPLORATION__))`);
          results.push({method,...result});console.log('EXPLORATION_SURROUNDINGS '+JSON.stringify({method,...result}));
          fs.writeFileSync(path.join(dir,'surrounding-map-'+method+'.png'),(await win.webContents.capturePage()).toPNG());
        }
        if(interceptionStore.handle('get','azhora-road-checkpoint-v1').value)throw Error('Surrounding chart wrote a normal save');
        fs.writeFileSync(path.join(dir,'surrounding-map-checks.json'),JSON.stringify({results,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--campaign-map-time-checks')){
        const results=[];
        for(const method of ['tower','playback','reading','returning','battle','waiting']){
          const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/campaign-map-time-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`);
          results.push({method,...result});
          fs.writeFileSync(path.join(dir,'campaign-map-time-'+method+'.png'),(await win.webContents.capturePage()).toPNG());
          fs.writeFileSync(path.join(dir,'campaign-map-time-checks.json'),JSON.stringify({results,errors,complete:false},null,2));
        }
        fs.writeFileSync(path.join(dir,'campaign-map-time-checks.json'),JSON.stringify({results,errors,complete:true},null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--combat-hero-visibility-checks')){
        const results=[];
        for(const method of ['opening','mounted','reentry']){
          const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/combat-hero-visibility-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`);
          results.push({method,...result});
          fs.writeFileSync(path.join(dir,'combat-hero-visibility-checks.json'),JSON.stringify({results,errors,complete:false},null,2));
          fs.writeFileSync(path.join(dir,'combat-hero-'+method+'.png'),(await win.webContents.capturePage()).toPNG());
        }
        fs.writeFileSync(path.join(dir,'combat-hero-visibility-checks.json'),JSON.stringify({results,errors,complete:true},null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--taleth-guidance-checks')){
        const results=[];
        for(const method of process.argv.includes('--guidance-early-only')?['opening','earlyWin']:['opening','secondFront','manualTracking','battle','journal','reload','ignoredFront','earlyWin']){
          const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/taleth-guidance-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`);
          results.push({method,...result});console.log('TALETH_GUIDANCE '+JSON.stringify({method,...result}));
          fs.writeFileSync(path.join(dir,'taleth-guidance-'+method+'.png'),(await win.webContents.capturePage()).toPNG());
          fs.writeFileSync(path.join(dir,'taleth-guidance-checks.json'),JSON.stringify({results,errors,complete:false},null,2));
        }
        fs.writeFileSync(path.join(dir,'taleth-guidance-checks.json'),JSON.stringify({results,errors,complete:true},null,2));app.exit(errors.length?1:0);return;
      }
      if(process.argv.includes('--weather-checks')){
        const results=[];
        for(const method of ['clear','partlyCloudy','overcast','rain','shelter','recovery']){
          const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/weather-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`);
          results.push({method,...result});console.log('EXPLORATION_WEATHER '+JSON.stringify({method,...result}));
          fs.writeFileSync(path.join(dir,'weather-'+method+'.png'),(await win.webContents.capturePage()).toPNG());
          fs.writeFileSync(path.join(dir,'weather-checks.json'),JSON.stringify({results,errors,complete:false},null,2));
        }
        fs.writeFileSync(path.join(dir,'weather-checks.json'),JSON.stringify({results,errors,complete:true},null,2));app.exit(errors.length?1:0);return;
      }
      if(process.argv.includes('--canerd-life-checks')){
        const results=[];
        for(const method of ['arrival','sleepingOak','talkingOak','closedOak','civilianLife','wizardJournal']){
          const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/canerd-life-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`);
          results.push({method,...result});console.log('CANERD_LIFE '+JSON.stringify({method,...result}));
          fs.writeFileSync(path.join(dir,'canerd-life-'+method+'.png'),(await win.webContents.capturePage()).toPNG());
          fs.writeFileSync(path.join(dir,'canerd-life-checks.json'),JSON.stringify({results,errors,complete:false},null,2));
        }
        fs.writeFileSync(path.join(dir,'canerd-life-checks.json'),JSON.stringify({results,errors,complete:true},null,2));app.exit(errors.length?1:0);return;
      }
      if(process.argv.includes('--tree-scenery-review')){
        const preparation=await win.webContents.executeJavaScript(`import('./src/dev/checks/tree-scenery-review.js').then(m=>m.prepareTreeSceneryReview(window.__EXPLORATION__))`),results=[];
        for(const shot of preparation.shots){
          const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/tree-scenery-review.js').then(m=>m.reviewTreeScenery(window.__EXPLORATION__,${JSON.stringify(shot)}))`);
          results.push({shot,...result});console.log('TREE_SCENERY '+JSON.stringify({shot,...result}));
          fs.writeFileSync(path.join(dir,'tree-scenery-'+shot+'.png'),(await win.webContents.capturePage()).toPNG());
        }
        fs.writeFileSync(path.join(dir,'tree-scenery-review.json'),JSON.stringify({preparation,results,errors,complete:true},null,2));app.exit(errors.length?1:0);return;
      }
      if(process.argv.includes('--tree-observation-checks')){
        const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/tree-observation-smoke.js').then(m=>m.observeTrees(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`);
        console.log('TREE_OBSERVATION '+JSON.stringify(result));
        fs.writeFileSync(path.join(dir,'tree-observation.png'),(await win.webContents.capturePage()).toPNG());
        fs.writeFileSync(path.join(dir,'tree-observation-checks.json'),JSON.stringify({result,errors,complete:true},null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--harbor-checks')){
        const results=[];
        for(const method of ['harbor','conversation','voyage','crewCloseup','destinations','battleGuide','missedBattle','horseAndSave']){
          const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/harbor-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`);
          results.push({method,...result});console.log('EXPLORATION_HARBOR '+JSON.stringify({method,...result}));
          fs.writeFileSync(path.join(dir,'harbor-'+method+'.png'),(await win.webContents.capturePage()).toPNG());
          fs.writeFileSync(path.join(dir,'harbor-checks.json'),JSON.stringify({results,errors,complete:false},null,2));
        }
        fs.writeFileSync(path.join(dir,'harbor-checks.json'),JSON.stringify({results,errors,complete:true},null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--field-battle-checks')){
        const results=[];
        const methods=process.argv.includes('--field-shoreline-only')?['nesdorFormation','nesdorShoreline']:['clockTransitions','retryClock','briefing','formation','readability','victory','aftermath','noChampion','ovesos','ovesosVictory','optionalDuel','nesdorFormation','nesdorShoreline'];
        const report=process.argv.includes('--field-shoreline-only')?'field-shoreline-checks.json':'field-battle-checks.json';
        for(const method of methods){
          const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/field-battle-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`);
          results.push({method,...result});console.log('EXPLORATION_FIELD_BATTLE '+JSON.stringify({method,...result}));
          fs.writeFileSync(path.join(dir,'field-battle-'+method+'.png'),(await win.webContents.capturePage()).toPNG());
          fs.writeFileSync(path.join(dir,report),JSON.stringify({results,errors,complete:false},null,2));
        }
        fs.writeFileSync(path.join(dir,report),JSON.stringify({results,errors,complete:true},null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--scenario-combat-checks')){
        const results=[];
        const reentry=process.argv.includes('--scenario-reentry-only'),report=reentry?'scenario-reentry-checks.json':'scenario-combat-checks.json';
        for(const method of reentry?['savedWounds']:['duelControls','duelResult','formationWest','victoryWest','formationEast','victoryEast','savedWounds']){
          const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/scenario-combat-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`);
          results.push({method,...result});console.log('EXPLORATION_SCENARIO_COMBAT '+JSON.stringify({method,...result}));
          fs.writeFileSync(path.join(dir,'scenario-combat-'+method+'.png'),(await win.webContents.capturePage()).toPNG());
          fs.writeFileSync(path.join(dir,report),JSON.stringify({results,errors,complete:false},null,2));
        }
        fs.writeFileSync(path.join(dir,report),JSON.stringify({results,errors,complete:true},null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--champion-duel-checks')){
        const results=[];
        for(const method of process.argv.includes('--caricas-commander-only')?[]:['opening','challenge','combat','overhead','victory','assault','withdrawal','death','retry','combinedWest','combinedEast']){
          const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/champion-duel-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`);
          results.push({method,...result});console.log('EXPLORATION_DUEL '+JSON.stringify({method,...result}));
          fs.writeFileSync(path.join(dir,'champion-duel-'+method+'.png'),(await win.webContents.capturePage()).toPNG());
          if(method==='opening'){
            const original=win.getContentSize();
            for(const [w,h]of [[390,844],[844,390]]){
              win.setContentSize(w,h);await new Promise(r=>setTimeout(r,250));
              results.push(await win.webContents.executeJavaScript(`import('./src/dev/checks/champion-duel-smoke.js').then(m=>m.compact())`));
              fs.writeFileSync(path.join(dir,`champion-duel-${w}x${h}.png`),(await win.webContents.capturePage()).toPNG());
            }
            win.setContentSize(...original);await new Promise(r=>setTimeout(r,250));
          }
        }
        for(const method of ['commanders','morale','aftermath','eastDuel','withdrawal']){
          const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/caricas-commander-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`);
          results.push({method:'caricas-'+method,...result});console.log('EXPLORATION_CARICAS '+JSON.stringify({method,...result}));
          fs.writeFileSync(path.join(dir,'caricas-'+method+'.png'),(await win.webContents.capturePage()).toPNG());
          if(method==='commanders'){
            const original=win.getContentSize();
            for(const [w,h]of [[390,844],[844,390]]){
              win.setContentSize(w,h);await new Promise(r=>setTimeout(r,250));
              results.push(await win.webContents.executeJavaScript(`import('./src/dev/checks/caricas-commander-smoke.js').then(m=>m.compact())`));
              fs.writeFileSync(path.join(dir,`caricas-commanders-${w}x${h}.png`),(await win.webContents.capturePage()).toPNG());
            }
            win.setContentSize(...original);await new Promise(r=>setTimeout(r,250));
          }
        }
        results.push(await win.webContents.executeJavaScript(`import('./src/dev/checks/allied-assault-smoke.js').then(m=>m.reaper(window.__EXPLORATION__))`));
        fs.writeFileSync(path.join(dir,'champion-duel-checks.json'),JSON.stringify({results,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--corris-checks')){
        const results=[];
          const modelOnly=process.argv.includes('--corris-model-only');
          for(const method of modelOnly?['introduction']:['introduction','arrival','conversation','persistence','river','southern','pigeons']){
          const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/corris-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`);
          results.push({method,...result});console.log('EXPLORATION_CORRIS '+JSON.stringify(result));
          fs.writeFileSync(path.join(dir,'corris-'+method+'.png'),(await win.webContents.capturePage()).toPNG());
            if(method==='conversation'||modelOnly){
            for(const [width,height] of [[390,844],[844,390]]){
              win.setContentSize(width,height);await new Promise(r=>setTimeout(r,150));
              results.push(await win.webContents.executeJavaScript(`import('./src/dev/checks/corris-smoke.js').then(m=>m.layout())`));
              fs.writeFileSync(path.join(dir,`corris-${width}x${height}.png`),(await win.webContents.capturePage()).toPNG());
            }
            win.setContentSize(1424,921);await new Promise(r=>setTimeout(r,150));
          }
        }
          fs.writeFileSync(path.join(dir,modelOnly?'corris-model-checks.json':'corris-checks.json'),JSON.stringify({results,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--guidance-clarity-checks')){
        const results=[];
        for(const method of ['opening','battlefield','finale','details','civilian','resumed']){
          const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/campaign-guidance-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`);
          results.push({method,...result});console.log('EXPLORATION_GUIDANCE '+JSON.stringify(result));
          fs.writeFileSync(path.join(dir,'guidance-'+method+'.png'),(await win.webContents.capturePage()).toPNG());
        }
        for(const [width,height] of [[1024,600],[390,844],[844,390]]){
          win.setContentSize(width,height);await new Promise(r=>setTimeout(r,200));
          const layout=await win.webContents.executeJavaScript(`import('./src/dev/checks/campaign-guidance-smoke.js').then(m=>m.finale(window.__EXPLORATION__))`);results.push(layout);
          fs.writeFileSync(path.join(dir,`guidance-${width}x${height}.png`),(await win.webContents.capturePage()).toPNG());
        }
        fs.writeFileSync(path.join(dir,'guidance-clarity.json'),JSON.stringify({results,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--horse-contact-checks')){
        const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/horse-contact-smoke.js').then(m=>m.checkHorseContact(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`);
        fs.writeFileSync(path.join(dir,'horse-contact.png'),(await win.webContents.capturePage()).toPNG());
        fs.writeFileSync(path.join(dir,'horse-contact-checks.json'),JSON.stringify({result,errors},null,2));console.log(JSON.stringify({result,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--resident-grounding-checks')){
        const survey=await win.webContents.executeJavaScript(`import('./src/dev/checks/resident-grounding-smoke.js').then(m=>m.survey(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`),views=[];
        for(const id of ['ilmarinen','consus']){
          views.push(await win.webContents.executeJavaScript(`import('./src/dev/checks/resident-grounding-smoke.js').then(m=>m.view(window.__EXPLORATION__,'${id}')).catch(e=>{console.error(e.stack);throw e;})`));
          fs.writeFileSync(path.join(dir,'resident-grounding-'+id+'.png'),(await win.webContents.capturePage()).toPNG());
        }
        const verification=await win.webContents.executeJavaScript(`import('./src/dev/checks/resident-grounding-smoke.js').then(m=>m.verify(window.__EXPLORATION__,${JSON.stringify(survey.rows)})).catch(e=>{console.error(e.stack);throw e;})`);
        fs.writeFileSync(path.join(dir,'resident-grounding-checks.json'),JSON.stringify({survey,views,verification,errors},null,2));console.log(JSON.stringify({rows:survey.rows,checks:verification.checks,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--minora-civic-checks')){
        const results=[];
        for(const method of process.argv.includes('--minora-hall-only')?['hall','mayor','saves']:['city','building','relief','hall','mayor','saves']){
          const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/minora-civic-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`);
          results.push({method,...result});console.log('MINORA_CIVIC '+JSON.stringify({method,checks:result.checks}));
          fs.writeFileSync(path.join(dir,'minora-civic-'+method+'.png'),(await win.webContents.capturePage()).toPNG());
        }
        fs.writeFileSync(path.join(dir,'minora-civic-checks.json'),JSON.stringify({results,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--population-checks')){
        const results=[];
        const visualOnly=process.argv.includes('--population-visual-only');
        for(const method of (visualOnly?['survey','town','shelter','returned','conversation']:['survey','contact','town','shelter','returned','performanceCheck','conversation'])){
          const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/resident-population-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`);
          results.push({method,...result});console.log('EXPLORATION_POPULATION '+method+' '+JSON.stringify(result));
          await new Promise(resolve=>setTimeout(resolve,180));
          fs.writeFileSync(path.join(dir,'resident-population-'+method+'.png'),(await win.webContents.capturePage()).toPNG());
        }
        fs.writeFileSync(path.join(dir,visualOnly?'resident-population-visual.json':'resident-population-checks.json'),JSON.stringify({results,errors},null,2));app.exit(errors.length?1:0);return;
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
      if(warTest&&process.argv.includes('--campaign-directive-checks')){
        const results=[];
        for(const method of ['prepare','westInvitation','westResult','eastInvitation','eastResult','ignoredWest','ignoredEast','finale','legacy']){
          const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/campaign-directive-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`);
          results.push({method,...result});
          await win.webContents.executeJavaScript('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
          fs.writeFileSync(path.join(dir,'campaign-directive-'+method+'.png'),(await win.webContents.capturePage()).toPNG());
          fs.writeFileSync(path.join(dir,'campaign-directive-checks.json'),JSON.stringify({results,errors},null,2));
          console.log('CAMPAIGN_DIRECTIVE_STAGE '+method+' '+result.checks.length+' checks');
        }
        console.log(JSON.stringify({methods:results.map(r=>r.method),checks:results.at(-1)?.checks.length,errors}));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--adventure-war-checks')){
        const results=[],uiOnly=process.argv.includes('--adventure-war-ui-only');
        const stages=uiOnly?[['prepare','ui-dawn'],['polish','ui-polish'],['returnToTaleth','ui-lookout']]:[['prepare','dawn'],['west','west-result'],['returnToTaleth','west-lookout'],['east','east-result'],['returnToTaleth','east-lookout']];
        for(const [method,image]of stages){
          const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/adventure-war-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`);
          results.push({method,...result});
          await win.webContents.executeJavaScript('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
          fs.writeFileSync(path.join(dir,'adventure-war-'+image+'.png'),(await win.webContents.capturePage()).toPNG());
          fs.writeFileSync(path.join(dir,uiOnly?'adventure-war-ui-checks.json':'adventure-war-checks.json'),JSON.stringify({results,errors},null,2));
          console.log('ADVENTURE_WAR_STAGE '+image+' '+result.checks.length+' checks');
        }
        console.log(JSON.stringify({methods:results.map(r=>r.method),checks:results.at(-1)?.checks.length,errors}));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--opening-clock-checks')){
        const run=method=>win.webContents.executeJavaScript(`import('./src/dev/checks/opening-clock-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`),results=[],uiOnly=process.argv.includes('--opening-clock-ui-only'),deathOnly=process.argv.includes('--opening-clock-death-only');
        const stage=async(method,image)=>{
          const result=await run(method);results.push({method,...result});
          await win.webContents.executeJavaScript('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
          if(image)fs.writeFileSync(path.join(dir,'opening-clock-'+image+'.png'),(await win.webContents.capturePage()).toPNG());
        };
        if(uiOnly){
          const layouts=async(method,scene)=>{
            for(const [width,height]of [[1920,1080],[1440,900],[1024,768],[390,844]]){
              win.setContentSize(width,height);await new Promise(resolve=>setTimeout(resolve,150));
              await stage(method,`hud-${scene}-${width}x${height}`);
            }
            win.setContentSize(1440,900);await new Promise(resolve=>setTimeout(resolve,150));
          };
          await stage('prepare');await layouts('hudLayout','foot');
          await stage('hudMounted');await layouts('hudLayout','mounted');
          await stage('hudReading');await stage('waitDialog');await layouts('waitLayout','wait');
          await stage('arrival');await stage('unattended');await stage('aftermath');await layouts('noticeLayout','taleth');
          await stage('message','hud-message');
        }else{
          const stages=deathOnly?[['prepare',null],['waitDialog',null],['arrival',null],['death','death-retry']]:[['prepare','clock'],['waitDialog','wait'],['arrival','arrival'],['west','west-aftermath'],['aftermath','explore-aftermath'],['message','message'],['east','east-aftermath'],['aftermath',null],['unattended','unattended-aftermath']];
          for(const [method,image]of stages)await stage(method,image);
        }
        const report={results,errors};fs.writeFileSync(path.join(dir,deathOnly?'opening-clock-death-checks.json':uiOnly?'opening-clock-ui-checks.json':'opening-clock-checks.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({methods:results.map(r=>r.method),checks:results.at(-1)?.checks,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--day-night-checks')){
        const run=(method,arg)=>win.webContents.executeJavaScript(`import('./src/dev/checks/day-night-smoke.js').then(m=>m.${method}(window.__EXPLORATION__,${JSON.stringify(arg??null)})).then(r=>JSON.parse(JSON.stringify(r))).catch(e=>{console.error(e.stack);throw e;})`);
        await run('prepare');const views=[];
        if(process.argv.includes('--day-night-combat-only')){
          const profile=await run('profile',{place:'caricas'}),combat=await run('battle');
          fs.writeFileSync(path.join(dir,'day-night-combat.png'),(await win.webContents.capturePage()).toPNG());
          const cleanup=await run('finishBattle');
          fs.writeFileSync(path.join(dir,'day-night-combat-checks.json'),JSON.stringify({profile,combat,cleanup,errors},null,2));
          console.log(JSON.stringify({profile,combat,cleanup,errors},null,2));app.exit(errors.length?1:0);return;
        }
        for(const place of ['minora','caricas'])for(const [label,hour,enabled] of [['original',12,false],['dawn',6.5,true],['noon',12,true],['dusk',18.5,true],['night',0,true]]){
          views.push({place,label,...await run('view',{place,hour,enabled})});
          fs.writeFileSync(path.join(dir,`day-night-${place}-${label}.png`),(await win.webContents.capturePage()).toPNG());
        }
        for(const [label,hour] of [['dusk',18.5],['night',0]]){
          views.push({place:'river',label,...await run('view',{place:'river',hour,enabled:true})});
          fs.writeFileSync(path.join(dir,`day-night-river-${label}.png`),(await win.webContents.capturePage()).toPNG());
        }
        for(const [body,hour] of [['sun',17.5],['sova',18.5],['vel',2.5]]){
          views.push({body,...await run('sky',{body,hour})});
          fs.writeFileSync(path.join(dir,`day-night-${body}.png`),(await win.webContents.capturePage()).toPNG());
        }
        const result=await run('verify');
        const combat=await run('battle');
        fs.writeFileSync(path.join(dir,'day-night-combat.png'),(await win.webContents.capturePage()).toPNG());
        await run('finishBattle');result.combat=combat;
        fs.writeFileSync(path.join(dir,'day-night-checks.json'),JSON.stringify({views,result,errors},null,2));
        console.log(JSON.stringify({views:views.map(v=>({place:v.place,label:v.label,body:v.body,render:v.render,frameMedianMs:v.frameMedianMs,frameP95Ms:v.frameP95Ms})),checks:result.checks,combat:result.combat,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--camera-cost-checks')){
        const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/camera-cost-smoke.js').then(m=>m.compareCamera(window.__EXPLORATION__))`);
        fs.writeFileSync(path.join(dir,'camera-cost-checks.json'),JSON.stringify({...result,errors},null,2));console.log(JSON.stringify({...result,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--war-resource-checks')){
        const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/war-resource-smoke.js').then(m=>m.resources())`);
        fs.writeFileSync(path.join(dir,'war-resource-checks.json'),JSON.stringify({...result,errors},null,2));console.log(JSON.stringify({...result,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--campaign-wait-checks')){
        const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/campaign-journey-smoke.js').then(m=>m.waitFixture(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`);
        fs.writeFileSync(path.join(dir,'campaign-wait.png'),(await win.webContents.capturePage()).toPNG());
        fs.writeFileSync(path.join(dir,'campaign-wait.json'),JSON.stringify({result,errors},null,2));console.log(JSON.stringify({result,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--lookout-performance-checks')){
        const results=[],label=process.argv.includes('--profile-before')?'before':'after';
        for(const method of ['river','ambron','pyra','north']){
          results.push(await win.webContents.executeJavaScript(`import('./src/dev/checks/lookout-performance-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`));
          fs.writeFileSync(path.join(dir,'lookout-performance-'+label+'-'+method+'.png'),(await win.webContents.capturePage()).toPNG());
        }
        fs.writeFileSync(path.join(dir,'lookout-performance-'+label+'.json'),JSON.stringify({results,errors},null,2));
        console.log(JSON.stringify({results:results.map(r=>({name:r.name,readyMs:r.readyMs,calls:r.render.calls,triangles:r.render.triangles,cpuMs:r.cpuMs,frameMs:r.frameMs})),errors}));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--lookout-landscape-checks')){
        const results=[];
        for(const method of ['river','east','south','pyra','west','north','freeEast','lifecycle']){
          results.push(await win.webContents.executeJavaScript(`import('./src/dev/checks/lookout-landscape-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`));
          fs.writeFileSync(path.join(dir,'lookout-landscape-'+method+'.png'),(await win.webContents.capturePage()).toPNG());
          if(['east','south','pyra','west'].includes(method)){
            await win.webContents.executeJavaScript(`window.__EXPLORATION__.testWorld.testLookoutReference(true).then(()=>window.__EXPLORATION__.renderStats())`);
            await new Promise(r=>setTimeout(r,500));
            const refImage=await win.webContents.capturePage();
            fs.writeFileSync(path.join(dir,'lookout-reference-'+method+'.png'),refImage.toPNG());
            const actual=nativeImage.createFromPath(path.join(dir,'lookout-landscape-'+method+'.png'));
            const first=actual.toBitmap(),second=refImage.toBitmap();let delta=0,changed=0,pixels=0;
            const {width,height}=actual.getSize();
            for(let y=160;y<Math.min(height-160,520);y++)for(let x=0;x<width;x++){
              if(method==='east'?x>width*.64:x>width*.37&&x<width*.64)continue;
              const k=(y*width+x)*4;let max=0;for(let c=0;c<3;c++){const d=Math.abs(first[k+c]-second[k+c]);delta+=d;max=Math.max(max,d);}pixels++;if(max>12)changed++;
            }
            results.at(-1).referenceComparison={meanChannelDifference:delta/(pixels*3),changedOver12Percent:changed/pixels*100,pixels};
            await win.webContents.executeJavaScript(`window.__EXPLORATION__.testWorld.testLookoutReference(false).then(()=>window.__EXPLORATION__.renderStats())`);
          }
        }
        if(interceptionStore.handle('get','azhora-road-checkpoint-v1').value)throw Error('Lookout landscape check wrote the normal save');
        fs.writeFileSync(path.join(dir,'lookout-landscape.json'),JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results:results.map(r=>({name:r.name,render:r.render,comparison:r.referenceComparison})),errors}));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--lookout-life-checks')){
        const results=[];
        for(const method of ['conclusion','pigeons','flight','archive','descent','bear','mayor','priest','residents','returnLookout']){
          results.push(await win.webContents.executeJavaScript(`import('./src/dev/checks/lookout-life-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`));
          fs.writeFileSync(path.join(dir,'lookout-life-'+method+'.png'),(await win.webContents.capturePage()).toPNG());
          if(method==='pigeons'){
            for(const [w,h]of [[1024,600],[390,844]]){
              win.setContentSize(w,h);await new Promise(r=>setTimeout(r,250));
              results.push(await win.webContents.executeJavaScript(`import('./src/dev/checks/lookout-life-smoke.js').then(m=>m.compact(window.__EXPLORATION__))`));
              fs.writeFileSync(path.join(dir,`lookout-life-${w}x${h}.png`),(await win.webContents.capturePage()).toPNG());
            }
            win.setContentSize(1280,720);await new Promise(r=>setTimeout(r,250));
          }
          console.log('EXPLORATION_CHECK '+method);
        }
        if(interceptionStore.handle('get','azhora-road-checkpoint-v1').value)throw Error('Lookout life check wrote a normal save');
        fs.writeFileSync(path.join(dir,'lookout-life.json'),JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results,errors}));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--lookout-tour-checks')){
        const results=[];
        const tour=async(method,...args)=>win.webContents.executeJavaScript(`import('./src/dev/checks/lookout-tour-smoke.js').then(m=>m.${method}(window.__EXPLORATION__,...${JSON.stringify(args)})).catch(e=>{console.error(e.stack);throw e;})`);
        if(process.argv.includes('--chart-only')){
          results.push(await tour('quickChart'));fs.writeFileSync(path.join(dir,'lookout-chart-expanded.png'),(await win.webContents.capturePage()).toPNG());
          fs.writeFileSync(path.join(dir,'lookout-chart.json'),JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results,errors}));app.exit(errors.length?1:0);return;
        }
        for(const method of ['river','chartBefore','impact','ambron','chartAfter']){results.push(await tour(method));fs.writeFileSync(path.join(dir,'lookout-tour-'+method+'.png'),(await win.webContents.capturePage()).toPNG());if(method==='chartBefore')await tour('returnToReview');if(method==='chartAfter')await tour('resumeTour');}
        const regionCount=await tour('regionCount');
        for(let i=0;i<regionCount;i++){const r=await tour('region',i);results.push(r);fs.writeFileSync(path.join(dir,'lookout-tour-'+r.view+'.png'),(await win.webContents.capturePage()).toPNG());}
        results.push(await tour('navigation'));
        for(const [w,h]of [[1024,600],[390,844]]){win.setContentSize(w,h);await new Promise(r=>setTimeout(r,250));results.push(await tour('compact'));fs.writeFileSync(path.join(dir,`lookout-tour-${w}x${h}.png`),(await win.webContents.capturePage()).toPNG());}
        results.push(await tour('complete'));
        if(interceptionStore.handle('get','azhora-road-checkpoint-v1').value)throw Error('Tour check wrote a normal save');
        fs.writeFileSync(path.join(dir,'lookout-tour.json'),JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results,errors}));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--lookout-preview-checks')){
        const results=[];
        for(const method of ['river','east','complete']){
          results.push(await win.webContents.executeJavaScript(`import('./src/dev/checks/lookout-preview-smoke.js').then(m=>m.${method}(window.__EXPLORATION__))`));
          await win.webContents.executeJavaScript(`import('./src/dev/checks/lookout-preview-smoke.js').then(m=>m.paint(window.__EXPLORATION__))`);fs.writeFileSync(path.join(dir,'lookout-preview-'+method+'.png'),(await win.webContents.capturePage()).toPNG());
        }
        if(interceptionStore.handle('get','azhora-road-checkpoint-v1').value)throw Error('Lookout preview wrote the normal save');
        fs.writeFileSync(path.join(dir,'lookout-preview.json'),JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results,errors}));app.exit(errors.length?1:0);return;
      }
      if(warTest&&(process.argv.includes('--autoplay-realtime-checks')||process.argv.includes('--autoplay-resilience-checks'))){
        const recovery=process.argv.includes('--autoplay-resilience-checks');
        if(recovery){
          await win.webContents.executeJavaScript(`import('./src/dev/checks/autoplay-loading-smoke.js').then(m=>m.waitForDoor(window.__EXPLORATION__))`);
          win.webContents.sendInputEvent({type:'keyDown',keyCode:'P'});win.webContents.sendInputEvent({type:'keyUp',keyCode:'P'});
          const stopped=await win.webContents.executeJavaScript(`import('./src/dev/checks/autoplay-loading-smoke.js').then(m=>m.outsidePaused(window.__EXPLORATION__))`);
          fs.writeFileSync(path.join(dir,'autoplay-loading-paused.json'),JSON.stringify(stopped,null,2));
          fs.writeFileSync(path.join(dir,'autoplay-loading-paused.png'),(await win.webContents.capturePage()).toPNG());
          win.webContents.sendInputEvent({type:'keyDown',keyCode:'P'});win.webContents.sendInputEvent({type:'keyUp',keyCode:'P'});
        }
        win.webContents.sendInputEvent({type:'mouseDown',x:600,y:300,button:'left',clickCount:1});win.webContents.sendInputEvent({type:'mouseUp',x:600,y:300,button:'left',clickCount:1});
        win.webContents.sendInputEvent({type:'keyDown',keyCode:'F2'});win.webContents.sendInputEvent({type:'keyUp',keyCode:'F2'});
        const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/autoplay-realtime-smoke.js').then(m=>m.watch(window.__EXPLORATION__,{full:${process.argv.includes('--full-campaign')}}))`);
        fs.writeFileSync(path.join(dir,'autoplay-realtime'+(recovery?'-recovery':'')+(process.argv.includes('--full-campaign')?'-full-'+(process.argv.includes('--east-side')?'east':'west'):'')+'.json'),JSON.stringify({result,errors},null,2));
        fs.writeFileSync(path.join(dir,'autoplay-realtime'+(recovery?'-recovery':'')+(process.argv.includes('--full-campaign')?'-full-'+(process.argv.includes('--east-side')?'east':'west'):'')+'.png'),(await win.webContents.capturePage()).toPNG());console.log(JSON.stringify({result,errors}));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--autoplay-modal-checks')){
        await win.webContents.executeJavaScript(`import('./src/dev/checks/autoplay-modal-smoke.js').then(m=>m.ready(window.__EXPLORATION__))`);
        for(const [key,method]of [['P','paused'],['P','resumed'],['button:Enter','paused'],['button:Space','resumed'],['Enter','continued'],['P','resumedBriefing']]){
          const buttonKey=key.startsWith('button:'),inputKey=buttonKey?key.slice(7):key;
          await win.webContents.executeJavaScript(buttonKey?`document.getElementById('world-autoplay').focus()`:`document.getElementById('world-skirmish-continue')?.focus()`);
          win.webContents.sendInputEvent({type:'keyDown',keyCode:inputKey});win.webContents.sendInputEvent({type:'keyUp',keyCode:inputKey});
          await new Promise(r=>setTimeout(r,100));
          const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/autoplay-modal-smoke.js').then(m=>m.${method}(window.__EXPLORATION__))`);
          if(result)fs.writeFileSync(path.join(dir,'autoplay-modal.json'),JSON.stringify({result,errors},null,2));
          if(method==='paused')for(const [width,height] of [[1280,720],[1024,600],[390,844],[844,390]]){
            win.setContentSize(width,height);await new Promise(r=>setTimeout(r,150));
            fs.writeFileSync(path.join(dir,`autoplay-modal-${width}x${height}.png`),(await win.webContents.capturePage()).toPNG());
            await win.webContents.executeJavaScript(`import('./src/dev/checks/autoplay-modal-smoke.js').then(m=>m.layout())`);
          }

        }
        await win.webContents.executeJavaScript(`import('./src/dev/checks/autoplay-modal-smoke.js').then(m=>m.finalResult(window.__EXPLORATION__))`);
        for(const [key,method]of [['Enter','finalContinued'],['P','resumedCampaign']]){
          if(key==='Enter')await win.webContents.executeJavaScript(`document.getElementById('world-skirmish-continue').focus()`);
          win.webContents.sendInputEvent({type:'keyDown',keyCode:key});win.webContents.sendInputEvent({type:'keyUp',keyCode:key});
          await new Promise(r=>setTimeout(r,100));
          const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/autoplay-modal-smoke.js').then(m=>m.${method}(window.__EXPLORATION__))`);
          fs.writeFileSync(path.join(dir,'autoplay-final-handoff-'+method+'.json'),JSON.stringify({result,errors},null,2));
        }
        fs.writeFileSync(path.join(dir,'autoplay-final-handoff.png'),(await win.webContents.capturePage()).toPNG());
        await win.webContents.executeJavaScript(`import('./src/dev/checks/autoplay-modal-smoke.js').then(m=>m.legacyResult(window.__EXPLORATION__))`);
        win.webContents.sendInputEvent({type:'keyDown',keyCode:'P'});win.webContents.sendInputEvent({type:'keyUp',keyCode:'P'});
        await win.webContents.executeJavaScript(`import('./src/dev/checks/autoplay-modal-smoke.js').then(m=>m.legacyStopped(window.__EXPLORATION__))`);
        fs.writeFileSync(path.join(dir,'autoplay-modal.png'),(await win.webContents.capturePage()).toPNG());
        if(interceptionStore.handle('get','azhora-road-checkpoint-v1').value)throw Error('Rehearsal touched the normal native save');
        console.log('EXPLORATION_CHECK Native modal pause, resume and manual Continue passed');app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--autoplay-takeover-checks')){
        await win.webContents.executeJavaScript(`import('./src/dev/checks/autoplay-takeover-smoke.js').then(m=>m.ready(window.__EXPLORATION__))`);
        win.webContents.sendInputEvent({type:'keyDown',keyCode:'P'});win.webContents.sendInputEvent({type:'keyUp',keyCode:'P'});
        await new Promise(r=>setTimeout(r,100));
        await win.webContents.executeJavaScript(`import('./src/dev/checks/autoplay-takeover-smoke.js').then(m=>m.paused(window.__EXPLORATION__))`);
        win.webContents.sendInputEvent({type:'keyDown',keyCode:'P'});win.webContents.sendInputEvent({type:'keyUp',keyCode:'P'});
        await new Promise(r=>setTimeout(r,100));
        await win.webContents.executeJavaScript(`import('./src/dev/checks/autoplay-takeover-smoke.js').then(m=>m.resumed(window.__EXPLORATION__))`);
        win.webContents.sendInputEvent({type:'keyDown',keyCode:'P'});win.webContents.sendInputEvent({type:'keyUp',keyCode:'P'});
        await new Promise(r=>setTimeout(r,100));
        const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/autoplay-takeover-smoke.js').then(m=>m.verify(window.__EXPLORATION__))`);
        if(interceptionStore.handle('get','azhora-road-checkpoint-v1').value)throw Error('Rehearsal touched the normal native save');
        await win.webContents.executeJavaScript(`window.__EXPLORATION__.pause();document.getElementById('return-start').click()`);
        await new Promise((resolve,reject)=>{let tries=0;const check=async()=>{try{if(await win.webContents.executeJavaScript(`!document.getElementById('start-screen')?.hidden&&!new URL(location.href).searchParams.has('autoplay')&&document.querySelectorAll('#start-screen [data-watch-war]').length===2`))return resolve();}catch{}if(tries++>100)return reject(Error('Rehearsal did not return to its menu'));setTimeout(check,100);};check();});
        await win.webContents.executeJavaScript(`document.querySelector('#start-screen [data-watch-war]').closest('article').scrollIntoView({block:'center'});new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);
        fs.writeFileSync(path.join(dir,'autoplay-menu.png'),(await win.webContents.capturePage()).toPNG());
        fs.writeFileSync(path.join(dir,'autoplay-takeover.json'),JSON.stringify({result,errors},null,2));console.log(JSON.stringify({result,errors}));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--lookout-checks')){
          const results=[];
          for(const method of ['settled','river','politics','east','complete']){
            results.push(await win.webContents.executeJavaScript(`import('./src/dev/checks/lookout-panorama-smoke.js').then(m=>m.${method}(window.__EXPLORATION__))`));
            fs.writeFileSync(path.join(dir,'lookout-'+method+'.png'),(await win.webContents.capturePage()).toPNG());
          }
          const stats=await win.webContents.executeJavaScript('JSON.parse(JSON.stringify({state:window.__EXPLORATION__.state(),world:window.__EXPLORATION__.tower.state(),render:window.__EXPLORATION__.renderStats()}))');
          fs.writeFileSync(path.join(dir,'lookout-checks.json'),JSON.stringify({results,stats,errors},null,2));console.log(JSON.stringify({stats,errors}));app.exit(errors.length?1:0);return;
        }
        if(warTest&&process.argv.includes('--campaign-ending-checks')){
          const results=[];
          results.push(await win.webContents.executeJavaScript(`import('./src/dev/checks/campaign-ending-smoke.js').then(m=>m.strategy(window.__EXPLORATION__))`));
          fs.writeFileSync(path.join(dir,'campaign-current-strategy.png'),(await win.webContents.capturePage()).toPNG());
          await win.webContents.executeJavaScript(`import('./src/dev/checks/campaign-ending-smoke.js').then(m=>m.closeStrategy(window.__EXPLORATION__))`);
          for(const side of ['west','east',null]){
            const label=side??'unattended';
            for(const [method,arg] of [['setup',side],['council','mayor'],['council','temple'],['civilian',null],['lookout',null],['persisted',null]]){
              const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/campaign-ending-smoke.js').then(m=>m.${method}(window.__EXPLORATION__,${JSON.stringify(arg)})).catch(e=>{console.error(e.stack);throw e;})`);
              results.push({side:label,method,...result});console.log('EXPLORATION_ENDING '+JSON.stringify(results.at(-1)));
              fs.writeFileSync(path.join(dir,`ending-${label}-${method}${method==='council'?'-'+arg:''}.png`),(await win.webContents.capturePage()).toPNG());
              if(['council','civilian'].includes(method))await win.webContents.executeJavaScript(`import('./src/dev/checks/campaign-ending-smoke.js').then(m=>m.closeConversation(window.__EXPLORATION__))`);
            }
          }
          fs.writeFileSync(path.join(dir,'campaign-endings.json'),JSON.stringify({results,errors},null,2));app.exit(errors.length?1:0);return;
        }
        if(warTest&&process.argv.includes('--campaign-autoplay-checks')){
          const side=process.argv.includes('--east-side')?'east':'west',results=[];
          for(let n=0;n<50;n++){
            const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/campaign-autoplay-smoke.js').then(m=>m.next(window.__EXPLORATION__,{conversationResume:${process.argv.includes('--autoplay-dialogue-checks')}}))`);
            results.push(result);console.log('EXPLORATION_WATCH '+JSON.stringify(result));
            fs.writeFileSync(path.join(dir,'autoplay-'+side+'-'+n+'.png'),(await win.webContents.capturePage()).toPNG());
            if(result.done)break;
          }
          const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/campaign-autoplay-smoke.js').then(m=>m.verify(window.__EXPLORATION__,${JSON.stringify(side)})).then(v=>JSON.parse(JSON.stringify(v)))`);
          fs.writeFileSync(path.join(dir,'autoplay-'+side+'.json'),JSON.stringify({results,result,errors},null,2));console.log(JSON.stringify({result,errors}));app.exit(errors.length?1:0);return;
        }
        if(warTest&&process.argv.includes('--campaign-journey-checks')){
        const results=[],side=process.argv.includes('--east-side')?'east':'west';
        const check=async(module,method)=>{
          console.log('EXPLORATION_JOURNEY '+method);
          const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/${module}.js').then(m=>m.${method}(window.__EXPLORATION__,${JSON.stringify(side)})).catch(e=>{console.error(e.stack);throw e;})`);
          results.push(result);fs.writeFileSync(path.join(dir,'journey-'+side+'-'+method+'.png'),(await win.webContents.capturePage()).toPNG());return result;
        };
        for(const method of ['departure','ride','battle'])await check('first-session-smoke',method);
        for(const method of ['firstLetter','secondRide','secondBattle','secondResult','quietWait','choices','alternate'])await check('campaign-journey-smoke',method);
        fs.writeFileSync(path.join(dir,'journey-'+side+'.json'),JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--campaign-continuity-checks')){
        const results=[],side=process.argv.includes('--east-side')?'east':'west';
        const check=async(module,method,label)=>{
          const result=await win.webContents.executeJavaScript(`import('./src/dev/checks/${module}.js').then(m=>m.${method}(window.__EXPLORATION__,${JSON.stringify(side)})).catch(e=>{console.error(e.stack);throw e;})`);
          results.push(result);fs.writeFileSync(path.join(dir,'continuity-'+side+'-'+label+'.png'),(await win.webContents.capturePage()).toPNG());return result;
        };
        for(const method of ['departure','ride','battle'])await check('first-session-smoke',method,method);
        await check('campaign-continuity-smoke','letter','letter');
        for(let n=0;n<12;n++){const result=await check('campaign-continuity-smoke','next','battle-'+n);if(result.winner)break;}
        await check('campaign-continuity-smoke','verify','result');
        for(const method of ['river','politics','east','complete'])await check('taleth-story-smoke',method,method);
        fs.writeFileSync(path.join(dir,'continuity-'+side+'.json'),JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results,errors},null,2));app.exit(errors.length?1:0);return;
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
        for(const [method,image] of [['setupBattlefieldEntry','boundary'],['checkDomeFlight','dome-flight'],['checkDomeGroundReturn','dome-ground'],['checkFootEntry','foot-entry'],['checkMountedEntry','mounted-entry'],['checkAcceptedEntry','withdrawal'],['checkPartialBattleProgress','partial-progress'],['checkBattlePhaseCompletion','result']]){
          results.push(await win.webContents.executeJavaScript(`import('./src/dev/checks/battlefield-entry-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).then(r=>JSON.parse(JSON.stringify(r)))`));
          fs.writeFileSync(path.join(dir,'battlefield-'+image+'.png'),(await win.webContents.capturePage()).toPNG());
        }
        const result={checks:results.flatMap(r=>r.checks),results,errors};
        fs.writeFileSync(path.join(dir,'battlefield-checks.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({checks:result.checks,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(warTest&&process.argv.includes('--campaign-chronicle-checks')){
        const results=[];
        for(const method of ['ongoing','west','east','finished']){results.push(await win.webContents.executeJavaScript(`import('./src/dev/checks/campaign-chronicle-smoke.js').then(m=>m.${method}(window.__EXPLORATION__)).catch(e=>{console.error(e.stack);throw e;})`));fs.writeFileSync(path.join(dir,'campaign-chronicle-'+method+'.png'),(await win.webContents.capturePage()).toPNG());}
        fs.writeFileSync(path.join(dir,'campaign-chronicle.json'),JSON.stringify({results,errors},null,2));console.log(JSON.stringify({checks:results.at(-1).checks,errors},null,2));app.exit(errors.length?1:0);return;
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
    }catch(error){
      console.error(error.stack);fs.writeFileSync(path.join(dir,'exploration-failure.png'),(await win.webContents.capturePage()).toPNG());
      if(process.argv.includes('--internal-review')){
        const state=await win.webContents.executeJavaScript('window.__EXPLORATION__ ? JSON.parse(JSON.stringify({state:window.__EXPLORATION__.state(),autoplay:window.__EXPLORATION__.campaignAutoplay?.state(),war:window.__EXPLORATION__.war?.state(),mountain:window.__OREMINDI_FIGHT_DEBUG__??null})) : null').catch(()=>null);
        fs.writeFileSync(path.join(dir,'internal-review-failure.json'),JSON.stringify({error:String(error.stack),state,errors},null,2));
      }
      app.exit(1);
    }
  }
}).catch(error=>{console.error(error);app.exit(1);});
