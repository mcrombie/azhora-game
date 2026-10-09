// Presentation of an existing encounter. Never awards casualties or advances time.
export function battlePhase(pending){
  if(pending.rally)return {number:2,total:2,title:'Final assault',path:'Interception complete → Final assault → Battle result'};
  if(pending.stage==='intercept'&&pending.reinforcements)return {number:1,total:2,title:'Intercept reinforcements',path:'Interception → Final assault → Battle result'};
  return {number:1,total:1,title:pending.reinforcements?'Intercept reinforcements':'Field skirmish',path:'Skirmish → Battle result'};
}

export function battleProgress(pending,field){
  const phase=battlePhase(pending),down=field.guards.filter(g=>!g.hp).length;
  const left=field.guards.filter(g=>g.hp&&!g.escaped).length;
  const escaped=field.guards.filter(g=>g.escaped&&!g.routed).length+(pending.participation?.escaped??0);
  const stopped=down+(pending.rally?.stopped??pending.participation?.stopped??0);
  const detail=pending.rally?(left?`${left} guards remain · Break their line to win`:field.outcome==='success'?'Victory · Field secured':'Enemy line broken · Securing victory')
    :`${stopped} stopped · ${escaped} escaped · ${left} remaining`;
  return {label:`${phase.number} / ${phase.total} · ${phase.title}`,detail,path:phase.path};
}

export function phaseDebrief(pending,field,{regionName,allyName,strength}){
  if(!pending.participation)return null; // Legacy saves retain their original accounting.
  const phase=battlePhase(pending),down=field.guards.filter(g=>!g.hp).length;
  if(pending.rally)return {
    title:field.outcome==='success'?`Final assault won / ${regionName}`:`Final assault ended / ${regionName}`,
    detail:field.outcome==='success'?`You broke the enemy line. ${allyName} secures ${regionName}.${field.allies?.some(a=>a.hp>0)?' Surviving allies are regrouping at the standard.':''}`:'The assault ended before the enemy line broke. Your casualties count; the armies will decide who holds the field.',
    facts:[['Your interception',`${pending.rally.blocked} enemy strength removed`],['Rally guards defeated',`${(pending.rally.stopped??0)-(pending.rally.allied?.routed??0)+down} total`],...(field.squad?[["Allied soldiers",`${field.allies.filter(a=>a.hp).length} still standing; ${(pending.rally.allied?.lost??0)+field.squad.alliesLost} lost in this assault`],["Enemy retreat",`${(pending.rally.allied?.routed??0)+field.squad.routed} routed (not counted as kills)`],["Squad contribution",`${field.squad.damageByAllies} damage by allies; ${field.squad.damageByHero} by Teresod`]]:[]),['Time',`Day ${pending.day} → day ${pending.endsOn} on Continue`]],
    next:'Continue records the final result now. There are no extra days to wait through.',button:'Continue to campaign (Enter)'
  };
  if(phase.total===1)return {title:`Skirmish ended / ${regionName}`,detail:'The armies will resolve the battle with your recorded contribution.',facts:[['Soldiers stopped',String((pending.participation.stopped??0)+down)]],next:`Continue to the result on day ${pending.endsOn}.`,button:'See the battle result (Enter)'};
  const stopped=(pending.participation.stopped??0)+down,escaped=(pending.participation.escaped??0)+field.guards.filter(g=>g.escaped&&!g.routed).length;
  const blocked=Math.floor(strength*stopped/pending.participation.totalGuards);
  // Mirrors the existing guard-count projection; the next pending encounter
  // supplies the authoritative formation after the result is recorded.
  const guards=3+Math.ceil((strength-blocked)/6);
  return {title:`Interception complete / ${regionName}`,detail:`The reinforcement phase is over; control of ${regionName} has not changed. The final assault is your chance to decide the battle.`,
    facts:[['Reinforcements',`${stopped} stopped · ${escaped} escaped`],['Your effect',`${blocked} / ${strength} enemy strength removed`],['Next opposition',`${guards} rally guards · Break their line to win`]],
    next:'Regroup at full health and advance to the final assault. Leaving preserves this contribution and lets you return while the battle is active.',button:'Regroup for final assault (Enter)'};
}
