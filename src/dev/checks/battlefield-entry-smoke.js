import {createWorldWar} from '../../app/exploration/world-war.js';
import {canStand} from '../../gameplay/movement/locomotion.js';
import {RIDE} from '../../gameplay/movement/riding.js';
import {prepareWarExterior} from './tower-smoke.js';

const assert=(value,message)=>{if(!value)throw Error(message);};
const frame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
const key=code=>document.dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true}));
let fixture=null;
let partial=null;
const battleFor=api=>api.war.state().campaign.engagements.find(b=>b.id===fixture.battle.id);
const position=api=>{const [x,y,z]=api.state().position;return{x,y,z};};

function findApproach(world,battle){
  const centre=battle.location,region=world.regionAt(centre.x,centre.z).id;
  const clear=p=>world.readyAt(p.x,p.z)&&world.canExploreAt(p.x,p.z)&&world.regionAt(p.x,p.z).id===region&&canStand(p.x,p.z,world,RIDE.radius+.25)&&world.heightAt(p.x,p.z)>world.waterAt(p.x,p.z)+.1;
  for(let n=0;n<64;n++){
    const angle=-Math.PI/2+n*Math.PI/32,at=d=>({x:centre.x+Math.sin(angle)*d,z:centre.z+Math.cos(angle)*d});
    let valid=true;
    for(let d=60;d<=86;d+=.5){
      const p=at(d),previous=at(d-.5);
      if(!clear(p)||Math.abs(world.heightAt(p.x,p.z)-world.heightAt(previous.x,previous.z))>.4){valid=false;break;}
    }
    if(valid)return {outside:at(84),inside:at(64),angle};
  }
  throw Error('No clear dry Caricas lane crosses the 70m battlefield boundary');
}

function moveTo(api,target,{entry=false}={}){
  window.dispatchEvent(new Event('focus'));api.hold('KeyW',true);
  try{
    for(let i=0;i<800;i++){
      if(api.state().mode==='encounter'){
        assert(entry,'Unexpected entry dialog while leaving the battlefield');return;
      }
      assert(api.state().mode==='playing','Movement stopped in '+api.state().mode);
      const p=position(api),distance=Math.hypot(p.x-target.x,p.z-target.z);
      if(distance<.2){assert(!entry,'Crossed battlefield without an entry offer');return;}
      api.look({yaw:Math.atan2(p.x-target.x,p.z-target.z),pitch:.32,distance:8});
      api.step(.04);
    }
    throw Error('Boundary movement stalled: '+JSON.stringify({target,position:position(api),mode:api.state().mode,probe:api.groundProbe(position(api).x,position(api).z)}));
  }finally{api.hold('KeyW',false);}
}

function unchangedConsequences(api,before){
  const after=battleFor(api),campaign=api.war.state().campaign;
  assert(campaign.day===before.day,'Declining cannot advance the campaign day');
  assert(campaign.hero.readyOn===before.readyOn,'Declining cannot put the hero into recovery');
  assert(JSON.stringify(after.heroResult)===JSON.stringify(before.battle.heroResult),'Declining cannot record a combat result');
  assert(JSON.stringify(after.participation)===JSON.stringify(before.battle.participation),'Declining cannot consume a phase or commit a faction');
  assert(JSON.stringify(after.reinforcements)===JSON.stringify(before.battle.reinforcements),'Declining cannot remove reinforcements');
}
const beforeChoice=api=>({day:api.war.state().campaign.day,readyOn:api.war.state().campaign.hero.readyOn,battle:structuredClone(battleFor(api))});

export async function setupBattlefieldEntry(api){
  await prepareWarExterior(api);window.dispatchEvent(new Event('focus'));api.war.pause();
  if(api.state().mount.kind!=='foot')assert(api.selectMount('foot').ok,'Boundary fixture begins on foot');
  api.war.restore(null);
  const war=createWorldWar();war.advance(3);
  const battle=war.snapshot().engagements.find(b=>b.region==='caricas'&&b.status==='active');
  assert(battle&&battle.entryRadius===70,'Fresh scenario has a 70m Caricas battlefield on day 3');
  await api.visit(battle.location);
  const approach=findApproach(api.testWorld,battle);
  fixture={battle,approach};
  await api.visit(approach.outside);api.reveal(true);api.war.restore(war.checkpoint());api.war.run();api.step(.04);
  assert(api.state().mode==='playing','Outside the battlefield does not show entry dialog');
  const footprint=api.war.state().battlefield.footprints.find(p=>p.id===battle.id);
  assert(footprint&&footprint.radius===70&&footprint.segments>0&&footprint.pennants>0,'Active battlefield has a grounded broken boundary and pennants');
  api.look({yaw:approach.angle,pitch:.26,distance:8});await frame();
  return {checks:['Fresh day-3 Caricas battlefield is visibly marked before arrival','A clear dry path crosses its real 70m perimeter'],battle:fixture.battle,approach,footprint};
}

