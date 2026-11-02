import {prepareWarExterior} from './tower-smoke.js';
import {createWorldWar,FOOD_WORLD_SCENARIO,WORLD_WAR_SCENARIO} from '../../app/exploration/world-war.js';
import {canStand} from '../../gameplay/movement/locomotion.js';
import {columnGroundClear} from '../../app/exploration/war-column-routes.js';
import {driveWorldEncounter,clearCombatKeys} from './encounter-controls.js';

// Ordinary campaign histories and ordinary input; the isolated desktop profile
// changes only the hero's observation point and chosen campaign allegiance.
const checks=[],samples=[];
const assert=(ok,label)=>{if(!ok)throw Error(label);checks.push(label);console.log('EXPLORATION_CHECK '+label);};
const frames=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
const refresh=api=>api.step(0);
const state=api=>api.war.state(),campaign=api=>state(api).campaign;
const column=(api,id)=>state(api).columns.columns.find(c=>c.id===id);
const near=(a,b,tolerance=.02)=>Math.hypot(a.x-b.x,a.z-b.z)<tolerance;
const press=code=>{for(const type of ['keydown','keyup'])document.dispatchEvent(new KeyboardEvent(type,{code,bubbles:true}));};
let scenario,initial,pendingVictory;

async function plannedColumn(api,id,label){
  const deadline=performance.now()+45000;
  while((!column(api,id)||column(api,id).pendingRoute)&&performance.now()<deadline){refresh(api);await frames();}
  const model=column(api,id);assert(model?.location&&!model.pendingRoute,label+': moving army has a physical route / '+JSON.stringify(state(api).columns.routes??{}));return model;
}

function checkpoint(day,fraction=15){
  const war=createWorldWar(null,scenario);war.advance(day);war.resetPhase(fraction);return war.checkpoint();
}
function standing(api,at,min=25,max=min){
  for(let distance=min;distance<=max;distance+=2)for(let i=0;i<32;i++){
    const angle=i*Math.PI/16,p={x:at.x+Math.sin(angle)*distance,z:at.z+Math.cos(angle)*distance};
    if(api.testWorld.readyAt(p.x,p.z)&&canStand(p.x,p.z,api.testWorld,.7))return p;
  }
  throw Error('No clear observation ground near column '+JSON.stringify(at));
}
function contactLane(api,at){
  for(let i=0;i<32;i++){
    const angle=i*Math.PI/16,point=r=>({x:at.x+Math.sin(angle)*r,z:at.z+Math.cos(angle)*r});let clear=true;
    for(let r=10;r<=30;r+=1.5){const p=point(r);if(!canStand(p.x,p.z,api.testWorld,.75)){clear=false;break;}}
    if(clear)return {away:point(30),close:point(10),yaw:angle};
  }
  throw Error('No clear walking approach to '+JSON.stringify(at));
}
async function observe(api,{day,id,side=null,fraction=15,label}){
  api.resume();api.selectMount('foot');api.war.restore({...checkpoint(day,fraction),campaignSide:side??'west',reportReadThrough:9999});api.war.pause();refresh(api);
  const army=campaign(api).armies.find(a=>a.id===id);
  assert(army&&['marching','retreating'].includes(army.status),label+': actual campaign army is moving');
  // Allied observation avoids opening a hostile roadside encounter while
  // checking presentation; interception receives separate checks below.
  if(side===null){api.war.restore({...checkpoint(day,fraction),campaignSide:army.owner,reportReadThrough:9999});api.war.pause();refresh(api);}
  const model=await plannedColumn(api,id,label);
  await api.testWorld.prepare(model.location.x,model.location.z);
  const vantage=standing(api,model.location,28,42);await api.visit(vantage);api.war.sync();refresh(api);
  // Bear's completed handoff can already select this army. Tracking is a
  // toggle, so pressing the same target twice would deliberately stop it.
  const tracked=state(api).tracking?.target;
  if(tracked?.kind!=='army'||tracked.id!==id)api.war.track({kind:'army',id});refresh(api);
  const shown=column(api,id);assert(shown.visible&&shown.soldiers.length>0,label+': real soldiers visible beside their marker');
  const view=state(api).columns;
  assert(view.columns.filter(c=>c.visible).length<=view.budget.columns&&view.columns.reduce((n,c)=>n+c.soldiers.length,0)<=view.budget.soldiers&&view.actors<=view.budget.soldiers+2,label+': rendering stays within the shared column and soldier budget');
  for(const [x,y,z] of shown.soldiers){const p=api.groundProbe(x,z);assert(p.ready&&columnGroundClear(api.testWorld,{x,z})&&Math.abs(p.height-y)<.03,label+': soldier stands on clear, loaded terrain or a shallow ford');}
  const marker=api.war.minimapEvents().find(e=>e.target.kind==='army'&&e.target.id===id);
  assert(marker&&near(marker,shown.location),label+': minimap follows the physical column');
  assert(state(api).light.visible&&near(state(api).light.location,shown.location),label+': selected world guide follows the physical column');
  assert(api.state().mode==='playing',label+': observing a column does not force combat');
  api.look({yaw:Math.atan2(vantage.x-shown.location.x,vantage.z-shown.location.z),pitch:.13,distance:10});await frames();
  return {army,shown,vantage,label};
}

