import {fieldBattleFormation} from '../../simulation/field-battle.js';

export function battleApproaches(pending,side=null){
  if(pending.kind==='roadside')return ['intercept'];
  if(pending.duel?.status==='accepted')return ['duel'];
  if(pending.rally)return ['field'];
  const normal=pending.fieldBattleAvailable?'field':'intercept';
  const enemy=side===pending.attacker?pending.defender:pending.attacker;
  const champion=pending.commanders?(side?pending.commanders[enemy]?.status==='active':Object.values(pending.commanders).some(c=>c.status==='active')):true;
  return pending.duelAvailable&&champion?[normal,'duel']:[normal];
}

export function fieldBattleBrief(pending,side){
  const formation=pending.rally?{guards:pending.rally.guards,allies:pending.rally.allied?pending.rally.allied.totalAllies-pending.rally.allied.lost:pending.rally.supportAllies}:fieldBattleFormation(pending,side);
  const enemy=side===pending.attacker?pending.defender:pending.attacker,captain=pending.commanders?.[enemy];
  return `Join ${formation.allies} allied soldiers against ${formation.guards} enemy soldiers${captain?.status==='active'?' led by '+captain.name:''}. Break the enemy line and defeat or rout any remaining enemy commander to win. This is one continuous battle; you may withdraw and return while it remains active.`;
}
