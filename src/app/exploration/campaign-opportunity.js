import {availableBattleStage} from '../../simulation/battle-stages.js';
import {latestPersonalBattle} from './battle-consequences.js';
import {talethAdvice} from './taleth-correspondence.js';

// Live advice is separate from historical letters. Only already-known map
// intelligence may become a destination, and selecting it never enlists you.
export function nextCampaignOpportunity(state,scenario,armies,known=()=>true,{concluded=false}={}){
  const region=id=>scenario.regions.find(r=>r.id===id)?.name??id;
  const faction=id=>scenario.factions.find(f=>f.id===id)?.short??id;
  if(!state.day)return {kind:'briefing',label:'Speak to Taleth',detail:'Speak with Taleth in the tower to begin the campaign.',target:null};
  if(state.winner)return concluded
    ?{kind:'complete',label:'Visit Taleth / optional',detail:'The Lizeemi War campaign is complete. Explore Minora, speak with its people, or visit Taleth to review your campaign and the surrounding countries. The wider regions on the chart are reference territory; this scenario still contains five playable regions.',target:null}
    :{kind:'finale',label:'Return to Taleth',detail:`${faction(state.winner)} has won. The Lizeemi League is united. Return to the Wizard Guild lookout to conclude the campaign.`,target:null};
  const owners=Object.fromEntries(Object.entries(state.regions).map(([id,r])=>[id,r.owner]));
  const last=state.events.findLast(e=>e.type==='battle'),advice=talethAdvice(owners,last?(last.captured?last.attacker:last.defender):null);
  const personal=latestPersonalBattle(state),side=personal?.side??advice.side;
  const context=personal?`Continuing from your support for ${faction(side)}. `:'';
  const battles=state.engagements.filter(b=>availableBattleStage(b)&&known(b.location));
  battles.sort((a,b)=>Number(!!b.participation?.faction)-Number(!!a.participation?.faction)||a.endsOn-b.endsOn||Number(b.attacker===side)-Number(a.attacker===side)||a.id.localeCompare(b.id));
  const visible=new Map(armies.map(a=>[a.id,a]));
  const marches=state.armies.filter(a=>a.status==='marching'&&a.kind==='attack'&&a.strength>0&&(visible.get(a.id)?.route||visible.get(a.id)?.physical)&&Number.isFinite(visible.get(a.id).arrives));
  marches.sort((a,b)=>Number(b.owner===side)-Number(a.owner===side)||a.arrives-b.arrives||a.id-b.id);
  const choices=[...battles.map(b=>{
    const committed=b.participation?.faction,chosen=committed??side,phase=availableBattleStage(b);
    return {kind:'battle',side:chosen,adviceSide:advice.side,target:{kind:'battle',id:b.id},region:b.region,committed:!!committed,
      purpose:chosen===b.attacker?'advance':chosen===b.defender?'defend':null,deadline:b.endsOn,
      label:`Track ${region(b.region)} / resume`,
      detail:`${committed?'':context}${phase==='rally'?'Finish the assault at':'Battle open at'} ${region(b.region)} until day ${b.endsOn}. ${committed?`Your ${faction(committed)} detachment is waiting; earlier progress is kept.`:'Enter its boundary to choose a side.'} ${chosen===b.attacker?'Winning here can take an enemy province.':chosen===b.defender?'Holding this field protects your gains.':'Your final assault can decide this field.'}`};
  }),...marches.map(a=>({kind:'army',side,adviceSide:advice.side,target:{kind:'army',id:a.id},region:a.to,
    purpose:a.owner===side?'advance':side?'defend':null,deadline:a.arrives,
    label:`Follow toward ${region(a.to)} / resume`,detail:`${context}${faction(a.owner)} is advancing toward ${region(a.to)}, expected day ${a.arrives}. Track the moving army and choose your own route. You choose your side at the battlefield.`}))];
  const next=choices[0];
  if(next){
    const alternative=!next.committed&&next.purpose?choices.find(o=>o.region!==next.region&&o.purpose&&o.purpose!==next.purpose):null;
    if(alternative){
      next.alternative={...alternative,label:`${alternative.purpose==='defend'?'Defend':'Advance on'} ${region(alternative.region)} / resume`};
      next.tradeoff=next.purpose==='defend'
        ?`Taleth's counsel: protect ${region(next.region)} first. You could instead support the advance on ${region(alternative.region)}; the defenders here would have to hold without you.`
        :`Taleth's counsel: advancing on ${region(next.region)} can shorten the war, but ${region(alternative.region)} ${alternative.kind==='battle'?`is fighting until day ${alternative.deadline}`:`faces an enemy arrival on day ${alternative.deadline}`}. Defending it protects your foothold.`;
    }else if(!next.committed&&next.purpose==='defend')next.tradeoff=`Taleth's counsel: hold ${region(next.region)} to protect your foothold for the next advance. Riding on leaves this field to the regional armies.`;
    else if(!next.committed&&next.purpose==='advance')next.tradeoff=`Taleth's counsel: support this offensive while it is ready. Staying behind leaves the offensive to the regional armies.`;
    if(next.tradeoff&&advice.side&&side&&advice.side!==side)next.tradeoff=`Taleth favors ${faction(advice.side)} for a swift peace. If you keep supporting ${faction(side)}: `+next.tradeoff.replace("Taleth's counsel: ",'');
    return next;
  }
  const nextOrders=state.day+((scenario.rules.decisionEvery-(state.day-1)%scenario.rules.decisionEvery)%scenario.rules.decisionEvery||scenario.rules.decisionEvery);
  return {kind:'regroup',side,adviceSide:advice.side,target:null,label:'Wait for next dispatch',
    detail:`${context}No joinable battle or known attacking march is available. Armies are regrouping; the next orders are considered on day ${nextOrders}. Wait advances up to seven days and pauses at the next known front. You can also resume normal time from the map and explore.`};
}

// Explicit player wait: use ordinary daily simulation, stopping at the first
// known opportunity. Never skip an open choice, travel the hero, or restart war.
export function waitForCampaignDispatch(session,readOpportunity){
  session.pause();let days=0,state=session.snapshot();
  while(days<7&&!state.pending&&!state.winner&&readOpportunity(state).kind==='regroup'){session.advance();days++;state=session.snapshot();}
  return {days,opportunity:readOpportunity(state)};
}
