import { MINORA_START, MAIN_QUEST_RECRUITERS } from './minora-opening.js';

/** Native opening/save regression. All storage belongs to the isolated smoke profile. */
export async function runMinoraOpeningChecks(h, expected = null) {
  const checks = [];
  const assert = (condition, label) => { if (!condition) throw new Error(label); checks.push(label); console.log('MINORA_PROGRESS '+label); };
  const until = async (predicate, label) => {
    const start = performance.now();
    while (!predicate()) { if (performance.now()-start>300000) throw new Error(label); await h.frames(1); }
  };
  const capture = async name => { await h.frames(3); console.log('MINORA_CAPTURE '+name); await new Promise(r=>setTimeout(r,500)); };
  const choose = id => { const b=document.querySelector(`[data-choice="${id}"]`); assert(!!b,'Conversation offers '+id); b.click(); };
  const dormant = () => {
    const s = h.state();
    return s.freeStart?.joined===false && s.questStage===0 && !s.journey.started && !s.peninsulaTutorial.active;
  };
  assert(h.state().mode==='opening','Launch opens on the city panorama');
  const buttons=[...document.querySelectorAll('#opening button')].filter(b=>!b.hidden&&b.getClientRects().length);
  assert(buttons.map(b=>b.textContent.trim()).join('|')==='Tutorial|Start|Continue','Opening offers exactly Tutorial, Start, Continue');
  if (!expected) {
    assert(document.getElementById('continue-road').disabled,'Continue is disabled when no save exists');
    await capture('title');
    const camera=h.camera(); await h.frames(10);
    assert(Math.hypot(...h.camera().map((v,i)=>v-camera[i]))>.01,'The city camera rotates while the menu is open');
    h.orbit(90); await capture('title-countryside'); h.orbit(0);
    document.getElementById('begin-skip-tutorial').click();
    await until(()=>h.state().mode==='playing','Start did not enter Minora');
    assert(dormant(),'Start leaves tutorial and main quest unaccepted');
    assert(h.state().region===16&&Math.hypot(h.state().position[0]-MINORA_START.x,h.state().position[2]-MINORA_START.z)<2,'Start stands in Minora');
    assert(h.canStand(),'Minora spawn is on clear walkable ground');
    assert(!h.state().inventory.some(id=>['tutorial-letter','harbor-letter','road-token','jojo-sandwich'].includes(id)),'Start grants no tutorial letters, sandwich, or travel token');
    assert(h.state().arrivalClock<0,'Free exploration does not start the tutorial arrival event');
    await capture('start');
    h.hold('KeyW',true); await h.frames(35);h.hold('KeyW',false);await h.frames(3);
    assert(Math.hypot(h.state().position[0]-MINORA_START.x,h.state().position[2]-MINORA_START.z)>.5,'The new traveler can walk freely');
    assert(dormant(),'Walking does not silently accept the main quest');
    assert(h.save(),'Free exploration writes a real checkpoint');
    const saved=h.read();assert(saved.ok&&saved.data?.freeStart?.joined===false,'Saved checkpoint retains independent exploration');
    const savedText=JSON.stringify(saved.data);
    h.pause();h.blockSave(true);document.getElementById('exit-main-menu').click();
    assert(h.state().mode==='pause'&&!document.getElementById('exit-menu-confirm').classList.contains('hidden'),'Blocked saving requires an explicit exit choice');
    document.getElementById('exit-menu-stay').click();
    assert(h.state().mode==='pause'&&document.getElementById('exit-menu-confirm').classList.contains('hidden'),'Stay in game cancels the exit');
    document.getElementById('exit-main-menu').click();document.getElementById('exit-menu-discard').click();h.blockSave(false);
    await until(()=>h.state().mode==='opening','Exit without saving did not return to the menu');
    assert(JSON.stringify(h.read().data)===savedText,'Exit without saving preserves the last checkpoint');
    document.getElementById('continue-road').click();await until(()=>h.state().mode==='playing','Continue after exit did not resume');
    assert(Math.hypot(h.state().position[0]-saved.data.position.x,h.state().position[2]-saved.data.position.z)<.1,'Continue after menu exit restores the saved location');
    h.pause();h.testing(true);const beforeTestExit=JSON.stringify(h.read().data);document.getElementById('exit-main-menu').click();
    await until(()=>h.state().mode==='opening','Testing exit did not return to the menu');
    assert(JSON.stringify(h.read().data)===beforeTestExit,'Exiting a testing session never overwrites the adventure');
    document.getElementById('continue-road').click();await until(()=>h.state().mode==='playing','Continue from testing did not resume');
    assert(!h.state().testingEnabled,'Continue leaves testing mode');
    h.pause();await capture('pause-exit');document.getElementById('exit-main-menu').click();
    await until(()=>h.state().mode==='opening','Saved exit did not return to the menu');
    assert(!document.getElementById('continue-road').disabled,'Saved exit enables Continue without reloading the world');
    assert(!document.body.classList.contains('playing')&&document.getElementById('pause').classList.contains('hidden'),'Exit clears the gameplay and pause overlays');
    await capture('returned-menu');
    const latest=h.read().data;document.getElementById('continue-road').click();await until(()=>h.state().mode==='playing','Final Continue did not resume');
    return {ok:true,checks,expected:{position:latest.position,inventory:latest.inventory,freeStart:latest.freeStart}};
  }
  assert(!document.getElementById('continue-road').disabled,'A fresh renderer finds the last save');
  await capture('title-continue');
  document.getElementById('continue-road').click();
  await until(()=>h.state().mode==='playing','Continue did not finish');
  assert(dormant(),'Continue preserves the unaccepted main quest');
  assert(Math.hypot(h.state().position[0]-expected.position.x,h.state().position[2]-expected.position.z)<.1,'Continue resumes the saved position');
  for(const id of MAIN_QUEST_RECRUITERS){
    h.talk(id); choose('minora-not-yet'); assert(dormant(),id+' allows declining recruitment');
  }
  h.talk('instructor');choose('minora-join-main');
  assert(h.state().freeStart.joined&&h.state().journey.started,'Glun starts the main road only after acceptance');
  assert(h.state().practiceHits===0&&!h.state().peninsulaTutorial.active,'Recruitment does not fabricate tutorial practice');
  assert(h.save()&&h.read().data.freeStart.joined,'Recruited exploration saves successfully');
  await capture('joined');
  // Existing tutorial remains available as a fresh launch choice.
  await h.tutorial();
  await until(()=>h.state().mode==='arriving'||h.state().peninsulaTutorial.active,'Tutorial did not load');
  assert(h.state().freeStart===null&&h.state().peninsulaTutorial.active,'Tutorial still selects the original Drent peninsula lessons');
  assert(h.state().peninsulaTutorial.path==='tutorial','Tutorial retains the original lesson sequence');
  assert(!h.state().frameErrors?.count,'No renderer frame errors');
  return {ok:true,checks,state:h.state()};
}
