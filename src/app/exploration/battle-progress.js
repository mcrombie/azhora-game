import {roadsideDebrief} from './roadside-presentation.js';
import {championFor,duelEffect} from '../../content/scenarios/lizeem-champions.js';
import {adventureTimeLabel} from '../../experiments/day-night/opening-time-label.js';
import {battleResultTime} from '../../experiments/day-night/opening-battle-time.js';
// Presentation of an existing encounter. Never awards casualties or advances time.
export function battlePhase(pending){
  if(pending.kind==='roadside')return {number:1,total:1,title:'Roadside interception',path:'Intercept the column \u2192 Return to the campaign'};
  if(pending.duel?.status==='accepted')return {number:1,total:2,title:'Champion duel',path:'Champion duel → Final assault with allies → Battle result'};
  if(pending.fieldBattleAvailable||pending.rally?.direct)return {number:1,total:1,title:'Battle',path:'Battle with allies → Battle result'};
  if(pending.rally&&pending.duel)return {number:2,total:2,title:'Final assault',path:'Challenge complete → Final assault with allies → Battle result'};
  if(pending.rally)return {number:2,total:2,title:'Final assault',path:'Interception complete → Final assault → Battle result'};
  if(pending.stage==='intercept'&&pending.reinforcements)return {number:1,total:2,title:'Intercept reinforcements',path:'Interception → Final assault → Battle result'};
  return {number:1,total:1,title:pending.reinforcements?'Intercept reinforcements':'Field skirmish',path:'Skirmish → Battle result'};
}

export function battleProgress(pending,field){
  const phase=battlePhase(pending),down=field.guards.filter(g=>!g.commanderId&&!g.hp).length;
  const left=field.guards.filter(g=>g.hp&&!g.escaped).length;
  const escaped=field.guards.filter(g=>g.escaped&&!g.routed).length+(pending.participation?.escaped??0);
  const stopped=down+(pending.rally?.stopped??pending.participation?.stopped??0);
  const detail=pending.duel?.status==='accepted'?`${championFor(pending).name} · ${field.guards[0].hp} / 200 resolve · ${Math.max(0,Math.ceil(120-field.time))}s`:pending.rally?(left?`${left} opponents remain · Break their line to win`:field.outcome==='success'?'Victory · Field secured':'Enemy line broken · Securing victory')
    :`${stopped} stopped · ${escaped} escaped · ${left} remaining`;
  return {label:`${phase.number} / ${phase.total} · ${phase.title}`,detail,path:phase.path};
}

