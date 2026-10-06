/** Testing-mount fire. No inventory, skill, or checkpoint state belongs to this weapon. */
export const DRAGON_FIRE = Object.freeze({range:72, radius:10, damagePerSecond:2400,
  tapDuration:.75, windup:.12, pulse:.1, burnDuration:6, burnRadius:3.8, maxBurns:24});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=p=>p&&['x','y','z'].every(k=>Number.isFinite(p[k]));
const at=(o,d,t)=>({x:o.x+d.x*t,y:o.y+d.y*t,z:o.z+d.z*t});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const unit=d=>{const length=Math.hypot(d?.x,d?.y,d?.z);return length>1e-8&&Number.isFinite(length)?{x:d.x/length,y:d.y/length,z:d.z/length}:null;};

/** Capsule centre and generous body radius, without flattening airborne fire onto the ground. */
export function dragonFireContact(body,fire){
  if(!body||body.dead||body.active===false||body.action==='dead'||body.hp<=0)return null;
  const y=Number.isFinite(body.minY)&&Number.isFinite(body.maxY)?(body.minY+body.maxY)/2:body.y+(body.height??1.8)/2;
  const p={x:body.x,y,z:body.z};if(!finite(p)||!finite(fire?.origin)||!finite(fire?.direction))return null;
  const d={x:p.x-fire.origin.x,y:p.y-fire.origin.y,z:p.z-fire.origin.z};
  const along=d.x*fire.direction.x+d.y*fire.direction.y+d.z*fire.direction.z;
  const r=Math.max(.25,body.r??body.radius??.45);
  if(along<0||along>fire.range+r)return null;
  const radial=Math.sqrt(Math.max(0,d.x*d.x+d.y*d.y+d.z*d.z-along*along));
  const width=.5+(fire.radius??DRAGON_FIRE.radius)*clamp(along/DRAGON_FIRE.range,0,1);
  return radial<=width+r?{point:p,along}:null;
}

/** Stop the jet at a hillside or water surface; never ignite a valley through its ridge. */
export function traceDragonFire(origin,direction,{heightAt=()=>-Infinity,waterAt=()=>-Infinity,range=DRAGON_FIRE.range}={}){
  let previous=0;
  for(let t=0;t<=range+1;t+=1){
    const sample=Math.min(t,range),p=at(origin,direction,sample),ground=heightAt(p.x,p.z),water=waterAt(p.x,p.z);
    if(p.y<=Math.max(ground,water)+.08){
      let low=previous,high=sample;
      for(let i=0;i<6;i++){const mid=(low+high)/2,q=at(origin,direction,mid);if(q.y<=Math.max(heightAt(q.x,q.z),waterAt(q.x,q.z))+.08)high=mid;else low=mid;}
      const hit=at(origin,direction,high),wet=waterAt(hit.x,hit.z)>heightAt(hit.x,hit.z)+.15;
      return {range:high,hit,wet};
    }
    if(sample===range)break;previous=sample;
  }
  return {range,hit:null,wet:false};
}

