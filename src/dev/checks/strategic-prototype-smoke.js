/** Native UI and real combat integration check. Strategic time advances through
 * the same buttons as manual testing. Damage uses combat's ordinary hit path. */
export async function runStrategicPrototypeChecks({prepare,model,ui,frames,readAdventure,normalSaved,combat,enterBattle,finishDamage,activeBattle,store}) {
  const checks=[];const check=(ok,text)=>{if(!ok)throw new Error(`Strategy: ${text}`);checks.push(text);};
  const press=action=>{const el=ui.element.querySelector(`[data-action="${action}"]`);check(el&&!el.disabled,`${action} control is available`);el.click();};
  const capture=async name=>{await frames(3);console.log(`STRATEGY_CAPTURE ${name}`);await frames(4);};
  await prepare();const saved=normalSaved();
  document.getElementById('test-strategic-prototype').click();await frames(3);
  const before=readAdventure();
  check(ui.active&&ui.element.querySelectorAll('[data-cell]').length===90,'F8 entry opens the real ninety-hex frontier chart');
  check(ui.element.textContent.includes('Minora')&&ui.element.textContent.includes('Caricas'),'The existing holdings and regions appear on the chart');
  press('reset');
  const initial=JSON.stringify(model.snapshot());
  press('guide-bridge');
  check(JSON.stringify(model.snapshot())===initial,'Quick start selects the crossing without issuing orders or advancing time');
  check(document.activeElement?.dataset.action==='march','Quick start brings the march control into keyboard focus');
  press('march');
  check(model.view().hour===0&&ui.element.textContent.includes('Order queued.'),'Queuing the march explains that time must advance');
  press('advance6');
  const partial=JSON.stringify(model.snapshot());press('load');
  check(JSON.stringify(model.snapshot())===partial,'Reload orders preserves partial march progress');
  for(let i=0;i<30&&!model.view().pendingBattle;i++)press('advance24');
  const pending=model.view().pendingBattle;check(!!pending,'Marching to the crossing meets the centaur raid and pauses time');
  check(JSON.stringify(readAdventure())===JSON.stringify(before),'Strategic turns do not change adventure time, map discovery, inventory or chapter state');
  await capture('chart');
  check(await enterBattle(pending),'The pending campaign battle enters a safe local clearing');await frames(12);
  check(!ui.active&&activeBattle()?.id===pending.id&&combat.state.phase==='active','The chart suspends while its encounter is active');
  check(combat.state.enemies.length===2&&combat.state.enemies.every(e=>e.kind==='centaur'&&e.hp===e.maxHp),'Two full-health generic centaurs represent the band');
  check(combat.state.allies.length===2&&combat.state.allies.every(a=>a.id.startsWith('strategy-')),'Only the two generic Imperial soldiers join the test');
  await capture('battle');
  finishDamage();await frames(8);
  check(ui.active&&!activeBattle(),'Real combat victory returns to the strategic chart');
  check(model.view().resolvedBattles.length===1&&model.view().resolvedBattles[0].outcome==='imperial-victory','The adventure victory is reconciled exactly once');
  check(!model.resolveAdventureBattle(pending.id,'imperial-victory').ok,'A repeated victory cannot award a second consequence');
  check(store.load(model).ok&&model.view().resolvedBattles.length===1,'The battle consequence survives strategic reload');
  check(JSON.stringify(readAdventure())===JSON.stringify(before),'Leaving the battle restores the original adventure and personal map');
  check(normalSaved()===saved,'Neither strategic orders nor the local battle rewrites the normal adventure file');
  ui.render();await capture('victory');ui.close();await frames(2);
  check(!ui.active,'Return to adventure closes the prototype cleanly');
  return {ok:true,checks,strategic:model.snapshot()};
}
