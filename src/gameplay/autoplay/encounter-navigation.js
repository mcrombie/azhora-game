import {encounterBodyGap} from '../combat/encounter-space.js';

// The director only chooses ordinary inputs. Check the whole intended step,
// including its body width, before committing to a dodge near water or crowds.
export function clearEncounterDirection(hero,preferred,bodies,navigation={},distance=1.2){
  const {canOccupy,canTraverse,directions}=navigation;
  if(!canOccupy&&!canTraverse)return preferred;
  const length=Math.hypot(preferred.x,preferred.z);
  if(!length)return {x:0,z:0};
  const p={x:preferred.x/length,z:preferred.z/length},heading=Math.atan2(p.x,p.z);
  const candidates=directions??[0,.4,-.4,.8,-.8,Math.PI/2,-Math.PI/2,2.35,-2.35,Math.PI].map(a=>({x:Math.sin(heading+a),z:Math.cos(heading+a)}));
  const radius=hero.bodyRadius??.55;
  // Match the actual ground footprint along the swept path. The larger landing
  // margin must not forbid an inward escape from an already narrow bank edge.
  const terrainRadius=navigation.terrainRadius??radius;
  let best=null;
  for(const direction of candidates){
    const end={x:hero.x+direction.x*distance,z:hero.z+direction.z*distance};
    if(canOccupy&&!canOccupy(end,Math.max(radius,terrainRadius)))continue;
    if(canTraverse&&!canTraverse(hero,end,terrainRadius))continue;
    let valid=true;
    const steps=Math.max(1,Math.ceil(distance/.18));
    for(let step=1;step<=steps&&valid;step++){
      const at={x:hero.x+(end.x-hero.x)*step/steps,z:hero.z+(end.z-hero.z)*step/steps};
      if(canOccupy&&!canOccupy(at,terrainRadius)){valid=false;break;}
      valid=bodies.every(b=>b===hero||b.hp<=0||b.escaped||Math.hypot(at.x-b.x,at.z-b.z)>=Math.min(encounterBodyGap(hero,b)+.08,Math.hypot(hero.x-b.x,hero.z-b.z))-1e-6);
    }
    if(!valid)continue;
    const score=direction.x*p.x+direction.z*p.z;
    if(!best||score>best.score+1e-8)best={...direction,score};
  }
  return best?{x:best.x,z:best.z}:{x:0,z:0};
}

// Native recording inputs use eight keyboard directions. Evaluate those exact
// bearings, rather than rounding a safe analogue direction toward a riverbank.
export function encounterKeyboardDirections(yaw){
  return Array.from({length:8},(_,i)=>{const angle=yaw+i*Math.PI/4;return {x:Math.sin(angle),z:Math.cos(angle)};});
}
