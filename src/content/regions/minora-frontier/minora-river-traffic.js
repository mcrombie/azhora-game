import * as THREE from 'three';
import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';
import {MINORA_SHIPPING,MINORA_GUARDSHIP,minoraTraderPose} from './minora-river-route.js';
import {createRiverboatCrew} from './riverboat-crew.js';

const WOOD='#624839',EDGE='#a48152',DECK='#ba9a67',CREAM='#dfd1a4',TEAL='#245c59',IRON='#3c4b49';
function vessel(parent,warship){
  const b=createSceneryBuilder(warship?'Minora river guard / watch galley':'Lizeem trading barge / lowered mast');
  const length=warship?MINORA_SHIPPING.guardLength:MINORA_SHIPPING.length,beam=warship?MINORA_SHIPPING.guardBeam:MINORA_SHIPPING.beam;
  const deck=warship?1.25:.68,draft=warship?1.15:.55;
  const stations=[[-.5,.05],[-.4,.72],[-.22,1],[.24,1],[.42,.6],[.5,.025]];
  for(let i=1;i<stations.length;i++){
    const [za,wa]=stations[i-1],[zb,wb]=stations[i],a=za*length,c=zb*length;
    for(const side of [-1,1]){
      const x0=side*wa*beam/2,x1=side*wb*beam/2;
      const face=[[x0,deck,a],[x0*.63,-draft*.45,a],[x1*.63,-draft*.45,c],[x1,deck,c]];
      b.quad(i%2?WOOD:'#74553c',...(side<0?face:face.reverse()));
      const low=[[x0*.63,-draft*.45,a],[0,-draft,a],[0,-draft,c],[x1*.63,-draft*.45,c]];
      b.quad(WOOD,...(side<0?low:low.reverse()));
      b.beam(EDGE,[x0,deck+.08,a],[x1,deck+.08,c],warship?.19:.12);
    }
    b.quad(DECK,[-wa*beam/2,deck,a],[-wb*beam/2,deck,c],[wb*beam/2,deck,c],[wa*beam/2,deck,a]);
  }
  // Deck planking and low cargo keep the riverboats legible nearby; the
  // working crew batch supplies a moving tiller and rudder.
  for(let z=-length*.3;z<length*.35;z+=.6)b.box(EDGE,0,deck+.008,z,beam*.78,.012,.025);
  if(warship){
    b.block(TEAL,0,deck,-6.1,3.8,1.8,3.6);b.box(DECK,0,deck+1.83,-6.1,4.1,.17,4);
    for(const side of [-1,1])for(let z=-7.5;z<=7.5;z+=2.5){
      b.block(EDGE,side*2.2,deck,z,.14,.65,.14);
      b.box(TEAL,side*2.47,deck+.25,z,.15,.9,.7);b.box(CREAM,side*2.56,deck+.27,z,.05,.12,.48);
    }
    b.cylinder(WOOD,0,deck,0,.16,11);b.beam(WOOD,[-4,9,0],[4,9,0],.17);
    b.sheet(CREAM,[-3.8,8.95,.04],[3.8,8.95,.04],[3.1,4.1,.6],[-3.1,4.1,.6]);
    b.sheet(TEAL,[-.55,8.9,.08],[.55,8.9,.08],[.45,4.12,.65],[-.45,4.12,.65]);
    b.sheet(TEAL,[0,12.2,0],[2.7,11.9,0],[2.3,11,0],[0,11.2,0]);
    for(const side of [-1,1])b.beam('#afa189',[0,11,0],[side*2.4,deck,2.5],.045);
    // Bow ballista and a reinforced prow distinguish the guard from civilian boats.
    b.block(WOOD,0,deck,6.4,.7,.9,1.2);b.beam(IRON,[-1.7,deck+1.25,6.4],[0,deck+1.4,7.2],.18);b.beam(IRON,[0,deck+1.4,7.2],[1.7,deck+1.25,6.4],.18);
    b.beam(WOOD,[0,deck+1.2,5.6],[0,deck+1.2,8.6],.2);b.beam(IRON,[0,0,10],[0,.15,12],.5);
    b.beam(IRON,[1.7,deck,8.3],[2.3,-2.2,9.7],.055); // Anchored watch, outside the shipping lane.
  }else{
    for(const z of [-1.6,0,1.6]){
      b.block('#9b7446',0,deck,z,1.55,.88,1.2);
      for(const side of [-1,1])b.box(WOOD,side*.6,deck+.45,z,.08,.9,1.23);
    }
    // Furled canvas on the lowered spar leaves room for the seated stern hand.
    b.beam(WOOD,[.9,deck+.25,-3.5],[.9,deck+.25,3.4],.12);
    b.box(CREAM,.9,deck+.28,.6,.26,.25,3.1);
    b.box(TEAL,-.7,deck+.18,-2.9,.45,.3,1.2);
  }
  return b.finish(parent,{castShadow:false});
}
export function createMinoraRiverTraffic(parent){
  const root=new THREE.Group();root.name='Minora live river traffic';root.userData.lookoutDynamic=true;parent.add(root);
  const guard=vessel(root,true),trader=vessel(root,false),second=trader.clone();root.add(second);
  const ships=[guard,trader,second],crews=ships.map((ship,i)=>createRiverboatCrew(ship,i===0?{kind:'guard',deck:1.25,beam:MINORA_SHIPPING.guardBeam,length:MINORA_SHIPPING.guardLength}:{}));
  let updates=0,disposed=false;
  function place(mesh,p,time,phase){mesh.position.set(p.x,p.y+Math.sin(time*.7+phase)*.035,p.z);mesh.rotation.set(0,p.yaw,Math.sin(time*.45+phase)*.004);}
  function update(time,observer=null){
    // Streamed-out scenery and the inactive lookout do no recurring work.
    if(disposed)return;
    let traffic=null;
    for(let p=root;p;p=p.parent){if(!p.visible)return;traffic=p.userData.lizeemRiverTraffic??traffic;}
    const traders=traffic?.shipsAt(time)??[minoraTraderPose(time,0),minoraTraderPose(time,1)];
    const poses=[{...MINORA_GUARDSHIP,phase:'moored',speed:0,rowing:false},...traders];
    for(let i=0;i<ships.length;i++){place(ships[i],poses[i],time,i);crews[i].update(time,poses[i],observer);}updates++;
  }
  update(0);
  return {root,update,state:()=>({ships:3,traders:2,drawCalls:6,triangles:ships.reduce((n,m)=>n+m.geometry.attributes.position.count/3,0)+crews.reduce((n,c)=>n+c.state().triangles,0),updates,crews:crews.map(c=>c.state()),
    positions:ships.map(m=>({name:m.name,x:m.position.x,y:m.position.y,z:m.position.z}))}),
    dispose(){if(disposed)return;disposed=true;root.removeFromParent();crews.forEach(c=>c.dispose());guard.geometry.dispose();trader.geometry.dispose();}};
}