export async function checkFootEntry(api){
  assert(fixture,'Call setupBattlefieldEntry first');
  moveTo(api,fixture.approach.inside,{entry:true});const before=beforeChoice(api);
  const state=api.war.state(),p=position(api),distance=Math.hypot(p.x-fixture.battle.location.x,p.z-fixture.battle.location.z);
  assert(distance<=70.1&&distance>68,'Ordinary walking triggers entry at the perimeter rather than the flag');
  assert(state.campaign.pending?.battleId===fixture.battle.id&&state.encounter.active,'Area entry opens the actual battle choice');
  assert(!state.clock.running,'Choice pauses campaign time');
  const frozen=JSON.stringify(state.clock);for(let i=0;i<40;i++)api.step(.04);
  assert(JSON.stringify(api.war.state().clock)===frozen,'Reading the choice spends no campaign time');
  api.war.withdraw();assert(api.state().mode==='playing','Stay out returns to exploration');unchangedConsequences(api,before);
  for(let i=0;i<30;i++)api.step(.04);
  assert(api.state().mode==='playing'&&!api.war.state().campaign.pending,'Staying inside after refusal does not reopen each frame');
  api.hold('KeyW',true);for(let i=0;i<100;i++)api.step(.04);api.hold('KeyW',false);
  const edge=position(api);assert(Math.hypot(edge.x-fixture.battle.location.x,edge.z-fixture.battle.location.z)>69.99,'Refusal blocks further movement through the wall');
  const manualBefore=beforeChoice(api);key('KeyF');assert(api.state().mode==='encounter','F can reopen the choice without leaving');api.war.withdraw();
  unchangedConsequences(api,manualBefore);
  moveTo(api,fixture.approach.outside);moveTo(api,fixture.approach.inside,{entry:true});
  assert(api.war.state().battlefield.entry.battles.find(b=>b.id===fixture.battle.id).entries===2,'Leaving beyond the hysteresis and walking back gives a fresh offer');
  await frame();return {checks:['On-foot entry prompts at the 70m edge and pauses time','Stay out spends no day, troops, phase or recovery','Refusal does not cause repeated popups','F reopens inside; leaving and re-entering offers again'],position:position(api)};
}

export async function checkMountedEntry(api){
  api.war.withdraw();api.war.pause();moveTo(api,fixture.approach.outside);
  api.stable.restore({version:1,owned:true,taught:true,horse:{...fixture.approach.outside,yaw:fixture.approach.angle}});
  api.stable.toggleMount();assert(api.stable.mounted&&api.state().mount.horseSpeed===1,'Normal owned horse mounts outside the battlefield');
  api.war.run();moveTo(api,fixture.approach.inside,{entry:true});const before=beforeChoice(api);
  assert(api.stable.mounted&&api.state().mount.kind==='horse','Riding across the boundary opens the choice without dismounting');
  api.war.withdraw();unchangedConsequences(api,before);
  assert(api.stable.mounted,'Stay out leaves the rider mounted');
  moveTo(api,fixture.approach.outside);moveTo(api,fixture.approach.inside,{entry:true});
  assert(api.stable.mounted&&!api.war.state().clock.running,'Mounted re-entry pauses with the rider still on the horse');
  await frame();return {checks:['Normal horseback entry uses the same battlefield footprint','Mounted refusal preserves the horse, time and battle','Riding away and back permits another decision'],mount:api.state().mount};
}

export async function checkAcceptedEntry(api){
  const before=beforeChoice(api);await api.war.help('west');await frame();
  assert(api.state().mode==='skirmish','Accepting entry opens the actual outdoor skirmish: '+document.getElementById('encounter-result').textContent);
  assert(api.stable.owned&&!api.stable.mounted&&api.state().mount.kind==='foot','Accepting automatically dismounts the rider safely');
  const encounter=api.war.state().encounter.encounter;
  assert(encounter?.site==='caricas-world'&&encounter.radius===70,'Combat uses the same Caricas battlefield footprint');
  const initialGuards=encounter.guards.length;
  api.war.withdraw();assert(api.state().mode==='playing','Withdrawing during combat returns to exploration');
  const progress=battleFor(api).participation;
  assert(progress.faction==='west'&&progress.intercept.status==='available','Withdrawn fight keeps the chosen side and remaining phase');
  assert(progress.intercept.stopped===0&&progress.intercept.escaped===0,'Immediate withdrawal invents no casualties or escaped soldiers');
  assert(api.war.state().campaign.day===before.day,'Abandoning an unfinished phase does not jump to its ending');
  for(let i=0;i<12;i++)api.step(.04);
  assert(api.state().mode==='playing','Combat withdrawal does not cause an instant entry loop');
  key('KeyF');
  assert(api.state().mode==='encounter','The unfinished battle can be rejoined after withdrawal');
  const pending=api.war.state().campaign.pending;
  assert(pending.participation.faction==='west'&&pending.participation.guards===initialGuards,'Re-entry retains allegiance and only the remaining enemies');
  const wrongSide=document.getElementById(pending.attacker==='west'?'fight-defender':'fight-attacker');
  assert(wrongSide.hidden,'Committed players cannot switch sides to farm the same battle');
  api.war.withdraw();assert(!api.state().frameErrors.length,'Entry, horse dismount and re-entry render without errors');
  await frame();return {checks:['Accepting a mounted entry safely dismounts into the real outdoor fight','Combat uses the visible 70m footprint','Withdrawal keeps allegiance and remaining opponents without duplicate casualties','Re-entry is available while the battle remains active'],campaign:api.war.state().campaign};
}

