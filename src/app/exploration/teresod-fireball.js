import {FIREBALL_BASE as F} from '../../gameplay/magic/fireball-spec.js';
export const TERESOD_MANA=100;
export function validSorcerySave(s){return s===undefined||!!s&&s.version===1&&Number.isFinite(s.mana)&&s.mana>=0&&s.mana<=TERESOD_MANA&&Number.isFinite(s.rest)&&s.rest>=0&&s.rest<=4&&Number.isFinite(s.cooldown)&&s.cooldown>=0&&s.cooldown<=F.cast;}
export function createTeresodSorcery(saved){
  let mana=TERESOD_MANA,rest=0,cooldown=0,id=0,shots=[],impacts=[];
  function restore(s){if(!validSorcerySave(s))throw Error('Invalid sorcery checkpoint.');mana=s?.mana??TERESOD_MANA;rest=s?.rest??0;cooldown=s?.cooldown??0;shots=[];impacts=[];}
  restore(saved);
  function cast(origin,direction){
    if(cooldown>0)return {ok:false,reason:'Fireball is recharging.'};if(mana<F.cost)return {ok:false,reason:'Not enough mana. Let it recover.'};
    const len=Math.hypot(direction.x,direction.y??0,direction.z);if(!Number.isFinite(len)||len<.001)return {ok:false};
    mana-=F.cost;rest=4;cooldown=F.cast;shots.push({id:++id,...origin,dx:direction.x/len,dy:(direction.y??0)/len,dz:direction.z/len,travel:0});return {ok:true};
  }
  function tick(dt,{blocked=()=>false,targets=[],hit=()=>{}}={}){
    if(!Number.isFinite(dt)||dt<0||dt>.1)return;
    cooldown=Math.max(0,cooldown-dt);const idle=Math.max(0,dt-rest);rest=Math.max(0,rest-dt);mana=Math.min(TERESOD_MANA,mana+idle*4);
    impacts=impacts.map(p=>({...p,age:p.age+dt})).filter(p=>p.age<.25);
    for(const shot of [...shots]){
      const steps=Math.max(1,Math.ceil(F.speed*dt/.18)),stride=F.speed*dt/steps;let done=false;
      for(let i=0;i<steps&&!done;i++){
        shot.x+=shot.dx*stride;shot.y+=shot.dy*stride;shot.z+=shot.dz*stride;shot.travel+=stride;
        const wall=blocked(shot),target=!wall&&targets.find(t=>t.hp>0&&!t.escaped&&Math.hypot(t.x-shot.x,t.z-shot.z)<.5+F.radius&&Math.abs(t.y-shot.y)<1);
        if(wall||target||shot.travel>=F.range){if(target)hit(target.id,F.damage);impacts.push({...shot,age:0,hit:!!target});done=true;}
      }
      if(done)shots=shots.filter(s=>s!==shot);
    }
  }
  return {cast,tick,restore,clear(){shots=[];impacts=[];},snapshot:()=>({version:1,mana,rest,cooldown}),state:()=>({mana,max:TERESOD_MANA,cost:F.cost,cooldown,shots:shots.map(s=>({...s})),impacts:impacts.map(s=>({...s}))})};
}