export function createDragonFire({getBodies=()=>[],damage=()=>{},scorch=()=>{},heightAt=()=>-Infinity,
  waterAt=()=>-Infinity,clip=null,clearTo=()=>true}={}){
  let tap=0,warm=0,pulse=0,sequence=0,totalHits=0;
  let frame={active:false,intensity:0,range:DRAGON_FIRE.range,radius:DRAGON_FIRE.radius,origin:{x:0,y:0,z:0},direction:{x:0,y:0,z:1},impacts:[]};
  const burns=[];
  function stop(){tap=0;warm=0;pulse=0;frame={...frame,active:false,intensity:0,impacts:[]};}
  function reset(){stop();burns.length=0;sequence=0;totalHits=0;frame.impacts=[];}
  function press(){tap=Math.max(tap,DRAGON_FIRE.tapDuration);}
  const wantsFire=({enabled=true,held=false}={})=>enabled&&(held||tap>0);
  function ignite(point){
    const old=burns.find(b=>distance(b,point)<DRAGON_FIRE.burnRadius);
    if(old){old.left=DRAGON_FIRE.burnDuration;return;}
    if(burns.length===DRAGON_FIRE.maxBurns)burns.shift();
    burns.push({...point,id:++sequence,left:DRAGON_FIRE.burnDuration,radius:DRAGON_FIRE.burnRadius,tick:0});
  }
  function hurt(body,amount,source){damage(body,amount,source);totalHits++;}
  function update(dt,{enabled=false,held=false,playing=true,origin,direction}={}){
    dt=clamp(Number(dt)||0,0,.2);
    if(!playing){stop();return view();}
    const facing=unit(direction),active=wantsFire({enabled,held})&&finite(origin)&&!!facing;
    tap=Math.max(0,tap-dt);
    if(!active){warm=0;pulse=0;frame={...frame,active:false,intensity:0,impacts:[]};}
    else{
      warm+=dt;
      const ground=traceDragonFire(origin,facing,{heightAt,waterAt});
      const limit=clip?.(origin,facing,ground.range);
      const length=Number.isFinite(limit?.range)&&limit.range<ground.range?limit.range:ground.range;
      const hit=length<ground.range?at(origin,facing,length):ground.hit;
      const wet=length<ground.range?false:ground.wet;
      frame={active:true,intensity:clamp(warm/.22,0,1),origin:{...origin},direction:facing,
        range:Math.max(.2,length),radius:DRAGON_FIRE.radius,tipRadius:.5+DRAGON_FIRE.radius*length/DRAGON_FIRE.range,impacts:[]};
      if(warm>=DRAGON_FIRE.windup){
        pulse+=dt;
        while(pulse+1e-8>=DRAGON_FIRE.pulse){
          pulse-=DRAGON_FIRE.pulse;
          const seen=new Set();
          for(const body of getBodies()){
            const id=body.npcId??body.id;if(id==='traveler'||seen.has(id))continue;
            const contact=dragonFireContact(body,frame);
            if(!contact||!clearTo(origin,contact.point))continue;
            seen.add(id);hurt(body,DRAGON_FIRE.damagePerSecond*DRAGON_FIRE.pulse,{...frame,kind:'breath'});
          }
          scorch({...frame,radius:DRAGON_FIRE.radius*frame.range/DRAGON_FIRE.range,dt:DRAGON_FIRE.pulse});
          if(hit&&!wet){
            // Walls receive an impact bloom; only ground receives a lingering fire.
            if(Math.abs(hit.y-heightAt(hit.x,hit.z))<1)ignite({...hit,y:heightAt(hit.x,hit.z)+.12});
          }
        }
      }
      if(hit)frame.impacts.push({...hit,radius:Math.min(7,1+length*.1),wet});
    }
    let bodies=null;
    for(let i=burns.length-1;i>=0;i--){
      const burn=burns[i];burn.left-=dt;burn.tick+=dt;
      if(burn.left<=0){burns.splice(i,1);continue;}
      if(burn.tick>=.4){
        const seconds=burn.tick;burn.tick=0;bodies??=getBodies();const seen=new Set();
        for(const body of bodies){
          const id=body.npcId??body.id;if(id==='traveler'||seen.has(id)||body.hp<=0||body.dead||body.action==='dead'||body.active===false)continue;
          const p={x:body.x,y:body.y??body.minY,z:body.z};
          if(!finite(p)||distance(p,burn)>burn.radius+(body.r??.4)||!clearTo(burn,{...p,y:p.y+.8}))continue;
          seen.add(id);hurt(body,180*seconds,{origin:burn,kind:'ground-fire'});
        }
      }
    }
    return view();
  }
  function view(){return {...frame,origin:{...frame.origin},direction:{...frame.direction},
    impacts:[...frame.impacts,...burns.map(({x,y,z,radius,left,id})=>({x,y,z,radius,left,id}))],hits:totalHits,burns:burns.length};}
  return {press,wantsFire,update,stop,reset,view};
}
