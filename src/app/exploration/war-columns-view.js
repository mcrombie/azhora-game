import * as THREE from 'three';
import {createCharacter} from '../../content/characters/characters.js';
import {canStand} from '../../gameplay/movement/locomotion.js';
import {campaignColumn,columnRoadPoint} from './war-columns.js';

// A bounded visual sample of the actual force. The campaign alone owns its
// strength, orders and outcome. No second AI tick or full army spawning.
export function createMarchingColumns(scene,world){
  const root=new THREE.Group();root.name='Campaign marching column';root.visible=false;scene.add(root);
  const poleGeometry=new THREE.CylinderGeometry(.075,.075,5.6,6),flagGeometry=new THREE.PlaneGeometry(2,1.9);
  const poleMaterial=new THREE.MeshStandardMaterial({color:0x6f5234});
  const flagMaterial=new THREE.MeshBasicMaterial({color:0xbf7969,side:THREE.DoubleSide,fog:false});
  const pole=new THREE.Mesh(poleGeometry,poleMaterial),flag=new THREE.Mesh(flagGeometry,flagMaterial);root.add(pole,flag);
  const dustGeometry=new THREE.IcosahedronGeometry(1,0),dustMaterial=new THREE.MeshBasicMaterial({color:0xd6c296,transparent:true,opacity:.16,depthWrite:false});
  const dust=new THREE.InstancedMesh(dustGeometry,dustMaterial,8);dust.frustumCulled=false;root.add(dust);
  const dummy=new THREE.Object3D(),pools=new Map();let model=null,time=0,visible=false;
  const clear=p=>world.readyAt(p.x,p.z)&&canStand(p.x,p.z,world,.34,world.heightAt(p.x,p.z));
  return {
    update(state,clock,position,known,dt,enabled){
      model=campaignColumn(state,clock);time+=enabled?dt:0;
      visible=!!(enabled&&model?.marching&&known(model.location)&&Math.hypot(position.x-model.location.x,position.z-model.location.z)<420&&clear(model.location));
      root.visible=visible;if(!visible)return;
      const color=model.owner==='west'?0x789e91:0xbf7969;flagMaterial.color.setHex(color);
      for(const [owner,pool]of pools)if(owner!==model.owner)for(const actor of pool)actor.group.visible=false;
      if(!pools.has(model.owner))pools.set(model.owner,[]);const actors=pools.get(model.owner);
      const at=model.location,y=world.heightAt(at.x,at.z),near=Math.hypot(position.x-at.x,position.z-at.z)<145;
      pole.position.set(at.x,y+2.8,at.z);flag.position.set(at.x+1,y+4.55,at.z);flag.rotation.y=Math.sin(time*2)*.15;
      // Silhouette retains its faction color at range; nearby it is a standard
      // carried at the head of eight or fewer representatives, not eight strength.
      while(near&&actors.length<model.count){const actor=createCharacter({role:'legion-soldier',tunic:color,armed:true,hat:false});root.add(actor.group);actors.push(actor);}
      for(const [index,actor] of actors.entries()){
        const distance=model.distance-index*2.8,p=columnRoadPoint(distance,model.route);
        actor.group.visible=near&&index<model.count&&distance>=0&&clear(p);
        if(actor.group.visible){actor.group.position.set(p.x,world.heightAt(p.x,p.z),p.z);actor.group.rotation.y=p.yaw;actor.animate(time+index*.2,model.marching&&clock.running?2.3:0,true,{action:'idle',progress:0});}
      }
      dust.visible=model.marching&&clock.running;
      if(dust.visible){for(let i=0;i<8;i++){
        const age=(time*.55+i/8)%1,p=columnRoadPoint(Math.max(0,model.distance-i*2.8-age*3),model.route);
        dummy.position.set(p.x+Math.sin(i*2.4+time)*age,world.heightAt(p.x,p.z)+.15+age*.7,p.z);
        dummy.scale.setScalar(.18+age*.7);dummy.updateMatrix();dust.setMatrixAt(i,dummy.matrix);
      }dust.instanceMatrix.needsUpdate=true;}
    },
    target:id=>model?.id===id?model:null,
    state:()=>({visible,army:model?.id??null,route:model?.route??null,owner:model?.owner??null,location:model?.location??null,strength:model?.strength??0,marching:model?.marching??false,
      soldiers:root.visible?[...pools.values()].flat().filter(a=>a.group.visible).map(a=>a.group.position.toArray()):[]}),
    dispose(){root.removeFromParent();const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[])materials.add(m);});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();}
  };
}
