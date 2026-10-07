// Local bodies compose with the host's terrain movement; they never push or
// teleport another actor. Small swept steps also keep a dodge from tunnelling.
export const ENCOUNTER_BODY_GAP=1.1;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function moveEncounterBody(actor,dx,dz,bodies,terrainMove){
  let p={...actor},obstruction=null;
  const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.12));
  for(let i=0;i<count;i++){
    let sx=dx/count,sz=dz/count;
    for(const other of bodies){
      if(other===actor||other.hp<=0||other.escaped)continue;
      const nx=p.x-other.x,nz=p.z-other.z,d=Math.hypot(nx,nz);
      if(d<1e-8)continue; // Existing bad overlaps must still allow escape.
      const inward=(sx*nx+sz*nz)/d,room=Math.max(0,d-ENCOUNTER_BODY_GAP);
      if(inward < -room){const remove=inward+room;sx-=remove*nx/d;sz-=remove*nz/d;if(remove<-.0001)obstruction={kind:'body',target:other.id??null};}
    }
    const next=terrainMove(p,sx,sz);
    if(Math.hypot(next.x-p.x-sx,next.z-p.z-sz)>.0001)obstruction={kind:'terrain',target:null};
    // A terrain slide can change direction: validate its result as well. When
    // starting overlapped, allow only steps which improve that existing overlap.
    if(bodies.every(b=>b===actor||b.hp<=0||b.escaped||distance(next,b)>=Math.min(ENCOUNTER_BODY_GAP,distance(p,b))-1e-7))p={...p,...next};
  }
  return {x:p.x,z:p.z,obstruction};
}

// Steer around a body instead of repeatedly walking into its centre. This is
// used by walking soldiers, never by the hero's manual movement or dodge.
export function encounterSteering(actor,target,bodies){
  const dx=target.x-actor.x,dz=target.z-actor.z,d=Math.hypot(dx,dz)||1;
  const heading=Math.atan2(dx,dz),horizon=Math.min(d,1.4),side=(actor.id??0)%2?1:-1;
  // Check alternate short paths as a group: additive repulsion alone cancels
  // out between two escorts and strands the runner behind them.
  // Each actor keeps a passing side, so it cannot oscillate between the two
  // equally short ways around a stationary shield wall.
  const offsets=[0,.3,.6,.9,1.2,1.5,1.8,2.1,Math.PI];
  let best=null;
  for(const offset of offsets){
    const x=Math.sin(heading+offset*side),z=Math.cos(heading+offset*side);
    let penalty=0;
    for(const b of bodies){
      if(b===actor||b===target||b.hp<=0||b.escaped)continue;
      const bx=b.x-actor.x,bz=b.z-actor.z,start=Math.hypot(bx,bz),along=Math.max(0,Math.min(horizon,bx*x+bz*z));
      const clearance=Math.hypot(bx-x*along,bz-z*along),required=Math.min(1.2,start);
      penalty+=Math.max(0,required-clearance)*100;
    }
    const score=Math.cos(offset)-penalty;
    if(!best||score>best.score+1e-8)best={x,z,score};
  }
  return {x:best.x,z:best.z};
}

export function escortScreen(guard,hero,guards){
  const runner=guards.find(g=>g.role==='runner'&&g.hp>0&&!g.escaped);
  if(guard.role!=='escort'||!runner||distance(hero,runner)>8)return null;
  const d=distance(hero,runner)||1,ux=(hero.x-runner.x)/d,uz=(hero.z-runner.z)/d;
  const escorts=guards.filter(g=>g.role==='escort'&&g.hp>0&&!g.escaped),slot=escorts.indexOf(guard)-(escorts.length-1)/2;
  return {x:runner.x+ux*Math.min(2,d*.5)+uz*slot*1.6,z:runner.z+uz*Math.min(2,d*.5)-ux*slot*1.6};
}
