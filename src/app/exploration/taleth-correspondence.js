import {battleConsequence,latestPersonalBattle,councilBalance} from './battle-consequences.js';
import {LIZEEM_SCENARIO} from '../../content/scenarios/lizeem.js';
import {LOOKOUT_TOUR} from '../../content/regions/minora-frontier/lookout-tour.js';
import {commanderTurningPoint} from './commander-report.js';
import {adventureTimeLabel} from '../../experiments/day-night/opening-time-label.js';
import {openingTimelineText} from '../../experiments/day-night/opening-presentation.js';
import {roadsideReport} from './roadside-report.js';

const league=id=>id==='west'?'West Lizeem':'East Lizeem';
const name=id=>LIZEEM_SCENARIO.regions.find(r=>r.id===id)?.name??id;
const opening=()=>Object.fromEntries(LIZEEM_SCENARIO.regions.map(r=>[r.id,r.owner]));

export const TALETH_VOICE_INTRO="Teresod, it is Taleth. I can speak into your thoughts while you travel. When you hear my voice, listen when you are ready; my messages remain on your map for you to review.";
export function talethMessageStamp(report,clock){
  return clock?.sharedOpening?adventureTimeLabel(report.elapsedSeconds??report.day*60):`Day ${report.day}`;
}
// Elapsed campaigns wait through the explicit forecast on quiet ground.
// Their ordinary navigation controls must still lead home once the war ends.
export function talethFollowAvailable(opportunity,clock){
  if(!opportunity||opportunity.kind==='briefing')return false;
  if(clock?.complete)return !!clock.fullCampaign&&['finale','complete'].includes(opportunity.kind);
  if(clock?.sharedOpening&&(opportunity.kind==='regroup'&&!clock.fullCampaign||opportunity.kind==='army'&&!opportunity.target))return false;
  return true;
}
export function talethMessageNext(opportunity,clock){
  if(clock?.complete&&!clock.fullCampaign)return 'The first battle is settled. Time is held while you explore the aftermath and review what happened.';
  if(!opportunity||opportunity.kind==='briefing')return 'Speak with me at the tower when you are ready to begin. I will reach you with counsel after the fighting.';
  if(opportunity.kind==='finale')return 'Return to the Wizard Guild in Minora. Meet me at the lookout above my chamber.';
  if(opportunity.kind==='complete')return 'Our work in this war is done. I can review it with you at the guild; the people of Minora will have their own thoughts.';
  if(opportunity.kind==='regroup')return clock?.fullCampaign?'Our troops are regrouping. Choose Wait for next front to advance the map at 20×; it pauses as soon as I have a new destination for you. Close the map to cancel, or explore while the armies prepare.':clock?.sharedOpening?'The armies are regrouping. Explore while they prepare, or rest at a safe place to await the next event.':'The armies are regrouping. Explore while they prepare, or use the map to wait for the next report.';
  const directions=opportunity.detail.replace(/^Continuing from your support for [^.]+\. /,'');
  return openingTimelineText(directions+(opportunity.alternative?' There is also another front; consider my reasoning before choosing.':''),clock);
}

