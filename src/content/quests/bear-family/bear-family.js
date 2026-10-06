import { bodyWorld, stepToward } from '../../../gameplay/combat/bodies.js';
import { MAIN_ROAD } from '../../../world/terrain/region-world.js';
import { KAYLA_ROUTE, KAYLA_RIVER_CROSSING, KAYLA_RADIUS, kaylaMaySwim, kaylaNavigationWorld } from '../kayla/kayla.js';
import { CUB_STAND } from './cub-honey-quest.js';
import { CIRCUS_ACTS, CIRCUS_CAMP, CIRCUS_FILE, circusPerforming } from './bear-circus.js';

const phases=['waiting-race','returning','waiting-cub','roaming'];
const finite=p=>Number.isFinite(p?.x)&&Number.isFinite(p?.z)&&Math.abs(p.x)<5000&&Math.abs(p.z)<5000;
export const BEAR_HOME_ROUTE=Object.freeze([
  MAIN_ROAD[21],...KAYLA_RIVER_CROSSING.slice().reverse(),...MAIN_ROAD.slice(13,20).reverse(),
  ...KAYLA_ROUTE.slice(1,8),{x:CUB_STAND.x-2.5,z:CUB_STAND.z+2},
].map(p=>Object.freeze({x:p.x,z:p.z})));
// Version 2 adds where the rest of the circus is (src/content/quests/bear-family/bear-circus.js); a version 1 save has them in camp.
const campIds=Object.keys(CIRCUS_CAMP);
const validFamily=f=>f===undefined||!!f&&typeof f==='object'&&!Array.isArray(f)&&Object.entries(f).every(([id,p])=>campIds.includes(id)&&finite(p));
export function validateBearFamilySnapshot(s){return s===undefined||!!s&&(s.version===1||s.version===2)&&validFamily(s.family)&&phases.includes(s.phase)
  &&Number.isInteger(s.next)&&s.next>=0&&s.next<=BEAR_HOME_ROUTE.length&&finite(s.cub)
  &&(s.phase!=='waiting-race'||s.next===0)&&(!['waiting-cub','roaming'].includes(s.phase)||s.next===BEAR_HOME_ROUTE.length);}
const gap=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

/**
 * Mother and cub only resume the old honey rounds after both errands and their reunion. The rest of
 * the circus (`members`: Michael, Ava and Elle) waits in camp by the cub until then, and afterwards
 * walks in one file behind Kayla (CIRCUS_FILE), each bear following the living one ahead of it;
 * Kayla waits for whoever falls behind. Whenever the family is together and at rest, in camp or at
 * one of Kayla's stops, it puts on the show: each bear's `kaylaPose.act`, drawn by its own rig.
 */
