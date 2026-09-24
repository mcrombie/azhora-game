import * as THREE from 'three';

/** Small pooled scene effects. Gameplay and collision stay in magic.js. */
export function createMagicView({scene,magic}) {
  const group=new THREE.Group();group.name='learned-spells';scene.add(group);
  const objects=new Map(),fireGeometry=new THREE.IcosahedronGeometry(.24,1),beeGeometry=new THREE.BoxGeometry(.07,.045,.045);
  const fireMaterial=new THREE.MeshBasicMaterial({color:0xffbd53}),beeMaterial=new THREE.MeshBasicMaterial({color:0xf2c656});
  let time=0;
  function update(dt=0) {
    time+=dt;const state=magic.view(),present=new Set();
    for(const effect of [...state.projectiles,...state.swarms]) {
      present.add(effect.id);let object=objects.get(effect.id);
      if(!object){
        if(effect.profile.swarm){object=new THREE.Group();for(let i=0;i<12;i++){const bee=new THREE.Mesh(beeGeometry,beeMaterial);object.add(bee);}}
        else object=new THREE.Mesh(fireGeometry,fireMaterial);
        group.add(object);objects.set(effect.id,object);
      }
      object.position.set(effect.x,effect.y,effect.z);
      if(effect.profile.swarm)object.children.forEach((bee,i)=>{const phase=time*7+i*2.399;bee.position.set(Math.sin(phase)*.6,Math.sin(phase*1.3)*.27,Math.cos(phase)*.6);bee.rotation.y=-phase;});
      else {object.rotation.y=time*7;object.scale.setScalar(1+Math.sin(time*25)*.12);}
    }
    for(const [id,object]of objects)if(!present.has(id)){group.remove(object);objects.delete(id);}
  }
  return {update,dispose(){group.removeFromParent();fireGeometry.dispose();beeGeometry.dispose();fireMaterial.dispose();beeMaterial.dispose();objects.clear();}};
}
