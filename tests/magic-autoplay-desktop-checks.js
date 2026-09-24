import { CAT, LIZ } from '../src/cat-quest.js';
import { TROY, CLUES } from '../src/murder-quest.js';

// Launch the actual F8 button and observe ordinary rendered frames. No quest
// actions, NPC relocation, combat outcomes or testimony are injected here.
export async function runMagicAutoplayDesktopChecks(kind,h){
  const liz=kind==='liz',name=liz?'Liz':'Troy',teacher=liz?LIZ:TROY;
  const questId=liz?'liz-cat':'cobble-murder',rewardStage=liz?'home':'solved';
  const prefix=liz?'cat':'murder',spell=liz?'summon-bees':'mindread',school=liz?'beast':'mind';
  const checks=[],samples=[],stages=new Set();
  const frames=async(n=1)=>{for(let i=0;i<n;i++)await new Promise(requestAnimationFrame);};
  const gap=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
  const state=()=>({mode:h.mode(),pilot:h.pilot(),quest:h.quest(),position:h.position(),
    teacher:h.person(teacher.id),cat:liz?{...h.person(CAT.id),mode:h.catMode()}:null,samples,frameErrors:h.frameErrors()});
  const fail=message=>{throw new Error(`${name} autoplay: ${message}; ${JSON.stringify(state())}`);};
  const check=(value,message)=>{if(!value)fail(message);checks.push(message);};
  const until=async(test,message,seconds=30)=>{const end=performance.now()+seconds*1000;
    while(!test()){if(performance.now()>end)fail(message);await frames();}};
  const tap=code=>{h.press(code);h.release(code);};
  const start=async()=>{
    tap('F8');await frames(2);
    check(h.mode()==='testing','F8 opens the testing tools');
    const button=document.getElementById(`test-${kind}-autoplay`);
    check(button&&!button.disabled&&button.getClientRects().length,`Play ${name}'s quest is available`);
    button.click();await frames(3);
    check(h.isTesting()&&h.pilot().enabled&&h.pilot().id===kind,'The button starts the selected isolated quest');
  };
  await h.prepare();await frames(3);
  const savedBefore=JSON.stringify(h.checkpointCopy());
  check(!!h.checkpointCopy(),'A normal adventure checkpoint exists before testing');
  await start();
  check(!h.magic.known(spell),'The spell is not awarded before the quest');
  const began=performance.now();let last=h.position(),travelled=0,largestStep=0,lastReport=0,reloaded=false,paused=false;
  const initialCat=liz?h.person(CAT.id):null;
  while(h.pilot().enabled){
    if(performance.now()-began>420000)fail('The full live quest exceeded seven minutes');
    if(h.mode()==='defeated'||h.combat.state.player.hp<=0)fail('The traveler fell');
    await frames();const at=h.position(),step=gap(at,last);travelled+=step;largestStep=Math.max(largestStep,step);last=at;
    const quest=h.quest();stages.add(quest.stage);
    if(!['unmet','asked'].includes(quest.stage))checkFocus();
    if(!paused&&h.mode()==='playing'&&(liz?quest.stage==='following':quest.heard.length===1)){
      tap('Escape');const clock=h.clock(),still=h.position(),cat=liz?h.person(CAT.id):null;
      await frames(10);
      check(h.mode()==='pause'&&h.clock()===clock&&gap(h.position(),still)<.01,'Pause freezes the pilot and world clock');
      if(liz)check(gap(h.person(CAT.id),cat)<.01,'Mop stays still while paused');
      tap('Escape');paused=true;
    }
    if(!reloaded&&h.mode()==='playing'&&(liz?quest.stage==='following'&&gap(h.person(CAT.id),initialCat)>15:quest.heard.length===1)){
      check(h.save(),'Progress can be saved in the testing session');
      const before=h.session(),cat=liz?h.person(CAT.id):null;
      check(h.reload(),'The testing checkpoint reloads');
      if(liz){check(gap(h.person(CAT.id),cat)<.05&&h.catMode()==='following','Reload keeps Mop at his actual feet and following');}
      else check(JSON.stringify(h.quest().heard)===JSON.stringify(before.murder.heard),'Reload preserves the first testimony');
      check(h.resume(),'The focused quest resumes after loading');last=h.position();reloaded=true;
    }
    if(performance.now()-lastReport>5000){lastReport=performance.now();samples.push({seconds:Math.round((lastReport-began)/1000),
      stage:quest.stage,position:at,cat:liz?h.person(CAT.id):undefined,heard:quest.heard,intent:h.pilot().intent});
      window.__MAGIC_AUTOPLAY_CHECK_PROGRESS__=samples.at(-1);}
  }
  function checkFocus(){if(h.tracked()!==questId)fail('The quest lost its objective focus');}
  check(paused&&reloaded,'The live route exercised pause and checkpoint recovery');
  check(h.quest().stage===rewardStage,'The real quest reaches its unrewarded conclusion');
  check(h.mode()==='dialogue'&&document.querySelector(`[data-choice="${prefix}-purse"]`)?.getClientRects().length
    &&document.querySelector(`[data-choice="${prefix}-lesson"]`)?.getClientRects().length,'Both reward choices are visible when the pilot stops');
  check(!h.magic.known(spell),'Autoplay leaves the reward to the player');
  check(travelled>(liz?150:20)&&largestStep<4,'The quest uses continuous walking after its initial teleport');
  if(liz){check(stages.has('looking')&&stages.has('following')&&gap(initialCat,h.person(CAT.id))>60,'Mop walks home through the actual NPC frame loop');}
  else check(CLUES.every(clue=>h.quest().heard.includes(clue)),'All three actual witness conversations supply the evidence');
  const purse=h.inventory.count('copper-piece');
  document.querySelector(`[data-choice="${prefix}-lesson"]`).click();await frames(3);
  check(h.quest().stage==='taught'&&h.magic.known(spell)&&h.skills.taught(school),`The chosen lesson teaches ${spell} and its sorcery school`);
  check(h.inventory.count('copper-piece')===purse,'Taking the lesson does not also pay the purse');
  check(h.mode()==='playing','The reward returns normal control');
  check(h.save()&&h.reload()&&h.magic.known(spell),'The earned spell survives a checkpoint reload');
  check(JSON.stringify(h.checkpointCopy())===savedBefore,'The normal saved adventure is unchanged');
  const completion={seconds:Math.round((performance.now()-began)/1000),travelled,largestStep,stages:[...stages],spell,samples};
  await start();
  check(!h.magic.known(spell)&&['unmet','asked'].includes(h.quest().stage),'Starting again resets the completed quest');
  await until(()=>h.mode()==='playing'&&(liz?h.quest().stage==='looking':h.quest().stage==='asking'),'The fresh run did not accept the quest again',60);
  const origin=h.position();await until(()=>gap(h.position(),origin)>1.5,'The restarted pilot does not walk',20);
  check(h.pilot().enabled&&h.tracked()===questId,'Restarting the test follows the selected side quest');
  check(JSON.stringify(h.checkpointCopy())===savedBefore,'Restarting also preserves the normal save');
  check(h.frameErrors().count===0,'No renderer frame errors during the whole quest');
  return {ok:true,checks,completion,questId,pilotId:kind,awaitingNativeTakeover:true,frameErrors:h.frameErrors().count};
}