export function phaseDebrief(pending,field,{regionName,allyName,strength,faction,clock=null}){
  if(pending.kind==='roadside')return roadsideDebrief(pending,field,clock);
  const shared=!!clock?.sharedOpening,time=shared?adventureTimeLabel(clock.elapsedSeconds):null,timing=battleResultTime(pending,clock,field.outcome);
  if(pending.duel?.status==='accepted'){
    const won=field.outcome==='success',champion=championFor(pending),enemy=pending.duel.enemy;
    const guards=Math.max(0,(pending.duel.fieldBattle?.guards??(3+Math.ceil(pending.reinforcements[enemy].strength/6)))-(won?2:0));
    return {title:won?`${champion.name} yields`:'Challenge ended',detail:won?'The captain lowers their weapon. “Enough. You have bested me; my soldiers have seen it.” The field remains contested.':'The champion holds the field. Your side can still win the assault.',facts:[['Duel',won?'Champion spared; no kills':pending.duel.armyCommander?'Your side lost 10 morale; their side gained 10':'No morale advantage'],...(pending.duel.armyCommander&&won?[["Commander",`${champion.name} retreats; your morale +20, theirs -20`]]:[]),['Final assault',`${guards} rally guards${won?' (two fell back)':''}`],...(shared?[['Time',`${time} · Held during combat`]]:[])],next:shared?'Regroup at full health and lead the assault with allies. No adventure time is skipped. Leaving keeps this result and lets you return while the battle remains active.':'Regroup at full health and lead the assault with allies. Leaving keeps this result and lets you return before the battle ends.',button:'Regroup for final assault (Enter)'};
  }
  if(!pending.participation)return null; // Legacy saves retain their original accounting.
  const phase=battlePhase(pending),down=field.guards.filter(g=>!g.commanderId&&!g.hp).length;
  if(pending.rally)return {
    title:(pending.rally.direct?'Battle':'Final assault')+(field.outcome==='success'?` won / ${regionName}`:` ended / ${regionName}`),
    detail:field.outcome==='success'?`You broke the enemy line. ${allyName} secures ${regionName}.${field.allies?.some(a=>a.hp>0)?' Surviving allies are regrouping at the standard.':''}`:'The assault ended before the enemy line broke. Your casualties count; the armies will decide who holds the field.',
    facts:[...(pending.rally.direct&&!pending.duel?[]:[[pending.duel?'Your challenge':'Your interception',pending.duel?duelEffect(pending.duel):`${pending.rally.blocked} enemy strength removed`]]),['Enemy soldiers defeated',`${(pending.rally.stopped??0)-(pending.rally.allied?.routed??0)+down} total`],...(field.squad?[["Allied soldiers",`${field.allies.filter(a=>a.hp&&!a.escaped&&!a.commanderId).length} still standing; ${(pending.rally.allied?.lost??0)+field.squad.alliesLost} lost in this assault`],[field.morale?"Other enemy retreats":"Enemy retreat",`${(pending.rally.allied?.routed??0)+field.squad.routed} routed (not counted as kills)`],["Squad contribution",`${field.squad.damageByAllies} damage by allies; ${field.squad.damageByHero} by Teresod`]]:[]),...(field.morale?[["Army commanders",[...field.guards,...(field.allies??[])].filter(a=>a.commanderId).map(a=>`${a.name}: ${!a.hp?'slain':a.routed?'retreated':'survived'}`).join('; ')],["Morale",`Your side ${field.morale.allies}; enemy ${field.morale.enemies}. ${field.morale.notice}`]]:[]),timing?.fact??['Time',`Day ${pending.day} → day ${pending.endsOn} on Continue`]],
    next:timing?.next??'Continue records the final result now. There are no extra days to wait through.',button:'Continue to campaign (Enter)'
  };
  if(phase.total===1)return {title:`Skirmish ended / ${regionName}`,detail:'The armies will resolve the battle with your recorded contribution.',facts:[['Soldiers stopped',String((pending.participation.stopped??0)+down)],...(timing?[timing.fact]:[])],next:timing?.next??`Continue to the result on day ${pending.endsOn}.`,button:'See the battle result (Enter)'};
  const stopped=(pending.participation.stopped??0)+down,escaped=(pending.participation.escaped??0)+field.guards.filter(g=>g.escaped&&!g.routed).length;
  const blocked=Math.floor(strength*stopped/pending.participation.totalGuards);
  // Mirrors the existing guard-count projection; the next pending encounter
  // supplies the authoritative formation after the result is recorded.
  const guards=3+Math.ceil((strength-blocked)/6);
  const side=faction??pending.participation.faction,enemy=side===pending.attacker?pending.defender:pending.attacker;
  const commander=side&&pending.commanders?.[enemy]?.status==='active'?pending.commanders[enemy]:null;
  return {title:`Interception complete / ${regionName}`,detail:`The reinforcement phase is over; control of ${regionName} has not changed. The final assault is your chance to decide the battle.`,
    facts:[['Reinforcements',`${stopped} stopped · ${escaped} escaped`],['Your effect',`${blocked} / ${strength} enemy strength removed`],['Next opposition',`${guards} rally guards${commander?` and ${commander.name}`:''} · Break their line to win`],...(shared?[['Time',`${time} · Held during combat`]]:[])],
    next:shared?'Regroup at full health and begin the final assault without skipping adventure time. Leaving preserves this contribution and lets you return while the battle is active.':'Regroup at full health and advance to the final assault. Leaving preserves this contribution and lets you return while the battle is active.',button:'Regroup for final assault (Enter)'};
}
