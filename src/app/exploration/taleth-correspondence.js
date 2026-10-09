import {battleConsequence,latestPersonalBattle,councilBalance} from './battle-consequences.js';
import {LIZEEM_SCENARIO} from '../../content/scenarios/lizeem.js';

const league=id=>id==='west'?'West Lizeem':'East Lizeem';
const name=id=>LIZEEM_SCENARIO.regions.find(r=>r.id===id)?.name??id;
const opening=()=>Object.fromEntries(LIZEEM_SCENARIO.regions.map(r=>[r.id,r.owner]));

// Letters are derived from recorded events, in order. An old dispatch never
// borrows a later conquest or promises a mathematically optimal war outcome.
export function talethAdvice(owners,recentWinner){
  const counts=Object.fromEntries(['west','east'].map(id=>[id,Object.values(owners).filter(o=>o===id).length]));
  const side=counts.west===counts.east?recentWinner:counts.west>counts.east?'west':'east';
  if(!side)return {side:null,text:'Neither league has a territorial advantage. Watch the next battle before committing; another drawn-out reversal will spend lives without settling the war.'};
  const enemy=side==='west'?'east':'west';
  const frontier=LIZEEM_SCENARIO.regions.filter(r=>owners[r.id]===enemy&&r.neighbors.some(n=>owners[n]===side));
  const evidence=counts.west===counts.east?`Each league still holds ${counts.west} provinces; ${league(side)} has the latest victory, but no territorial lead.`:`${league(side)} now holds ${counts[side]} of the four contested provinces; ${league(enemy)} holds ${counts[enemy]}.`;
  return {side,text:`${evidence} ${counts[enemy]===0?`Its surviving enemies may still be in the field. Let the remaining armies resolve before calling this peace.`:`My counsel is to help ${league(side)} finish the war${frontier.length?' on the front around '+frontier.map(r=>r.name).join(' and '):''}. Use the map to find the next active battle and choose that side when you enter.`} This is my best judgment from the reported front, not a promise. You remain free to choose otherwise.`};
}

export function talethLetters(state){
  if(!state)return [];
  const owners=opening(),letters=[];let recent=null;
  for(const event of state.events){
    if(event.type==='battle'){
      const victor=event.captured?event.attacker:event.defender;
      if(!['west','east'].includes(victor))continue;
      if(event.captured)owners[event.region]=victor;recent=victor;
      const battle=state.engagements.find(b=>b.resultId===event.id),impact=battleConsequence(state,battle);
      const advice=talethAdvice(owners,recent);
      const recovery=event.reattackOn?` The defeated command must reorganize until at least day ${event.reattackOn} before ordering another attack here. Troops already marching can still arrive. Use that opening to defend your gains or press the next front.`:'';
      letters.push({id:event.id,day:event.day,taleth:true,battleId:battle?.id,hero:!!impact?.side,
        title:`Taleth / After ${name(event.region)}`,side:advice.side,
        detail:`Teresod: ${impact?.explanation??`${league(victor)} has ${event.captured?'taken':'held'} ${name(event.region)}.`}${impact?.side?' '+(impact.reinforcements?`Your interception removed ${impact.intercepted} enemy strength; your assault removed ${impact.rally} more.`:`Your part: ${impact.contribution.toLowerCase()}.`):' You did not take part in this battle.'} ${advice.text}${recovery}`,
        facts:impact?.facts??[['Battle losses',`${league(event.attacker)}: ${event.attackLoss}; ${league(event.defender)}: ${event.defenseLoss}`]],
        note:letters.length===0?'End this war swiftly, if you can. We must preserve the people’s strength for greater troubles to come. Minora’s walls command this crossroads. When we come to terms with the victor, this city will be the seat of the new league.':'Every reversal spends strength we may soon need elsewhere. I seek an end to the war, not the ruin of either people.'});
    }else if(event.type==='battle-start'&&letters.length){
      const b=event.engagement,advice=talethAdvice(owners,recent);
      letters.push({id:event.id,day:event.day,taleth:true,battleId:b.id,title:`Taleth / A new front at ${name(b.region)}`,side:advice.side,
        detail:`Scouts report ${league(b.attacker)} attacking ${league(b.defender)} at ${name(b.region)}. The fighting is expected to continue until day ${b.endsOn}. ${advice.text}`,note:'Enter the marked battlefield to take part, or let the armies decide it. The choice remains yours.'});
    }else if(event.type==='victory'){
      letters.push({id:event.id,day:event.day,taleth:true,finale:true,hero:true,title:'Taleth / Return to the tower',side:event.faction,
        detail:`${league(event.faction)} has triumphed. The fighting between the leagues is over. Return to the Wizard Guild in Minora, Teresod. Join me at the lookout above my chamber; we will look upon the river country and reckon what your choices have changed.`,note:'Our walls command the key crossing of this country. The terms with the victor will make Minora the ruling seat of the new league. There is something farther east I must show you.'});
    }
  }
  return letters;
}

export function talethFinale(state){
  if(!['west','east'].includes(state?.winner))return [];
  const personal=state.engagements.map(b=>battleConsequence(state,b)).filter(b=>b?.side),last=latestPersonalBattle(state),decisive=personal.filter(b=>b.decisive).length;
  const effect=personal.length?`You fought in ${personal.length} resolved ${personal.length===1?'battle':'battles'}; ${decisive} ${decisive===1?'was':'were'} decided by your final assaults. ${last?`At ${last.region}, you supported ${league(last.side)}. ${last.explanation}`:''}`:'You left the fighting to the armies. Their victories and losses, rather than your blade, decided this war.';
  return [
    {view:'river',title:'The river country',words:`Look along the Lizeem, Teresod: Nethereum and Ovesos, Caricas and Nesdor. ${league(state.winner)} has prevailed, and their war is settled. The fields must feed people again, not armies. This is why I asked for haste: greater troubles will demand the strength we have left.`},
    {view:'river',title:'What your choices changed',words:`${effect} ${state.winner==='west'?'The Mayor’s western allies have prevailed.':'The High Priest’s eastern allies have prevailed.'} ${councilBalance(state)} We will come to terms with the victors. Our walls command their crossings; Minora will be the ruling seat of the new league. The victor gains the provinces, and their friends gain the louder voice in our council.`},
    {view:'east',title:'Beyond the Lizeem',words:'Now look east, toward Ambron. What happened here was only one tremor in the greater realm. Remember the lives spared, as well as the battles won. Our next concern lies in that direction.',closing:'The Lizeemi War campaign is complete. The road toward Ambron will continue in a later chapter.'},
  ];
}