// Letters are derived from recorded events, in order. An old dispatch never
// borrows a later conquest or promises a mathematically optimal war outcome.
export function talethAdvice(owners,recentWinner,{side:campaignSide=null}={}){
  const counts=Object.fromEntries(['west','east'].map(id=>[id,Object.values(owners).filter(o=>o===id).length]));
  if(['west','east'].includes(campaignSide)){
    const enemy=campaignSide==='west'?'east':'west';
    const evidence=`${league(campaignSide)} holds ${counts[campaignSide]} of the four contested provinces; ${league(enemy)} holds ${counts[enemy]}.`;
    const counsel=counts[enemy]===0?'The enemy still has forces in the field. Help our troops finish the fighting.'
      :counts[campaignSide]===0?'Our armies must recover a foothold. Support their next attack when they are ready.'
      :counts[campaignSide]<counts[enemy]?'Protect our remaining ground, then help our armies recover the initiative.'
      :'Hold our gains and help our next advance end the war swiftly.';
    return {side:campaignSide,text:`${evidence} ${counsel} I will keep your next task up to date as the front changes. Spare the strength of the people wherever you can.`};
  }
  const side=counts.west===counts.east?recentWinner:counts.west>counts.east?'west':'east';
  if(!side)return {side:null,text:'Neither league has a territorial advantage. Watch the next battle before committing; another drawn-out reversal will spend lives without settling the war.'};
  const enemy=side==='west'?'east':'west';
  const frontier=LIZEEM_SCENARIO.regions.filter(r=>owners[r.id]===enemy&&r.neighbors.some(n=>owners[n]===side));
  const evidence=counts.west===counts.east?`Each league still holds ${counts.west} provinces; ${league(side)} has the latest victory, but no territorial lead.`:`${league(side)} now holds ${counts[side]} of the four contested provinces; ${league(enemy)} holds ${counts[enemy]}.`;
  return {side,text:`${evidence} ${counts[enemy]===0?`Its surviving enemies may still be in the field. Let the remaining armies resolve before calling this peace.`:`My counsel is to help ${league(side)} finish the war${frontier.length?' on the front around '+frontier.map(r=>r.name).join(' and '):''}. Use the map to find the next active battle and choose that side when you enter.`} This is my best judgment from the reported front, not a promise. You remain free to choose otherwise.`};
}

export function talethLetters(state,{side=null}={}){
  if(!state)return [];
  const owners=opening(),letters=[];let recent=null;
  for(const event of state.events){
    if(event.type==='battle'){
      const victor=event.captured?event.attacker:event.defender;
      if(!['west','east'].includes(victor))continue;
      if(event.captured)owners[event.region]=victor;recent=victor;
      const battle=state.engagements.find(b=>b.resultId===event.id),impact=battleConsequence(state,battle);
      const advice=talethAdvice(owners,recent,{side}),turningPoint=commanderTurningPoint(event);
      const recovery=event.reattackOn?` The defeated command must reorganize until at least day ${event.reattackOn} before ordering another attack here. Troops already marching can still arrive. Use that opening to defend your gains or press the next front.`:'';
      letters.push({id:event.id,day:event.day,taleth:true,battleId:battle?.id,hero:!!impact?.side,
        title:`Taleth / After ${name(event.region)}`,side:advice.side,
        summaryText:`${league(victor)} has ${event.captured?'taken':'held'} ${name(event.region)}. ${impact?.side?(impact.decisive?'Your final assault decided this field.':`Your fighting removed ${impact.intercepted+impact.rally} enemy strength.`):'The armies settled this battle without you.'}${turningPoint?' '+turningPoint:''}`,
        detail:`Teresod: ${impact?.explanation??`${league(victor)} has ${event.captured?'taken':'held'} ${name(event.region)}.`}${impact?.side?' '+(impact.duel?impact.contribution:impact.reinforcements?`Your interception removed ${impact.intercepted} enemy strength; your assault removed ${impact.rally} more.`:`Your part: ${impact.contribution.toLowerCase()}.`):' You did not take part in this battle.'} ${impact?.commanderSummary??''} ${advice.text}${recovery}`,
        facts:impact?.facts??[['Battle losses',`${league(event.attacker)}: ${event.attackLoss}; ${league(event.defender)}: ${event.defenseLoss}`]],
        note:letters.length===0?'End this war swiftly, if you can. We must preserve the people’s strength for greater troubles to come. Minora’s walls command this crossroads. When we come to terms with the victor, this city will be the seat of the new league.':'Every reversal spends strength we may soon need elsewhere. I seek an end to the war, not the ruin of either people.'});
    }else if(event.type==='roadside-result'){
      const report=roadsideReport(event,{region:name,faction:league}),advice=talethAdvice(owners,recent,{side});
      letters.push({...report,day:event.day,taleth:true,title:`Taleth / After the roadside fight`,side:side??event.faction,
        summaryText:`${event.strength===0?'You destroyed the enemy column':event.delay?'You delayed the enemy march':'Your roadside fight is over'}. ${event.removed} enemy strength was removed. No town changed hands.`,
        detail:`Teresod: ${report.detail} ${advice.text}`,
        note:letters.length===0?'End this war swiftly, if you can. We must preserve the people’s strength for greater troubles to come. I will keep your next task up to date as the armies move.':report.note});
    }else if(event.type==='battle-start'&&letters.length){
      const b=event.engagement,advice=talethAdvice(owners,recent,{side});
      letters.push({id:event.id,day:event.day,taleth:true,battleId:b.id,title:`Taleth / A new front at ${name(b.region)}`,side:advice.side,
        summaryText:`A new battle has opened at ${name(b.region)}. ${league(b.attacker)} is attacking; you can join before day ${b.endsOn}.`,
        detail:`Scouts report ${league(b.attacker)} attacking ${league(b.defender)} at ${name(b.region)}. The fighting is expected to continue until day ${b.endsOn}. ${advice.text}`,note:'Enter the marked battlefield to take part, or let the armies decide it. The choice remains yours.'});
    }else if(event.type==='victory'){
      letters.push({id:event.id,day:event.day,taleth:true,finale:true,hero:true,title:'Taleth / Return to the tower',side:event.faction,
        summaryText:`${league(event.faction)} has won the war. The united country is now the Lizeemi League. Taleth wants to see you at the tower.`,
        detail:`${league(event.faction)} has triumphed. The united country is now the Lizeemi League, under the victor's colors. Return to the Wizard Guild in Minora, Teresod. Join me at the lookout above my chamber; we will look upon the river country and reckon what your choices have changed.`,note:'Our walls command the key crossing of this country. Minora is now the ruling seat of the Lizeemi League. There is something farther east I must show you.'});
    }
  }
  // Keep the exact event time when the opening experiment uses elapsed time.
  // Legacy saves only have strategic days and retain their original labels.
  const times=new Map(state.events.filter(e=>Number.isFinite(e.elapsedSeconds)).map(e=>[e.id,e.elapsedSeconds]));
  return letters.map(letter=>times.has(letter.id)?{...letter,elapsedSeconds:times.get(letter.id)}:letter);
}

