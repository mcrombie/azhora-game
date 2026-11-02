// Army identity and battle morale are campaign state, independent of the view.
export const COMMANDER_HEALTH=200;
export function attachCommander(state,army,roster=[]){
  const c=roster.find(c=>c.faction===army.owner&&c.origin===army.origin&&!state.armies.some(a=>a.commander?.id===c.id));
  if(!c)return;
  army.commander={id:c.id,name:c.name,faction:c.faction,home:c.home,status:'active',hp:COMMANDER_HEALTH};
  army.name=`${c.company} / ${c.name}`;
}
export function fieldCommanders(state,battle){
  const participants=state.armies.filter(a=>a.strength>0&&(battle.attackingIds.includes(a.id)||a.region===battle.region&&a.owner===battle.defender));
  return Object.fromEntries(participants.filter(a=>a.commander?.status==='active').map(a=>[a.owner,{...a.commander,armyId:a.id,armyName:a.name}]));
}
export function shiftBattleMorale(battle,loser,amount=20){
  if(!battle.commanders)return;
  const winner=loser===battle.attacker?battle.defender:battle.attacker;
  battle.morale??={[battle.attacker]:0,[battle.defender]:0};
  for(const [side,sign] of [[loser,-1],[winner,1]])battle.morale[side]=Math.max(-40,Math.min(40,(battle.morale[side]??0)+sign*amount));
}
export function recordCommander(state,battle,side,report){
  const c=battle.commanders?.[side];if(!c||c.status!=='active')return;
  c.hp=report.hp;c.status=report.outcome;
  const army=state.armies.find(a=>a.id===c.armyId);
  Object.assign(army.commander,{hp:c.hp,status:c.status});
  if(c.status!=='active'){
    army.commander.recoverOn=c.status==='routed'?battle.endsOn+2:null;
    shiftBattleMorale(battle,side);
  }
}
export function validateCommanderReport(battle,report,faction,outcome){
  const live=Object.entries(battle.commanders??{}).filter(([,c])=>c.status==='active');
  if(!live.length)return report===undefined||report&&Object.keys(report).length===0;
  if(!report||Object.keys(report).length!==live.length)return false;
  return live.every(([side,c])=>{
    const r=report[side];
    return r&&Object.keys(r).every(k=>['id','hp','outcome'].includes(k))&&r.id===c.id&&Number.isFinite(r.hp)&&r.hp>=0&&r.hp<=c.hp&&
      ['active','routed','slain'].includes(r.outcome)&&(r.outcome==='slain'?r.hp===0:r.hp>0)&&
      !(outcome==='success'&&side!==faction&&r.outcome==='active');
  });
}
export function recoverCommanders(state){
  for(const a of state.armies){const c=a.commander;if(!c||['slain','captured'].includes(c.status))continue;
    if(a.status==='destroyed'||a.strength<=0){c.status='captured';continue;}
    if(['ready','recovering'].includes(a.status)&&(!a.readyOn||state.day>=a.readyOn)&&c.status==='active')c.hp=COMMANDER_HEALTH;
    if(['ready','recovering'].includes(a.status)&&c.status==='routed'&&state.day>=c.recoverOn){c.status='active';c.hp=COMMANDER_HEALTH;}
  }
}