export async function prepare(api){
  window.dispatchEvent(new Event('focus'));await prepareWarExterior(api);api.war.pause();api.reveal(true);
  scenario=api.state().launch==='food-world'?FOOD_WORLD_SCENARIO:WORLD_WAR_SCENARIO;
  initial=api.war.save(api.snapshot());
  if(scenario===FOOD_WORLD_SCENARIO)assert(!!api.testWorld.agricultureState?.(), 'Food world uses the reviewed farms for physical marching checks');
  return {checks:[...checks],readyMs:api.state().readyMs};
}

async function sample(api,options){
  const {army,shown,vantage,label}=await observe(api,options),before=JSON.stringify(campaign(api)),clock=state(api).clock;
  // Exercise ordinary movement as well as the independently running clock.
  api.hold('KeyW',true);api.step(.04);api.hold('KeyW',false);
  api.war.run();for(let i=0;i<60;i++)api.step(1/60);api.war.pause();refresh(api);
  const moved=column(api,army.id);
  assert(Math.hypot(moved.location.x-shown.location.x,moved.location.z-shown.location.z)>.1,label+': visible march advances within one campaign day');
  assert(JSON.stringify(campaign(api))===before,label+': rendering does not alter forces or campaign orders');
  const paused={...moved.location};for(let i=0;i<20;i++)api.step(.04);
  assert(near(column(api,army.id).location,paused),label+': paused march stays still');
  api.pause();refresh(api);assert(!state(api).columns.columns.some(c=>c.visible),label+': menu hides marching scenery');api.resume();refresh(api);
  assert(api.save().ok,label+': campaign and column can be saved');
  await api.loadSaved();api.war.pause();refresh(api);
  assert(near(column(api,army.id).location,paused),label+': saved campaign restores the same physical position');
  assert(column(api,army.id).soldiers.length>0,label+': restored column renders again');
  const photo=contactLane(api,paused);await api.visit(photo.away);refresh(api);
  api.look({yaw:photo.yaw,pitch:.2,distance:11});await frames();
  const result={label,day:campaign(api).day,id:army.id,owner:army.owner,status:army.status,from:army.from,to:army.to,location:column(api,army.id).location,soldiers:column(api,army.id).soldiers.length,render:api.renderStats(),clockBefore:clock.fraction};samples.push(result);
  return {sample:result,checks:[...checks]};
}
export const openingWest=api=>sample(api,{day:2,id:2,label:'Opening West column'});
export const openingEast=api=>sample(api,{day:2,id:3,label:'Opening East column'});
export const laterWest=api=>sample(api,{day:12,id:5,label:'Later replacement West army'});
export const laterEast=api=>sample(api,{day:14,id:3,label:'Later East return march'});
export const easternPlain=api=>sample(api,{day:20,id:5,label:'Later West eastern plain march'});
export const retreat=api=>sample(api,{day:20,id:6,label:'Later West retreat'});

