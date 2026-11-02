import {createAdventureWar} from '../../experiments/day-night/opening-war.js';
import {prepareWarExterior} from './tower-smoke.js';
import {finish} from './champion-duel-smoke.js';
import {validateWorldWarSave} from '../../app/exploration/war-checkpoint.js';
import {createSkirmishGround} from '../../app/exploration/skirmish-ground.js';
import {driveWorldEncounter,clearCombatKeys} from './encounter-controls.js';
import {encounterBodyGap} from '../../gameplay/combat/encounter-space.js';
const assert=(ok,message)=>{if(!ok)throw Error(message);};
const frames=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
const fight=a=>a.war.state().encounter.encounter;
async function capture(){window.dispatchEvent(new Event('blur'));await frames();}
async function setup(a,region='caricas',side='west'){
  window.dispatchEvent(new Event('focus'));await prepareWarExterior(a);
  const war=createAdventureWar();if(region==='ovesos')war.advance(2);const b=war.snapshot().engagements.find(b=>b.region===region);
  await a.visit(b.location);a.reveal(true);a.war.restore({...war.checkpoint(),campaignSide:side});a.war.pause();a.step(.04);
  assert(a.state().mode==='encounter','Battlefield opens immediately');return b;
}
function idleClock(a,running,label){
  // Withdrawal first puts the player back outside the battlefield boundary.
  a.step(.04);
  const before=a.war.clock().elapsedSeconds,position=a.snapshot().position;
  for(let i=0;i<40;i++)a.step(.04);
  const clock=a.war.clock();
  assert(clock.running===running,label+': running preference restored');
  assert(Math.abs(clock.elapsedSeconds-before-(running?1.6:0))<1e-6,label+': idle time '+before+' → '+clock.elapsedSeconds+' / '+clock.heldReason);
  assert(Math.hypot(a.snapshot().position.x-position.x,a.snapshot().position.z-position.z)<.01,label+': no movement needed');
}
export async function clockTransitions(a){
  const b=await setup(a);a.war.withdraw();idleClock(a,false,'Deliberate pause survives declining');
  a.war.run();assert(a.war.join(b.id).ok,'Running campaign re-enters battle');
  const before=a.war.clock().elapsedSeconds;for(let i=0;i<40;i++)a.step(.04);
  assert(a.war.clock().elapsedSeconds===before,'Briefing holds campaign time');
  a.war.withdraw();idleClock(a,true,'Declining resumes outdoor time');
  assert(a.war.join(b.id).ok,'Rejoin from running campaign');await a.war.help('west');
  assert(a.state().mode==='skirmish','Full battle starts');a.war.withdraw();
  assert(a.state().mode==='playing','Withdrawal returns to exploration');idleClock(a,true,'Withdrawal resumes outdoor time');
  await capture();return {checks:['Explicit pause preserved; running campaign resumes after declining and withdrawing, without movement']};
}
export async function retryClock(a){
  const b=await setup(a);a.war.withdraw();a.war.run();assert(a.war.join(b.id).ok,'Running campaign enters lethal duel');
  await a.war.help('west','duel');
  for(let i=0;i<9000&&a.state().mode==='skirmish';i++){a.step(.04);if(i%200===0)await frames();}
  const end=performance.now()+10000;
  while((a.state().mode!=='limbo'||document.body.classList.contains('crossing-limbo'))&&performance.now()<end)await frames();
  assert(a.state().mode==='limbo','Ordinary enemy attacks defeat Teresod and enter limbo');
  assert(!a.war.clock().running,'Limbo remains paused');
  assert(a.afterlife.snapshot().death.before.tower.running,'Retry checkpoint remembers pre-battle running preference');
  assert(await a.afterlife.choose('retry'),'Retry reopens the duel');
  const result=await finish(a);for(let i=0;i<90;i++)a.step(1/60);a.war.continue();
  assert(a.state().mode==='encounter','Duel victory offers the allied battle');a.war.withdraw();
  idleClock(a,true,'Victory after retry resumes outdoor time');
  await capture();return {checks:['Death holds time; retry preserves running preference through duel victory and return to exploration'],duelSeconds:result.time};
}
export async function briefing(a){
  const b=await setup(a);a.war.withdraw();a.war.run();assert(a.war.join(b.id).ok,'Enter first battle with campaign running');
  const options=[...document.getElementById('encounter-opening').options].map(o=>o.value);
  assert(options.join(',')==='field,duel','Battle is default; a real opposing captain permits optional duel');
  assert(document.getElementById('encounter-phase-path').textContent==='Battle with allies → Battle result','One battle described');
  assert(!document.getElementById('fight-attacker').hidden&&document.getElementById('fight-defender').hidden,'Campaign allegiance is already chosen');
  assert(!document.getElementById('encounter-time-notice').textContent.includes('regroup'),'Time notice does not promise a second stage');
  await capture();return {checks:['Direct battle default; optional champion; no interception choice'],options};
}
export async function formation(a){
  window.dispatchEvent(new Event('focus'));await a.war.help('west');const s=fight(a);
  assert(s?.stage==='rally'&&!s.interception,'Default enters the full battle directly: '+document.getElementById('encounter-result').textContent+' / '+JSON.stringify(a.war.state().encounter));
  assert(s.guards.length>=8&&s.allies.length>=8,'Two larger militia formations');
  assert(s.guards.some(g=>g.commanderId)&&s.allies.some(g=>g.commanderId),'Both available army commanders are present');
  assert(document.getElementById('world-skirmish-phase').textContent.includes('1 / 1 · Battle'),'Combat HUD shows one battle');
  a.look({yaw:0,pitch:.55,distance:16});await capture();return {checks:['Allied militia formations and commanders load on real Caricas terrain'],enemies:s.guards.length,allies:s.allies.length};
}
export async function victory(a){
  const entered=a.war.clock().elapsedSeconds,deadline=a.war.state().campaign.pending.endsOn*60;
  const field=await finish(a);for(let i=0;i<90;i++)a.step(1/60);
  assert(!document.getElementById('world-skirmish-facts').textContent.includes('interception'),'Result does not invent an interception');
  assert(a.war.clock().elapsedSeconds===entered,'Fighting and reading the result do not charge time before Continue');
  assert(deadline===180,'Caricas result forecasts its scheduled 03:00 finish');
  await capture();return {checks:['Ordinary staff, dodge and targeting inputs win the single battle; result review retains the entry clock'],seconds:field.time,hp:field.hero.hp,alliesLost:field.squad.alliesLost};
}
export async function readability(a){
  window.dispatchEvent(new Event('blur'));
  const labels=a.state().combatCues.filter(c=>c.kind==='label'&&c.visible);
  assert(labels.length<=4&&labels.filter(c=>c.detailed).length<=1,'Field limits large enemy cards to one and compact labels to nearby threats');
  let allies=0;a.testHero.group.parent.traverse(o=>{if(o.userData.alliedLabel&&o.visible)allies++;});
  assert(allies<=1,'Healthy formation labels only its captain');
  let faded=false;
  for(let i=0;i<24;i++){
    a.look({yaw:i*Math.PI/12,pitch:.3,distance:9});await frames();
    if(a.testWorld.caricasStandards.state().faded){faded=true;break;}
  }
  assert(faded,'Caricas standards fade when the follow camera passes behind one');
  assert(a.state().heroVisible&&!a.state().frameErrors.length,'Teresod remains visible without rendering errors');
  return {checks:['One main enemy label; no healthy rank-and-file allied cards','Standards clear the camera view of Teresod'],labels:labels.length,alliedLabels:allies,camera:a.state().camera,standards:a.testWorld.caricasStandards.state()};
}
export async function aftermath(a){
  window.dispatchEvent(new Event('focus'));document.getElementById('world-skirmish-continue').click();
  const s=a.war.state().campaign;
  assert(s.regions.caricas.owner==='west'&&!s.pending,'One Continue resolves the battle, with no second combat stage');
  const first=s.engagements.find(b=>b.region==='caricas'),other=s.engagements.find(b=>b.region==='ovesos');
  assert(first.resolvedAt===180&&a.war.state().clock.elapsedSeconds===180,'Continue advances exactly to the scheduled 03:00 Caricas result');
  assert(other.status==='active'&&other.startedAt===120&&other.endsAt===300,'Ovesos begins during the elapsed interval and has two minutes left');
  assert(s.food.last.day===3,'Food production and consumption reach the same campaign minute');
  idleClock(a,true,'Victory resumes outdoor time');
  assert(a.save().ok&&validateWorldWarSave(a.store.read().data),'Single battle saves');
  const seconds=a.war.clock().elapsedSeconds;await a.loadSaved();a.war.pause();assert(a.war.clock().elapsedSeconds===seconds,'Reload preserves exact post-battle time');
  await capture();return {checks:['One battle resolves territory at 03:00; Ovesos and food advance normally; Save/Continue validates']};
}
export async function noChampion(a){
  await setup(a,'ovesos','east');assert(document.getElementById('encounter-duel-choice').hidden,'No opponent champion means no duel choice');
  assert([...document.getElementById('encounter-opening').options].map(o=>o.value).join(',')==='field','Only direct battle offered');
  await capture();return {checks:['Ovesos armies without champions get only Join battle']};
}
export async function ovesos(a){
  window.dispatchEvent(new Event('focus'));await a.war.help('east');const s=fight(a);
  assert(s?.stage==='rally'&&s.allies.length>=4&&s.guards.length>=4,'East joins full battle at Ovesos');
  a.look({yaw:0,pitch:.55,distance:16});await capture();return {checks:['Ovesos field fits both formations'],enemies:s.guards.length,allies:s.allies.length};
}
export async function ovesosVictory(a){
  const s=await finish(a);for(let i=0;i<90;i++)a.step(1/60);document.getElementById('world-skirmish-continue').click();
  assert(a.war.state().campaign.regions.ovesos.owner==='east','East victory settles Ovesos');
  assert(!a.state().frameErrors.length,'No frame errors');await capture();return {checks:['East can win Ovesos through normal combat inputs'],seconds:s.time,hp:s.hero.hp};
}
export async function optionalDuel(a){
  await setup(a);await a.war.help('west','duel');assert(fight(a).stage==='duel','Explicit challenge starts one-on-one');
  const field=await finish(a);for(let i=0;i<90;i++)a.step(1/60);document.getElementById('world-skirmish-continue').click();await a.war.help('west');
  const s=fight(a);assert(s.stage==='rally'&&!s.guards.some(g=>g.commanderId)&&s.allies.length>=8,'Duel leads to larger battle; yielded captain stays absent');
  a.look({yaw:0,pitch:.55,distance:16});await capture();return {checks:['Optional duel leads to full allied battle and preserves captain retreat'],duelSeconds:field.time,enemies:s.guards.length,allies:s.allies.length};
}

