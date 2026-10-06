import { BRANDY_HOME } from '../../content/quests/brandy/brandy-home-world.js';
import { BRANDY, BRANDY_STAND } from '../../content/quests/brandy/brandy.js';
import { JOHN } from '../../content/quests/salt/salt-sultan.js';

export async function runBrandyHomeChecks(h) {
  const checks = [], check = (ok, text) => { if (!ok) throw new Error(`${text}: ${JSON.stringify(h.homes.state())}`); checks.push(text); };
  const gap = (a, b) => Math.hypot(a.x-b.x, a.z-b.z);
  async function until(predicate, label, seconds=100) {
    for (let t=0; t<seconds&&!predicate(); t+=.05) {
      h.homes.frame(.05,true);
      if (Math.round(t*20)%200===0) await h.frames(1);
    }
    check(predicate(),label); await h.frames(2);
  }
  await h.prepare(); h.clock(100); h.homes.restore();
  check(gap(h.homes.state().brandy.position,BRANDY_STAND)<.2,'Morning begins at the relocated board yard');
  h.clock(360); const before=h.homes.snapshot(); h.homes.frame(30,false);
  check(JSON.stringify(h.homes.snapshot())===JSON.stringify(before),'Pausing stops household time and movement');
  await until(()=>h.homes.state().brandy.phase==='inside','Brandy walks the real path and enters her house');
  check(!h.npcById.get(BRANDY.id).actor.group.visible,'Brandy has no visible double while indoors');
  check(h.saveAndRestore(),'Household saves and restores through the real checkpoint');
  check(h.homes.state().brandy.phase==='inside','Indoor state survives reload');
  h.warp(BRANDY_HOME.porch); await h.frames(2);
  check(h.prompt().includes('Knock on Jon and Brandy'),'House has its normal knock prompt'); h.interact();
  for(let n=0;n<10&&!document.querySelector('[data-choice="brandy-home-come-out"]');n++)h.nextSpeech();
  const button=document.querySelector('[data-choice="brandy-home-come-out"]');
  check(!!button,'Knocking offers to ask Brandy outside');button.click();
  await until(()=>h.homes.state().brandy.phase==='answering','Brandy comes out to answer the visitor',8);
  check(h.npcById.get(BRANDY.id).actor.group.visible,'Answering Brandy is visible');
  h.warp({x:40,z:90});h.clock(960);
  await until(()=>h.homes.state().brandy.phase==='sleeping','At night Brandy walks indoors to sleep');
  h.warp(BRANDY_HOME.porch);await h.frames(2);h.interact();
  check(h.message().includes('asleep'),'A night knock explains that Brandy is asleep');
  h.warp({x:70,z:80});h.salt.berth('tidehaven','moored',50);h.homes.frame(.05,true);
  await until(()=>h.homes.state().jon.phase==='inside','Jon walks from the pier and enters his own home at night',180);
  check(!h.npcById.get(JOHN.id).actor.group.visible&&h.homes.holdDeparture,'Jon is inside and his ship waits');
  check(h.saveAndRestore(),'Jon home visit persists through checkpoint restore');
  await until(()=>h.homes.state().jon.phase==='docked','Jon comes back out and walks to the pier',250);
  check(!h.homes.holdDeparture,'Ship may depart after Jon returns');
  return {ok:true,checks,household:h.homes.snapshot()};
}
