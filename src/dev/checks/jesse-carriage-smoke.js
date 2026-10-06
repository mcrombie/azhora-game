import { JESSE, JESSE_WORKSHOP, JESSE_GUILD, CARRIAGE_PARTS } from '../../content/quests/jesse/jesse-carriage-world.js';

export async function runJesseCarriageChecks(h) {
  const checks=[],check=(value,label)=>{if(!value)throw new Error(`${label}: ${JSON.stringify(h.host.state())}`);checks.push(label);};
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
  async function choose(id){
    for(let n=0;n<14&&!document.querySelector(`[data-choice="${id}"]`);n++)h.nextSpeech();
    const button=document.querySelector(`[data-choice="${id}"]`);check(button&&!button.disabled,`Choice ${id} is available`);
    button.click();await h.frames(2);
  }
  await h.prepare();h.warp(JESSE_WORKSHOP.stand);h.conversation(h.npc);await choose('jesse-accept');
  for(const part of CARRIAGE_PARTS){h.warp(part);await h.frames(2);check(h.prompt().startsWith('Collect '),`${part.id} has a collection prompt`);h.interact();await h.frames(2);}
  h.warp(JESSE_WORKSHOP.stand);h.conversation(h.npc);await choose('jesse-timber-pine');
  const xpBefore=h.xp();
  for(const step of ['frame','wheels','braces'])await choose(`jesse-assemble-${step}`);
  check(h.xp()>xpBefore,'Completing assembly grants Construction experience');const earned=h.xp();
  h.closeDialogue();h.warp(JESSE_WORKSHOP.carriage);await h.frames(2);h.interact();await choose('jesse-board');
  check(h.host.mounted,'Player boards the physical carriage with Jesse driving');
  const paused=h.host.snapshot();h.host.frame(5,false);check(JSON.stringify(h.host.snapshot())===JSON.stringify(paused),'Pause holds the carriage and narration');
  let n=0,stalled=0;
  while(h.host.mounted&&n++<16000){
    const before=h.host.state().cart;h.host.frame(.05,true,n*.05);
    checkBounded(before,h.host.state().cart);
    stalled=distance(before,h.host.state().cart)<.001?stalled+1:0;
    if(stalled>=120)throw new Error('Carriage stalled: '+JSON.stringify(h.host.state().cart));
    if(n===600){console.log('JESSE_CAPTURE riding');await h.frames(3);}
    if(n%1000===0)console.log('JESSE_PROGRESS '+JSON.stringify(h.host.state().cart));
    if(n===400){check(h.saveAndRestore(),'Carriage journey resumes through a real checkpoint');check(h.xp()===earned,'Loading does not award assembly experience again');}
    if(n%200===0)await h.frames(1);
  }
  check(!h.host.mounted&&h.host.state().complete,'Carriage travels the actual road and reaches the guild');
  check(distance(h.host.state().cart,JESSE_GUILD.cartParking)<.2,'Carriage parks beside the guild');
  for(let n=0;n<1800&&h.host.state().stage!=='inside';n++)h.host.frame(.05,true);
  await h.frames(2);check(h.host.state().stage==='inside'&&!h.npc.actor.group.visible,'Jesse walks through the guild door and goes inside');
  check(h.saveAndRestore(),'Jesse remains inside after loading');h.warp(JESSE_GUILD.porch);await h.frames(2);
  check(h.prompt().includes('Knock'),'Guild doorway offers a knock');h.interact();
  check(h.message().includes('not fleshed out yet'),'Guild notice explains the future arc');
  for(let n=0;n<100&&h.host.state().stage!=='outside';n++)h.host.frame(.05,true);
  await h.frames(2);check(h.host.state().stage==='outside'&&h.npc.actor.group.visible,'Jesse comes outside to talk');
  check(h.xp()===earned,'Guild visits do not duplicate Construction experience');
  return{ok:true,checks,quest:h.host.snapshot()};
  function checkBounded(a,b){if(distance(a,b)>.251)throw new Error('Carriage skipped a physical segment.');}
}
