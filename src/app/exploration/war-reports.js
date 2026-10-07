import {interceptionReason} from './interception-feedback.js';
// Reports describe recorded consequences; they never decide combat or ownership.
export function worldWarReports(state,scenario,known){
  const faction=id=>scenario.factions.find(f=>f.id===id)?.short??id;
  const region=id=>scenario.regions.find(r=>r.id===id)?.name??id;
  const percent=value=>`${Math.round(value*100)}%`;
  return state.engagements.filter(b=>known(b.location)).map(b=>{
    const hero=state.events.find(e=>e.type==='hero-result'&&e.battleId===b.id);
    const base={battleId:b.id,hero:!!hero};
    if(b.status==='resolved'){
      const result=state.events.find(e=>e.id===b.resultId);
      const winner=result.captured?result.attacker:result.defender;
      let detail=result.captured?`Control changed from ${faction(result.defender)} to ${faction(result.attacker)}.`:`${faction(result.defender)} kept control; the attack was repelled.`;
      detail+=` ${faction(result.attacker)} lost ${result.attackLoss} strength; ${faction(result.defender)} lost ${result.defenseLoss}.`;
      if(hero?.objective){
        const o=hero.objective;
        if(o.blocked){
          detail+=` You scattered ${o.blocked} strength of ${faction(o.targetFaction)} reinforcements before the battle; those troops are excluded from the battle losses above.`;
          const attacking=hero.faction===result.attacker,before=attacking?result.unassistedChance:1-result.unassistedChance,after=attacking?result.chance:1-result.chance;
          detail+=` Removing them changed ${faction(hero.faction)}'s chance from ${percent(before)} to ${percent(after)}.`;
          if((result.roll<result.unassistedChance)!==result.captured)detail+=' Your interception tipped the outcome in your side\'s favor.';
          else detail+=' Your interception reduced enemy strength, but did not change the winner of this battle.';
        }else detail+=` ${interceptionReason(hero.reason)} The reinforcements joined at full strength; your intervention removed no troops.`;
      }else if(hero&&hero.outcome!=='withdraw'){
        const attacking=hero.faction===result.attacker;
        const before=attacking?result.baseChance:1-result.baseChance,after=attacking?result.chance:1-result.chance;
        detail+=` Your ${hero.outcome==='success'?'skirmish victory':'setback'} changed ${faction(hero.faction)}'s chance from ${percent(before)} to ${percent(after)}.`;
        const unassistedCapture=result.defenders===0||result.roll<result.baseChance;
        if(unassistedCapture!==result.captured)detail+=hero.faction===winner?' Your intervention tipped the outcome in your side\'s favor.':' Your setback tipped the outcome against your side.';
      }else if(hero)detail+=' You withdrew; no hero bonus was applied.';
      return {...base,id:result.id,title:`${faction(winner)} ${result.captured?'captured':'held'} ${region(b.region)}`,detail};
    }
    if(hero){
      if(hero.objective){
        const o=hero.objective,title=o.blocked?`${o.blocked<o.strength?'Reinforcements weakened':'Reinforcements stopped'} at ${region(b.region)}`:hero.outcome==='withdraw'?`Withdrew from ${region(b.region)}`:`Interception failed at ${region(b.region)}`;
        const effect=o.blocked?`You scattered ${o.blocked} strength of ${faction(o.targetFaction)} reinforcements. That strength has been removed from the forces committed to this battle.`:'The reinforcement route remains open. No troops were removed; the reinforcements remain available for the regional battle.';
        const explanation=[interceptionReason(hero.reason),Number.isInteger(o.stopped)?`${o.stopped} of 3 soldiers stopped; ${o.strength-o.blocked} reinforcement strength remains available.`:''].filter(Boolean).join(' ');
        return {...base,id:hero.id,title,detail:`${explanation?explanation+' ':''}${effect} ${faction(b.defender)} still controls ${region(b.region)}. The regional battle is still underway and ends on day ${b.endsOn}.`};
      }
      const title=hero.outcome==='success'?`Skirmish won in ${region(b.region)}`:hero.outcome==='defeat'?`Driven back at ${region(b.region)}`:`Withdrew from ${region(b.region)}`;
      const effect=hero.outcome==='withdraw'?'No hero bonus will be applied.':`You fought for ${faction(hero.faction)}. Their regional battle chance ${hero.outcome==='success'?'gains up to 20':'loses up to 10'} percentage points.`;
      return {...base,id:hero.id,title,detail:`${effect} ${faction(b.defender)} still controls ${region(b.region)}. The regional battle ends on day ${b.endsOn}.`};
    }
    const opening=state.events.find(e=>e.type==='battle-start'&&e.engagement.id===b.id);
    return {...base,id:opening.id,title:`Battle underway in ${region(b.region)}`,detail:`${faction(b.attacker)} is attacking ${faction(b.defender)}. Reach the gold flag before day ${b.endsOn} to join, or let the battle unfold without you.${b.reinforcements?' You can intercept either side\'s approaching reinforcements.':''}`};
  }).sort((a,b)=>a.id-b.id);
}
