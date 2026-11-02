import {encounterBodyGap} from '../../gameplay/combat/encounter-space.js';
import {COMBAT_TRIALS} from '../../gameplay/combat/combat-trials.js';
import * as THREE from 'three';
import {driveWorldEncounter,clearCombatKeys} from './encounter-controls.js';
const checks=[],runs=[];
const assert=(v,m)=>{if(!v)throw Error(m);checks.push(m);};
const frame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
const fight=a=>a.practice.state().encounter;
let stillroomRoot=null;
function checkRoom(a){
  const world=a.testWorld,scene=a.testHero.group.parent;
  assert(world.state().arena==='stillroom'&&world.root===stillroomRoot&&world.root.visible,'Trial uses the same Stillroom through rounds and retries');
  assert(scene.fog.near===24&&scene.fog.far===90,'Stillroom mist is restored');
  assert(!scene.getObjectByName('Combat Testing: Minora camp')?.visible,'Outdoor camp is hidden in the Stillroom');
}
export async function room(a){
  const world=a.testWorld;stillroomRoot=world.root;
  assert(world.state().loadedArenas.join()==='stillroom'&&world.loading.state().jobs.length===0,'Fresh trials load no outdoor terrain or city scenery');
  assert(!a.war&&!a.tower,'Trials have no running campaign or tower clock');
  assert(world.state().room.buildings===1&&world.state().room.staticDraws===3,'Trials reuse the lightweight return pavilion and mist field');
  checkRoom(a);
  assert(a.state().fieldActors.every(p=>Math.abs(p.position[1]-p.ground)<.05),'Opponent stands on the Stillroom floor');
  document.getElementById('combat-trial-start').click();
  a.look({yaw:Math.PI+.12,pitch:.24,distance:10});await capture(a);
  return {checks:[...checks],readyMs:a.state().readyMs,world:world.state(),render:a.renderStats()};
}
const changeStat=(id,value)=>{const input=document.getElementById('trial-stat-'+id);input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));};
async function capture(a){clearCombatKeys(a);window.dispatchEvent(new Event('blur'));await frame();assert(!a.state().frameErrors.length,'No renderer errors');}
async function select(a,id){
  window.dispatchEvent(new Event('focus'));a.practice.finish();document.querySelector(`[data-combat-exercise="${id}"]`).click();
  const end=performance.now()+45000;while((a.state().mode!=='skirmish'||!fight(a))&&performance.now()<end)await frame();
  assert(a.state().mode==='skirmish'&&fight(a),'Exercise loads');
}
function ready(a,id,round){
  checkRoom(a);
  const s=fight(a);assert(s.trial===id&&a.practice.state().round===round,'Correct opponent in round '+(round+1));
  const dx=s.guards[0].x-s.hero.x,dz=s.guards[0].z-s.hero.z;
  assert(Math.sin(s.hero.heading)*dx+Math.cos(s.hero.heading)*dz>7.9,'Hero starts facing the opponent');
  assert(s.briefing&&document.getElementById('combat-trial-briefing').open,'Round briefing is a real paused modal');
  const time=s.time;for(let i=0;i<120;i++)a.step(1/60);
  assert(fight(a).time===time&&fight(a).hero.hp===100,'Reading the briefing costs no time or health');
  assert(a.state().fieldActors.length===1&&fight(a).guards.length===1,'Exactly one physical opponent');
  assert(a.testHero.group.parent.children.filter(o=>o.userData.trialOpponent).length===1,'Previous creature rig disposed');
  document.getElementById('combat-trial-start').click();assert(!fight(a).briefing,'Begin starts the round explicitly');
  a.look({yaw:Math.PI-.45,pitch:.36,distance:7.5});
}
function toWarning(a){
  for(let i=0;i<700&&fight(a).guards[0].phase!=='windup';i++)a.step(1/60);
  assert(fight(a).guards[0].phase==='windup','Opponent shows a preparation pose');
  for(let i=0;i<12;i++)a.step(1/60);
  assert(a.state().combatCues.some(c=>c.kind==='edge'&&c.visible),'Creature has its own visible danger footprint');
}
function complete(a){
  window.dispatchEvent(new Event('focus'));let minimum=Infinity;
  const actor=a.testHero.group.parent.children.find(o=>o.userData.trialOpponent===fight(a).trial),head=actor.getObjectByName('Head');
  const standingHeadHeight=head.getWorldPosition(new THREE.Vector3()).y-actor.position.y;
  for(let i=0;i<5500&&!fight(a).outcome;i++){
    driveWorldEncounter(a,fight(a));a.step(1/60);const s=fight(a),g=s.guards[0];minimum=Math.min(minimum,Math.hypot(g.x-s.hero.x,g.z-s.hero.z));
  }
  clearCombatKeys(a);const s=fight(a);assert(s.outcome==='success','Normal movement and staff input wins '+s.trial);
  assert(minimum>=encounterBodyGap(s.hero,s.guards[0])-1e-6,'Bodies remain separated during '+s.trial);
  runs.push({id:s.trial,hp:s.hero.hp,time:+s.time.toFixed(2),counters:s.skill.dodgeCounters});
  assert(!document.getElementById('battle-result-dialog').open,'Final blow does not immediately cover the fall');
  const combatBefore=JSON.stringify({hero:s.hero,guards:s.guards,time:s.time});
  for(let i=0;i<60;i++)a.step(1/60);
  assert(!document.getElementById('battle-result-dialog').open,'Fallen opponent stays visible before the report');
  for(let i=0;i<30;i++)a.step(1/60);
  assert(document.getElementById('battle-result-dialog').open,'Victory report opens after the defeat beat and waits for Continue');
  const after=fight(a);assert(JSON.stringify({hero:after.hero,guards:after.guards,time:after.time})===combatBefore,'Results hold time, health and combat positions');
  const fell=actor.userData.frontierTrial?Math.abs(actor.children[0].rotation.z)>1.5:head.getWorldPosition(new THREE.Vector3()).y-actor.position.y<standingHeadHeight*.75;
  assert(fell,'Defeated '+s.trial+' finishes falling before the report');
  assert(Math.abs(new THREE.Box3().setFromObject(actor).min.y-actor.position.y)<.08,'Defeated '+s.trial+' rests on the floor at its own scale');
  const joints=[];actor.traverse(o=>{if(o.isGroup)joints.push(...o.rotation.toArray().slice(0,3));});
  for(let i=0;i<30;i++)a.step(1/60);
  const frozen=[];actor.traverse(o=>{if(o.isGroup)frozen.push(...o.rotation.toArray().slice(0,3));});
  assert(joints.join()===frozen.join(),'Result animation settles completely for '+s.trial);
}
export async function goblin(a){
  await select(a,'trials');ready(a,'bramble-goblin',0);toWarning(a);await capture(a);return {checks:[...checks]};
}