let nesdorReview=null;
const gap=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function living(s){return [s.hero,...s.guards,...(s.allies??[])].filter(b=>b.hp>0&&!b.escaped);}
function inspectField(world,s,previous=null){
  const bodies=living(s);let closest=Infinity;
  for(let i=0;i<bodies.length;i++){
    const b=bodies[i];
    for(const [dx,dz]of [[0,0],[.33,0],[-.33,0],[0,.33],[0,-.33]]){
      const x=b.x+dx,z=b.z+dz;
      assert(world.readyAt(x,z)&&world.heightAt(x,z)>=world.waterAt(x,z)-1e-6,'Nesdor combatant stays on loaded dry footing');
    }
    for(let j=0;j<i;j++){
      const d=gap(b,bodies[j]);closest=Math.min(closest,d);
      assert(d>=encounterBodyGap(b,bodies[j])-1e-5,'Nesdor living combatants do not overlap');
    }
  }
  if(previous){
    const dt=s.time-previous.time;
    for(const g of [...s.guards,...s.allies]){
      const before=[...previous.guards,...previous.allies].find(p=>p.id===g.id);
      // Routed soldiers use the existing evacuation pace; no militia in this
      // fixture has a lunging attack. Movement is observed, never prescribed.
      if(before&&dt>0)assert(gap(g,before)<=Math.max(g.combat.moveSpeed,g.routed?3.2:0)*dt+.002,'Nesdor route correction does not teleport or accelerate a soldier');
    }
  }
  return closest;
}
function shoreApproach(world,s,ground){
  const options=[];
  for(const distance of [3,6,9,12,16,20])for(let i=0;i<32;i++){
    const angle=i*Math.PI/16,p={x:s.hero.x+Math.sin(angle)*distance,z:s.hero.z+Math.cos(angle)*distance};
    if(!ground.clear(p.x,p.z,.65)||!ground.segment(s.hero,p,.55))continue;
    const water=Array.from({length:16},(_,j)=>({x:p.x+Math.sin(j*Math.PI/8)*2,z:p.z+Math.cos(j*Math.PI/8)*2}))
      .find(q=>world.heightAt(q.x,q.z)<world.waterAt(q.x,q.z));
    if(!water)continue;
    const crowd=living(s).filter(b=>b!==s.hero).reduce((sum,b)=>sum+Math.max(0,3-gap(b,p))*3,0);
    options.push({point:p,water,score:distance+crowd});
  }
  options.sort((a,b)=>a.score-b.score);return options[0]??null;
}

