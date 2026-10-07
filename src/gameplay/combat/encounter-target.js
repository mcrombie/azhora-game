export const ENCOUNTER_REACH=2.7;
export const ENCOUNTER_AIM_CONE=Math.PI/3;
export const encounterFacing=(a,b,cone=ENCOUNTER_AIM_CONE)=>Math.cos(Math.atan2(b.x-a.x,b.z-a.z)-a.heading)>=Math.cos(cone);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
// A shield-bearing body can screen a runner. Do not select or hit through it.
export function encounterClearStrike(hero,target,guards,canHit){
  if(!canHit(hero,target))return false;
  const dx=target.x-hero.x,dz=target.z-hero.z,length=dx*dx+dz*dz;
  return !guards.some(g=>{
    if(g===target||g.hp<=0||g.escaped||!length)return false;
    const t=((g.x-hero.x)*dx+(g.z-hero.z)*dz)/length;
    return t>0&&t<1&&Math.hypot(g.x-hero.x-dx*t,g.z-hero.z-dz*t)<.5;
  });
}
export function selectEncounterTarget(hero,guards,canHit=()=>true){
  const score=g=>Math.abs(Math.atan2(Math.sin(Math.atan2(g.x-hero.x,g.z-hero.z)-hero.heading),Math.cos(Math.atan2(g.x-hero.x,g.z-hero.z)-hero.heading)))+distance(hero,g)*.15;
  return guards.filter(g=>g.hp>0&&!g.escaped&&distance(hero,g)<=ENCOUNTER_REACH&&encounterFacing(hero,g)&&encounterClearStrike(hero,g,guards,canHit))
    .sort((a,b)=>{const difference=score(a)-score(b);return Math.abs(difference)>1e-8?difference:a.id-b.id;})[0]??null;
}