export async function statsMenu(a){
  document.getElementById('trial-stat-controls').open=true;
  for(const [id,value] of Object.entries({vitality:15,power:12,quickness:15,mobility:12}))changeStat(id,value);
  assert(document.getElementById('trial-stat-preview').textContent.includes('150 health · 30 staff damage · 4.8 m/s · 1.20'),'Preview calculates health, damage, movement and attack speed');
  changeStat('quickness',21);assert(document.querySelector('[data-combat-exercise="trials"]').disabled,'Invalid stats cannot start a fight');
  changeStat('quickness',15);assert(!document.querySelector('[data-combat-exercise="trials"]').disabled,'Correcting stats restores start');
  await capture(a);return {checks:[...checks]};
}
export async function statsBriefing(a){
  await select(a,'trials');const s=fight(a);
  checkRoom(a);
  assert(s.hero.maxHp===150&&s.hero.hp===150&&s.hero.combat.damage===30,'Chosen attributes reach the real encounter');
  assert(s.hero.combat.timing.swing<.30&&s.hero.combat.moveSpeed===4.8,'Stats affect the model timing and movement');
  const table=document.querySelector('.trial-stats-comparison');assert(table.textContent.includes('150')&&table.textContent.includes('0.13s'),'Briefing reports calculated health and contact');
  table.parentElement.open=true;await capture(a);return {checks:[...checks]};
}
export async function statsRounds(a){
  window.dispatchEvent(new Event('focus'));document.getElementById('combat-trial-start').click();
  assert(document.getElementById('world-skirmish-health-meter').max===150,'HUD health meter uses the new maximum');
  let sawDamage=false;
  for(let i=0;i<5500&&!fight(a).outcome;i++){driveWorldEncounter(a,fight(a));a.step(1/60);if(fight(a).hero.lastStrike?.damage===30)sawDamage=true;}
  clearCombatKeys(a);assert(sawDamage&&fight(a).outcome==='success','Real staff attacks deal the selected damage');
  for(let i=0;i<90;i++)a.step(1/60);
  document.getElementById('world-skirmish-continue').click();assert(fight(a).hero.hp===150&&fight(a).hero.combat.attributes.quickness===15,'Next round keeps stats and restores full health');
  document.getElementById('combat-trial-start').click();
  for(let i=0;i<1200&&fight(a).hero.hp===150;i++)a.step(1/60);
  assert(fight(a).hero.hp<150,'Enemy can damage the larger health pool');
  document.getElementById('world-skirmish-retry').click();assert(fight(a).hero.hp===150&&a.practice.state().results.length===1,'Retry restores selected health without losing completed rounds');
  document.getElementById('combat-trial-start').click();complete(a);
  document.getElementById('world-skirmish-continue').click();assert(fight(a).hero.combat.attributes.power===12,'Third round retains the chosen power');
  document.getElementById('combat-trial-start').click();complete(a);
  for(let round=3;round<COMBAT_TRIALS.length;round++){document.getElementById('world-skirmish-continue').click();assert(fight(a).hero.hp===150,'Round '+(round+1)+' restores selected health');document.getElementById('combat-trial-start').click();complete(a);}
  const report=document.getElementById('world-skirmish-result-detail').textContent;
  assert(report.includes('/150')&&!report.includes('/100'),'Final results use the correct health denominators');
  await capture(a);return {checks:[...checks],runs:[...runs]};
}
export async function statsCleanup(a){
  document.getElementById('world-skirmish-continue').click();await select(a,'lesson');
  assert(fight(a).hero.hp===100&&fight(a).hero.combat.attributes.quickness===10,'Practice tuning does not leak into guard exercises');
  a.practice.finish();document.getElementById('trial-stat-reset').click();
  assert(document.getElementById('trial-stat-quickness').value==='10'&&document.getElementById('trial-stat-preview').textContent.includes('100 health'),'Restore starting stats resets controls and preview');
  document.getElementById('trial-stat-controls').open=false;
  await capture(a);return {checks:[...checks]};
}
export async function wolf(a){
  const round=COMBAT_TRIALS.findIndex(t=>t.id==='wolf');
  while(a.practice.state().round<round){complete(a);document.getElementById('world-skirmish-continue').click();ready(a,COMBAT_TRIALS[a.practice.state().round].id,a.practice.state().round);}
  // Lose through ordinary inaction; retry must preserve the completed goblin.
  for(let i=0;i<5500&&!fight(a).outcome;i++)a.step(1/60);
  assert(fight(a).outcome==='defeat','The wolf can defeat an inactive player');
  const time=fight(a).time;for(let i=0;i<90;i++)a.step(1/60);
  assert(a.testHero.group.getObjectByName('Head').getWorldPosition(new THREE.Vector3()).y-a.testHero.group.position.y<.85&&fight(a).time===time,'Player defeat finishes falling without advancing combat');
  document.getElementById('world-skirmish-retry').click();assert(a.practice.state().results.length===round,'Retry retains earlier rounds');
  ready(a,'wolf',round);toWarning(a);await capture(a);return {checks:[...checks],runs:[...runs]};
}
export async function bandit(a){
  return nextOpponent(a,'bandit');
}
async function nextOpponent(a,id){
  document.getElementById('trial-start-opponent').value=id;await select(a,'trials');ready(a,id,COMBAT_TRIALS.findIndex(t=>t.id===id));toWarning(a);await capture(a);return {checks:[...checks],runs:[...runs],render:a.renderStats()};
}
export const militia=a=>nextOpponent(a,'militiaman');
export const raider=a=>nextOpponent(a,'orc-raider');
export const soldier=a=>nextOpponent(a,'ambron-soldier');
export const warrior=a=>nextOpponent(a,'orc-warrior');
export const veteran=a=>nextOpponent(a,'veteran-ambron-soldier');
export const orcVeteran=a=>nextOpponent(a,'veteran-orc-warrior');
export async function ogre(a){
  await nextOpponent(a,'ogre-bruiser');
  const g=fight(a).guards[0],actor=a.testHero.group.parent.children.find(o=>o.userData.trialOpponent==='ogre-bruiser');
  assert(g.bodyRadius===.95&&g.staggerResistant,'Ogre has its larger physical body and committed attacks');
  assert(actor.getObjectByName('Ogre heavy wooden club'),'Ogre carries its own large wooden club');
  a.look({yaw:Math.PI-.45,pitch:.36,distance:10});await capture(a);
  return {checks:[...checks],runs:[...runs],render:a.renderStats()};
}
export async function ogreStomp(a){
  window.dispatchEvent(new Event('focus'));let found=false;
  // Approach using ordinary movement; the ogre must choose its stomp naturally.
  for(let i=0;i<1600&&!fight(a).outcome;i++){
    const s=fight(a),g=s.guards[0],h=s.hero,yaw=a.snapshot().camera.yaw;
    if(g.attack==='ogre-stomp'&&g.phase==='windup'){found=true;break;}
    const d=Math.hypot(g.x-h.x,g.z-h.z)||1,x=(g.x-h.x)/d,z=(g.z-h.z)/d;
    const forward=-Math.sin(yaw)*x-Math.cos(yaw)*z,side=Math.cos(yaw)*x-Math.sin(yaw)*z;
    for(const [key,down] of Object.entries({KeyW:forward>.35,KeyS:forward<-.35,KeyD:side>.35,KeyA:side<-.35}))a.hold(key,down);
    a.step(1/60);
  }
  clearCombatKeys(a);assert(found,'Entering close range provokes the circular stomp');
  for(let i=0;i<23;i++)a.step(1/60);
  const g=fight(a).guards[0];assert(g.attack==='ogre-stomp'&&g.phase==='windup','Stomp provides a readable raised-foot warning');
  assert(a.state().combatCues.some(c=>c.kind==='edge'&&c.visible),'Stomp danger circle is visible');
  a.look({yaw:Math.PI-1.1,pitch:.36,distance:10});
  await capture(a);return {checks:[...checks]};
}
export async function result(a){
  // Complete a full ladder in the measured order, independent of preview selection.
  document.getElementById('trial-start-opponent').value=COMBAT_TRIALS[0].id;await select(a,'trials');ready(a,COMBAT_TRIALS[0].id,0);
  complete(a);
  for(let round=1;round<COMBAT_TRIALS.length;round++){document.getElementById('world-skirmish-continue').click();ready(a,COMBAT_TRIALS[round].id,round);complete(a);}
  assert(document.getElementById('world-skirmish-result-title').textContent===COMBAT_TRIALS.length+' trials complete','Final victory completes every round');
  assert(a.practice.state().results.length===COMBAT_TRIALS.length-1,'Earlier round results appear in the final report');
  await capture(a);return {checks:[...checks],runs:[...runs]};
}
export async function cleanup(a){
  window.dispatchEvent(new Event('focus'));document.getElementById('world-skirmish-continue').click();
  assert(a.state().mode==='combat-menu'&&!a.state().fieldActors.length&&!a.state().combatCues.length,'Finish returns to menu and removes opponents and cues');
  assert(!a.save().ok,'Trials cannot save over a campaign');
  await select(a,'trials');assert(a.practice.state().round===0&&a.practice.state().results.length===0,'Restart begins at the goblin');
  document.getElementById('combat-trial-leave').click();assert(a.state().mode==='combat-menu'&&!document.getElementById('combat-trial-briefing'),'Leaving briefing disposes modal and restores menu');
  for(const tempo of ['classic','matched']){
    document.getElementById('combat-tempo').value=tempo;await select(a,'lesson');
    assert(a.testWorld.state().arena==='camp'&&a.testWorld.root.visible&&!stillroomRoot.visible&&a.testHero.group.parent.fog.near===100,'Guard exercise restores the outdoor camp and its atmosphere');
    assert(!fight(a).trial&&!fight(a).briefing&&fight(a).tempo===tempo,'Earlier guard exercise keeps '+tempo+' timing without a trial briefing');
    a.practice.finish();
  }
  assert(!document.querySelector('#battle-result-dialog,#combat-trial-briefing'),'No modal listeners or elements survive exit');
  await capture(a);return {checks:[...checks],runs:[...runs]};
}