async function playCombatUntil(api,done,label){
  window.dispatchEvent(new Event('focus'));api.autoplay.start();
  try{
    for(let i=0;i<3600;i++){
      const field=api.war.state().encounter.encounter;
      if(field&&done(field))return field;
      assert(api.state().mode==='skirmish','Combat left its field before '+label+': '+JSON.stringify({mode:api.state().mode,autoplay:api.autoplay.state(),field}));
      assert(field&&!field.outcome,'Combat ended before '+label+': '+JSON.stringify(field));
      api.step(.04);
      // Yield without speeding the combat clock or changing attacks, damage,
      // collision or enemy AI. Inspect again before allowing a review tick.
      if(i%180===179){
        const next=api.war.state().encounter.encounter;
        if(next&&done(next))return next;
        await frame();
      }
    }
    throw Error('Combat did not reach '+label+': '+JSON.stringify(api.war.state().encounter));
  }finally{api.autoplay.stop();}
}

function reopen(api){
  if(api.state().mode==='playing')key('KeyF');
  assert(api.state().mode==='encounter'&&api.war.state().campaign.pending?.battleId===fixture.battle.id,'The active Caricas battle can be reopened here');
}

export async function checkPartialBattleProgress(api){
  assert(fixture,'Call setupBattlefieldEntry first');api.war.pause();
  const before=api.war.state().campaign,battle=battleFor(api);
  assert(battle.participation.intercept.status==='available','Interception remains available for partial progress check');
  reopen(api);await api.war.help('west');
  const field=await playCombatUntil(api,s=>s.guards.some(g=>g.hp===0),'one defeated soldier');
  const stopped=field.guards.filter(g=>g.hp===0).length,escaped=field.guards.filter(g=>g.escaped).length;
  assert(stopped===1&&!field.outcome,'Withdraw after exactly one genuine combat kill, before this phase ends');
  api.war.withdraw();
  const progress=battleFor(api).participation.intercept,current=api.war.state().campaign;
  assert(current.day===before.day,'Partial combat withdrawal keeps the current campaign day');
  assert(progress.status==='available'&&progress.stopped===stopped&&progress.escaped===escaped,'Only actual casualties and escapes are recorded');
  assert(battleFor(api).participation.faction==='west','The committed West Lizeem side survives withdrawal');
  const objective=battleFor(api).heroResult.objective;
  assert(objective.blocked===Math.floor(objective.strength*stopped/progress.totalGuards),'One defeated soldier removes exactly its share of the committed reinforcement detachment');
  partial={day:current.day,progress:structuredClone(progress),objective:structuredClone(objective),remaining:progress.totalGuards-stopped-escaped,endsOn:battle.endsOn,started:battle.started};
  assert(partial.remaining>0&&partial.remaining<progress.totalGuards,'Unfinished opponents remain for re-entry');
  assert(api.save().ok,'A partly fought battlefield saves through the normal save path');
  await api.loadSaved();
  assert(JSON.stringify(battleFor(api).participation.intercept)===JSON.stringify(partial.progress),'Save/Continue preserves partial casualties and escapes');
  assert(JSON.stringify(battleFor(api).heroResult.objective)===JSON.stringify(partial.objective),'Save/Continue does not apply the same troop loss twice');
  reopen(api);
  assert(api.war.state().campaign.pending.participation.guards===partial.remaining,'Reloaded re-entry offers only the remaining opponents');
  await frame();return {checks:['Normal combat autoplay defeats one soldier before withdrawing','Partial withdrawal preserves the day, allegiance and exact troop loss','Save/Continue restores those casualties without applying them again','Re-entry offers only the unfinished reinforcement squad'],partial};
}