export async function convoy(api){
  const {shown}=await observe(api,{day:26,id:1,side:'east',label:'Several returning East armies'}),before=JSON.stringify(campaign(api));
  const armies=campaign(api).armies.filter(a=>a.status==='retreating'&&a.from==='nesdor'&&a.to==='ovesos');
  assert(armies.length>=3,'Later campaign naturally produces a shared-road retreat convoy');
  for(const army of armies)await plannedColumn(api,army.id,'Convoy army '+army.id);
  const models=armies.map(a=>column(api,a.id));
  assert(models.every(c=>c.visible&&c.soldiers.length>0),'Each nearby retreating army has its own visible troops and standard');
  for(let i=0;i<models.length;i++)for(let j=i+1;j<models.length;j++){
    assert(Math.hypot(models[i].location.x-models[j].location.x,models[i].location.z-models[j].location.z)>12,'Separate army standards leave room for their own formations');
    for(const a of models[i].soldiers)for(const b of models[j].soldiers)assert(Math.hypot(a[0]-b[0],a[2]-b[2])>.7,'Different columns do not stack their soldiers inside one another');
  }
  const markers=api.war.minimapEvents();for(const model of models){const mark=markers.find(e=>e.target.kind==='army'&&e.target.id===model.id);assert(mark&&near(mark,model.location),'Convoy army '+model.id+' keeps its own exact minimap position');}
  assert(JSON.stringify(campaign(api))===before,'Convoy spacing does not alter march orders or strengths');
  const positions=models.map(c=>({id:c.id,location:{...c.location}}));assert(api.save().ok,'Convoy observation saves');await api.loadSaved();api.war.pause();refresh(api);
  for(const saved of positions)assert(near(column(api,saved.id).location,saved.location),'Convoy spacing survives Continue for army '+saved.id);
  const point=api.state().position;api.look({yaw:Math.atan2(point[0]-shown.location.x,point[2]-shown.location.z),pitch:.35,distance:25});await frames();
  return {checks:[...checks],convoy:state(api).columns.columns.filter(c=>armies.some(a=>a.id===c.id)),render:api.renderStats()};
}

export async function alliedApproach(api){
  const {shown}=await observe(api,{day:12,id:5,side:'west',label:'Allied column approach'}),before=JSON.stringify(campaign(api).armies);
  await api.visit(standing(api,shown.location,8,12));refresh(api);await frames();
  assert(!campaign(api).pending&&api.state().mode==='playing','Walking up to an allied army never starts a hostile interception');
  assert(!api.war.intercept(5).ok,'Direct interception also refuses a campaign ally');
  assert(JSON.stringify(campaign(api).armies)===before,'Friendly contact leaves army strength and orders unchanged');
  return {checks:[...checks]};
}

async function approach(api,side){
  const id=side==='west'?3:5,day=side==='west'?14:12,label=side+' roadside interception';
  const observed=await observe(api,{id,day,side,label}),before=JSON.stringify(campaign(api).armies),at=observed.shown.location;
  const {away,close,yaw}=contactLane(api,at);await api.visit(away);api.war.sync();refresh(api);
  if(side==='east'){
    api.stable.restore({version:1,owned:true,taught:true,horse:{...away,yaw:yaw+Math.PI}});press('KeyG');
    assert(api.stable.mounted&&api.state().mount.kind==='horse',label+': ordinary owned horse mounts before contact');
  }
  api.look({yaw,pitch:.15,distance:9});api.hold('KeyW',true);
  for(let i=0;i<200&&api.state().mode==='playing';i++){api.step(.04);if(i%30===29)await frames();}
  api.hold('KeyW',false);await frames();
  assert(campaign(api).pending?.kind==='roadside',label+': walking up opens the encounter automatically');
  assert(side==='west'||api.stable.mounted,label+': mounted approach remains mounted until combat confirmation');
  assert(campaign(api).pending.armyId===id,label+': encounter belongs to the approached army');
  assert(document.getElementById('encounter-dialog').matches(':modal'),label+': encounter pauses in a central confirmation');
  const text=document.getElementById('encounter-brief').textContent;
  assert(!/choose (?:a|your) side/i.test(text),label+': allegiance is not asked again');
  assert(JSON.stringify(campaign(api).armies)===before,label+': invitation itself changes no army');
  api.war.withdraw();refresh(api);
  assert(api.state().mode==='playing'&&!campaign(api).pending,label+': staying out returns control');
  assert(JSON.stringify(campaign(api).armies)===before,label+': declining does not weaken or delay troops');
  for(let i=0;i<60;i++)api.step(.02);
  assert(!campaign(api).pending,label+': declining does not immediately reopen the prompt');
  await api.visit(away);refresh(api);await api.visit(close);refresh(api);
  assert(campaign(api).pending?.kind==='roadside',label+': leaving and approaching again permits reconsideration');
  return {label,id,side,day,brief:text};
}
export const westApproach=api=>approach(api,'west');
export const eastApproach=api=>approach(api,'east');