export async function nesdorFormation(a){
  window.dispatchEvent(new Event('focus'));clearCombatKeys(a);
  if(['skirmish','encounter'].includes(a.state().mode))a.war.withdraw();
  await prepareWarExterior(a);
  // Let the ordinary unattended campaign reach this front. No victory,
  // casualty, army strength or battlefield position is patched into the save.
  const war=createAdventureWar();let battle=null;
  for(let ticks=0;ticks<20&&!war.snapshot().winner;ticks++){
    battle=war.snapshot().engagements.find(b=>b.region==='nesdor'&&b.status==='active');
    if(battle)break;war.advance(1);
  }
  assert(battle,'The ordinary campaign reaches an active Nesdor battle');
  await a.visit(battle.location);a.reveal(true);a.war.restore({...war.checkpoint(),campaignSide:'west'});a.war.pause();a.step(.04);
  assert(a.state().mode==='encounter','Nesdor uses the normal battle briefing');await a.war.help('west');
  const s=fight(a);assert(s?.site==='nesdor-world'&&s.stage==='rally','Nesdor loads its actual shared-world field');
  assert(s.guards.length>=6&&s.allies.length>=4,'Nesdor has two substantial committed formations');
  const ground=createSkirmishGround(a.testWorld,s.centre,14,s.radius),shore=shoreApproach(a.testWorld,s,ground);
  assert(shore,'Nesdor provides a connected dry approach within two metres of real water');
  const closest=inspectField(a.testWorld,s);
  nesdorReview={battleId:battle.id,shore,initial:{x:s.hero.x,z:s.hero.z},clock:a.war.clock().elapsedSeconds,enemies:s.guards.length,allies:s.allies.length};
  a.look({yaw:0,pitch:.55,distance:16});await capture();
  return {checks:['Untouched campaign reaches Nesdor; real terrain holds both formations','A connected bank approach is found beside actual water'],enemies:s.guards.length,allies:s.allies.length,closest,shore:shore.point,water:shore.water};
}

