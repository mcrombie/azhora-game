import {driveWorldEncounter,clearCombatKeys} from './encounter-controls.js';
const frames=async()=>{await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);};
const checks=[];
function assert(value,label){if(!value)throw Error(label);checks.push(label);console.log('EXPLORATION_CHECK '+label);}
const fight=h=>h.practice.state().encounter;
export async function startPractice(h){
  window.dispatchEvent(new Event('focus'));h.war.pause();assert(h.save().ok,'Save sentinel before combat practice');
  const before={campaign:h.war.state().campaign,saved:h.store.read().data,hero:h.snapshot(),dirty:h.state().dirty};
  h.openDeveloper();document.getElementById('practice-minora').click();
  const deadline=performance.now()+180000;
  while(!fight(h)&&performance.now()<deadline)await frames();
  assert(h.state().mode==='skirmish'&&fight(h)?.hero.hp===100,'F8 practice button opens manual camp combat');
  assert(h.state().region===16&&Math.hypot(fight(h).hero.x+2474,fight(h).hero.z-83)<1,'Practice uses the existing Minora muster yard');
  assert(h.practice.state().profile.jobs.length===0,'Practice from Minora needs no additional region construction');
  assert(fight(h).objective===null&&h.state().rallyLabels.every(l=>!l.visible),'Camp training has no reinforcement route or rally marker');
  assert(!h.journey.state().active&&!h.autoplay.state().active,'Practice leaves combat in player control');
  assert(fight(h).guards.length===1&&h.practice.state().exercise==='lesson','Default camp exercise is the one-soldier lesson');
  assert(document.querySelector('#world-skirmish .eyebrow').textContent.includes('DODGE LESSON'),'HUD distinguishes the lesson from campaign combat');
  assert(!document.getElementById('world-skirmish-retry').hidden,'Retry is available before the fight ends');
  const z=fight(h).hero.z;h.hold('Space',true);for(let i=0;i<5;i++)h.step(.04);h.hold('Space',false);
  assert(Math.abs(fight(h).hero.z-z)>1,'Space alone produces a physical backstep');
  for(let i=0;i<25;i++)h.step(.04);
  const x=fight(h).hero.x;h.hold('KeyD',true);document.getElementById('world-skirmish-dodge').click();
  for(let i=0;i<5;i++)h.step(.04);h.hold('KeyD',false);
  assert(fight(h).hero.x>x+1,'Visible Dodge button plus D produces a sidestep');
  assert(document.getElementById('world-skirmish-dodge').disabled,'Dodge button shows recovery before the next dodge');
  document.getElementById('world-skirmish-retry').click();
  assert(h.practice.state().attempt===2&&fight(h).hero.hp===100,'Retry button resets health and opponents');
  for(let i=0;i<300&&!fight(h).guards.some(g=>g.phase==='windup');i++)h.step(.04);
  assert(fight(h).guards.some(g=>g.phase==='windup'),'Soldiers visibly prepare a committed attack');
  await frames();return before;
}
export async function finishPractice(h,before){
  h.hold('KeyX',true);for(let i=0;i<1500&&!fight(h).outcome;i++)h.step(.04);h.hold('KeyX',false);
  assert(fight(h).outcome==='defeat'&&fight(h).skill.blocks>3,'Stationary attack spam loses against the raised guard');
  assert(document.getElementById('world-skirmish-result-title').textContent.includes('again'),'Attack spam cannot complete the lesson');
  document.getElementById('world-skirmish-retry').click();
  for(let i=0;i<3000&&!fight(h).outcome;i++){driveWorldEncounter(h,fight(h));h.step(1/60);}clearCombatKeys(h);
  assert(fight(h).outcome==='success'&&fight(h).hero.hp>=75&&fight(h).skill.dodgeCounters>0,'Directional dodges and counterattacks win with ordinary keys');
  assert(document.getElementById('world-skirmish-result-title').textContent==='Dodge lesson complete','The lesson recognizes the performed dodge-counter sequence');
  assert(document.getElementById('world-skirmish-result-detail').textContent.includes('No campaign troops or territory changed'),'Result states that practice has no campaign consequence');
  for(let i=0;i<12;i++)h.step(.04);
  assert(h.state().fieldActors.length===1,'The fallen training opponent remains for result review');
  window.dispatchEvent(new Event('blur'));await frames();return {checks:[...checks]};
}
export async function retryAndExit(h,before){
  window.dispatchEvent(new Event('focus'));
  document.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyR',bubbles:true}));
  document.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyR',bubbles:true}));
  assert(h.practice.state().attempt===4&&fight(h).guards.every(g=>g.hp===50),'R starts a new attempt after the result');
  for(let i=0;i<2300&&!fight(h).outcome;i++)h.step(.04);
  assert(fight(h).outcome==='defeat'&&fight(h).hero.hp===0,'Not defending leads to a readable defeat');
  document.getElementById('world-skirmish-continue').click();await frames();
  h.openDeveloper();document.getElementById('practice-minora-squad').click();
  const deadline=performance.now()+30000;while(!fight(h)&&performance.now()<deadline)await frames();
  assert(fight(h)?.guards.length===3&&h.practice.state().exercise==='squad','Three-soldier practice remains available as a separate exercise');
  assert(fight(h).guards.filter(g=>g.role==='runner').length===1&&fight(h).guards.filter(g=>g.role==='escort').length===2&&fight(h).objective?.type==='intercept','Advanced group practice has one runner, two escorts and a rally objective');
  for(let i=0;i<3500&&!fight(h).outcome;i++){driveWorldEncounter(h,fight(h));h.step(1/60);}clearCombatKeys(h);
  assert(fight(h).outcome==='success'&&fight(h).skill.counters>=3,'Dodge-counter play also works against the three-soldier group');
  document.getElementById('world-skirmish-retry').click();assert(fight(h).guards.length===3,'Retry preserves the selected three-soldier exercise');
  document.getElementById('world-skirmish-withdraw').click();await frames();
  assert(!h.practice.state().active&&h.state().mode==='playing','Leaving practice returns to exploration');
  assert(h.state().fieldActors.length===0&&h.state().rallyLabels.length===0,'Retries and exit leave no encounter actors or markers');
  assert(JSON.stringify(h.war.state().campaign)===JSON.stringify(before.campaign),'Practice and retries preserve the entire campaign state');
  assert(JSON.stringify(h.store.read().data)===JSON.stringify(before.saved),'Practice never overwrites the saved game');
  assert(JSON.stringify(h.snapshot().cells)===JSON.stringify(before.hero.cells),'Practice does not reveal new map cells');
  assert(Math.hypot(h.state().position[0]-before.hero.position.x,h.state().position[2]-before.hero.position.z)<.01,'Exit restores the original exploration location');
  assert(!h.state().frameErrors.length,'Combat practice completes without frame errors');
  return {checks:[...checks],profile:h.practice.state().profile};
}

