import { forestSegmentHit } from './forest-sightline.js';

/** Swept, aimed-at-release shafts. Cover and bodies compete for the first impact. */
export function forestBodyHit(from,to,body,radius=.06) {
  if(body.active===false||body.hp<=0||body.dead)return null;
  const dx=to.x-from.x,dy=to.y-from.y,dz=to.z-from.z,r=(body.r??.4)+radius;
  const x=from.x-body.x,z=from.z-body.z,a=dx*dx+dz*dz,b=2*(x*dx+z*dz),c=x*x+z*z-r*r;
  let near=0,far=1;
  if(a<1e-12){if(c>0)return null;}
  else{const discriminant=b*b-4*a*c;if(discriminant<0)return null;const root=Math.sqrt(discriminant);near=Math.max(near,(-b-root)/(2*a));far=Math.min(far,(-b+root)/(2*a));}
  const min=(body.minY??body.y??0)-radius,max=(body.maxY??((body.y??0)+1.9))+radius;
  if(Math.abs(dy)<1e-12){if(from.y<min||from.y>max)return null;}
  else{const low=(min-from.y)/dy,high=(max-from.y)/dy;near=Math.max(near,Math.min(low,high));far=Math.min(far,Math.max(low,high));}
  const t=Math.max(0,Math.min(1,near));
  return near<=far+1e-9&&far>=-1e-9&&near<=1+1e-9?{t,x:from.x+dx*t,y:from.y+dy*t,z:from.z+dz*t,body}:null;
}

export function createForestArrows({world,getBodies=()=>[],onHit=()=>{},onImpact=()=>{}}) {
  let arrows=[],serial=0;
  function fire({rangerId,origin,target,damage=70}) {
    const length=Math.hypot(target.x-origin.x,target.y-origin.y,target.z-origin.z);
    if(!Number.isFinite(length)||length<.01)return false;
    arrows.push({id:`elf-arrow-${++serial}`,owner:rangerId,x:origin.x,y:origin.y,z:origin.z,
      dx:(target.x-origin.x)/length,dy:(target.y-origin.y)/length,dz:(target.z-origin.z)/length,damage,travelled:0,origin:{...origin}});
    return true;
  }
  function update(dt,{paused=false}={}) {
    if(paused||!Number.isFinite(dt)||dt<=0)return;
    const distance=58*Math.min(dt,.1),bodies=getBodies();
    arrows=arrows.filter(arrow=>{
      const from={x:arrow.x,y:arrow.y,z:arrow.z},to={x:from.x+arrow.dx*distance,y:from.y+arrow.dy*distance,z:from.z+arrow.dz*distance};
      let contact=forestSegmentHit(world,from,to,{radius:.06});
      for(const body of bodies){if(body.id===arrow.owner)continue;const hit=forestBodyHit(from,to,body);if(hit&&(!contact||hit.t<contact.t))contact=hit;}
      if(contact){if(contact.body)onHit(contact.body,arrow);onImpact({...contact,arrow});return false;}
      Object.assign(arrow,to);arrow.travelled+=distance;
      return arrow.travelled<75;
    });
  }
  return {fire,update,clear(){arrows=[];},state:()=>arrows.map(a=>({...a,origin:{...a.origin}}))};
}
