// Limit overhead information without changing targeting, combat or warnings.
const alive=a=>a.hp>0&&!a.departed&&(!a.escaped||a.routed);
const gap=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function enemyLabelPlan(state,previousId=null){
  const nearby=state.guards.filter(alive).sort((a,b)=>gap(a,state.hero)-gap(b,state.hero)||a.id-b.id);
  const within=(id,r=22)=>nearby.find(g=>g.id===id&&gap(g,state.hero)<=r);
  const threat=g=>(!state.squad||g.targetId===-1)&&['windup','strike'].includes(g.phase)&&gap(g,state.hero)<10;
  const primary=within(state.hero.focusId)??nearby.find(threat)??within(state.hero.targetId,14)
    ??nearby.find(g=>g.open&&gap(g,state.hero)<8)??within(previousId,10)??nearby.find(g=>gap(g,state.hero)<18);
  const others=nearby.filter(g=>g!==primary&&gap(g,state.hero)<=9).sort((a,b)=>Number(threat(b))-Number(threat(a))||gap(a,state.hero)-gap(b,state.hero)).slice(0,3);
  return {primary:primary?.id??null,visible:new Set([...others.map(g=>g.id),...(primary?[primary.id]:[])])};
}
export function alliedLabelPlan(state){
  const nearby=(state.allies??[]).filter(a=>alive(a)&&gap(a,state.hero)<14);
  const captain=nearby.find(a=>a.commanderId);
  const wounded=nearby.filter(a=>a!==captain&&a.hp<(a.maxHp??70)&&gap(a,state.hero)<8)
    .sort((a,b)=>a.hp/(a.maxHp??70)-b.hp/(b.maxHp??70)).slice(0,2);
  return {captain:captain?.id??null,visible:new Set([...wounded.map(a=>a.id),...(captain?[captain.id]:[])])};
}