let completion;
export async function checkInterceptionReview(api){
  assert(partial,'Call checkPartialBattleProgress first');await api.war.help('west');
  assert(api.war.state().encounter.encounter.guards.length===partial.remaining,'Rejoined combat physically spawns only the remaining opponents');
  const interception=await playCombatUntil(api,s=>!!s.outcome,'the completed interception');
  assert(interception.hero.hp>0,'Teresod survives the remaining interception to regroup');
  const newlyStopped=interception.guards.filter(g=>g.hp===0).length,newlyEscaped=interception.guards.filter(g=>g.escaped).length;
  completion={interception,newlyStopped,newlyEscaped};
  assert(document.getElementById('world-skirmish-facts').textContent.includes('enemy strength removed'),'Interception review explains its actual contribution');
  assert(document.getElementById('world-skirmish-next').textContent.includes('full health'),'Interception review explains regrouping');
  window.dispatchEvent(new Event('blur'));await frame();
  return {checks:['Interception review shows stopped soldiers, exact strength and next opposition'],interception};
}
export async function checkAssaultBriefing(api){
  const {newlyStopped,newlyEscaped}=completion;
  api.war.continue();
  const campaign=api.war.state().campaign,battle=battleFor(api),progress=battle.participation.intercept;
  assert(progress.status==='finished','Completing the encounter closes the interception phase');
  assert(progress.stopped===partial.progress.stopped+newlyStopped&&progress.escaped===partial.progress.escaped+newlyEscaped,'The resumed phase counts each defeated or escaped soldier once');
  assert(progress.stopped+progress.escaped===progress.totalGuards,'All committed reinforcement soldiers are accounted for');
  const middleDay=Math.min(partial.endsOn-1,partial.started+Math.max(1,Math.floor((partial.endsOn-partial.started)/2)));
  assert(campaign.day===Math.max(partial.day,middleDay),'Completing interception advances to its phase day');
  assert(campaign.pending?.stage==='rally'&&api.state().mode==='encounter','Continue leads directly to the final assault choice');
  assert(battle.status==='active'&&campaign.day<partial.endsOn,'The first phase alone does not prematurely award territorial control');
  completion.finalGuards=campaign.pending.rally.guards;
  assert(document.getElementById('encounter-phase-path').textContent.includes('Final assault'),'Briefing shows the next phase');
  assert(document.getElementById('encounter-brief').textContent.includes('day-'+partial.endsOn+' result'),'Briefing promises the actual result deadline');
  await frame();return {checks:['Regroup records the interception once and opens the final assault briefing'],pending:campaign.pending};
}
export async function checkAssaultReview(api){
  await api.war.help('west');
  const final=await playCombatUntil(api,s=>!!s.outcome,'the final assault and its hold objective');
  assert(final.hero.hp>0,'Teresod survives the final assault');completion.final=final;
  assert(document.getElementById('world-skirmish-continue').textContent.includes('battle result'),'Final review offers immediate resolution');
  window.dispatchEvent(new Event('blur'));await frame();return {checks:['Final assault review explains immediate resolution'],final};
}
export async function checkBattleResolution(api){
  const {final,finalGuards,interception,newlyStopped,newlyEscaped}=completion;
  api.war.continue();
  const finished=api.war.state().campaign,resolved=battleFor(api);
  assert(finished.day===partial.endsOn,'Finishing participation goes directly to the actual battle deadline');
  assert(resolved.status!=='active'&&!finished.pending,'Battle result is decided immediately, with no idle days remaining');
  if(final.outcome==='success')assert(finished.regions.caricas.owner==='west','Winning the final assault gives the supporting faction Caricas');
  assert(api.state().mode==='playing','The resolved battle returns to outdoor exploration');
  assert(!api.war.state().battlefield.footprints.some(f=>f.id===fixture.battle.id),'The resolved battlefield perimeter disappears');
  assert(!api.war.state().battlefield.entry.battles.some(b=>b.id===fixture.battle.id),'Resolved territory cannot reopen its old entry prompt');
  assert(!api.state().frameErrors.length,'Partial progress, save/Continue and both combat phases render without errors');
  await frame();return {checks:['Rejoined combat spawns only remaining opponents and applies no duplicate casualties','Interception completion advances campaign time and offers the final assault','Final assault resolves the battle on its deadline immediately','Resolved battle removes the perimeter and cannot reopen'],interception:{outcome:interception.outcome,stopped:newlyStopped,escaped:newlyEscaped},final:{outcome:final.outcome,guards:finalGuards,hp:final.hero.hp},campaign:finished};
}

export async function checkBattlePhaseCompletion(api){
  const results=[];
  for(const check of [checkInterceptionReview,checkAssaultBriefing,checkAssaultReview,checkBattleResolution])results.push(await check(api));
  return {...results.at(-1),checks:results.flatMap(r=>r.checks)};
}
