import {availableBattleStage} from '../../simulation/battle-stages.js';
import {latestPersonalBattle} from './battle-consequences.js';
import {talethAdvice} from './taleth-correspondence.js';
import {roadsideOrderKey} from '../../simulation/roadside-interception.js';

// Live advice is separate from historical letters. Only already-known map
// intelligence may become a destination, and selecting it never enlists you.
export function nextCampaignOpportunity(state,scenario,armies,known=()=>true,{concluded=false,side:campaignSide=null,position=null}={}){
  const region=id=>scenario.regions.find(r=>r.id===id)?.name??id;
  const faction=id=>scenario.factions.find(f=>f.id===id)?.short??id;
  campaignSide=['west','east'].includes(campaignSide)?campaignSide:null;
  const allegiance=campaignSide?{campaignSide,side:campaignSide}:{};
  if(!state.day&&!state.engagements.length)return {...allegiance,kind:'briefing',label:'Speak to Taleth',detail:campaignSide?`Speak with Taleth in the tower about helping ${faction(campaignSide)} win the war.`:'Speak with Taleth in the tower to begin the campaign.',target:null};
  if(state.winner)return concluded
    ?{...allegiance,kind:'complete',label:'Visit Taleth / optional',detail:'The Lizeemi War campaign is complete. Explore Minora, speak with its people, or visit Taleth to review your campaign and the surrounding countries. The wider regions on the chart are reference territory; this scenario still contains five playable regions.',target:null}
    :{...allegiance,kind:'finale',label:'Return to Taleth',detail:`${faction(state.winner)} has won. The Lizeemi League is united. Return to the Wizard Guild lookout to conclude the campaign.`,target:null};
  if(campaignSide)return committedOpportunity(state,scenario,armies,known,campaignSide,region,faction,position);
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
    return {kind:'battle',side:chosen,adviceSide:advice.side,target:{kind:'battle',id:b.id},region:b.region,phase,...(b.rally?.direct?{direct:true}:{}),committed:!!committed,
      purpose:chosen===b.attacker?'advance':chosen===b.defender?'defend':null,deadline:b.endsOn,
      label:`Track ${region(b.region)} / resume`,
      detail:`${committed?'':context}${b.rally?.direct?'Rejoin the battle at':phase==='rally'?'Finish the assault at':'Battle open at'} ${region(b.region)} until day ${b.endsOn}. ${committed?`Your ${faction(committed)} detachment is waiting; earlier progress is kept.`:'Enter its boundary to choose a side.'} ${chosen===b.attacker?'Winning here can take an enemy province.':chosen===b.defender?'Holding this field protects your gains.':'Your final assault can decide this field.'}`};
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

// Campaign allegiance is fixed, but the front is not. Advice reads the current
// world every time: it neither reserves a battle nor penalizes another route.
function committedOpportunity(state,scenario,armies,known,side,region,faction,position){
  const visible=new Map(armies.map(a=>[a.id,a]));
  const choices=state.engagements.filter(b=>availableBattleStage(b)&&known(b.location)
    &&[b.attacker,b.defender].includes(side)&&(!b.participation?.faction||b.participation.faction===side)).map(b=>{
    const committed=b.participation?.faction===side,phase=availableBattleStage(b),purpose=b.defender===side?'defend':'advance';
    const reason=purpose==='defend'?`Protect ${faction(side)}'s territory and keep the road open for the next advance.`:`Taking ${region(b.region)} brings ${faction(side)} closer to ending the war.`;
    return {kind:'battle',campaignSide:side,side,adviceSide:side,target:{kind:'battle',id:b.id},region:b.region,phase,...(b.rally?.direct?{direct:true}:{}),committed,purpose,deadline:b.endsOn,reason,
      label:`Track ${region(b.region)} / resume`,
      detail:committed?`${b.rally?.direct?'Rejoin the battle':phase==='rally'?'Finish the assault':'Finish the interception'} at ${region(b.region)} before day ${b.endsOn}. Your earlier progress is kept; your ${faction(side)} detachment awaits you.`
        :`${purpose==='defend'?'Defend':'Take'} ${region(b.region)} for ${faction(side)} before day ${b.endsOn}. ${reason} Reach the marked boundary to review the battle and decide whether to join.`};
  });
  for(const a of state.armies){
    const mark=visible.get(a.id);
    if(a.status!=='marching'||a.kind!=='attack'||a.strength<=0||!(mark?.route||mark?.physical)||!Number.isFinite(mark.arrives))continue;
    // An enemy march only matters to this cause when it threatens our land.
    if(a.owner!==side&&state.regions[a.to]?.owner!==side)continue;
    const purpose=a.owner===side?'advance':'defend';
    const reason=purpose==='defend'?`${faction(a.owner)} is approaching our territory. Help the defenders hold it.`:`Join our army's advance and help bring the war to a swift end.`;
    const interceptable=purpose==='defend'&&a.roadside?.order!==roadsideOrderKey(a);
    choices.push({kind:'army',campaignSide:side,side,adviceSide:side,target:{kind:'army',id:a.id},region:a.to,purpose,deadline:mark.arrives,reason,interceptable,
      label:`Track ${region(a.to)} / resume`,
      detail:`${purpose==='defend'?'Prepare to defend':'Support the advance on'} ${region(a.to)}. ${reason} The army is expected on day ${mark.arrives}. ${interceptable?'Approach the enemy column to intercept it before arrival, or defend the battlefield when it arrives.':'Follow your own route; you can decide whether to join when the battle opens.'}`});
  }
  // Taleth has warned of the second opening attack. If its column has not
  // been sighted, mark the known destination without inventing an army position.
  for(const order of scenario.openingBattles??[]){
    if(!(order.startsOn>0)||!known(scenario.regions.find(r=>r.id===order.to).battlefield))continue;
    const army=state.armies.find(a=>a.owner===order.faction&&a.to===order.to&&a.departed===0&&a.status==='marching'&&a.strength>0);
    if(!army||choices.some(o=>o.region===order.to))continue;
    const purpose=army.owner===side?'advance':'defend';
    choices.push({kind:'army',campaignSide:side,side,adviceSide:side,target:{kind:'opening',id:order.to},region:order.to,purpose,deadline:army.arrives,departed:0,
      reason:`${faction(army.owner)} is approaching ${region(order.to)}. ${purpose==='defend'?'Prepare to help its defenders.':'Prepare to join our attack.'}`,
      label:`Track ${region(order.to)} / resume`,detail:`Head toward ${region(order.to)} before the army arrives on day ${army.arrives}. Taleth knows its destination; the column itself has not been sighted.`});
  }
  // Finish an existing commitment, then prioritize live battles by deadline.
  // Equally urgent fields favor the closer destination, not defense at any cost.
  const priority=o=>o.committed?0:o.kind==='battle'?1:2;
  const distance=o=>{const p=scenario.regions.find(r=>r.id===o.region)?.battlefield;return position&&p?Math.hypot(p.x-position.x,p.z-position.z):0;};
  choices.sort((a,b)=>priority(a)-priority(b)||a.deadline-b.deadline||distance(a)-distance(b)||String(a.target.id).localeCompare(String(b.target.id)));
  const next=choices[0];
  if(next){
    const alternative=choices.find(o=>o.region!==next.region);
    if(alternative)next.alternative={...alternative,label:`${alternative.purpose==='defend'?'Defend':'Advance on'} ${region(alternative.region)} / resume`};
    next.tradeoff=next.committed?`Taleth's counsel: finish the work you began at ${region(next.region)}. Your earlier fighting has already helped this detachment.`
      :`Taleth's counsel: ${next.purpose==='defend'?'protect':'support the advance on'} ${region(next.region)} first. ${next.reason}`;
    if(alternative)next.tradeoff+=` You may instead help at ${region(alternative.region)}; the armies will keep fighting on this front.`;
    return next;
  }
  const every=scenario.rules.decisionEvery,nextOrders=state.day+((every-(state.day-1)%every)%every||every);
  return {kind:'regroup',campaignSide:side,side,adviceSide:side,target:null,label:'Wait for next dispatch',
    reason:'Let our troops regroup before committing them again.',
    detail:`Prepare for ${faction(side)}'s next advance. There is no known battle to join. Travel, speak with the people, or rest on quiet ground to await the next report. The next command review is on day ${nextOrders}; I will give you a new destination when the front changes.`};
}

// Explicit player wait: use ordinary daily simulation, stopping at the first
// known opportunity. Never skip an open choice, travel the hero, or restart war.
export function waitForCampaignDispatch(session,readOpportunity){
  session.pause();let days=0,state=session.snapshot();
  while(days<7&&!state.pending&&!state.winner&&readOpportunity(state).kind==='regroup'){session.advance();days++;state=session.snapshot();}
  return {days,opportunity:readOpportunity(state)};
}