export async function nesdorShoreline(a){
  assert(nesdorReview&&fight(a)?.site==='nesdor-world','Run nesdorFormation before nesdorShoreline');
  window.dispatchEvent(new Event('focus'));clearCombatKeys(a);
  const review=nesdorReview,world=a.testWorld;let s=fight(a),closest=Infinity,walked=0;
  // Walk the player to the bank with ordinary camera-relative WASD. The live
  // opponents continue moving and fighting throughout this approach.
  for(let i=0;i<420&&a.state().mode==='skirmish'&&!s.outcome&&gap(s.hero,review.shore.point)>.65;i++){
    const dx=review.shore.point.x-s.hero.x,dz=review.shore.point.z-s.hero.z;
    a.look({yaw:Math.atan2(-dx,-dz),pitch:.45,distance:13});a.hold('KeyW',true);
    const before=s;a.step(1/60);s=fight(a);assert(s,'Nesdor encounter remains available during the bank approach');
    closest=Math.min(closest,inspectField(world,s,before));walked+=gap(before.hero,s.hero);
    if(i%90===0)await frames();
  }
  clearCombatKeys(a);
  assert(a.state().mode==='skirmish'&&!s.outcome&&gap(s.hero,review.shore.point)<1,'Ordinary walking reaches the riverbank before the battle ends');
  assert(walked>1&&gap(s.hero,review.initial)>1,'The bank approach actually moved the hero');
  const atBank=s.time,starts=new Map(s.guards.map(g=>[g.id,{x:g.x,z:g.z}]));
  let moved=new Set(),damage=false,dodges=0,lastDodge=null,maxNearby=0,supportObserved=false;
  for(let i=0;i<2400&&a.state().mode==='skirmish'&&!s.outcome;i++){
    const before=s;driveWorldEncounter(a,s);a.step(1/60);s=fight(a);if(!s)break;
    closest=Math.min(closest,inspectField(world,s,before));
    for(const g of s.guards)if(gap(g,starts.get(g.id))>1)moved.add(g.id);
    maxNearby=Math.max(maxNearby,s.guards.filter(g=>g.hp&&!g.escaped&&gap(g,s.hero)<8).length);
    supportObserved||=s.guards.some(g=>g.engagementRank>0);
    damage||=s.hero.hp<before.hero.hp||s.guards.some(g=>g.hp<before.guards[g.id].hp)||s.squad.alliesLost>0;
    if(s.hero.dodgeStartedAt!==null&&s.hero.dodgeStartedAt!==lastDodge){lastDodge=s.hero.dodgeStartedAt;dodges++;}
    if(i%90===0)await frames();
  }
  clearCombatKeys(a);
  assert(moved.size>=3&&maxNearby>=3,'Several real enemies move into the shoreline engagement');
  assert(damage,'The native crowd check includes actual combat exchanges');
  assert(dodges>0,'Ordinary autoplay performs real dodges in the shoreline encounter');
  assert(a.war.clock().elapsedSeconds===review.clock,'The local shoreline fight holds campaign time');
  assert(!a.state().frameErrors.length,'Shoreline combat has no render errors');
  a.look({pitch:.55,distance:16});await capture();
  const result={checks:['WASD reaches the real Nesdor bank; several enemies pursue and exchange real damage','Dry footprints, body clearance and ordinary soldier speed survive combat and dodges','Local combat preserves the campaign clock'],seconds:s?.time-atBank,walked,closest,enemiesMoved:moved.size,maxNearby,dodges,supportObserved,outcome:s?.outcome??a.state().mode,hp:s?.hero.hp};
  nesdorReview=null;return result;
}
