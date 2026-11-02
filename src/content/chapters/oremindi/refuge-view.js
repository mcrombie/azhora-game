import * as THREE from 'three';
import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';
import {createCharacter,disposeCharacter} from '../../characters/characters.js';
import {OREMINDI_LOCATIONS as P} from './locations.js';

// Chapter-owned scenery. The physical tower travels; its isolated interior
// keeps its established coordinates so rooms, stairs and saved floors survive.
export function createOremindiRefuge({scene,world}){
  const root=new THREE.Group();root.name='Chapter 3 / lakeside Guild refuge';scene.add(root);
  let tower=null,camp=null,proof=null;const people=[],hidden=new Map(),colliders=[];
  const release=world.addExteriorFeature({colliders,filterCollider:c=>c.id!=='menora-sorcerers-guild'});
  function buildTower(){
    const {x,z}=P.tower,y=world.heightAt(x,z),b=createSceneryBuilder('Relocated Sorcerers’ Guild');
    b.frame(x,y,z,0,()=>{
      b.cylinder('#7c8983',0,-3,0,13.2,3.3,Math.PI/8);
      for(const [base,h,r] of [[0,16,11.7],[16,23,9.7],[39,27,8.2],[66,22,6.8],[88,18,5.6]]){
        b.cylinder('#cdd6cc',0,base,0,r,h,Math.PI/8);b.cylinder('#889b92',0,base+h-.5,0,r+.45,.8,Math.PI/8);
        for(let i=0;i<4;i++)b.frame(0,0,0,i*Math.PI/2,()=>{
          b.block('#b2c5c1',0,base,r,.8,h,1.4);
          for(let k=1;k<4;k++){b.box('#334d48',0,base+k*h/4,r+.7,1,2.8,.15);b.cone('#c3c5a1',0,base+k*h/4+1.4,r+.7,.65,1,0,4);}
        });
      }
      for(let i=0;i<4;i++)b.frame(0,0,0,i*Math.PI/2,()=>{b.beam('#889b92',[-7.8,5,7.8],[-3.9,95,3.9],2.2);b.beam('#e1dec6',[-3.9,94,3.9],[-6.8,118,6.8],1.2);b.cone('#e1dec6',-6.8,117,6.8,1.15,11,Math.PI/4,4);});
      b.cylinder('#b99a5d',0,106,0,6.8,1.1);b.cone('#90a6a1',0,107,0,5,12);b.cone('#b99a5d',0,119,0,1,6);b.rock('#c8e6d3',0,127,0,1.2,1.2,1.2);
      b.block('#e1dec6',0,0,12,4.4,9.5,2.5);b.box('#463d34',0,3.8,13.3,3.1,6,.18);b.cone('#b99a5d',0,7.1,13.35,.8,1.7,0,4);
      for(const s of [-1,1]){b.block('#e1dec6',s*2,0,13,.65,9,1);b.block('#877d66',s*4,0,14,1,1.4,1);b.cone('#6fc5d3',s*4,1.4,14,.3,.8);}
      b.block('#9ba8a0',0,-.15,15,6,.3,4);
    });tower=b.finish(root);colliders.push({x,z,r:11.9,minY:y,maxY:y+130,kind:'oremindi-refuge-tower'});
  }
  function buildCamp(){
    const {x,z}=P.rangers,b=createSceneryBuilder('North Ibenwood / mountain outpost');
    for(const [dx,dz,yaw]of [[-6,-4,.3],[6,-5,-.35]]){
      const y=world.heightAt(x+dx,z+dz);b.frame(x+dx,y,z+dz,yaw,()=>{for(const s of [-1,1])b.block('#6a5941',s*2,0,0,.2,2.5,.2);b.roof('#658471',0,2,0,4.8,4.8,1.6,0,'#5b7360');b.box('#a09475',0,.35,-1.4,2.8,.5,.7);});
    }
    const y=world.heightAt(x,z);for(let i=0;i<8;i++){const a=i*Math.PI/4;b.rock('#848575',x+Math.sin(a)*1.2,y+.15,z-5+Math.cos(a)*1.2,.4,.23,.3);}
    b.beam('#574735',[x-1,y+.1,z-5],[x+1,y+.3,z-5],.23);camp=b.finish(root);
    for(let i=0;i<3;i++){
      const actor=createCharacter({role:'mercenary',hat:false,armed:false,tunic:i===0?0x446553:0x69775a,look:{elven:true,build:'ordinary',hair:i===0?'silver':'brown',hairStyle:i===1?'long':'ponytail',facialHair:'clean',headgear:'bare'}});
      const px=x+(i-1)*4,pz=z+(i===0?0:-3);actor.group.position.set(px,world.heightAt(px,pz),pz);actor.group.name=i===0?'North Ibenwood ranger speaker':'North Ibenwood scout';root.add(actor.group);people.push(actor);
    }
  }
  function buildProof(){const b=createSceneryBuilder('Fallen mountain raider / proof remains'),p=P.proof,y=world.heightAt(p.x,p.z);
    b.rock('#52644a',p.x,y+.27,p.z,1,.26,.45);b.rock('#687654',p.x+1.03,y+.3,p.z,.3,.28,.25);b.box('#514736',p.x-.9,y+.18,p.z,.7,.26,.5);proof=b.finish(root);}
  return {root,update(time,dt,state,inside){
    root.visible=!inside;if(inside)return;
    // Batches preserve their source name even after streaming; only the old
    // tower mesh is hidden. Other city architecture and council rooms remain.
    if(!hidden.size&&world.readyAt(-2414,42))world.exteriorRoot?.traverse(o=>{if(o.name==='The Sorcerers’ Guild'){hidden.set(o,o.visible);o.visible=false;}});
    if(!tower&&world.readyAt(P.tower.x,P.tower.z))buildTower();
    if(!camp&&world.readyAt(P.rangers.x,P.rangers.z))buildCamp();
    if(!proof&&state.ambush.status==='victory'&&world.readyAt(P.proof.x,P.proof.z))buildProof();
    if(proof)proof.visible=state.proof==='available';
    for(const actor of people)actor.animate(time,0,true,{armed:false});
  },state:()=>({tower:!!tower,rangers:people.length,proof:!!proof?.visible}),dispose(){release();for(const actor of people)disposeCharacter(actor);for(const [node,visible]of hidden)node.visible=visible;root.traverse(o=>o.geometry?.dispose());root.removeFromParent();}};
}