export async function militiaWeapons(a){
  document.getElementById('trial-start-opponent').value='militiaman';
  for(const weapon of ['sword','spear','axe','mace']){
    document.getElementById('trial-militia-weapon').value=weapon;await select(a,'trials');
    const s=fight(a),actor=a.testHero.group.parent.children.find(o=>o.userData.trialOpponent==='militiaman');
    assert(s.guards[0].weapon===weapon&&actor.userData.weapon===weapon,'Militia model and combat agree on '+weapon);
    assert(actor.userData.armor===0&&s.guards[0].defense.type==='shield','Militia carries a shield without mail');
    document.getElementById('combat-trial-start').click();complete(a);
  }
  a.practice.finish();document.getElementById('trial-militia-weapon').value='sword';document.getElementById('trial-start-opponent').value=COMBAT_TRIALS[0].id;await capture(a);return {checks:[...checks],runs:[...runs]};
}

const press=code=>{document.dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true,cancelable:true}));document.dispatchEvent(new KeyboardEvent('keyup',{code,bubbles:true}));};
export async function chooseOpponent(a){
  const selectBox=document.getElementById('trial-start-opponent');
  assert(selectBox.options.length===COMBAT_TRIALS.length,'Opponent selector includes every round');
  for(let i=0;i<COMBAT_TRIALS.length;i++){
    selectBox.value=COMBAT_TRIALS[i].id;await select(a,'trials');
    assert(fight(a).trial===selectBox.value&&a.practice.state().round===i,'Direct selection reaches '+selectBox.value);
    assert(a.practice.state().results.length===0,'Skipping rounds awards no victories');
    assert(a.sorcery.state().mana===100&&fight(a).hero.hp===100,'Selected opponent starts with full health and mana');
    press('KeyQ');assert(a.sorcery.state().mana===100,'Briefing prevents casting');
    document.getElementById('combat-trial-start').click();a.step(1/60);
    if(['acor-wraith','acor-reed-stalker'].includes(selectBox.value))for(let step=0;step<180&&['veil','submerged'].includes(fight(a).guards[0].phase);step++)a.step(1/60);
    press('KeyT');press('KeyQ');
    assert(a.sorcery.state().mana===80,'Q casts a real Fireball in round '+(i+1));
    for(let step=0;step<80&&!fight(a).hero.lastStrike;step++)a.step(1/60);
    if(selectBox.value==='goblin-trapper'){
      const hit=fight(a).hero.lastStrike;
      assert(hit?.target<0&&hit.damage>0&&!fight(a).trialObjects.some(o=>o.id===hit.target&&o.hp>0),'Trapper snare absorbs the first Fireball and is destroyed');
      for(let step=0;step<120&&a.sorcery.state().cooldown>0;step++)a.step(1/60);
      press('KeyQ');
      for(let step=0;step<80&&fight(a).hero.lastStrike?.at===hit.at;step++)a.step(1/60);
    }
    assert(fight(a).hero.lastStrike?.kind==='fireball'&&fight(a).guards[0].hp<fight(a).guards[0].maxHp,'Projectile hits '+selectBox.value);
    assert(a.sorcery.state().lastRelease.source==='staff','Spell launches from the rendered staff tip');
    press('KeyR');assert(fight(a).trial===selectBox.value&&fight(a).briefing,'Retry preserves the selected opponent');
    assert(a.sorcery.state().mana===100&&!a.sorcery.state().shots.length,'Retry restores mana and removes old projectiles');
  }
  // A final-round-only win must not claim the skipped victories.
  document.getElementById('combat-trial-start').click();complete(a);
  assert(document.getElementById('world-skirmish-result-title').textContent==='Trial run complete','Skipped run does not claim all completed trials');
  assert(document.getElementById('world-skirmish-result-detail').textContent.startsWith('1 round won'),'Report counts actual wins');
  a.practice.finish();selectBox.value='bandit';await select(a,'trials');document.getElementById('combat-trial-start').click();
  a.look({yaw:Math.PI-.65,pitch:.24,distance:7});
  a.hold('KeyF',true);press('KeyT');
  for(let i=0;i<600&&!fight(a).skill.staffBlocks;i++)a.step(1/60);
  assert(fight(a).hero.blocking&&fight(a).skill.staffBlocks>0,'Holding F blocks a real incoming bandit blow');
  assert(fight(a).hero.hp>80,'Staff guard reduces the bandit blow while allowing chip damage');
  const mana=a.sorcery.state().mana;press('KeyQ');assert(a.sorcery.state().mana===mana,'Cannot cast through a raised guard');
  assert(document.getElementById('world-skirmish-block').getAttribute('aria-pressed')==='true','HUD reflects active staff guard');
  await capture(a);return {checks:[...checks],fight:fight(a)};
}

