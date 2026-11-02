const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {isPublicFile}=require('./public-file.cjs');
const root=path.resolve(__dirname,'..'),test=process.argv.includes('--smoke-test'),polish=process.argv.includes('--polish-review');
const requestedRegion=process.argv.find(arg=>arg.startsWith('--region='))?.slice(9)??'nethereum';
if(!['nethereum','caricas','ovesos','nesdor','isareos'].includes(requestedRegion))throw Error('Unknown farmland region. Use nethereum, caricas, ovesos, nesdor or isareos.');
if(process.env.AZHORA_TEST_PROFILE)app.setPath('userData',process.env.AZHORA_TEST_PROFILE);
for(const flag of ['disable-renderer-backgrounding','disable-background-timer-throttling','disable-backgrounding-occluded-windows'])app.commandLine.appendSwitch(flag);
let server;app.on('window-all-closed',()=>app.quit());app.on('will-quit',()=>server?.close());
app.whenReady().then(async()=>{
  server=http.createServer((req,res)=>{
    const url=new URL(req.url,'http://localhost'),pathname=url.pathname==='/'?'/farmland.html':url.pathname;
    const file=path.resolve(root,'.'+pathname);
    if(!isPublicFile(root,file)||!(pathname==='/farmland.html'||/^\/(src|vendor|assets)\//.test(pathname))){res.writeHead(403);res.end();return;}
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');res.end(data);});
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const win=new BrowserWindow({width:1440,height:1000,show:!test,title:'Azhora — Farmland review',webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}});win.setMenuBarVisibility(false);
  const errors=[];win.webContents.on('console-message',(_e,level,message)=>{if(level>=3)errors.push(message);});
  const watchdog=test?setTimeout(()=>{console.error('Farmland review timed out.');app.exit(1);},360000):null;
  await win.loadURL(`http://127.0.0.1:${server.address().port}/?region=${test&&!polish?'nethereum':requestedRegion}`);
  if(!test)return;
  try{
    const evaluate=code=>win.webContents.executeJavaScript(code);
    const waitForRegion=id=>evaluate(`new Promise((resolve,reject)=>{const poll=()=>window.__FARMLAND_REVIEW__?.ready&&window.__FARMLAND_REVIEW__.region()===${JSON.stringify(id)}?resolve():window.__FARMLAND_REVIEW_ERROR__?reject(Error(window.__FARMLAND_REVIEW_ERROR__)):setTimeout(poll,100);poll();})`);
    await waitForRegion(polish?requestedRegion:'nethereum');
    const out=path.join(root,'tests/artifacts');fs.mkdirSync(out,{recursive:true});
    const checkHousing=async id=>{
      const region=(await evaluate('window.__FARMLAND_REVIEW__.snapshot()')).regions[id];
      const report=await evaluate('document.getElementById("housing-report").textContent');
      assert(report.includes(`Actual population: ${region.food.population.toLocaleString('en-US')}`));
      assert(report.includes(`Housing capacity: ${region.housing.capacity.toLocaleString('en-US')} people`));
      assert(report.includes(`Spare capacity: ${(region.housing.capacity-region.food.population).toLocaleString('en-US')} people`));
    };
    await checkHousing(polish?requestedRegion:'nethereum');
    const capture=async name=>{
      assert(await evaluate('document.getElementById("loading").hidden'),`${name}: loading must be finished`);
      await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
      let shot,colors,lightPixels;
      // Chromium may composite the DOM before the first GPU surface in a hidden
      // window. Wait for visible geometry, with a strict bound, not a fixed nap.
      for(let attempt=0;attempt<15;attempt++){
        shot=await win.webContents.capturePage();const pixels=shot.toBitmap(),size=shot.getSize();colors=new Set();lightPixels=0;
        for(let y=150;y<size.height-80;y+=7)for(let x=400;x<size.width-30;x+=7){const at=(y*size.width+x)*4;colors.add(`${pixels[at]},${pixels[at+1]},${pixels[at+2]}`);if((pixels[at]+pixels[at+1]+pixels[at+2])/3>100)lightPixels++;}
        if(colors.size>50&&lightPixels>100)break;await new Promise(r=>setTimeout(r,200));
      }
      fs.writeFileSync(path.join(out,`farmland-${name}.png`),shot.toPNG());
      assert(colors.size>50&&lightPixels>100,`${name}: landscape must be visible, not just the menu or loading overlay`);
    };
    if(polish){
      for(const view of ['overview','town']){await evaluate(`window.__FARMLAND_REVIEW__.view('${view}')`);await capture(`polish-${requestedRegion}-${view}`);}
      for(const crop of ['grain','pasture']){
        assert(await evaluate(`window.__FARMLAND_REVIEW__.inspectParcel('${crop}')`));await capture(`polish-${requestedRegion}-${crop}`);
      }
      await evaluate("document.getElementById('walk-town').click()");await capture(`polish-${requestedRegion}-street`);
      assert.deepEqual(await evaluate('window.__FARMLAND_REVIEW__.routeAudit()'),[]);
      const result=await evaluate('({metrics:window.__FARMLAND_REVIEW__.metrics,stats:window.__FARMLAND_REVIEW__.stats()})');
      assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,`farmland-polish-${requestedRegion}.json`),JSON.stringify({result,errors},null,2));
      console.log(JSON.stringify({result,errors}));clearTimeout(watchdog);app.exit(0);return;
    }
    for(const view of ['overview','fields','town','wildland']){await evaluate(`window.__FARMLAND_REVIEW__.view('${view}')`);await capture(view);}
    await evaluate("window.__FARMLAND_REVIEW__.view('town');document.getElementById('housing').open=true");await capture('housing');
    await evaluate("document.getElementById('housing').open=false");
    for(const place of ['town','fields']){
      await evaluate(`document.getElementById('walk-${place}').click()`);await capture(`walk-${place}`);
      const initial=await evaluate('window.__FARMLAND_REVIEW__.position()');const moved=await evaluate('window.__FARMLAND_REVIEW__.walkFor(1)');assert(Math.hypot(moved[0]-initial[0],moved[2]-initial[2])>2,`${place} spawn must allow walking`);
    }
    const blocked=await evaluate('window.__FARMLAND_REVIEW__.routeAudit()');if(blocked.length)fs.writeFileSync(path.join(out,'farmland-blocked-lanes.json'),JSON.stringify(blocked,null,2));assert.deepEqual(blocked,[],'Every cart lane and river crossing must be walkable');
    await evaluate("document.getElementById('walk-town').click()");const beforeKey=await evaluate('window.__FARMLAND_REVIEW__.position()');
    assert.equal(await evaluate('document.activeElement.tagName'),'CANVAS');
    // Exercise the actual focused-element DOM handlers and animation frames;
    // OS input cannot target an intentionally hidden native test window.
    await evaluate("document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyW',key:'w',bubbles:true}));new Promise(resolve=>{let n=0;const frame=()=>++n===24?resolve():requestAnimationFrame(frame);requestAnimationFrame(frame);})");
    await evaluate("document.activeElement.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyW',key:'w',bubbles:true}))");
    const afterKey=await evaluate('window.__FARMLAND_REVIEW__.position()');assert(Math.hypot(afterKey[0]-beforeKey[0],afterKey[2]-beforeKey[2])>.5,'Walking button must give the keyboard focus to the landscape');
    await evaluate("document.getElementById('walk-town').click();document.getElementById('economy').open=true;document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyW',bubbles:true}));document.getElementById('condition').focus()");
    const beforeFocus=await evaluate('window.__FARMLAND_REVIEW__.position()');
    await evaluate('new Promise(resolve=>{let n=0;const frame=()=>++n===12?resolve():requestAnimationFrame(frame);requestAnimationFrame(frame);})');
    assert.deepEqual(await evaluate('window.__FARMLAND_REVIEW__.position()'),beforeFocus,'Focusing a food control must clear held movement keys');
    await evaluate("document.getElementById('day').focus();document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{code:'Escape',bubbles:true}))");
    assert.equal(await evaluate("document.querySelector('[data-view=overview]').getAttribute('aria-pressed')"),'true','Escape exits walking even while a panel control has focus');
    await evaluate("document.getElementById('economy').open=false;document.getElementById('walk-town').click()");
    const clipped=await evaluate('window.__FARMLAND_REVIEW__.look(Math.atan2(-10,15),.12,20)');
    assert(Math.hypot(...clipped.position.map((v,i)=>v-clipped.focus[i]))<18,'Camera must stop before the house behind the town spawn');
    await capture('camera-near-house');
    await evaluate("window.__FARMLAND_REVIEW__.view('overview');document.getElementById('economy').open=true;document.getElementById('day').click()");
    const day1=await evaluate('window.__FARMLAND_REVIEW__.snapshot()');assert.equal(day1.regions.nethereum.food.last.production,220);assert.equal(day1.regions.isareos.food.last.imports,170);
    await evaluate("document.getElementById('condition').value='0.5';document.getElementById('condition').dispatchEvent(new Event('change'))");
    assert.match(await evaluate("document.getElementById('ledger').textContent"),/Production changes take effect next day/);
    assert.equal((await evaluate('window.__FARMLAND_REVIEW__.snapshot()')).regions.nethereum.food.last.production,220,'Changing condition does not rewrite completed production');
    await evaluate("document.getElementById('week').click()");
    const disrupted=await evaluate('window.__FARMLAND_REVIEW__.snapshot()');assert.equal(disrupted.day,8);assert.equal(disrupted.regions.nethereum.food.last.production,110);assert(disrupted.regions.isareos.food.store<2380);
    await capture('food-report');
    await evaluate("document.getElementById('reset').click()");assert.equal((await evaluate('window.__FARMLAND_REVIEW__.snapshot()')).day,0);
    assert.doesNotMatch(await evaluate("document.getElementById('ledger').textContent"),/Produced:|Delivered to Minora:/,'Reset must clear completed-day figures');
    const results=await evaluate('({metrics:window.__FARMLAND_REVIEW__.metrics,stats:window.__FARMLAND_REVIEW__.stats(),colliders:window.__FARMLAND_REVIEW__.colliders()})');
    assert.equal(results.metrics.capacity,220);assert(results.colliders>20);assert(results.stats.calls<120);assert.deepEqual(errors,[]);
    console.log('Nethereum views, walking and food controls passed. Checking Caricas.');
    await evaluate('window.__FARMLAND_REVIEW__.advance(1);window.__FARMLAND_REVIEW__.condition(.5)');
    const beforeSwitch=await evaluate('window.__FARMLAND_REVIEW__.snapshot()');
    await evaluate("document.getElementById('region').value='caricas';document.getElementById('region').dispatchEvent(new Event('change'))");await waitForRegion('caricas');
    assert.deepEqual(await evaluate('window.__FARMLAND_REVIEW__.snapshot()'),beforeSwitch,'Region selection must preserve the shared campaign and pending commands');
    assert.equal(await evaluate("document.getElementById('condition').value"),'1','Each region shows its own condition');
    await checkHousing('caricas');
    await evaluate("document.getElementById('economy').open=false;document.getElementById('housing').open=true;window.__FARMLAND_REVIEW__.view('town')");await capture('caricas-housing');
    await evaluate("document.getElementById('housing').open=false");
    await evaluate("document.getElementById('economy').open=false");
    for(const view of ['overview','town','fields','wildland']){await evaluate(`window.__FARMLAND_REVIEW__.view('${view}')`);await capture(`caricas-${view}`);}
    for(const place of ['town','fields']){
      await evaluate(`document.getElementById('walk-${place}').click()`);await capture(`caricas-walk-${place}`);
      const initial=await evaluate('window.__FARMLAND_REVIEW__.position()'),moved=await evaluate('window.__FARMLAND_REVIEW__.walkFor(1)');
      assert(Math.hypot(moved[0]-initial[0],moved[2]-initial[2])>2,`Caricas ${place} must allow walking`);
    }
    assert.deepEqual(await evaluate('window.__FARMLAND_REVIEW__.routeAudit()'),[],'Caricas streets and the quay must be walkable');
    await evaluate("document.getElementById('reset').click();window.__FARMLAND_REVIEW__.view('town');document.getElementById('economy').open=true;document.getElementById('day').click()");
    const caricasDay=await evaluate('window.__FARMLAND_REVIEW__.snapshot()');
    assert.equal(caricasDay.regions.caricas.food.last.production,170);assert.equal(caricasDay.regions.caricas.food.last.exports,30);assert.equal(caricasDay.regions.isareos.food.last.imports,170);
    assert.match(await evaluate("document.getElementById('ledger').textContent"),/Delivered to Minora: 30/);await capture('caricas-food-report');
    await evaluate("document.getElementById('condition').value='0.5';document.getElementById('condition').dispatchEvent(new Event('change'));document.getElementById('week').click()");
    const caricasDisrupted=await evaluate('window.__FARMLAND_REVIEW__.snapshot()');
    assert.equal(caricasDisrupted.regions.caricas.food.last.production,85);assert.equal(caricasDisrupted.regions.nethereum.food.last.production,220);
    const caricas=await evaluate('({metrics:window.__FARMLAND_REVIEW__.metrics,stats:window.__FARMLAND_REVIEW__.stats()})');assert.equal(caricas.metrics.capacity,170);assert(caricas.stats.calls<120);
    await evaluate("window.__FARMLAND_REVIEW__.selectRegion('nethereum')");
    assert.deepEqual(await evaluate('window.__FARMLAND_REVIEW__.snapshot()'),caricasDisrupted);
    assert.equal(await evaluate("document.getElementById('condition').value"),'1');
    await evaluate("window.__FARMLAND_REVIEW__.selectRegion('caricas')");
    assert.equal(await evaluate("document.getElementById('condition').value"),'0.5');
    assert.equal(await evaluate('window.__FARMLAND_REVIEW__.stats().geometries'),caricas.stats.geometries,'Revisiting must reuse the cached landscape');
    console.log('Caricas passed. Checking Ovesos.');
    await evaluate("document.getElementById('region').value='ovesos';document.getElementById('region').dispatchEvent(new Event('change'))");await waitForRegion('ovesos');
    assert.deepEqual(await evaluate('window.__FARMLAND_REVIEW__.snapshot()'),caricasDisrupted,'Ovesos joins the same campaign');
    await checkHousing('ovesos');
    await evaluate("document.getElementById('economy').open=false");
    for(const view of ['overview','town','fields','wildland']){await evaluate(`window.__FARMLAND_REVIEW__.view('${view}')`);await capture(`ovesos-${view}`);}
    for(const place of ['town','fields']){
      await evaluate(`document.getElementById('walk-${place}').click()`);await capture(`ovesos-walk-${place}`);
      const initial=await evaluate('window.__FARMLAND_REVIEW__.position()'),moved=await evaluate('window.__FARMLAND_REVIEW__.walkFor(1)');
      assert(Math.hypot(moved[0]-initial[0],moved[2]-initial[2])>2,`Ovesos ${place} must allow walking`);
    }
    assert.deepEqual(await evaluate('window.__FARMLAND_REVIEW__.routeAudit()'),[],'Ovesos farm lanes and quay must be walkable');
    await evaluate("window.__FARMLAND_REVIEW__.view('town');document.getElementById('housing').open=true");await capture('ovesos-housing');
    await evaluate("document.getElementById('housing').open=false;document.getElementById('reset').click();document.getElementById('economy').open=true;document.getElementById('day').click()");
    const ovesosDay=await evaluate('window.__FARMLAND_REVIEW__.snapshot()');assert.equal(ovesosDay.regions.ovesos.food.last.production,100);assert.equal(ovesosDay.regions.isareos.food.last.imports,170);
    assert.match(await evaluate("document.getElementById('food-description').textContent"),/no direct Minora export contract/);await capture('ovesos-food-report');
    await evaluate("document.getElementById('condition').value='0.5';document.getElementById('condition').dispatchEvent(new Event('change'));document.getElementById('week').click()");
    const ovesosDisrupted=await evaluate('window.__FARMLAND_REVIEW__.snapshot()');assert.equal(ovesosDisrupted.regions.ovesos.food.last.production,50);assert.equal(ovesosDisrupted.regions.caricas.food.last.production,170);
    const ovesos=await evaluate('({metrics:window.__FARMLAND_REVIEW__.metrics,stats:window.__FARMLAND_REVIEW__.stats()})');assert.equal(ovesos.metrics.capacity,100);assert(ovesos.stats.calls<120);
    await evaluate("window.__FARMLAND_REVIEW__.selectRegion('nethereum');");await evaluate("window.__FARMLAND_REVIEW__.selectRegion('ovesos');");
    assert.deepEqual(await evaluate('window.__FARMLAND_REVIEW__.snapshot()'),ovesosDisrupted);assert.equal(await evaluate("document.getElementById('condition').value"),'0.5');
    assert.equal(await evaluate('window.__FARMLAND_REVIEW__.stats().geometries'),ovesos.stats.geometries);
    assert.deepEqual(errors,[]);
    console.log('Ovesos passed. Checking Nesdor.');
    await evaluate("document.getElementById('region').value='nesdor';document.getElementById('region').dispatchEvent(new Event('change'))");await waitForRegion('nesdor');
    assert.deepEqual(await evaluate('window.__FARMLAND_REVIEW__.snapshot()'),ovesosDisrupted,'Nesdor joins the same campaign');
    await checkHousing('nesdor');
    await evaluate("document.getElementById('economy').open=false");
    for(const view of ['overview','town','fields','wildland']){await evaluate(`window.__FARMLAND_REVIEW__.view('${view}')`);await capture(`nesdor-${view}`);}
    for(const place of ['town','fields']){
      await evaluate(`document.getElementById('walk-${place}').click()`);await capture(`nesdor-walk-${place}`);
      const initial=await evaluate('window.__FARMLAND_REVIEW__.position()'),moved=await evaluate('window.__FARMLAND_REVIEW__.walkFor(1)');
      assert(Math.hypot(moved[0]-initial[0],moved[2]-initial[2])>2,`Nesdor ${place} must allow walking`);
    }
    assert.deepEqual(await evaluate('window.__FARMLAND_REVIEW__.routeAudit()'),[],'Nesdor woodland must leave all lanes and the quay walkable');
    await evaluate("window.__FARMLAND_REVIEW__.view('town');document.getElementById('housing').open=true");await capture('nesdor-housing');
    await evaluate("document.getElementById('housing').open=false;document.getElementById('reset').click();document.getElementById('economy').open=true;document.getElementById('day').click()");
    const nesdorDay=await evaluate('window.__FARMLAND_REVIEW__.snapshot()');
    assert.equal(nesdorDay.regions.nesdor.food.last.production,85);assert.equal(nesdorDay.regions.nesdor.food.last.imports,0);
    assert.equal(nesdorDay.regions.nesdor.food.population,750);assert.equal(nesdorDay.regions.isareos.food.last.imports,170);
    await evaluate("document.getElementById('condition').value='0.5';document.getElementById('condition').dispatchEvent(new Event('change'));document.getElementById('week').click()");
    const nesdorDisrupted=await evaluate('window.__FARMLAND_REVIEW__.snapshot()');
    assert.equal(nesdorDisrupted.regions.nesdor.food.last.production,42.5);
    assert(nesdorDisrupted.food.last.transfers.some(t=>t.from==='caricas'&&t.to==='nesdor'&&t.amount>0));
    assert.match(await evaluate("document.getElementById('food-transfers').textContent"),/Received from Caricas:/);await capture('nesdor-food-report');
    const nesdor=await evaluate('({metrics:window.__FARMLAND_REVIEW__.metrics,stats:window.__FARMLAND_REVIEW__.stats()})');
    assert.equal(nesdor.metrics.capacity,85);assert(nesdor.metrics.woodlandTrees>600);assert(nesdor.stats.calls<120);
    await evaluate("window.__FARMLAND_REVIEW__.selectRegion('caricas')");
    assert.deepEqual(await evaluate('window.__FARMLAND_REVIEW__.snapshot()'),nesdorDisrupted);
    assert.match(await evaluate("document.getElementById('food-transfers').textContent"),/Sent to Nesdor:/);
    assert(!nesdorDisrupted.food.last.transfers.some(t=>t.from==='caricas'&&t.to==='isareos'&&t.amount>=30));
    await capture('caricas-relief-report');
    await evaluate("window.__FARMLAND_REVIEW__.selectRegion('nesdor')");
    assert.equal(await evaluate("document.getElementById('condition').value"),'0.5');
    assert.equal(await evaluate('window.__FARMLAND_REVIEW__.stats().geometries'),nesdor.stats.geometries,'Nesdor woodland is cached on return');
    await evaluate("document.getElementById('condition').value='1';document.getElementById('condition').dispatchEvent(new Event('change'));window.__FARMLAND_REVIEW__.advance(28)");
    const nesdorRestored=await evaluate('window.__FARMLAND_REVIEW__.snapshot()');
    assert.equal(nesdorRestored.regions.nesdor.food.last.production,85);assert.equal(nesdorRestored.regions.nesdor.food.civilianRation,1);
    assert(nesdorRestored.food.last.transfers.some(t=>t.from==='caricas'&&t.to==='isareos'&&t.amount>0));
    assert.deepEqual(errors,[]);
    console.log('Nesdor passed. Checking Isareos and Minora.');
    await evaluate("document.getElementById('region').value='isareos';document.getElementById('region').dispatchEvent(new Event('change'))");await waitForRegion('isareos');
    assert.deepEqual(await evaluate('window.__FARMLAND_REVIEW__.snapshot()'),nesdorRestored,'Minora joins the same campaign');
    await checkHousing('isareos');
    await evaluate("document.getElementById('economy').open=false");
    for(const view of ['overview','town','fields','wildland']){await evaluate(`window.__FARMLAND_REVIEW__.view('${view}')`);await capture(`isareos-${view}`);}
    for(const place of ['town','fields']){
      await evaluate(`document.getElementById('walk-${place}').click()`);await capture(`isareos-walk-${place}`);
      const initial=await evaluate('window.__FARMLAND_REVIEW__.position()'),moved=await evaluate('window.__FARMLAND_REVIEW__.walkFor(1)');
      assert(Math.hypot(moved[0]-initial[0],moved[2]-initial[2])>2,`Isareos ${place} must allow walking`);
    }
    assert.deepEqual(await evaluate('window.__FARMLAND_REVIEW__.routeAudit()'),[],'Farm approaches and retained Minora bridges must be walkable');
    await evaluate("window.__FARMLAND_REVIEW__.view('town');document.getElementById('housing').open=true");await capture('isareos-housing');
    await evaluate("document.getElementById('housing').open=false;document.getElementById('reset').click();document.getElementById('economy').open=true;document.getElementById('day').click()");
    let minoraState=await evaluate('window.__FARMLAND_REVIEW__.snapshot()');
    assert.equal(minoraState.regions.isareos.food.last.imports,170);assert.equal(minoraState.regions.isareos.food.store,2380);
    assert.match(await evaluate("document.getElementById('food-transfers').textContent"),/Received from Nethereum: 140/);
    assert.match(await evaluate("document.getElementById('food-transfers').textContent"),/Received from Caricas: 30/);
    await evaluate("document.getElementById('food-transfers').scrollIntoView({block:'center'})");await capture('isareos-imports');
    await evaluate("document.getElementById('import-nethereum').click();document.getElementById('import-caricas').click()");
    assert.equal(await evaluate("document.getElementById('food-balance').textContent"),'','Pending closure must not retain a healthy forecast');
    await evaluate("document.getElementById('week').click()");
    minoraState=await evaluate('window.__FARMLAND_REVIEW__.snapshot()');
    assert.equal(minoraState.regions.isareos.food.store,1190);assert.equal(minoraState.regions.isareos.food.last.imports,0);
    assert.match(await evaluate("document.getElementById('food-balance').textContent"),/About 7 more days/);
    await evaluate("document.getElementById('food-balance').scrollIntoView({block:'center'})");await capture('isareos-cutoff');
    await evaluate("document.getElementById('week').click();document.getElementById('day').click()");
    minoraState=await evaluate('window.__FARMLAND_REVIEW__.snapshot()');assert(minoraState.regions.isareos.food.civilianRation<1);
    await evaluate("document.getElementById('import-nethereum').click();document.getElementById('import-caricas').click();window.__FARMLAND_REVIEW__.advance(35)");
    const minoraRestored=await evaluate('window.__FARMLAND_REVIEW__.snapshot()');assert.equal(minoraRestored.regions.isareos.food.civilianRation,1);assert(minoraRestored.regions.isareos.food.store>0);
    const isareos=await evaluate('({metrics:window.__FARMLAND_REVIEW__.metrics,stats:window.__FARMLAND_REVIEW__.stats()})');
    assert.equal(isareos.metrics.capacity,100);assert.equal(isareos.metrics.city.bridges,5);assert(isareos.stats.calls<180);
    await evaluate("window.__FARMLAND_REVIEW__.selectRegion('nethereum')");
    assert(await evaluate("document.getElementById('import-routes').hidden"));
    await evaluate("window.__FARMLAND_REVIEW__.selectRegion('isareos')");
    assert.deepEqual(await evaluate('window.__FARMLAND_REVIEW__.snapshot()'),minoraRestored);
    assert.equal(await evaluate('window.__FARMLAND_REVIEW__.stats().geometries'),isareos.stats.geometries,'Minora must reuse its cached scenery');
    await evaluate("document.getElementById('import-caricas').click();document.getElementById('reset').click()");
    assert(await evaluate("document.getElementById('import-caricas').checked"));
    assert.equal(await evaluate("document.getElementById('food-transfers').textContent"),'');
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(out,'farmland-review.json'),JSON.stringify({results,caricas,ovesos,nesdor,isareos,errors},null,2));console.log(JSON.stringify({results,caricas,ovesos,nesdor,isareos,errors}));clearTimeout(watchdog);app.exit(0);
  }catch(error){console.error(error);clearTimeout(watchdog);app.exit(1);}
});
