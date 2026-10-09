import {availableBattleStage} from '../../simulation/battle-stages.js';
import {latestPersonalBattle} from './battle-consequences.js';
import {talethAdvice} from './taleth-correspondence.js';

// Live advice is separate from historical letters. Only already-known map
// intelligence may become a destination, and selecting it never enlists you.
export function nextCampaignOpportunity(state,scenario,armies,known=()=>true){
  const region=id=>scenario.regions.find(r=>r.id===id)?.name??id;
  const faction=id=>scenario.factions.find(f=>f.id===id)?.short??id;
  if(!state.day)return {kind:'briefing',label:'Speak to Taleth',detail:'Speak with Taleth in the tower to begin the campaign.',target:null};
  if(state.winner)return {kind:'finale',label:'Return to Taleth',detail:`${faction(state.winner)} has won. Return to the Wizard Guild lookout to conclude the campaign.`,target:null};
  const owners=Object.fromEntries(Object.entries(state.regions).map(([id,r])=>[id,r.owner]));
  const last=state.events.findLast(e=>e.type==='battle'),advice=talethAdvice(owners,last?(last.captured?last.attacker:last.defender):null);
  const personal=latestPersonalBattle(state),side=personal?.side??advice.side;
  const context=personal?`Continuing from your support for ${faction(side)}. `:'';
  const options=state.engagements.filter(b=>availableBattleStage(b)&&known(b.location));
  options.sort((a,b)=>Number(!!b.participation?.faction)-Number(!!a.participation?.faction)||a.endsOn-b.endsOn||Number(b.attacker===side)-Number(a.attacker===side)||a.id.localeCompare(b.id));
  const battle=options[0];
  if(battle){const committed=battle.participation?.faction,phase=availableBattleStage(battle);
    return {kind:'battle',side:committed??side,adviceSide:advice.side,target:{kind:'battle',id:battle.id},region:battle.region,
      label:`Track ${region(battle.region)} / resume`,
      detail:`${committed?'':context}${phase==='rally'?'Finish the assault at':'Battle open at'} ${region(battle.region)} until day ${battle.endsOn}. ${committed?`Your ${faction(committed)} detachment is waiting; earlier progress is kept.`:'Enter its boundary to choose a side.'} ${(committed??side)===battle.attacker?'Winning here can take an enemy province.':(committed??side)===battle.defender?'Holding this field prevents another reversal.':'Your final assault can decide this field.'}`};
  }
  const visible=new Map(armies.map(a=>[a.id,a]));
  const marches=state.armies.filter(a=>a.status==='marching'&&a.kind==='attack'&&a.strength>0&&(visible.get(a.id)?.route||visible.get(a.id)?.physical)&&Number.isFinite(visible.get(a.id).arrives));
  marches.sort((a,b)=>Number(b.owner===side)-Number(a.owner===side)||a.arrives-b.arrives||a.id-b.id);
  const army=marches[0];
  if(army)return {kind:'army',side,adviceSide:advice.side,target:{kind:'army',id:army.id},region:army.to,
    label:`Follow toward ${region(army.to)} / resume`,detail:`${context}${faction(army.owner)} is advancing toward ${region(army.to)}, expected day ${army.arrives}. Track the moving army and choose your own route. You choose your side at the battlefield.`};
  const nextOrders=state.day+((scenario.rules.decisionEvery-(state.day-1)%scenario.rules.decisionEvery)%scenario.rules.decisionEvery||scenario.rules.decisionEvery);
  return {kind:'regroup',side,adviceSide:advice.side,target:null,label:'Resume campaign',
    detail:`${context}No joinable battle or known attacking march is available. Armies are regrouping; the next orders are considered on day ${nextOrders}. Resume time while you ride, visit the council, or explore. A new dispatch will announce the next front.`};
}
