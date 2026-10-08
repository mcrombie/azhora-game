// Optional, deliberate focus. No damage, movement, or automatic target switching.
export const FOCUS_RANGE=22;
export const aliveTarget=g=>g&&g.hp>0&&!g.escaped;
export function focusCandidates(hero,guards,yaw,visible=()=>true){
  const angle=g=>Math.atan2(Math.sin(Math.atan2(hero.x-g.x,hero.z-g.z)-yaw),Math.cos(Math.atan2(hero.x-g.x,hero.z-g.z)-yaw));
  return guards.filter(g=>aliveTarget(g)&&Math.hypot(g.x-hero.x,g.z-hero.z)<=FOCUS_RANGE&&Math.abs(angle(g))<Math.PI*.42&&visible(hero,g))
    .sort((a,b)=>Math.abs(angle(a))-Math.abs(angle(b))||Math.hypot(a.x-hero.x,a.z-hero.z)-Math.hypot(b.x-hero.x,b.z-hero.z)||a.id-b.id);
}
export function selectFireballTarget(origin,direction,targets,{lockedId=null,visible=()=>true,range=18}={}){
  const valid=g=>aliveTarget(g)&&Math.hypot(g.x-origin.x,g.y-origin.y,g.z-origin.z)<=range&&visible(origin,g);
  // A chosen opponent never redirects the spell to somebody else behind them.
  if(lockedId!==null)return targets.find(g=>g.id===lockedId&&valid(g))??null;
  const alignment=g=>{const dx=g.x-origin.x,dz=g.z-origin.z;return (dx*direction.x+dz*direction.z)/Math.max(.001,Math.hypot(dx,dz));};
  return targets.filter(g=>valid(g)&&alignment(g)>Math.cos(Math.PI/8)).sort((a,b)=>alignment(b)-alignment(a)||a.id-b.id)[0]??null;
}
