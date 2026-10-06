import { GROVE_ROUTE, GROVE_LOOP, GROVE_WOOD, GROVE_WILDLIFE, GROVE_PROTECTION } from '../../content/regions/ibenwood/ibenwood-pilot.js';
import { canStand, canSwim } from '../../gameplay/movement/game-state.js';
export async function runIbenwoodChecks(h){
  const checks=[],check=(ok,label)=>{if(!ok)throw new Error(`Ibenwood: ${label}`);checks.push(label);};
  const position=()=>h.player.group.position, gap=p=>Math.hypot(position().x-p.x,position().z-p.z);
  h.prepare();await h.frames(2);const saved=h.saved();h.open();await h.frames(2);
  const button=document.getElementById('test-ibenwood');button.closest('details')?.setAttribute('open','');
  check(button.getClientRects().length>0,'The partial grove destination is visible in F8');h.enter();await h.frames(5);
  check(h.state().testingEnabled&&h.state().mode==='playing','F8 starts an isolated ordinary walking session');
  check(gap(GROVE_ROUTE[0])<.1&&canStand(position().x,position().z,h.world),'Public arrival is grounded and collision-free');
  async function walk(target){
    const end=performance.now()+25000;h.press('KeyW');
    try{while(gap(target)>.4){if(performance.now()>end)throw new Error(`Ibenwood route stalled at ${JSON.stringify(target)}, ${position().toArray()}`);
      h.face(Math.atan2(target.x-position().x,target.z-position().z));await h.frames(1);}}
    finally{h.release('KeyW');}
    check(canStand(position().x,position().z,h.world,.34,position().y),'Ordinary held movement reached a route waypoint');
  }
  for(const p of GROVE_ROUTE.slice(1))await walk(p);
  for(const p of [...GROVE_LOOP].reverse().slice(1))await walk(p);
  for(const tree of h.world.ibenwood.trees){check(!h.wood.canChop(tree.id,()=>true).ok&&h.wood.canChop(tree.id,()=>true).reason===GROVE_PROTECTION,'Living tree protection uses the harvesting API');}
  const animals=h.westLife.state().creatures.filter(a=>GROVE_WILDLIFE.some(zone=>a.id.startsWith(`${zone.id}-`)));
  check(animals.length===8&&animals.some(a=>a.species==='boar')&&animals.some(a=>a.species==='red-deer'),'Persistent birds and ground mammals are instantiated');
  const branch=GROVE_WOOD[0];h.warp(branch);await h.frames(3);const before=h.inventory.count('forest-stick');h.press('KeyF');h.release('KeyF');await h.frames(3);
  check(h.inventory.count('forest-stick')>before&&h.woodlandLife.state().sticks.find(s=>s.id===branch.id).collected,'F gathers a fallen branch through the existing pickup system');
  const gathered=h.inventory.count('forest-stick');check(h.save(),'Pilot session can save its atlas position and new gathered-wood IDs');
  h.warp(GROVE_ROUTE[0]);check(h.reload(),'Pilot session checkpoint reloads');await h.frames(3);
  check(gap(branch)<.2&&h.inventory.count('forest-stick')===gathered&&h.woodlandLife.state().sticks.find(s=>s.id===branch.id).collected,'Reload restores the pilot position and collected branch without duplication');
  check(h.saved()===saved,'The pilot leaves the normal checkpoint unchanged');
  const forest=h.world.ibenwoodForest;
  const visits=[];
  for(const name of Object.keys(forest.arrivals)) {
    h.open();await h.frames(1);
    const select=document.getElementById('test-country');select.value=name;select.dispatchEvent(new Event('change'));
    document.getElementById('test-place').value='0';document.getElementById('test-goto').click();await h.frames(3);
    check(h.world.regionAt(position().x,position().z).name===name&&canStand(position().x,position().z,h.world),'F8 reaches every Ibenwood region on clear ground');
    visits.push({name,position:position().toArray()});
  }
  const forestAnimals=h.westLife.state().creatures.filter(a=>a.id.startsWith('ibenwood-woods-'));
  check(new Set(forestAnimals.map(a=>a.region)).size===5,'Ground wildlife lives in all five forests');
  check(forest.metrics.trees>15000&&forest.metrics.wildTreesPerHectare>forest.metrics.groveTreesPerHectare*3,'Wild forest is materially denser than grove clearings');
  for(const route of forest.walkRoutes.filter(r=>r.id.endsWith('canopy-loop'))) {
    h.warp(route.points[0]);await h.frames(3);
    await walk(route.points[1]);await walk(route.points[2]);
    const top={x:position().x,y:position().y,z:position().z};
    check(top.y>h.world.heightAt(top.x,top.z)+5,'Ordinary movement reaches the high canopy');
    check(h.save(),'Canopy position saves');h.warp(route.points[0]);check(h.reload(),'Canopy checkpoint reloads');await h.frames(3);
    check(Math.abs(position().y-top.y)<.3,'Reload returns to the canopy rather than the ground below');
    await walk(route.points[3]);
    const deck=route.points[1],end=route.points[2],under={x:(deck.x+end.x)/2,z:(deck.z+end.z)/2};
    h.warp(under);await h.frames(3);
    check(Math.abs(position().y-h.world.heightAt(under.x,under.z))<.15,'The same bridge can be walked underneath');
  }
  for(const profile of h.world.ibenwoodRivers.profiles) {
    const p=profile.samples[Math.floor(profile.samples.length/2)],wet=h.world.waterAt(p.x,p.z);
    check(wet>h.world.heightAt(p.x,p.z)+.3&&canSwim(p.x,p.z,h.world),'Both atlas river courses have open swimmable beds');
  }
  const forestBranch=h.woodlandLife.state().sticks.find(s=>s.id.startsWith('ibenwood-branch-'));
  check(!!forestBranch,'The wider forest has collectible fallen branches');h.warp(forestBranch);await h.frames(3);
  const stickCount=h.inventory.count('forest-stick');h.press('KeyF');h.release('KeyF');await h.frames(3);
  check(h.inventory.count('forest-stick')===stickCount+1,'F collects a regional fallen branch');
  check(h.save(),'Regional fallen wood saves');h.warp(GROVE_ROUTE[0]);check(h.reload(),'Regional fallen wood reloads');await h.frames(3);
  check(h.woodlandLife.state().sticks.find(s=>s.id===forestBranch.id).collected,'Regional branch remains collected on reload');
  check(h.saved()===saved,'Regional travel and canopy saves leave the normal checkpoint unchanged');

  check(!h.state().frameErrors?.count,'No renderer frame errors');
  h.review('ibenwood-player');await h.frames(8);
  const state=h.state();return {ok:true,checks:[...new Set(checks)],forest:forest.metrics,visits,trees:h.world.ibenwood.metrics,animals:animals.map(a=>({id:a.id,species:a.species})),state:{mode:state.mode,testingEnabled:state.testingEnabled,region:state.region,position:state.position,frameErrors:state.frameErrors,drawCalls:state.drawCalls,triangles:state.triangles,averageFrameMs:state.averageFrameMs}};
}
