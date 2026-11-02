// The stableboy makes one short, local approach. He never follows the traveler
// out into the campaign. Footing/collision remain the host's responsibility.
export const BEAR_ARRIVAL=Object.freeze({radius:12,reach:2.3,speed:2.35});

export function createBearArrival(home,{routine=[]}={}){
  const point={x:home.x,y:0,z:home.z};let approaching=false,pace=0,heading=-Math.PI/2,station=0,dwell=0,task=null;
  const difference=target=>Math.atan2(Math.sin(target-heading),Math.cos(target-heading));
  function face(target,dt){
    const desired=Math.atan2(target.x-point.x,target.z-point.z),turn=difference(desired),step=Math.min(Math.max(0,dt),.1)*5;
    heading+=Math.max(-step,Math.min(step,turn));return Math.abs(difference(desired))<.08;
  }
  function update(dt,player,{offering=false,working=false,move=()=>{}}={}){
    approaching=false;pace=0;
    if(!(dt>0))return false;
    task=null;
    const seeking=offering&&Math.hypot(player.x-home.x,player.z-home.z)<=BEAR_ARRIVAL.radius;
    if(seeking){station=0;dwell=0;}
    const tending=working&&!seeking&&routine.length>0;
    const target=seeking?player:tending?routine[station]:home,dx=target.x-point.x,dz=target.z-point.z,distance=Math.hypot(dx,dz);
    const stop=seeking?BEAR_ARRIVAL.reach:.04;
    if(distance>stop+1e-6){
      // Turn first, then walk forward. Nearby travelers must not override a
      // departing worker's travel heading and make him moonwalk home.
      if(!face(target,dt))return false;
      const elapsed=Math.min(dt,.1),step=Math.min(distance-stop,BEAR_ARRIVAL.speed*elapsed),before={...point};
      move(point,dx/distance*step,dz/distance*step);
      pace=Math.hypot(point.x-before.x,point.z-before.z)/elapsed;
      if(pace>.01)heading=Math.atan2(point.x-before.x,point.z-before.z);
      approaching=seeking&&pace>.05;
    }else if(tending){
      if(target.face&&!face(target.face,dt))return false;
      task=target.task??null;dwell+=Math.min(dt,.1);
      if(dwell>=(target.seconds??0)){station=(station+1)%routine.length;dwell=0;task=null;}
    }else if(seeking){face(player,dt);}
    return seeking&&Math.hypot(player.x-point.x,player.z-point.z)<=BEAR_ARRIVAL.reach+.04;
  }
  return {update,face,get position(){return {...point};},get approaching(){return approaching;},get pace(){return pace;},get heading(){return heading;},
    get work(){return task?{task,horse:routine[station]?.horse}:null;},get station(){return station;},
    ground(y){if(Number.isFinite(y))point.y=y;},reset(){Object.assign(point,{x:home.x,y:0,z:home.z});approaching=false;pace=0;heading=-Math.PI/2;station=0;dwell=0;task=null;}};
}

// Prefer directly ahead, then the forward arc, then the sides. Every candidate
// is clear of the player's body and remains within G's normal mounting reach.
export function offeredHorseSpot(player,heading,canPlace){
  if(!Number.isFinite(player?.x)||!Number.isFinite(player?.z)||!Number.isFinite(heading))return null;
  for(const turn of [0,Math.PI/10,-Math.PI/10,Math.PI/5,-Math.PI/5,Math.PI/3,-Math.PI/3,Math.PI/2,-Math.PI/2,Math.PI]){
    for(const distance of [2.3,2.65]){
      const point={x:player.x+Math.sin(heading+turn)*distance,z:player.z+Math.cos(heading+turn)*distance,yaw:heading};
      if(canPlace(point))return point;
    }
  }
  return null;
}