async function fight(api,side,{pauseForPhoto=false}={}){
  const pending=structuredClone(campaign(api).pending),before=structuredClone(campaign(api)),clock=state(api).clock.fraction;
  const originalLocation={...column(api,pending.armyId).location};
  await api.war.help(side);await frames();
  assert(api.state().mode==='skirmish',side+': roadside confirmation starts a combined battle');
  assert(api.state().mount.kind==='foot'&&!api.stable.mounted,side+': combat begins safely on foot');
  let combat=state(api).encounter.encounter,steps=0;
  for(;steps<12000&&!combat?.outcome&&api.state().mode==='skirmish';steps++){
    driveWorldEncounter(api,combat);api.step(1/60);if(steps%120===119)await frames();combat=state(api).encounter.encounter;
  }
  clearCombatKeys(api);
  assert(combat?.outcome==='success',side+': ordinary combat inputs win the roadside encounter');
  assert(document.getElementById('battle-result-dialog').matches(':modal'),side+': roadside victory has a centered result');
  assert(state(api).clock.fraction===clock,side+': fighting and reading spend no campaign time');
  pendingVictory={side,pending,before,originalLocation,combat,steps};
  if(pauseForPhoto){await frames();return {checks:[...checks],side,result:combat.outcome,health:combat.hero.hp,steps};}
  return finishFight(api,pendingVictory);
}
async function finishFight(api,{side,pending,before,originalLocation,combat,steps}){
  document.getElementById('world-skirmish-continue').click();refresh(api);
  assert(!campaign(api).pending&&api.state().mode==='playing',side+': continue returns to the same world');
  assert(state(api).campaignSide===side,side+': allegiance remains fixed');
  assert(campaign(api).day===before.day,side+': interception does not skip the campaign clock');
  const afterState=campaign(api),event=afterState.events.findLast(e=>e.type==='roadside-result'),oldArmy=before.armies.find(a=>a.id===pending.armyId),army=afterState.armies.find(a=>a.id===pending.armyId);
  assert(event?.armyId===pending.armyId&&event.outcome==='success',side+': outcome records the exact intercepted army');
  assert(army.strength===oldArmy.strength-event.removed,side+': battle removes only the recorded soldiers from the moving army');
  assert(event.removed>=0&&event.removed<=12&&army.arrives===oldArmy.arrives+event.delay,side+': army losses and delay remain bounded');
  if(army.strength>0)assert(near(column(api,pending.armyId).location,originalLocation,.05),side+': delaying the march does not teleport its column backward');
  for(const untouched of before.armies.filter(a=>a.id!==pending.armyId))assert(JSON.stringify(afterState.armies.find(a=>a.id===untouched.id))===JSON.stringify(untouched),side+': unrelated army '+untouched.id+' is unchanged');
  assert(!api.war.intercept(pending.armyId).ok,side+': the same march cannot be intercepted repeatedly');
  for(const [id,r] of Object.entries(before.regions))assert(afterState.regions[id].owner===r.owner,side+': roadside combat does not capture '+id);
  assert(api.save().ok,side+': completed roadside encounter saves');const after=JSON.stringify(campaign(api));
  await api.loadSaved();api.war.pause();refresh(api);assert(JSON.stringify(campaign(api))===after,side+': roadside result replays exactly');
  assert(!api.state().frameErrors.length,side+': roadside battle has no renderer errors');
  return {checks:[...checks],side,pending,steps,result:combat.outcome,health:combat.hero.hp};
}
export const westBattle=api=>fight(api,'west');
export const eastBattle=api=>fight(api,'east');
export const westVictory=api=>fight(api,'west',{pauseForPhoto:true});
export const westResult=api=>finishFight(api,pendingVictory);
export async function finish(api){
  clearCombatKeys(api);api.war.restore(initial);api.war.pause();refresh(api);
  assert(!api.state().frameErrors.length,'All campaign marching and interception checks have no frame errors');
  return {checks:[...checks],samples};
}
