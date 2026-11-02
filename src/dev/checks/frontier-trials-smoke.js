import {COMBAT_TRIALS} from '../../gameplay/combat/combat-trials.js';
import {driveWorldEncounter,clearCombatKeys} from './encounter-controls.js';
const frame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
const fight=a=>a.practice.state().encounter;
const assert=(v,m)=>{if(!v)throw Error(m);};
const press=code=>{document.dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true,cancelable:true}));document.dispatchEvent(new KeyboardEvent('keyup',{code,bubbles:true}));};
export async function inspect(a,id){
  window.dispatchEvent(new Event('focus'));clearCombatKeys(a);a.hold('KeyF',false);a.practice.finish();
  document.getElementById('trial-start-opponent').value=id;document.querySelector('[data-combat-exercise="trials"]').click();
  const end=performance.now()+45000;while((a.state().mode!=='skirmish'||!fight(a))&&performance.now()<end)await frame();
  assert(fight(a)?.trial===id&&fight(a).briefing,'Selection loads '+id);
  assert(fight(a).hero.hp===100&&a.sorcery.state().mana===100,'Fresh round restores health and mana');
  const before=fight(a).time;for(let i=0;i<30;i++)a.step(1/60);assert(fight(a).time===before,'Briefing is paused');
  document.getElementById('combat-trial-start').click();a.look({yaw:Math.PI-.45,pitch:.28,distance:8});
  const interesting=s=>id==='goblin-trapper'?s.trialObjects.some(o=>o.kind==='trap'):id==='dwarven-earthshaper'?s.trialObjects.some(o=>o.kind==='ridge'):id==='dark-elf-mirrorblade'?s.mirages.length>0:id==='dark-dwarf-furnace-keeper'?s.guards[0].phase==='vent':id==='nanvir-penitent'?s.guards[0].empowered:id==='acor-reed-stalker'?s.guards[0].phase==='submerged':id==='high-goblin-binder'?s.trialObjects.some(o=>o.kind==='binding'):id==='elven-ranger'?s.projectiles.length>0:id==='oremindi-stone-troll'?s.projectiles.length>0:id==='young-wyvern'?s.guards[0].flightHeight>0:id==='eshtor-oathbound-champion'?s.guards[0].stance==='pursuit':id==='acor-wraith'?s.guards[0].phase==='veil':id==='web-spider'?s.trialObjects.some(o=>o.kind==='web'):id==='dark-dwarf-runesmith'?s.trialObjects.length>0:id==='nanvir-adept'?s.guards[0].empowered:id==='eshtor-barrow-guardian'?s.echoes.length>0:id==='guild-golem'?s.guards[0].phase==='recover':id==='goblin-slinger'?s.projectiles.length>0:s.guards[0].phase==='windup';
  for(let i=0;i<900&&!interesting(fight(a))&&!fight(a).outcome;i++)a.step(1/60);
  assert(interesting(fight(a)),id+' demonstrates its mechanic');
  if(id==='acor-reed-stalker')assert(a.testHero.group.parent.children.find(o=>o.userData.trialOpponent===id).children[0].visible===false,'Submerged figure disappears while its ripples remain visible');
  press('KeyH');const frozen=JSON.stringify(fight(a));for(let i=0;i<60;i++)a.step(1/60);assert(JSON.stringify(fight(a))===frozen,'Help freezes all mechanics');press('Escape');
  window.dispatchEvent(new Event('blur'));await frame();
  assert(!a.state().frameErrors.length,'No frame errors for '+id);
  return {id,round:COMBAT_TRIALS.findIndex(t=>t.id===id)+1,state:fight(a),render:a.renderStats()};
}
export async function finish(a,id){
  if(id==='dark-dwarf-runesmith'){
    window.dispatchEvent(new Event('focus'));press('KeyR');document.getElementById('combat-trial-start').click();
    const stone=fight(a).trialObjects.find(o=>o.kind==='anchor'),h=fight(a).hero;
    a.look({yaw:Math.atan2(h.x-stone.x,h.z-stone.z),pitch:.2,distance:8});
    let casts=0;
    for(let i=0;i<240&&fight(a).trialObjects.some(o=>o.id===stone.id&&o.hp>0);i++){
      if(casts<2&&a.sorcery.state().cooldown===0){press('KeyQ');casts++;}
      a.step(1/60);
    }
    assert(casts===2&&!fight(a).trialObjects.some(o=>o.id===stone.id&&o.hp>0),'Two aimed Fireballs destroy the physical ward anchor');
    assert(!fight(a).guards[0].warded,'Destroying the anchor removes its ward');
  }
  if(id==='web-spider'||id==='high-goblin-binder'){
    window.dispatchEvent(new Event('focus'));
    const h=fight(a).hero,kind=id==='web-spider'?'web':'binding';
    const web=fight(a).trialObjects.find(o=>o.kind===kind&&Math.hypot(o.x-h.x,o.z-h.z)<o.radius);assert(web,'Ground hazard exists under the stationary player');
    press('KeyQ');
    for(let i=0;i<100&&fight(a).trialObjects.some(o=>o.id===web.id&&o.hp>0);i++)a.step(1/60);
    assert(!fight(a).trialObjects.some(o=>o.id===web.id&&o.hp>0),'Fireball clears silk directly underfoot');
    a.testHero.group.traverse(o=>assert([...o.position.toArray(),...o.quaternion.toArray()].every(Number.isFinite),'Casting at silk keeps the posed rig finite'));
  }
  window.dispatchEvent(new Event('focus'));press('KeyR');assert(fight(a).briefing,'Retry restores briefing');document.getElementById('combat-trial-start').click();
  for(let i=0;i<9000&&!fight(a).outcome;i++){driveWorldEncounter(a,fight(a));a.step(1/60);}clearCombatKeys(a);
  assert(fight(a).outcome==='success',id+' is winnable through normal keyboard input');
  assert(!fight(a).projectiles.length&&!fight(a).echoes.length&&!fight(a).trialObjects.length&&!fight(a).mirages.length,'Victory clears temporary effects');
  assert(fight(a).presentation.resultPending,'Victory waits for defeat animation');
  for(let i=0;i<120;i++)a.step(1/60);
  assert(!fight(a).presentation.resultPending,'Result appears after the fall');
  const result={id,hp:fight(a).hero.hp,time:fight(a).time,render:a.renderStats()};
  a.practice.finish();assert(!a.testHero.group.parent.getObjectByName('Stillroom spell effects'),'Exit releases effects');
  assert(!a.testHero.group.parent.children.some(o=>o.userData.trialOpponent),'Exit releases opponent');
  assert(!a.state().frameErrors.length,'No errors after retry and exit');return result;
}
