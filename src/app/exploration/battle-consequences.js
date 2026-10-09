import {MINORA_COUNCIL} from '../../content/regions/minora-frontier/minora-council.js';
import {councilInfluence} from './council-state.js';

const faction=id=>id==='west'?'West Lizeem':id==='east'?'East Lizeem':id;
const regionNames={caricas:'Caricas',ovesos:'Ovesos',nethereum:'Nethereum',nesdor:'Nesdor',isareos:'Isareos'};

// Read the completed engagement and its event, not the region's later owner.
// This remains stable across subsequent conquests, Save/Continue and retries.
export function battleConsequence(state,battle){
  if(!battle||battle.status!=='resolved')return null;
  const result=state.events.find(e=>e.id===battle.resultId);
  if(!result)return null;
  const side=battle.participation?.faction??battle.rally?.faction??battle.heroResult?.faction??null;
  const winner=result.captured?result.attacker:result.defender;
  const name=regionNames[battle.region]??battle.region,decisive=result.resolution==='rally-rout';
  const intercepted=battle.heroResult?.objective?.blocked??0,rally=battle.rally?.removed??0;
  const won=side===winner,reinforcements=!!battle.reinforcements;
  const contribution=reinforcements?`${intercepted} reinforcement strength + ${rally} rally strength removed`
    :battle.heroResult?.outcome==='success'?'Skirmish won':battle.heroResult?.outcome==='defeat'?'Skirmish lost':'Withdrew from the skirmish';
  return {battleId:battle.id,eventId:result.id,region:name,side,winner,won,decisive,day:result.day,intercepted,rally,reinforcements,contribution,
    title:`${faction(winner)} ${result.captured?'captured':'held'} ${name}`,
    explanation:decisive?`You broke the enemy rally and forced their retreat. Your final assault secured this victory for ${faction(winner)}.`
      :side?`You fought for ${faction(side)}. ${faction(winner)} won when the armies resolved the remaining fighting.`:`The armies decided the battle without your intervention.`,
    facts:[['Territory',`${faction(result.defender)} → ${faction(winner)}${result.captured?'':' (held)'}`],
      ...(side?[['Your contribution',contribution]]:[]),
      ...(battle.rally?.allied?[["Assault allies",`${battle.rally.allied.lost} lost; ${battle.rally.allied.damage} damage dealt`],["Enemy routs",`${battle.rally.allied.routed} retreated; not counted as kills`]]:[]),
      ['Battle losses',`${faction(result.attacker)}: ${result.attackLoss} · ${faction(result.defender)}: ${result.defenseLoss}`],['Resolved',`Day ${result.day}`]],
    note:side&&reinforcements?'Battle losses are additional to the recorded assault and interception casualties.':'Battle losses describe the armies’ final engagement.'};
}

export function latestPersonalBattle(state){
  if(!state)return null;
  return state.engagements.map(b=>battleConsequence(state,b)).filter(b=>b?.side).sort((a,b)=>b.eventId-a.eventId)[0]??null;
}

export function councilBalance(state){
  const i=councilInfluence(state),leader=MINORA_COUNCIL[i.leader];
  if(i.settled)return `${faction(i.faction)} has won the war. ${leader.name} leads the council; the ${leader.banner} banner flies highest at the gates. Minora is the seat of the united Lizeemi League, which retains the victor's colors.`;
  if(i.faction)return `Your intervention for ${faction(i.faction)} strengthens ${leader.name}'s voice. The ${leader.banner} banner flies highest at the gates. This is provisional; the war is not over.`;
  return 'Taleth chairs the neutral council. The Wizard Guild banner flies highest, with the civic bridge and temple sun beside it.';
}

export function councilReturnHint(state){
  const influence=councilInfluence(state),leader=MINORA_COUNCIL[influence.leader];
  return `The ${leader.banner} banner leads in Minora${influence.settled?'':' for now'}. Return to hear the council, or keep exploring.`;
}

export function councilBattleResponse(id,state){
  const record=latestPersonalBattle(state);if(!record)return null;
  const c=MINORA_COUNCIL[id],wonFor=faction(record.winner),side=faction(record.side);
  let words;
  if(id==='taleth')words=record.decisive?`You chose ${side} at ${record.region}, and your final assault drove their opponents from the field. ${wonFor} held it at the end of day ${record.day}. The Chronoscope records that choice; it does not undo it.`
    :`At ${record.region}, you fought for ${side}. Your part alone did not decide the field; the armies continued the fighting. ${wonFor} prevailed on day ${record.day}. ${state.winner?'The wider war is now decided.':'One battle does not settle the whole war.'}`;
  else if(c.side===record.side)words=record.won?`Word has reached us from ${record.region}. You stood with ${side}, and ${wonFor} prevailed. ${record.decisive?'Your assault forced that retreat.':'Your effort helped our allies, even though the remaining battle was decided by their armies.'} ${id==='mayor'?'The canal houses of Ovesos will hear of it.':'My allies in Nesdor will remember your service.'}`
    :`You stood with ${side} at ${record.region}, but ${wonFor} held the field. I welcome your help, not the cost of this defeat. Our allies must recover before they can press their case again.`;
  else words=record.won?`You helped ${side} secure ${record.region}. ${id==='mayor'?'That is bitter news for my friends in Ovesos.':'My allies in Nesdor will pay for that reversal.'} I will hear you, but do not mistake hospitality for approval.`
    :`You fought against my allies at ${record.region}. ${wonFor} held the field despite your intervention. ${id==='mayor'?'I would rather you listen to the western councils before choosing your next battle.':'Hear the eastern sanctuaries before you return to the fighting.'}`;
  return {record,words,balance:councilBalance(state),detail:record.reinforcements?`Your interception removed ${record.intercepted} enemy strength; your rally assault removed ${record.rally} more.`:`Your recorded contribution: ${record.contribution.toLowerCase()}.`,
    next:id==='taleth'?'The Mayor in the riverside Hall and the High Priest in the Grand Temple will have their own answers. You may visit them, or return to the campaign.':''};
}
