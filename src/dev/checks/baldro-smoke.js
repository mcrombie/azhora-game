import * as THREE from 'three';
import {BALDRO_KINGDOMS,BALDRO_PATHS,BALDRO_PEAKS} from '../../content/regions/baldro/baldro-world.js';
import {canStand,moveCharacter} from '../../gameplay/movement/game-state.js';
import {canWalkSlope,createClimbing,sampleClimbSurface} from '../../gameplay/movement/climbing.js';
import {shouldStartTerrainFall,createTerrainFall} from '../../gameplay/movement/terrain-fall.js';
import {travelCountries} from '../tools/testing-travel.js';

export async function runBaldroChecks(h){
  const checks=[],metrics={},saved=h.saved(),assert=(ok,label)=>{if(!ok)throw new Error(`Dwarfland: ${label}; ${JSON.stringify({checks,metrics})}`);checks.push(label);};
  h.host.restore();
  assert(!h.host.enter('west-baldro')&&!h.host.enter('east-baldro'),'Both city interiors refuse unearned entry');
  const countries=travelCountries();
  for(const k of BALDRO_KINGDOMS)assert(countries.some(c=>c.id===k.region&&c.name===k.regionName),`${k.name} is available through F8 Go anywhere`);
  metrics.scenery=h.world.baldro.stats;
  assert(metrics.scenery.trees>500&&metrics.scenery.entrances===2,'Both mountain countries have built scenery and registered vegetation');
  const wildlife=h.life.snapshot().creatures.filter(a=>BALDRO_KINGDOMS.some(k=>a.region===k.region));
  metrics.animals=wildlife.length;
  // Wildlife uses atlas names in some older habitats and ids in others.
  const residents=h.life.snapshot().creatures.filter(a=>BALDRO_KINGDOMS.some(k=>a.region===k.region||a.region===k.regionName)||a.id.startsWith('baldro-'));
  metrics.animals=residents.length;
  assert(residents.length>=40,'Persistent ground wildlife is present across the two regions');
  let samples=0;
  for(const path of BALDRO_PATHS){
    for(let i=1;i<path.points.length;i++){
      const a=path.points[i-1],b=path.points[i],length=Math.hypot(b.x-a.x,b.z-a.z),steps=Math.max(1,Math.ceil(length/.5));
      const p=new THREE.Vector3(a.x,h.world.heightAt(a.x,a.z),a.z);
      for(let n=1;n<=steps;n++){
        const x=a.x+(b.x-a.x)*n/steps,z=a.z+(b.z-a.z)*n/steps;
        if(BALDRO_KINGDOMS.some(k=>Math.hypot(x-k.gate.x,z-k.gate.z)<3.6))continue;
        moveCharacter(p,x-p.x,z-p.z,h.world,.34,{canTraverse:(ox,oz,nx,nz)=>canWalkSlope(ox,oz,nx,nz,h.world)});
        if(Math.hypot(p.x-x,p.z-z)>.65)throw new Error(`Dwarfland road blocked: ${path.id} at ${x},${z}`);
        p.y=h.world.heightAt(p.x,p.z);samples++;
      }
    }
  }
  metrics.routeSamples=samples;checks.push('All three mountain routes traverse actual rendered ground and scenery collision');
  metrics.climbs=[];
  for(const [index,k] of BALDRO_KINGDOMS.entries()){
    const peak=BALDRO_PEAKS[index?3:1],baseZ=index?-35:35;
    let climbed=null;
    // A few neighboring stands allow ordinary rock/tree scatter without fixing
    // the test to a prop's exact position. Every probe uses the rendered mesh.
    for(const [dx,dz] of [[-80,baseZ],[-65,baseZ],[-95,baseZ],[-80,baseZ+15],[-80,baseZ-15],[-65,baseZ+15],[-95,baseZ-15]]){
      const x=peak.x+dx,z=peak.z+dz,surface=sampleClimbSurface(h.world,x,z),owned=h.world.regionAt(x,z);
      if((owned?.id??owned)!==k.region||!surface.climbable||surface.slope>4)continue;
      const start={x,z,y:h.world.heightAt(x,z)},controller=createClimbing({world:h.world});
      if(!controller.grab(start,surface.yaw,{stamina:100}))continue;
      let stamina=100,xp=0,result,attached=true;
      for(let frame=0;frame<40;frame++){
        result=controller.tick(.05,{up:1,stamina});stamina-=result.staminaSpent;xp+=result.xp;
        if(result.phase!=='climbing'||Math.abs(result.position.y-h.world.heightAt(result.position.x,result.position.z))>.02){attached=false;break;}
      }
      if(!attached||result.position.y-start.y<2||stamina>=95||xp<=0)continue;
      const g=surface.gradient,up={x:x+g.x*.18,z:z+g.z*.18},down={x:x-g.x*.18,z:z-g.z*.18};
      if(canWalkSlope(x,z,up.x,up.z,h.world)||!canWalkSlope(x,z,down.x,down.z,h.world))continue;
      const fall=createTerrainFall(),falling={...start};fall.begin(falling,{drift:{x:-g.x*2,z:-g.z*2}});
      fall.tick(.1,{position:falling,moveHorizontal:(p,mx,mz)=>moveCharacter(p,mx,mz,h.world,.34),surfaceAt:(xx,zz)=>{
        const s=sampleClimbSurface(h.world,xx,zz);return {height:s.height,slope:s.slope,gradient:s.gradient,water:false};
      }});
      climbed={start,down,surface,gain:result.position.y-start.y,staminaSpent:100-stamina,xp,falling};break;
    }
    assert(!!climbed,`${k.name} rendered mountain face requires climbing and supports attached ascent`);
    assert(shouldStartTerrainFall({before:climbed.start,after:climbed.down,floor:h.world.heightAt(climbed.down.x,climbed.down.z),groundSlope:climbed.surface.slope})
      &&climbed.falling.y<climbed.start.y&&Math.hypot(climbed.falling.x-climbed.start.x,climbed.falling.z-climbed.start.z)<1,
      `${k.name} steep descent falls physically through real scenery collision`);
    metrics.climbs.push({kingdom:k.id,x:climbed.start.x,z:climbed.start.z,slope:climbed.surface.slope,gain:climbed.gain,staminaSpent:climbed.staminaSpent});
  }
  let serviceXp=0;
  for(const [index,k] of BALDRO_KINGDOMS.entries()){
    const guard=h.host.people.find(p=>p.guard&&p.hold.kingdom.id===k.id);
    await h.travel({x:guard.home.x,z:guard.home.z+1.8});
    const bodyProbe=h.player.group.position.clone();
    moveCharacter(bodyProbe,0,-3.6,h.bodyWorld);
    assert(bodyProbe.z>guard.home.z+.8,`${k.name} gatekeeper is solid in the normal player collision world`);
    h.interact();h.choose(`${k.id}-accept`);
    assert(h.host.model.view(k.id).stage==='working',`${k.name} guard offers the exterior service through normal dialogue`);
    for(const site of k.taskSites){
      const stand=[{x:site.x+2.6,z:site.z},{x:site.x-2.6,z:site.z},{x:site.x,z:site.z+2.6}].find(p=>canStand(p.x,p.z,h.world));
      assert(!!stand,`${site.name} has a clear work approach`);
      await h.travel(stand);h.interact();
      assert(h.host.model.view(k.id).repaired.includes(site.id),`${site.name} repaired through the interaction controller`);
    }
    await h.travel({x:guard.home.x,z:guard.home.z+1.8});h.interact();const beforeReport=h.xp();h.choose(`${k.id}-report`);serviceXp+=h.xp()-beforeReport;
    assert(h.host.model.canEnter(k.id),`${k.name} independently grants permission`);
    if(index===0)assert(!h.host.model.canEnter(BALDRO_KINGDOMS[1].id),'Western permission does not open the eastern city');
    h.interact();h.choose(`${k.id}-enter`);await h.frames(4);
    assert(h.host.active&&Math.abs(h.player.group.position.y-h.host.floorAt(h.player.group.position.x,h.player.group.position.z))<.02,`${k.name} uses its underground floor without surface snapping`);
    const snap=h.snapshot();assert(Math.hypot(snap.position.x-h.host.safeEntrance.x,snap.position.z-h.host.safeEntrance.z)<.1&&snap.baldro.cities[index?'east':'west'].admitted,'Saving inside preserves admission and a safe exterior position');
    const hold=h.host.holds[index],p=h.player.group.position;
    // The normal doorway and ramp are continuous at human walking increments.
    for(const stop of [{x:0,z:20},{x:0,z:0},{x:0,z:-14},{x:0,z:-37},{x:0,z:-44}]){
      const target=hold.walk.toWorld(stop),count=Math.ceil(Math.hypot(target.x-p.x,target.z-p.z)/.2);
      for(let n=0;n<count;n++)h.host.move(p,(target.x-p.x)/(count-n),(target.z-p.z)/(count-n));
      assert(Math.hypot(target.x-p.x,target.z-p.z)<.3,`${k.name} walk reaches ${stop.z<-30?'the elevated memorial':'the central hall'}`);
    }
    const stamp=JSON.stringify(h.host.snapshot());h.host.restore(h.host.snapshot());
    assert(!h.host.active&&JSON.stringify(h.host.snapshot())===stamp,'Restoring gate records never guesses an underground floor');
    const paid=h.xp();h.host.model.report(k.id);assert(h.xp()===paid,'Repeated reports do not grant experience twice');
  }
  assert(serviceXp===60,'Both useful services award exactly 60 Construction experience together');
  assert(h.saved()===saved,'Desktop playtests leave the real saved adventure untouched');
  await h.travel(BALDRO_KINGDOMS[1].arrival);
  return {ok:true,checks,metrics};
}
