import {driveWorldEncounter,clearCombatKeys} from './encounter-controls.js';
const checks=[];
const assert=(v,label)=>{if(!v)throw Error(label);checks.push(label);console.log('EXPLORATION_CHECK '+label);};
const frames=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
const fight=a=>a.practice.state().encounter;
const summary=s=>({outcome:s.outcome,time:+s.time.toFixed(2),health:s.hero.hp,allies:s.allies?.filter(a=>a.hp).length??0,killed:s.guards.filter(g=>!g.hp).length,routed:s.squad?.routed??0,allyDamage:s.squad?.damageByAllies??0,heroDamage:s.squad?.damageByHero??null});

export async function prepare(a){
  window.dispatchEvent(new Event('focus'));a.practice.finish();document.querySelector('[data-combat-exercise="allied"]').click();
  for(let i=0;i<100&&!fight(a);i++)await frames();assert(fight(a),'Allied comparison loads the existing Minora camp');
  a.look({yaw:0,pitch:.35,distance:15});
}

export async function transition(a){
  window.dispatchEvent(new Event('focus'));
  for(let i=0;i<5400&&!fight(a).outcome&&!fight(a).objective.secured;i++){driveWorldEncounter(a,fight(a));a.step(1/60);}clearCombatKeys(a);
  const s=fight(a);assert(s.objective.secured>0&&!s.outcome,'Breaking the line begins a short victory transition');
  document.dispatchEvent(new KeyboardEvent('keydown',{code:'Escape',bubbles:true,cancelable:true}));
  const frozen=fight(a);for(let i=0;i<90;i++)a.step(1/60);
  assert(fight(a).presentation.helpOpen&&fight(a).time===frozen.time,'Escape during victory pauses for help rather than throwing away the win');
  document.dispatchEvent(new KeyboardEvent('keydown',{code:'Escape',bubbles:true,cancelable:true}));
  for(let i=0;i<50;i++)a.step(1/60);
  assert(fight(a).squad.regrouped&&!fight(a).outcome,'Survivors regroup during the transition');
  assert(!document.getElementById('world-skirmish-rally-guide').hidden&&document.getElementById('world-skirmish-actions').hidden&&document.getElementById('combat-focus').hidden,'Victory is visible and obsolete fighting controls are hidden');
  window.dispatchEvent(new Event('blur'));await frames();return {checks:[...checks],state:fight(a)};
}

export async function result(a){
  window.dispatchEvent(new Event('focus'));const at={...fight(a).hero};for(let i=0;i<180&&!fight(a).outcome;i++)a.step(1/60);
  const s=fight(a);assert(s.outcome==='success'&&s.hero.x===at.x&&s.hero.z===at.z,'Victory completes without input or relocation');
  const button=document.getElementById('world-skirmish-compare');assert(button&&button.textContent.includes('Try solo'),'Result offers a direct solo comparison');
  assert(!document.getElementById('world-skirmish-result').hidden,'Victory result is readable');
  window.dispatchEvent(new Event('blur'));await frames();return {checks:[...checks],allied:summary(s)};
}

export async function compare(a){
  window.dispatchEvent(new Event('focus'));const world=a.testWorld,completed=world.loading.state().completed,runs=[];
  for(const exercise of ['solo-assault','allied','solo-assault','allied']){
    document.getElementById('world-skirmish-compare').click();a.look({yaw:0,pitch:.35,distance:15});
    assert(a.practice.state().exercise===exercise&&fight(a).hero.hp===100,exercise+' comparison starts afresh');
    assert(a.state().fieldActors.length===(exercise==='allied'?7:4),'Comparison replaces the previous formation without extra soldiers');
    const costs=[];
    for(let i=0;i<5400&&!fight(a).outcome;i++){
      const s=fight(a);driveWorldEncounter(a,s);const begun=performance.now();a.step(1/60);
      if(i>=60&&i<360)costs.push(performance.now()-begun);
    }
    clearCombatKeys(a);const s=fight(a);assert(s.outcome==='success',exercise+' wins through ordinary movement, strike and dodge');
    costs.sort((a,b)=>a-b);runs.push({exercise,...summary(s),stepCpuMedianMs:costs[Math.floor(costs.length*.5)],stepCpuP95Ms:costs[Math.floor(costs.length*.95)],sampleFrames:costs.length,render:a.renderStats()});
    assert(document.querySelectorAll('#world-skirmish-compare').length===1,'There is one comparison control after switching');
  }
  assert(world===a.testWorld&&completed===world.loading.state().completed,'All four comparisons reuse the same loaded world');
  assert(!a.save().ok&&a.store.read().data===null,'Comparison has no save capability');
  assert(!a.state().frameErrors.length,'Both assault variants and repeated transitions have no frame errors');
  window.dispatchEvent(new Event('blur'));await frames();return {checks:[...checks],runs};
}