export function createBearFamily({world,kayla,kaylaNpc=null,cub,members=[],raceComplete,cubComplete,alive=()=>true,bodies=()=>[],onChange=()=>{}}){
  const nav=bodyWorld(kaylaNavigationWorld(world)),cubPosition={x:CUB_STAND.x,z:CUB_STAND.z};
  const camp=member=>CIRCUS_CAMP[member.id]??{x:CUB_STAND.x+3,z:CUB_STAND.z+3,yaw:0};
  const spots=new Map(members.map(member=>[member.id,{x:camp(member).x,z:camp(member).z}]));
  const file=CIRCUS_FILE.map(id=>id===cub.id?cub:members.find(one=>one.id===id)).filter(Boolean);
  const where=bear=>bear===cub?cubPosition:spots.get(bear.id);
  let phase='waiting-race',next=0,clock=0;
  function placeBear(bear,speed=0,yaw){
    const at=where(bear),water=world.waterAt?.(at.x,at.z),ground=world.heightAt(at.x,at.z);
    bear.actor.group.position.set(at.x,kaylaMaySwim(at.x,at.z)&&water>ground?water-(bear.swimDepth??.38):ground,at.z);
    if(Number.isFinite(yaw))bear.actor.group.rotation.y=yaw;
    bear.kaylaMotion=speed;world.npcPositions[bear.id]={...at};
  }
  const placeCub=(speed,yaw)=>placeBear(cub,speed,yaw);
  function toCamp(){for(const member of members){Object.assign(spots.get(member.id),{x:camp(member).x,z:camp(member).z});placeBear(member,0,camp(member).yaw);}}
  function move(position,target,amount,radius,id){
    nav.setBodies(bodies()).moving(position,radius,id);
    const old={...position};stepToward(position,target,amount,nav,radius);
    return {distance:Math.hypot(position.x-old.x,position.z-old.z),yaw:Math.atan2(position.x-old.x,position.z-old.z)};
  }
  const radius=bear=>bear.radius??.45;
  /** The living bear each one follows: the one ahead of it in the file, or Kayla at the front. */
  function leaderOf(index){
    for(let i=index-1;i>=0;i--)if(alive(file[i].id))return {at:where(file[i]),r:radius(file[i])};
    return {at:kayla.model.position,r:KAYLA_RADIUS};
  }
  // Everybody in the show, and whether each is doing its act this frame.
  function perform(playing){
    const health=kayla.state?.()??{},calm=playing&&alive('kayla')&&!health.provoked&&!health.fighting;
    const onStage=calm&&circusPerforming(clock);
    let kaylaActs=false;
    const acts=new Map();
    if(onStage&&phase!=='roaming'){
      // In camp: the ones who wait there practise, and Kayla too once she is back with them.
      for(const bear of [cub,...members])acts.set(bear,true);
      kaylaActs=phase==='waiting-cub';
    }else if(onStage){
      // On the road: when Kayla rests at one of her stops, everybody near her performs.
      const state=kayla.model?.state?.()??{},resting=!!state.stop&&state.wait>0&&!state.walking&&!(state.honey>0);
      for(const bear of file)acts.set(bear,resting&&gap(where(bear),kayla.model.position)<11);
      kaylaActs=resting;
    }
    for(const bear of [cub,...members]){const act=acts.get(bear)&&alive(bear.id)?CIRCUS_ACTS[bear.id]:undefined;bear.kaylaPose=act?{act}:undefined;}
    if(kaylaNpc)kaylaNpc.kaylaPose={...kaylaNpc.kaylaPose,act:kaylaActs?CIRCUS_ACTS[kaylaNpc.id]:undefined};
  }
  function frame(dt,{playing=true}={}){
    cub.kaylaMotion=0;for(const member of members)member.kaylaMotion=0;
    if(playing&&Number.isFinite(dt)&&dt>0)clock+=Math.min(dt,.1);
    perform(playing);
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
      file.forEach((bear,index)=>{
        if(!alive(bear.id))return;
        const at=where(bear),leader=leaderOf(index),distance=gap(at,leader.at),keep=leader.r+radius(bear)+.75;
        if(distance>keep+.1){const result=move(at,leader.at,Math.min(3.1*dt,distance-keep),radius(bear),bear.id);placeBear(bear,result.distance/(dt||1),result.yaw);}
        else placeBear(bear);
      });
    }else{placeCub();for(const member of members)placeBear(member);}
  }
  function restore(s){if(!validateBearFamilySnapshot(s))return false;
    phase=s?.phase??'waiting-race';next=s?.next??0;Object.assign(cubPosition,s?.cub??CUB_STAND);placeCub();
    toCamp();for(const [id,at] of Object.entries(s?.family??{}))if(spots.has(id)){Object.assign(spots.get(id),{x:at.x,z:at.z});placeBear(members.find(one=>one.id===id));}
    return true;}
  placeCub();toCamp();
  return {frame,restore,snapshot:()=>({version:2,phase,next,cub:{...cubPosition},family:Object.fromEntries([...spots].map(([id,at])=>[id,{...at}]))}),
    get phase(){return phase;},get roaming(){return phase==='roaming';},
    get motherMayRoam(){const health=kayla.state?.()??{};
      if(!(phase==='roaming'&&raceComplete()&&cubComplete()&&alive('kayla')&&alive(cub.id)&&!health.provoked&&!health.fighting
        &&Math.hypot(kayla.model.position.x-cubPosition.x,kayla.model.position.z-cubPosition.z)<7))return false;
      // She waits for the whole file, not only the cub: nobody living is left more than a few metres behind.
      return file.every((bear,index)=>!alive(bear.id)||gap(where(bear),leaderOf(index).at)<7.5);}};
}
