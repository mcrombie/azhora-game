import { CAGNEY_AMBUSH, CAGNEY_HOME } from './cagney-quest.js';

/** Drives the public F8 button and watches real render frames, ordinary travel and combat. */
export async function runCagneyAutoplayChecks(h) {
  const checks=[],samples=[],stages=new Set(),check=(ok,message)=>{if(!ok)fail(message);checks.push(message);};
  const frames=async(n=1)=>{for(let i=0;i<n;i++)await new Promise(requestAnimationFrame);};
  const gap=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
  const state=()=>({mode:h.mode(),pilot:h.pilot(),quest:h.quest(),position:h.position(),cagney:h.person(),
    combat:{phase:h.combat.state.phase,hp:h.combat.state.player.hp,enemies:h.combat.state.enemies,allies:h.combat.state.allies},samples});
  function fail(message){throw new Error(`Cagney autoplay: ${message}; ${JSON.stringify(state())}`);}
  const until=async(test,message,seconds=30)=>{const until=performance.now()+seconds*1000;
    while(!test()){if(performance.now()>until)fail(message);await frames();}};
  async function startFromMenu(){
    h.press('F8');h.release('F8');await frames(2);
    check(h.mode()==='testing','F8 opens the testing tools');
    const button=document.getElementById('test-cagney-autoplay');
    check(button&&!button.disabled&&button.getClientRects().length,'Testing tools offer Play Cagney escort');
    button.click();await frames(3);
    check(h.isTesting()&&h.pilot().enabled&&h.pilot().id==='cagney','The public button starts an isolated Cagney autoplay');
  }
  await h.prepare();await frames(3);
  const savedBefore=JSON.stringify(h.checkpointCopy());
  check(!!h.checkpointCopy(),'A normal adventure checkpoint exists before testing');
  await startFromMenu();
  const start=performance.now(),initialMoney=h.inventory.count('copper-piece'),initial=h.position();
  let last=initial,travelled=0,largestStep=0,combatSeen=false,attackSeen=false,saveChecked=false,lastReport=0;
  while(h.pilot().enabled){
    if(performance.now()-start>1200000)fail('The live escort exceeded its twenty-minute limit');
    if(h.mode()==='defeated'||['dead','captured'].includes(h.quest().stage))fail('A member of the escort party fell');
    await frames();const now=h.position(),step=gap(last,now);last=now;travelled+=step;largestStep=Math.max(largestStep,step);
    const q=h.quest(),c=h.combat.state;stages.add(q.stage);
    if(['escorting','ambushed','home'].includes(q.stage)&&h.tracked()!=='cagney-escort')fail('The escort lost objective focus');
    if(c.phase==='active'){
      combatSeen=true;attackSeen ||= c.player.action==='attack';
      if(c.encounterId!==CAGNEY_AMBUSH.id)fail('An unrelated encounter interrupted the escort');
      const ally=c.allies.find(a=>a.id==='cagney');
      if(!ally||ally.kind!=='bystander'||ally.armed!==false||ally.model?.look?.shirtRibbons!==true)fail('Cagney lost her own appearance or civilian role');
    }
    if(q.stage==='escorting'&&q.ambushCleared&&!saveChecked&&c.phase!=='active'&&h.mode()==='playing'){
      const health=q.hp,position=h.person();
      check(h.save(),'An escort checkpoint can be saved after the road fight');
      check(h.reload(),'The saved escort resumes in the real game');await frames(2);
      check(h.quest().ambushCleared&&h.quest().enemies.every(hp=>hp===0)&&h.quest().hp===health,'Loading preserves the defeated cagnappers and Cagney health');
      check(gap(position,h.person())<1,'Loading keeps Cagney at her saved road position');
      h.resume();check(h.pilot().enabled&&h.pilot().id==='cagney','P resumes the selected escort after loading');
      saveChecked=true;last=h.position();
    }
    if(performance.now()-lastReport>5000){lastReport=performance.now();samples.push({seconds:Math.round((lastReport-start)/1000),stage:q.stage,
      waypoint:q.walk.waypoint,position:now,cagney:h.person(),hp:c.player.hp,intent:h.pilot().intent});
      if(samples.length>160)samples.shift();window.__CAGNEY_AUTOPLAY_CHECK_PROGRESS__=samples.at(-1);
      if(samples.length%3===1)console.log('CAGNEY_AUTOPLAY_PROGRESS '+JSON.stringify(samples.at(-1)));}
  }
  check(h.quest().stage==='complete','The pilot finishes the escort and speaks to Cagney at her home');
  check(stages.has('escorting')&&stages.has('ambushed')&&stages.has('home'),'The real escort, ambush and home stages were played');
  check(combatSeen&&attackSeen&&h.quest().ambushCleared,'Ordinary player combat defeats all three cagnappers');
  check(saveChecked,'A mid-escort save and load were exercised');
  check(travelled>250&&gap(h.person(),CAGNEY_HOME)<2.6,'The traveler and Cagney walk the western road to her actual house');
  check(largestStep<4,'Autoplay does not teleport during the quest');
  check(h.inventory.count('copper-piece')===initialMoney+45,'The homecoming pays exactly 45 copper');
  check(h.mode()==='playing'&&h.combat.state.player.hp>0,'The completed escort returns ordinary player control');
  check(JSON.stringify(h.checkpointCopy())===savedBefore,'Autoplay preserves the normal saved adventure');
  const completion={seconds:Math.round((performance.now()-start)/1000),travelled,largestStep,stages:[...stages],position:h.position(),cagney:h.person(),samples};
  await startFromMenu();
  check(!h.quest().ambushCleared&&h.quest().enemies.every(hp=>hp===48),'A repeated playtest resets the completed encounter');
  await until(()=>h.quest().stage==='escorting'&&h.mode()==='playing','The second run did not accept the escort',60);
  const restart=h.position();await until(()=>gap(restart,h.position())>1.5,'The restarted pilot did not walk',30);
  check(h.tracked()==='cagney-escort','Restarting focuses the escort again');
  check(JSON.stringify(h.checkpointCopy())===savedBefore,'Restarting preserves the saved adventure');
  check(h.frameErrors().count===0,'The full rendered quest produces no frame errors');
  return {ok:true,checks,completion,restart:{position:h.position(),cagney:h.person(),pilot:h.pilot(),stage:h.quest().stage},awaitingNativeTakeover:true,frameErrors:h.frameErrors().count};
}
