// Native review cameras. They observe ordinary wildlife poses without changing animal state.
// Call after East Izol (63) is ready, with the review frozen and the traveler
// hidden at EAST_IZOL_ARRIVAL. Does not change materials or assign animal state.
export const EAST_WILDLIFE_REVIEW = Object.freeze({
  'east-izol-hare-interior': { prefix:'east-izol-central-plain-hares-', count:1, distance:2.8, pitch:.13, aim:.23 },
  'east-izol-gull-colony': { prefix:'east-izol-north-head-gulls-', count:4, distance:10.5, pitch:.24, aim:.28 },
  'east-izol-dolphin-offshore': { prefix:'east-izol-east-dolphins-', count:1, distance:9, pitch:.18, aim:.1 },
});

export function eastWildlifeReview(view, {world, westLife, seaLevel}) {
  const cfg=EAST_WILDLIFE_REVIEW[view];
  if(!cfg)return null;
  const sea=view==='east-izol-dolphin-offshore';
  const live=westLife.state().creatures.filter(a=>a.id.startsWith(cfg.prefix)).slice(0,cfg.count);
  if(live.length!==cfg.count)throw new Error(`${view}: expected ${cfg.count} actual residents, got ${live.length}`);
  if(live.some(a=>a.action==='dead'))throw new Error(`${view}: subject has developer damage; use an untouched review session`);
  const centre=()=>({x:live.reduce((s,a)=>s+a.x,0)/live.length,z:live.reduce((s,a)=>s+a.z,0)/live.length});
  const start=centre(),observer={x:start.x+45,z:start.z+30};
  const ready=()=>sea ? live[0].y>=seaLevel+.34 : live.every(a=>!a.hidden&&a.lift<.02&&a.speed<.15&&['graze','idle'].includes(a.action));
  // A resting pose / a dolphin surfacing is obtained through its normal clock,
  // never by setting action, lift, position or clock. The observer is outside
  // every flee distance but inside the existing 130 m visual reach.
  let steps=0;
  westLife.setObserver(observer);
  for(;!ready()&&steps<(sea?300:1800);steps++)westLife.update(1/30,observer,true);
  if(!ready())throw new Error(`${view}: no readable natural pose within ${steps/30} simulated seconds`);
  const target=centre();
  target.y=live.reduce((s,a)=>s+(sea?a.y:world.renderedGroundHeight(a.x,a.z)+a.lift),0)/live.length+cfg.aim;
  // The north colony is viewed from inland, with the sea beyond it. The small
  // hare and dolphin are shown in a front-quarter view so body length is clear.
  const base=cfg.count>1?0:live[0].yaw+1.15;
  let eye=null,bearing=null;
  for(const delta of [0,.3,-.3,.6,-.6]) {
    const a=base+delta,candidate={x:target.x+Math.sin(a)*cfg.distance,z:target.z+Math.cos(a)*cfg.distance,
      y:target.y+Math.tan(cfg.pitch)*cfg.distance};
    let clear=true;
    if(!sea)for(let n=1;n<=20;n++) {
      const t=n/20,x=target.x+(candidate.x-target.x)*t,z=target.z+(candidate.z-target.z)*t;
      if(world.renderedGroundHeight(x,z)>target.y+(candidate.y-target.y)*t-.1){clear=false;break;}
    }
    if(clear){eye=candidate;bearing=a;break;}
  }
  if(!eye)throw new Error(`${view}: authored close camera is occluded by ground; do not silently take a distant shot`);
  westLife.setObserver(eye);
  return {view,target,eye,bearing,pitch:cfg.pitch,distance:Math.hypot(cfg.distance,eye.y-target.y),
    simulatedSeconds:steps/30,subjects:live.map(a=>({id:a.id,x:a.x,y:a.y,z:a.z,action:a.action,lift:a.lift,hidden:a.hidden}))};
}
