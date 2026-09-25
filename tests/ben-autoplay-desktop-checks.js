import { BEN, SPIDER } from '../src/spider-quest.js';
import { createEscortMotionChecks } from '../src/escort-motion-checks.js';

/** Starts the same F8 tool as the player, then only observes normal live frames.
 * The Electron caller supplies trusted native input after the final restart to
 * test manual takeover; synthetic DOM keyboard events cannot establish that.
 */
export async function runBenAutoplayDesktopChecks(h) {
  const checks=[];
  const samples=[];
  const motion=createEscortMotionChecks();
  const check=(value,message)=>{if(!value)throw new Error(`Ben autoplay: ${message}`);checks.push(message);};
  const frames=async(n=1)=>{for(let i=0;i<n;i++)await new Promise(requestAnimationFrame);};
  const gap=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
  const state=()=>({mode:h.mode(),pilot:h.pilot(),tracked:h.tracked(),quest:h.spiderQuest.snapshot(),position:h.getPosition(),ben:h.getBenPosition(),samples,
    combat:{phase:h.combat.state.phase,hp:h.combat.state.player.hp,action:h.combat.state.player.action,
      enemies:h.combat.state.enemies.map(e=>({id:e.id,hp:e.hp,x:e.x,z:e.z,action:e.action})),
      allies:h.combat.state.allies.map(e=>({id:e.id,hp:e.hp,x:e.x,z:e.z,action:e.action}))}});
  const fail=message=>{throw new Error(`Ben autoplay: ${message}; ${JSON.stringify(state())}`);};
  const until=async(test,message,seconds=20)=>{
    const deadline=performance.now()+seconds*1000;
    while(!test()){if(performance.now()>deadline)fail(message);await frames();}
  };
  const startFromMenu=async()=>{
    h.press('F8');h.release('F8');await frames(2);
    check(h.mode()==='testing'&&document.getElementById('testing')?.getClientRects().length,'F8 opens the testing tools');
    const button=document.getElementById('test-ben-autoplay');
    check(button&&!button.disabled&&button.getClientRects().length,'Testing tools offer Play Ben’s quest');
    button.click();await frames(3);
    check(h.pilot().enabled&&h.isTesting(),'The button starts an isolated Ben quest autoplay session');
  };

  await h.prepare();await frames(3);
  const savedBefore=JSON.stringify(h.checkpointCopy());
  check(!!h.checkpointCopy(),'A normal adventure checkpoint exists before entering testing');
  await startFromMenu();
  check(!['taught','paid','abandoned','killed'].includes(h.spiderQuest.state.stage),'The quest starts before its resolution');
  check(!h.magic.known('fireball'),'The test does not award Fireball before doing the quest');
  const start=performance.now(),initialPlayer=h.getPosition(),initialBen=h.getBenPosition();
  let last=initialPlayer,travelled=0,largestStep=0,combatSeen=false,spellSeen=false,playerAttackSeen=false,playerDefenceSeen=false,focusSeen=false;
  let enemyInitialHp=null,enemyLowestHp=null,lastReport=0;
  const stages=new Set([h.spiderQuest.state.stage]);
  while(h.pilot().enabled){
    if(performance.now()-start>480000)fail('The full live quest exceeded its bounded eight-minute limit');

    if(h.mode()==='defeated'||h.spiderQuest.state.benDown)fail('A member of the quest party fell');
    await frames();
    const now=h.getPosition(),step=gap(last,now);travelled+=step;largestStep=Math.max(largestStep,step);last=now;
    stages.add(h.spiderQuest.state.stage);
    if(['walking','fighting'].includes(h.spiderQuest.state.stage)){
      if(h.tracked()!=='ben-spider')fail('Ben’s quest lost objective focus while the pilot was following it');
      focusSeen=true;
    }
    const combat=h.combat.state,spider=combat.enemies.find(e=>e.id===SPIDER.id);
    motion.observe(h.motion(),h.mode()==='playing'&&h.spiderQuest.state.stage==='walking'&&combat.phase!=='active');
    if(combat.phase==='active'){
      combatSeen=true;spellSeen ||= (combat.fireballs??[]).some(p=>p.owner===BEN.id||p.sourceId===BEN.id||p.id.includes(BEN.id));
      playerAttackSeen ||= combat.player.action==='attack';
      playerDefenceSeen ||= combat.player.action==='dodge'||!!h.pilot().guard;
      if(spider){enemyInitialHp??=spider.hp;enemyLowestHp=Math.min(enemyLowestHp??spider.hp,spider.hp);}
    }
    if(performance.now()-lastReport>5000){
      lastReport=performance.now();samples.push({seconds:Math.round((performance.now()-start)/1000),stage:h.spiderQuest.state.stage,
        position:now,ben:h.getBenPosition(),hp:combat.player.hp,intent:h.pilot().intent});
      if(samples.length>100)samples.shift();
      window.__BEN_AUTOPLAY_CHECK_PROGRESS__=samples.at(-1);
    }
  }
  await until(()=>!h.pilot().enabled,'The completed quest did not stop its pilot',5);
  check(stages.has('walking')&&stages.has('fighting')&&stages.has('killed'),'The pilot escorts Ben, fights the spider, and returns for the reward');
  check(focusSeen,'Ben’s objective stays focused throughout the escort and fight');
  check(travelled>80&&gap(initialBen,h.getBenPosition())>60,'The traveler and Ben walk the actual route to the den');
  check(largestStep<4,'The pilot follows the route without mid-quest teleporting');
  const following=motion.result();
  check(following.seconds>8,'Smooth-follow checks observed sustained live walking behind Ben');
  check(following.stopRate<.6&&following.inputStopRate<.6&&following.speedJumpRate<.8,
    `Following Ben avoids repeated start-stop movement (${JSON.stringify(following)})`);
  check(following.cameraReversalRate<1.5,'Following Ben avoids repeated fast camera direction reversals');
  check(combatSeen&&enemyLowestHp<enemyInitialHp&&h.spiderQuest.state.spiderDown,'The normal combat system defeats the spider');
  check(spellSeen&&playerAttackSeen&&playerDefenceSeen,'Ben casts fireballs while the traveler attacks and defends');
  check(h.spiderQuest.state.stage==='killed'&&!h.magic.known('fireball'),'Autoplay leaves the reward unclaimed for the player');
  check(h.mode()==='dialogue'&&document.querySelector('[data-choice="ben-bounty"]')&&document.querySelector('[data-choice="ben-lesson"]'),'Both reward choices are visible when autoplay stops');
  document.querySelector('[data-choice="ben-lesson"]').click();await frames(2);
  check(h.spiderQuest.state.stage==='taught'&&h.magic.known('fireball')&&h.skills.taught('fire'),'The player chooses the Fire Sorcery lesson and learns Fireball');
  check(h.weapons.profile().id==='simple-sword'&&h.inventory.has('wand'),'The spare wand goes into the satchel without replacing the sword');
  for(let i=0;i<4&&!document.querySelector('[data-choice="ben-practice-later"]');i++)h.nextSpeech();
  document.querySelector('[data-choice="ben-practice-later"]').click();await frames(2);
  check(!h.spiderQuest.state.benDown&&h.combat.state.player.hp>0,'The traveler and Ben survive the completed quest');
  check(h.mode()==='playing','The completed quest leaves normal player control available');
  check(h.isTesting()&&JSON.stringify(h.checkpointCopy())===savedBefore,'Completing the test leaves the saved adventure unchanged');
  const completion={seconds:Math.round((performance.now()-start)/1000),travelled,largestStep,stages:[...stages],
    position:h.getPosition(),ben:h.getBenPosition(),hp:h.combat.state.player.hp,fireball:h.magic.known('fireball'),following,samples};
  await h.capture?.('ben-autoplay-completed');

  // Repeat the actual menu action after completion. Leave the second run live
  // so main.cjs can test trusted native WASD takeover, not a testing-only bypass.
  await startFromMenu();
  check(!h.magic.known('fireball')&&!h.spiderQuest.state.spiderDown,'Starting again resets the finished Ben quest and its Fireball lesson');
  await until(()=>h.spiderQuest.state.stage==='walking'&&h.mode()==='playing','The fresh run did not accept Ben’s quest again',60);
  const restartedAt=h.getPosition();
  await until(()=>gap(restartedAt,h.getPosition())>1.5,'The restarted pilot did not resume ordinary walking',20);
  check(h.pilot().enabled&&h.spiderQuest.state.walking,'A fresh run works after completing the previous test');
  check(h.tracked()==='ben-spider','The fresh Ben run selects its own objective again');
  check(JSON.stringify(h.checkpointCopy())===savedBefore,'Restarting the test also preserves the saved adventure');
  check(h.frameErrors().count===0,'The full rendered Ben autoplay produced no frame errors');
  return {ok:true,checks,completion,restart:{position:h.getPosition(),ben:h.getBenPosition(),pilot:h.pilot(),stage:h.spiderQuest.state.stage},
    awaitingNativeTakeover:true,frameErrors:h.frameErrors().count};
}
