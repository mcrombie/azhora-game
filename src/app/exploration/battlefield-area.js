// Crossing memory belongs to the exploration session, not the campaign save.
// A pause, map, refusal or conversation must not look like a fresh entry.
export const BATTLEFIELD_AREA=Object.freeze({radius:70,exitMargin:8});

// The map, wall and exclusion use one footprint. Sweeping the segment prevents
// fast mounts from tunnelling through the whole circle in a single frame.
export function battlefieldBoundary(battle,segments=64){
  const radius=battle.entryRadius??BATTLEFIELD_AREA.radius;
  return Array.from({length:segments},(_,i)=>({x:battle.location.x+Math.sin(i/segments*Math.PI*2)*radius,z:battle.location.z+Math.cos(i/segments*Math.PI*2)*radius}));
}
export function stopAtBattleBoundary(previous,next,battle){
  const c=battle.location,r=battle.entryRadius??BATTLEFIELD_AREA.radius;
  const px=previous.x-c.x,pz=previous.z-c.z,dx=next.x-previous.x,dz=next.z-previous.z;
  let x=next.x-c.x,z=next.z-c.z,hit=Math.hypot(x,z)<r;
  if(Math.hypot(px,pz)>=r-.001){
    const a=dx*dx+dz*dz,b=2*(px*dx+pz*dz),disc=b*b-4*a*(px*px+pz*pz-r*r);
    if(a>1e-10&&disc>=0){const t=(-b-Math.sqrt(disc))/(2*a);if(t>=0&&t<=1){x=px+dx*t;z=pz+dz*t;hit=true;}}
  }
  if(!hit)return null;
  const length=Math.hypot(x,z);if(length<1e-8){x=0;z=1;}
  // Keep the offer available at the edge, without letting the body cross it.
  const scale=(r-.0001)/Math.hypot(x,z);
  return {x:c.x+x*scale,z:c.z+z*scale};
}

export function createBattlefieldArea({radius=BATTLEFIELD_AREA.radius,exitMargin=BATTLEFIELD_AREA.exitMargin}={}){
  const crossings=new Map();let active=[],lastPosition=null;
  const distance=(battle,position)=>Math.hypot(position.x-battle.location.x,position.z-battle.location.z);
  const valid=b=>b.status==='active'&&b.id!=null&&Number.isFinite(b.location?.x)&&Number.isFinite(b.location?.z);
  function update({battles,position,enabled=true,eligible=()=>true}){
    active=battles.filter(valid);lastPosition=position;
    const ids=new Set(active.map(b=>b.id));
    for(const id of crossings.keys())if(!ids.has(id))crossings.delete(id);
    if(!Number.isFinite(position?.x)||!Number.isFinite(position?.z))return null;
    for(const battle of active){
      const d=distance(battle,position),record=crossings.get(battle.id)??{inside:false,offered:false,entries:0,distance:d};
      if(record.inside&&d>radius+exitMargin){record.inside=false;record.offered=false;}
      if(!record.inside&&d<=radius){record.inside=true;record.entries++;}
      record.distance=d;crossings.set(battle.id,record);
    }
    if(!enabled)return null;
    // If footprints overlap, offer only the nearest one at a time.
    const next=active.filter(b=>{const c=crossings.get(b.id);return c.inside&&!c.offered&&c.distance<=radius&&eligible(b);})
      .sort((a,b)=>distance(a,position)-distance(b,position))[0]??null;
    if(next)crossings.get(next.id).offered=true;
    return next;
  }
  return {update,
    suppress(id){
      const record=crossings.get(id)??{inside:true,offered:false,entries:1,distance:0};
      record.offered=true;crossings.set(id,record);
    },
    nearest(position=lastPosition,eligible=()=>true){
      if(!position)return null;
      return active.filter(b=>distance(b,position)<=radius&&eligible(b)).sort((a,b)=>distance(a,position)-distance(b,position))[0]??null;
    },
    reset(){crossings.clear();active=[];lastPosition=null;},
    state:()=>({radius,exitMargin,battles:[...crossings].map(([id,c])=>({id,...c}))})
  };
}