export async function fireballControls(a){
  window.dispatchEvent(new Event('focus'));a.hold('KeyF',false);a.step(1/60);
  press('KeyQ');assert(a.sorcery.state().mana===80,'Releasing F enables Q');
  press('KeyH');const frozen=JSON.stringify(a.sorcery.state().shots),mana=a.sorcery.state().mana;
  for(let i=0;i<60;i++)a.step(1/60);press('KeyQ');
  assert(JSON.stringify(a.sorcery.state().shots)===frozen&&a.sorcery.state().mana===mana,'Help freezes projectiles and prevents spending mana');
  press('Escape');press('KeyR');document.getElementById('combat-trial-start').click();a.step(1/60);
  const guard=document.getElementById('world-skirmish-block');guard.focus();
  guard.dispatchEvent(new KeyboardEvent('keydown',{code:'Space',bubbles:true,cancelable:true}));a.step(1/60);
  assert(fight(a).hero.blocking,'Keyboard activation holds the on-screen Block button');
  guard.dispatchEvent(new KeyboardEvent('keyup',{code:'Space',bubbles:true,cancelable:true}));a.step(1/60);
  assert(!fight(a).hero.blocking,'Releasing the on-screen control lowers the guard');
  press('KeyQ');for(let i=0;i<5;i++)a.step(1/60);
  assert(a.sorcery.state().shots.length>0,'Fireball is visibly traveling before impact');
  await capture(a);return {checks:[...checks],sorcery:a.sorcery.state()};
}

export async function controlsCleanup(a){
  window.dispatchEvent(new Event('focus'));a.practice.finish();
  assert(!a.sorcery.state().shots.length&&document.getElementById('teresod-sorcery').hidden,'Leaving practice clears spells and hides combat magic');
  assert(document.querySelectorAll('#teresod-sorcery').length===1,'One shared spell HUD survives exercise changes');
  document.getElementById('trial-start-opponent').value='bramble-goblin';
  assert(!a.state().frameErrors.length,'No errors during selection, guarding or spell combat');
  await capture(a);return {checks:[...checks]};
}
