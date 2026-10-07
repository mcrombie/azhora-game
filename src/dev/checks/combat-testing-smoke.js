import {driveWorldEncounter,clearCombatKeys} from './encounter-controls.js';
const checks=[];
const assert=(value,label)=>{if(!value)throw Error(label);checks.push(label);console.log('EXPLORATION_CHECK '+label);};
const frames=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
const wait=async fn=>{const end=performance.now()+180000;while(!fn()&&performance.now()<end)await frames();assert(fn(),'Combat selection becomes ready');};
export async function checkCombatMenu(){
  assert(!window.__EXPLORATION__,'Startup has not constructed the 3D host');
  document.getElementById('new-combat-testing').click();
  assert(!document.getElementById('combat-testing-menu').hidden&&document.getElementById('start-screen').hidden,'Combat Testing opens the exercise menu before loading');
  assert(document.querySelectorAll('[data-combat-exercise]').length===3,'Menu lists all three current Minora exercises');
  assert(!performance.getEntriesByType('resource').some(r=>r.name.includes('/src/world.js')),'Selecting Combat Testing does not load the world');
  document.getElementById('combat-testing-back').click();assert(!document.getElementById('start-screen').hidden,'Back returns to main menu without loading');
  document.getElementById('new-combat-testing').click();await frames();return {checks:[...checks]};
}
export async function checkCombatExercises(h){
  window.dispatchEvent(new Event('focus'));
  assert(h.state().launch==='combat'&&h.state().enabledRegions.join()==='16','Combat workspace limits construction to Minora');
  assert(!h.war&&!h.autoplay&&!h.journey&&!h.hearthfall,'Isolated combat has no running campaign or computer campaign scenario');
  assert(h.testWorld.loading.state().jobs.every(j=>j.regions.every(id=>id===16)),'Only Minora regional jobs are registered');
  assert(!h.save().ok&&h.store.read().data===null,'Combat workspace has no save slot');
  const world=h.testWorld,completed=h.testWorld.loading.state().completed;
  for(const exercise of ['lesson','advanced','squad']){
    if(exercise!=='lesson')document.querySelector(`[data-combat-exercise="${exercise}"]`).click();
    await wait(()=>h.practice.state().exercise===exercise&&!!h.practice.state().encounter);
    assert(h.state().mode==='skirmish'&&document.getElementById('combat-testing-menu').hidden,exercise+' starts directly in the camp encounter');
    assert(h.practice.state().profile.jobs.length===0,'Exercise switch reuses the prepared camp');
    document.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyR',bubbles:true}));
    document.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyR',bubbles:true}));
    assert(h.practice.state().attempt===2&&h.practice.state().exercise===exercise,'R retries the chosen exercise');
    for(let i=0;i<3500&&!h.practice.state().encounter.outcome;i++){driveWorldEncounter(h,h.practice.state().encounter);h.step(1/60);}clearCombatKeys(h);
    assert(h.practice.state().encounter.outcome==='success',exercise+' is winnable through ordinary movement, dodge and strike input');
    document.getElementById('world-skirmish-continue').click();
    assert(h.state().mode==='combat-menu'&&!document.getElementById('combat-testing-menu').hidden,'Result returns to the exercise menu');
    assert(!h.state().fieldActors.length&&!h.state().combatMarkers.length,'Exercise exit disposes its actors and markers');
  }
  assert(h.testWorld===world&&h.testWorld.loading.state().completed===completed,'Switching exercises keeps the same prepared world');
  document.querySelector('[data-combat-exercise="squad"]').click();await wait(()=>h.practice.state().active&&h.state().mode==='skirmish');
  document.dispatchEvent(new KeyboardEvent('keydown',{code:'Escape',bubbles:true}));
  document.dispatchEvent(new KeyboardEvent('keyup',{code:'Escape',bubbles:true}));
  assert(!h.practice.state().active&&h.state().mode==='combat-menu','Esc exits an unfinished fight directly to exercise selection');
  assert(!h.state().frameErrors.length,'Combat startup, retries and menu transitions have no frame errors');
  return {checks:[...checks]};
}

export async function checkCombatImpacts(h,stage){
  window.dispatchEvent(new Event('focus'));
  const fight=()=>h.practice.state().encounter;
  if(stage==='block'){
    for(let i=0;i<800&&!fight().guards[0].block;i++){h.hold('KeyX',true);h.step(1/60);}h.hold('KeyX',false);
    assert(fight().hero.lastStrike.kind==='guarded'&&fight().guards[0].hp===50,'Blocked strike keeps the raised guard and enemy health intact');
    assert(h.state().combatImpacts.some(p=>p.visible&&p.kind==='guarded'),'A shield block has visible local impact feedback');
    assert(fight().presentation.sound.state==='running'&&fight().presentation.sound.played>0,'Combat sound unlocks after input and plays a local impact cue');
    const count=fight().presentation.sound.played;for(let i=0;i<5;i++)h.step(1/60);
    assert(fight().presentation.sound.played===count,'Drawing the same impact does not replay its sound');
  }else if(stage==='hurt'){
    for(let i=0;i<200&&fight().hero.hp===100;i++)h.step(1/60);
    assert(h.state().combatImpacts.some(p=>p.visible&&p.kind==='hurt'),'Damage to Teresod has a separate red impact cue');
  }else if(stage==='counter'){
    document.getElementById('world-skirmish-retry').click();
    for(let i=0;i<1500&&!fight().skill.counters;i++){driveWorldEncounter(h,fight());h.step(1/60);}clearCombatKeys(h);
    assert(h.state().combatImpacts.some(p=>p.visible&&p.kind==='counter'),'A successful counter has its own gold impact cue');
  }else if(stage==='dodge'){
    document.getElementById('world-skirmish-retry').click();h.hold('Space',true);h.step(1/60);h.hold('Space',false);
    for(let i=0;i<20;i++)h.step(1/60);h.hold('Space',true);h.step(1/60);h.hold('Space',false);
    assert(fight().hero.lastDodge.kind==='cooldown'&&document.getElementById('world-skirmish-feedback').textContent.includes('recovering'),'An unavailable dodge explains its recovery');
    assert(h.state().combatImpacts.some(p=>p.visible&&p.kind==='dodge'),'Failed dodge explanation appears beside Teresod');
    assert(/\d\.\ds/.test(document.getElementById('world-skirmish-dodge').textContent),'Dodge button displays remaining recovery time');
  }
  window.dispatchEvent(new Event('blur'));await frames();return {checks:[...checks]};
}