export async function startAdvancedPractice(h){
  window.dispatchEvent(new Event('focus'));h.openDeveloper();document.getElementById('practice-minora-advanced').click();
  const deadline=performance.now()+30000;while(!fight(h)&&performance.now()<deadline)await frames();
  assert(fight(h)?.guards.length===1&&h.practice.state().exercise==='advanced','Advanced lesson starts from its named developer button');
  for(let i=0;i<2500&&!fight(h).skill.counterTypes.thrust;i++){driveWorldEncounter(h,fight(h));h.step(1/60);}clearCombatKeys(h);
  assert(fight(h).skill.counterTypes.thrust===1,'Advanced lesson records an actual thrust dodge and counter');
  for(let i=0;i<1000&&!fight(h).guards.some(g=>g.attack==='sweep'&&g.phase==='windup'&&g.timer<.5);i++)h.step(1/60);
  assert(fight(h).guards[0].attack==='sweep'&&fight(h).guards[0].phase==='windup','The surviving soldier visibly prepares the sweep');
  assert(document.getElementById('world-skirmish-objective').textContent.includes('Sweep:'),'Lesson changes its instruction from sidestep to retreat');
  window.dispatchEvent(new Event('blur'));await frames();
}

export async function finishAdvancedPractice(h,before){
  window.dispatchEvent(new Event('focus'));
  for(let i=0;i<2500&&!fight(h).outcome;i++){driveWorldEncounter(h,fight(h));h.step(1/60);}clearCombatKeys(h);
  assert(fight(h).outcome==='success'&&fight(h).hero.hp>=75&&fight(h).skill.counterTypes.sweep>0,'Ordinary keys clear the sweep and land the second counter');
  assert(document.getElementById('world-skirmish-result-title').textContent==='Thrust and sweep lesson complete','Advanced result requires both dodge-counter types');
  document.getElementById('world-skirmish-retry').click();assert(h.practice.state().exercise==='advanced'&&fight(h).hero.hp===100,'Retry retains the advanced lesson');
  document.getElementById('world-skirmish-withdraw').click();await frames();
  assert(JSON.stringify(h.war.state().campaign)===JSON.stringify(before.campaign)&&JSON.stringify(h.store.read().data)===JSON.stringify(before.saved),'Advanced exercises preserve campaign and saved game');
  assert(!h.state().fieldActors.length&&!h.state().rallyLabels.length&&!h.state().frameErrors.length,'Advanced lesson cleans up without frame errors');
  return {checks:[...checks],profile:h.practice.state().profile};
}
