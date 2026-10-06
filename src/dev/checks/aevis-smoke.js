import { canStand, canSwim, waterAt, moveCharacter } from '../../gameplay/movement/game-state.js';
import { AEVIS, AEVIS_PATHS, AEVIS_GATES, AEVIS_LANDMARKS, AEVIS_WALL_EDGES, AEVIS_OUTLINE, aevisDeckHeight, inAevis } from '../../content/regions/aevis/aevis-city.js';
import { AEVIS_SOLDIERS } from '../../content/regions/aevis/aevis-soldiers.js';

/** Seal only the intended apertures for this read-only check. A dry flood-fill
 * from every outer edge must then stay outside the city: visual walls ending
 * short of the sea cannot accidentally count as a defensible land circuit. */
export function checkAevisDefenses(world) {
  const failures=[],count=AEVIS_OUTLINE.length;
  let wallSamples=0;
  const gateFrames=AEVIS_GATES.map(g=>{
    const a=AEVIS_OUTLINE[g.edge],b=AEVIS_OUTLINE[(g.edge+1)%count],len=Math.hypot(b.x-a.x,b.z-a.z);
    return {...g,ux:(b.x-a.x)/len,uz:(b.z-a.z)/len};
  });
  const aperture=(x,z)=>gateFrames.some(g=>{
    const dx=x-g.x,dz=z-g.z;
    return Math.abs(dx*g.ux+dz*g.uz)<g.width/2+2.6&&Math.abs(dx*g.uz-dz*g.ux)<AEVIS.wallThickness/2+2.2;
  });
  for(const edge of AEVIS_WALL_EDGES){
    const a=AEVIS_OUTLINE[edge],b=AEVIS_OUTLINE[(edge+1)%count],len=Math.hypot(b.x-a.x,b.z-a.z);
    for(let d=.4;d<len;d+=.6){
      const x=a.x+(b.x-a.x)*d/len,z=a.z+(b.z-a.z)*d/len;
      if(aperture(x,z))continue;
      const y=world.heightAt(x,z);wallSamples++;
      if(canStand(x,z,world,.4,y)||canSwim(x,z,world,.4,y)){
        failures.push(`Curtain ${edge} has a collision gap at ${x.toFixed(2)}, ${z.toFixed(2)}`);break;
      }
    }
  }
  const wallEdges=new Set(AEVIS_WALL_EDGES);
  const seaEnds=AEVIS_OUTLINE.filter((p,i)=>wallEdges.has(i)!==wallEdges.has((i+count-1)%count));
  if(seaEnds.length!==2)failures.push('The continuous land circuit must have exactly two coastal ends');
  for(const p of seaEnds)if(world.heightAt(p.x,p.z)>=waterAt(p.x,p.z,world))
    failures.push(`Fortification ends on dry land at ${p.x}, ${p.z}`);

  const minX=Math.floor(Math.min(...AEVIS_OUTLINE.map(p=>p.x)))-22;
  const minZ=Math.floor(Math.min(...AEVIS_OUTLINE.map(p=>p.z)))-22;
  const width=Math.ceil(Math.max(...AEVIS_OUTLINE.map(p=>p.x))-minX)+23;
  const depth=Math.ceil(Math.max(...AEVIS_OUTLINE.map(p=>p.z))-minZ)+23;
  const state=new Uint8Array(width*depth),queue=new Int32Array(width*depth);
  const passable=(ix,iz)=>{
    const slot=iz*width+ix;if(state[slot])return state[slot]!==1;
    const x=minX+ix,z=minZ+iz,y=world.heightAt(x,z);
    const yes=!aperture(x,z)&&canStand(x,z,world,.4,y);state[slot]=yes?2:1;return yes;
  };
  let read=0,write=0;
  const add=(ix,iz)=>{
    if(ix<0||iz<0||ix>=width||iz>=depth)return;
    const slot=iz*width+ix;if(state[slot]===3||!passable(ix,iz))return;
    state[slot]=3;queue[write++]=slot;
  };
  for(let x=0;x<width;x++){add(x,0);add(x,depth-1);}
  for(let z=1;z<depth-1;z++){add(0,z);add(width-1,z);}
  while(read<write){
    const slot=queue[read++],ix=slot%width,iz=Math.floor(slot/width),x=minX+ix,z=minZ+iz;
    if(inAevis(x,z)){
      failures.push(`A dry walking route bypasses the closed gates at ${x}, ${z}`);break;
    }
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=ix+dx,nz=iz+dz;
      if(nx<0||nz<0||nx>=width||nz>=depth||state[nz*width+nx]===3||!passable(nx,nz))continue;
      const mx=x+dx*.5,mz=z+dz*.5;
      if(!aperture(mx,mz)&&canStand(mx,mz,world,.4,world.heightAt(mx,mz)))add(nx,nz);
    }
  }
  if(write<10)failures.push('No usable exterior land was sampled');
  return {ok:failures.length===0,failures,wallSamples,coastalEnds:seaEnds.length,exteriorVisited:read};
}

/** Verify the new city's live streamed scenery, waterfront support and troop stands. */
export function runAevisChecks(world, npcById) {
  const checks=[];
  const check=(ok,label)=>{if(!ok)throw new Error(`Aevis: ${label}`);checks.push(label);};
  check(world.aevis.metrics.buildings>=10,'The entire bronze city has streamed');
  for(const p of [AEVIS.arrival,...AEVIS_LANDMARKS,...AEVIS_SOLDIERS]) {
    check(canStand(p.x,p.z,world,.45),`${p.id??'arrival'} has clear, supported footing`);
    if(aevisDeckHeight(p.x,p.z)===null)check(world.regionAt(p.x,p.z).id===24,`${p.id??'arrival'} belongs to Southern Ascarth`);
  }
  for(const soldier of AEVIS_SOLDIERS) {
    const actor=npcById.get(soldier.id)?.actor;
    check(!!actor?.group.getObjectByName('Avite segmented bronze cuirass'),`${soldier.id} uses the distinct bronze soldier model`);
  }
  let distance=0,maxGrade=0;
  for(const path of AEVIS_PATHS)for(const points of [path.points,[...path.points].reverse()]) {
    const pos={...points[0],y:world.heightAt(points[0].x,points[0].z)};
    for(let i=1;i<points.length;i++) {
      const target=points[i],steps=Math.ceil(Math.hypot(target.x-pos.x,target.z-pos.z)/.2);
      const dx=(target.x-pos.x)/steps,dz=(target.z-pos.z)/steps;
      for(let j=0;j<steps;j++) {
        const old={...pos};moveCharacter(pos,dx,dz,world,.45);pos.y=world.heightAt(pos.x,pos.z);
        const travel=Math.hypot(pos.x-old.x,pos.z-old.z);distance+=travel;
        if(travel>.001)maxGrade=Math.max(maxGrade,Math.abs(pos.y-old.y)/travel);
      }
      check(Math.hypot(pos.x-target.x,pos.z-target.z)<.12,`${path.id} waypoint ${i} is reachable in both directions (${pos.x.toFixed(2)},${pos.z.toFixed(2)})`);
    }
  }
  check(maxGrade<1,`Streets and waterfront approaches remain walkable (grade ${maxGrade.toFixed(3)})`);
  const defenses=checkAevisDefenses(world);
  check(defenses.ok,`Every land approach is fortified and no dry path bypasses the coastal ends: ${defenses.failures.join('; ')}`);
  return {ok:true,checks,metresWalked:Math.round(distance),maxGrade,defenses,metrics:world.aevis.metrics};
}
