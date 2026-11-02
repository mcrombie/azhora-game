import {availableBattleStage} from '../../simulation/battle-stages.js';

// Taleth knows these two opening engagements. This is explicit intelligence,
// not a general reveal of unseen armies or later battles.
export function openingFronts(state,scenario,side){
  if(!['west','east'].includes(side)||!scenario.openingBattles?.length)return [];
  const battles=scenario.openingBattles.map(order=>state.engagements.find(b=>b.region===order.to&&b.started===(order.startsOn??0))).filter(Boolean);
  if(!battles.some(b=>b.status==='active'&&availableBattleStage(b)))return [];
  return battles.map(b=>{
    const defending=b.defender===side,place=scenario.regions.find(r=>r.id===b.region).name,active=b.status==='active'&&!!availableBattleStage(b);
    return {id:b.id,region:b.region,active,deadline:b.endsOn*60,title:`${defending?'Defend':'Attack'} ${place}`,
      detail:active?`${b.attacker==='west'?'West':'East'} Lizeem is attacking. ${defending?'Help your defenders hold the town.':'Help your army take the town.'}`:'This battle has ended. Taleth’s next advice follows the result.',
      target:{kind:'battle',id:b.id},place};
  });
}

