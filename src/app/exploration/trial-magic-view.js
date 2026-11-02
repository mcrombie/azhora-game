import {createExpeditionFieldView} from './expedition-field-view.js';
import * as THREE from 'three';
import {createTrialFieldView} from './trial-field-view.js';

// Fixed pools: no lights, particles, or allocations per simulation projectile.
export function createTrialMagicView(scene,world){
  const root=new THREE.Group();root.name='Stillroom spell effects';scene.add(root);
  const field=createTrialFieldView(root,world),expedition=createExpeditionFieldView(root,world);
  const core=new THREE.MeshBasicMaterial({color:0xb5f5ff}),trail=new THREE.MeshBasicMaterial({color:0x5cbfdf,transparent:true,opacity:.6,depthWrite:false});
  const stone=new THREE.MeshStandardMaterial({color:0xa79b7e,roughness:1,flatShading:true});
  const violet=new THREE.MeshBasicMaterial({color:0xc5adee,transparent:true,opacity:.75,side:THREE.DoubleSide,depthWrite:false});
  const orbGeometry=new THREE.IcosahedronGeometry(.22,1),tailGeometry=new THREE.ConeGeometry(.14,1.1,6),ringGeometry=new THREE.RingGeometry(.85,1,32);
  const bolts=Array.from({length:8},()=>{
    const g=new THREE.Group(),orb=new THREE.Mesh(orbGeometry,core),tail=new THREE.Mesh(tailGeometry,trail);
    tail.rotation.x=-Math.PI/2;tail.position.z=-.6;g.add(orb,tail);g.visible=false;g.userData.trialBolt=true;root.add(g);return g;
  });
  const ritual=new THREE.Group();ritual.name='Knight restoration ritual';root.add(ritual);
  const ring=new THREE.Mesh(ringGeometry,violet);ring.rotation.x=-Math.PI/2;ritual.add(ring);
  const runes=Array.from({length:8},(_,i)=>{const m=new THREE.Mesh(orbGeometry,violet);m.scale.set(.18,.6,.18);m.position.set(Math.sin(i*Math.PI/4)*.9,.3,Math.cos(i*Math.PI/4)*.9);ritual.add(m);return m;});
  return {
    draw(s,time){
      field.draw(s,time);expedition.draw(s,time);
      const shots=s.outcome?[]:s.projectiles??[];
      bolts.forEach((g,i)=>{const p=shots[i];g.visible=!!p;if(p){g.position.set(p.x,world.heightAt(p.x,p.z)+1.05,p.z);g.rotation.y=Math.atan2(p.dx,p.dz);g.children[1].visible=!['stone','boulder'].includes(p.kind);g.children[1].material=p.kind==='arrow'?stone:trail;g.children[1].scale.set(p.kind==='arrow'?.18:1,1,p.kind==='arrow'?.18:1);g.children[0].material=['stone','boulder','arrow'].includes(p.kind)?stone:core;g.children[0].scale.set(...(p.kind==='arrow'?[.2,.2,.7]:Array(3).fill(p.kind==='stone'?.7:p.kind==='boulder'?1.7:1)));}});
      const knight=s.outcome?null:s.guards.find(g=>g.hp>0&&g.phase==='restore');ritual.visible=!!knight;
      if(knight){ritual.position.set(knight.x,world.heightAt(knight.x,knight.z)+.05,knight.z);ritual.rotation.y=time*.7;
        const progress=1-knight.timer/knight.ritualDuration;ring.scale.setScalar(1+progress*.3);
        runes.forEach((m,i)=>{m.position.y=.15+((time*.65+i*.13)%1)*1.8;});}
    },
    dispose(){field.dispose();expedition.dispose();scene.remove(root);for(const resource of [core,stone,trail,violet,orbGeometry,tailGeometry,ringGeometry])resource.dispose();}
  };
}