export function talethFinale(state){
  if(!['west','east'].includes(state?.winner))return [];
  const personal=state.engagements.map(b=>battleConsequence(state,b)).filter(b=>b?.side),last=latestPersonalBattle(state),decisive=personal.filter(b=>b.decisive).length;
  const roads=state.events.filter(e=>e.type==='roadside-result');
  const roadEffect=roads.length?`You ${personal.length?'also ':''}fought ${roads.length} roadside ${roads.length===1?'skirmish':'skirmishes'}, removing ${roads.reduce((n,e)=>n+e.removed,0)} enemy strength and delaying ${roads.filter(e=>e.delay).length} ${roads.filter(e=>e.delay).length===1?'march':'marches'}.`:'';
  const effect=personal.length?`You fought in ${personal.length} resolved ${personal.length===1?'battle':'battles'}; ${decisive} ${decisive===1?'was':'were'} decided by your final assaults. ${last?`Your last battle was at ${last.region}, supporting ${league(last.side)}.`:''} ${roadEffect}`
    :roads.length?`${roadEffect} The armies decided the regional battles; your encounters on the roads are kept in the Chronoscope.`
      :'You left the fighting to the armies. Their victories and losses, rather than your blade, decided this war.';
  return [
    {view:'river',title:'The river country',words:`Look along the Lizeem, Teresod: Nethereum and Ovesos, Caricas and Nesdor. ${league(state.winner)} has prevailed. The united country is now the Lizeemi League, and their war is settled. The fields must feed people again, not armies. This is why I asked for haste: greater troubles will demand the strength we have left.`},
    {view:'river',title:'What your choices changed',words:`${effect} ${state.winner==='west'?'The Mayor’s western allies now shape Minora’s policy.':'The High Priest’s eastern allies now shape Minora’s policy.'} ${councilBalance(state)}`,closing:'Our walls command the crossings. The Chronoscope keeps the full record of your battles.'},
    {view:'east',title:'Beyond the Lizeem',words:'Now look east, toward Ambron. What happened here was only one tremor in the greater realm. Remember the lives spared, as well as the battles won. Before you decide where to turn next, let me show you the countries around us.'},
    ...LOOKOUT_TOUR,
  ];
}
