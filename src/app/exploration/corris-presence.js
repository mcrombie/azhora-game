import {createCorrisWeatherwise} from '../../content/regions/minora-frontier/corris-weatherwise.js';
import {canStand} from '../../gameplay/movement/locomotion.js';
import {TOWER,LOOKOUT} from './tower-state.js';

export function createCorrisPresence({scene,world,position,safeLanding=()=>true}){
  const actor=createCorrisWeatherwise(scene);actor.root.visible=false;
  let destination=null,place=null,elapsed=0,time=0,landed=false,retry=0;
  function land(){
    for(const radius of [2.5,4,6])for(let i=0;i<16;i++){
      const a=i*Math.PI/8+.5,x=position.x+Math.sin(a)*radius,z=position.z+Math.cos(a)*radius;
      if(world.readyAt(x,z)&&world.canExploreAt(x,z)&&canStand(x,z,world,.8)&&safeLanding(x,z)&&Math.abs(world.heightAt(x,z)-position.y)<3)return {x,y:world.heightAt(x,z),z};
    }
    return null;
  }
  return {
    call(){destination=null;elapsed=0;retry=0;},
    update(dt,{room=null,allowed=false,pending=false,talking=false}={}){
      time+=dt;const here=room??'world';
      if(place!==here){place=here;destination=null;elapsed=0;retry=0;}
      const indoor=room==='tower'||room==='lookout';
      if(!allowed||room&&!indoor){actor.root.visible=false;return;}
      if(indoor){const p=room==='tower'?TOWER:LOOKOUT;destination={x:p.x+5,y:p.y,z:p.z+1};elapsed=4;}
      else if(!destination&&pending){retry-=dt;if(retry<=0){destination=land();elapsed=0;retry=1;}}
      actor.root.visible=!!destination;if(!destination)return;
      elapsed=Math.min(4,elapsed+dt);landed=elapsed>=4;
      const approach=1-elapsed/4;
      actor.root.position.set(destination.x+approach*6,destination.y+approach*8,destination.z-approach*5);
      actor.root.rotation.y=Math.atan2(position.x-actor.root.position.x,position.z-actor.root.position.z);
      actor.animate(time,{flying:!landed,talking});
    },
    near(){return actor.root.visible&&landed&&Math.hypot(position.x-destination.x,position.z-destination.z)<(place==='world'?5:3)&&Math.abs(position.y-destination.y)<3;},
    people:()=>actor.root.visible&&landed?[{id:'corris',...destination}]:[],
    state:()=>({visible:actor.root.visible,landed,position:actor.root.position.toArray(),destination:destination?{...destination}:null}),
    reset(){place=null;destination=null;actor.root.visible=false;landed=false;elapsed=0;},
    dispose:actor.dispose,
  };
}
