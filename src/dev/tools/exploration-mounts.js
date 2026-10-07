import {createMountedPresentation} from './mounted-presentation.js';
import {createHorse} from '../../content/characters/characters.js';
// Appearance only: no bat quest, host, rewards or progression is constructed.
import {createBatman} from '../../content/quests/batman/batman-model.js';
import {createDeveloperDragon} from './developer-dragon-model.js';
import {createDeveloperBat,DEVELOPER_BAT} from './developer-bat.js';
import {RIDE,DEVELOPER_HORSE_SPEED} from '../../gameplay/movement/riding.js';
import {canStand,getMovementInput} from '../../gameplay/movement/locomotion.js';

export function createExplorationMounts({scene,actor,position,world,movement}){
  const presentation=createMountedPresentation();let lastDraw;
  const models={};let kind='foot',heading=Math.PI,bank=0;
  const flight=createDeveloperBat({heightAt:(x,z)=>Math.max(world.heightAt(x,z),world.waterAt(x,z)),bounds:world.bounds,
    canLand:(x,z)=>world.readyAt(x,z)&&canStand(x,z,world,.62)});
  const airborne=()=>kind==='bat'||kind==='dragon';
  function model(name){
    if(!models[name]){models[name]=name==='horse'?createHorse({saddled:true}):name==='bat'?createBatman():createDeveloperDragon();scene.add(models[name].group);}
    return models[name];
  }
  function reset(){presentation.reset();lastDraw=undefined;flight.cancel();kind='foot';bank=0;for(const m of Object.values(models))m.group.visible=false;movement.reset(heading);}
  function select(name){
    if(!['foot','horse','bat','dragon'].includes(name))return {ok:false,reason:'Unknown mount.'};
    if(name==='foot')return land();
    if(name==='horse'&&(airborne()||!movement.state().grounded||!canStand(position.x,position.z,world,RIDE.radius)))
      return {ok:false,reason:'Land on open, dry ground before mounting the horse.'};
    if(name!=='horse'&&!airborne()){flight.start(position,actor.group.rotation.y);Object.assign(position,flight.view().position);}
    model(name);for(const [id,m] of Object.entries(models))m.group.visible=id===name;
    presentation.reset();lastDraw=undefined;kind=name;heading=actor.group.rotation.y;bank=0;return {ok:true};
  }
  function land(){
    if(airborne())return flight.requestLanding();
    if(kind==='foot')return {ok:true};
    reset();return {ok:true};
  }
  function step(keys,yaw,dt){
    if(!airborne())return movement.step(keys,yaw,dt,kind==='horse'?{walk:RIDE.walk*DEVELOPER_HORSE_SPEED,run:RIDE.canter*DEVELOPER_HORSE_SPEED,radius:RIDE.radius,swimming:false,wadingDepth:.95}:undefined);
    const input=getMovementInput(keys),dx=-Math.sin(yaw)*input.forward+Math.cos(yaw)*input.side,dz=-Math.cos(yaw)*input.forward-Math.sin(yaw)*input.side;
    const boost=keys.has('ShiftLeft')||keys.has('ShiftRight'),turbo=keys.has('Tab');
    const pace=turbo?DEVELOPER_BAT.turbo:boost?DEVELOPER_BAT.boost:DEVELOPER_BAT.speed;
    const before=flight.view();
    // Sample the entire turbo path: checking only its endpoint can skip a region.
    const samples=Math.max(1,Math.ceil(pace*dt/.5));
    if(!before.landing)for(let i=1;i<=samples;i++){
      const x=Math.max(world.bounds.minX,Math.min(world.bounds.maxX,position.x+dx*pace*dt*i/samples));
      const z=Math.max(world.bounds.minZ,Math.min(world.bounds.maxZ,position.z+dz*pace*dt*i/samples));
      if(world.canExploreAt&&!world.canExploreAt(x,z))return {speed:0,grounded:false,swimming:false,heading,blockedBoundary:true};
      if(!world.readyAt(x,z))return {speed:0,grounded:false,swimming:false,heading,waiting:{x,z}};
    }
    const lift=Number(keys.has('Space'))-Number(keys.has('ControlLeft')||keys.has('ControlRight'));
    const s=flight.tick(dt,{dx,dz,lift,boost,turbo});Object.assign(position,s.position);heading=s.yaw;
    const turn=Math.atan2(Math.sin(heading-before.yaw),Math.cos(heading-before.yaw));
    bank+=(Math.max(-.28,Math.min(.28,-turn/Math.max(dt,.001)*.12))-bank)*(1-Math.exp(-5*dt));
    if(!s.active)reset();
    return {speed:s.speed,grounded:!s.active,swimming:false,heading};
  }
  function draw(time,moved){
    const dt=lastDraw===undefined?1/60:Math.max(0,Math.min(.1,time-lastDraw));lastDraw=time;
    const smooth=kind==='horse'?presentation.update({y:position.y,heading:moved.heading,speed:moved.speed},dt):null;
    heading=smooth?.heading??moved.heading;actor.group.rotation.y=heading;
    actor.group.position.copy(position);
    if(kind==='foot'){actor.animate(time,moved.speed,moved.grounded,{swimming:moved.swimming});return;}
    const m=model(kind);m.group.position.copy(position);m.group.rotation.y=heading;
    if(kind==='horse'){
      const pace=smooth.speed/DEVELOPER_HORSE_SPEED,gait=m.animate(time,pace,true);
      m.group.position.y=smooth.y;actor.group.position.y=smooth.y+RIDE.seat.up;
      actor.animate(time,0,true,{armed:false,riding:{pace,beat:Math.sin(gait.phase)}});
      actor.group.position.x+=Math.sin(heading)*RIDE.seat.forward;actor.group.position.z+=Math.cos(heading)*RIDE.seat.forward;
    }else{actor.animate(time,0,true,{armed:false,riding:{pace:0}});m.update(time,{flying:true,speed:moved.speed,bank});m.group.updateMatrixWorld(true);m.passengerAnchor.getWorldPosition(actor.group.position);}
  }
  return {select,land,reset,step,draw,airborne,get kind(){return kind;},
    state:()=>({kind,landing:flight.view().landing,visible:Object.entries(models).filter(([,m])=>m.group.visible).map(([id])=>id)})};
}
