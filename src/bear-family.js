import { bodyWorld, stepToward } from './bodies.js';
import { MAIN_ROAD } from './region-world.js';
import { KAYLA_ROUTE, KAYLA_RIVER_CROSSING, kaylaMaySwim, kaylaNavigationWorld } from './kayla.js';
import { CUB_STAND } from './cub-honey-quest.js';

const phases=['waiting-race','returning','waiting-cub','roaming'];
const finite=p=>Number.isFinite(p?.x)&&Number.isFinite(p?.z)&&Math.abs(p.x)<5000&&Math.abs(p.z)<5000;
export const BEAR_HOME_ROUTE=Object.freeze([
  MAIN_ROAD[21],...KAYLA_RIVER_CROSSING.slice().reverse(),...MAIN_ROAD.slice(13,20).reverse(),
  ...KAYLA_ROUTE.slice(1,8),{x:CUB_STAND.x-2.5,z:CUB_STAND.z+2},
].map(p=>Object.freeze({x:p.x,z:p.z})));
export function validateBearFamilySnapshot(s){return s===undefined||!!s&&s.version===1&&phases.includes(s.phase)
  &&Number.isInteger(s.next)&&s.next>=0&&s.next<=BEAR_HOME_ROUTE.length&&finite(s.cub)
  &&(s.phase!=='waiting-race'||s.next===0)&&(!['waiting-cub','roaming'].includes(s.phase)||s.next===BEAR_HOME_ROUTE.length);}

/** Mother and cub only resume the old honey rounds after both errands and their reunion. */
export function createBearFamily({world,kayla,cub,raceComplete,cubComplete,alive=()=>true,bodies=()=>[],onChange=()=>{}}){
  const nav=bodyWorld(kaylaNavigationWorld(world)),cubPosition={x:CUB_STAND.x,z:CUB_STAND.z};
  let phase='waiting-race',next=0;
  function placeCub(speed=0,yaw){
    const water=world.waterAt?.(cubPosition.x,cubPosition.z),ground=world.heightAt(cubPosition.x,cubPosition.z);
    cub.actor.group.position.set(cubPosition.x,kaylaMaySwim(cubPosition.x,cubPosition.z)&&water>ground?water-.38:ground,cubPosition.z);
    if(Number.isFinite(yaw))cub.actor.group.rotation.y=yaw;
    cub.kaylaMotion=speed;world.npcPositions[cub.id]={...cubPosition};
  }
  function move(position,target,amount,radius,id){
    nav.setBodies(bodies()).moving(position,radius,id);
    const old={...position};stepToward(position,target,amount,nav,radius);
    return {distance:Math.hypot(position.x-old.x,position.z-old.z),yaw:Math.atan2(position.x-old.x,position.z-old.z)};
  }
  function frame(dt,{playing=true}={}){
    cub.kaylaMotion=0;
    const health=kayla.state?.()??{};
    if(!playing||!Number.isFinite(dt)||dt<=0||!alive('kayla')||!alive(cub.id)||health.provoked||health.fighting)return;
    dt=Math.max(0,Math.min(.1,dt));
    if(phase!=='waiting-race'&&!raceComplete())return;
    if(phase==='roaming'&&!cubComplete())return;
    if(phase==='waiting-race'&&raceComplete()){phase='returning';next=0;onChange();}
    if(phase==='returning'){
      const p=kayla.model.position,target=BEAR_HOME_ROUTE[next];
      if(target){const result=move(p,target,2.5*dt,.8,'kayla');kayla.placeExternal({...p,yaw:result.distance>.001?result.yaw:undefined,speed:result.distance/(dt||1)});
        if(Math.hypot(p.x-target.x,p.z-target.z)<.45){next++;onChange();}}
      if(next>=BEAR_HOME_ROUTE.length){phase='waiting-cub';onChange();}
    }
    if(phase==='waiting-cub'&&cubComplete()){
      const saved=kayla.snapshot();let closest=0,best=Infinity;
      KAYLA_ROUTE.forEach((p,i)=>{const d=Math.hypot(p.x-saved.position.x,p.z-saved.position.z);if(d<best){best=d;closest=i;}});
      kayla.restore({...saved,next:closest,wait:0,stop:null});phase='roaming';onChange();
    }
    if(phase==='roaming'){
      const mother=kayla.model.position,distance=Math.hypot(mother.x-cubPosition.x,mother.z-cubPosition.z);
      if(distance>2.1){const result=move(cubPosition,mother,Math.min(3.1*dt,distance-2),.45,cub.id);placeCub(result.distance/(dt||1),result.yaw);}
      else placeCub();
    }else placeCub();
  }
  function restore(s){if(!validateBearFamilySnapshot(s))return false;
    phase=s?.phase??'waiting-race';next=s?.next??0;Object.assign(cubPosition,s?.cub??CUB_STAND);placeCub();return true;}
  placeCub();
  return {frame,restore,snapshot:()=>({version:1,phase,next,cub:{...cubPosition}}),
    get phase(){return phase;},get roaming(){return phase==='roaming';},
    get motherMayRoam(){const health=kayla.state?.()??{};return phase==='roaming'&&raceComplete()&&cubComplete()&&alive('kayla')&&alive(cub.id)&&!health.provoked&&!health.fighting&&Math.hypot(kayla.model.position.x-cubPosition.x,kayla.model.position.z-cubPosition.z)<7;}};
}
