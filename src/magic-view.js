import * as THREE from 'three';

const BEE_COUNT=12;

/** An oval with actual dark bands: the silhouette and stripes survive the follow-camera distance. */
function stripedBeeGeometry(){
  const geometry=new THREE.SphereGeometry(1,10,8).rotateX(Math.PI/2).scale(.065,.055,.115).toNonIndexed();
  const positions=geometry.getAttribute('position'),colors=new Float32Array(positions.count*3);
  const amber=new THREE.Color(0xe7ac36),dark=new THREE.Color(0x31241d);
  for(let triangle=0;triangle<positions.count;triangle+=3){
    const z=(positions.getZ(triangle)+positions.getZ(triangle+1)+positions.getZ(triangle+2))/3;
    const color=(z>-.085&&z<-.045)||(z>-.005&&z<.035)?dark:amber;
    for(let vertex=triangle;vertex<triangle+3;vertex++)color.toArray(colors,vertex*3);
  }
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));return geometry;
}

/** Small pooled scene effects. Gameplay and collision stay in magic.js. */
export function createMagicView({scene,magic}) {
  const group=new THREE.Group();group.name='learned-spells';scene.add(group);
  const objects=new Map(),fireGeometry=new THREE.IcosahedronGeometry(.24,1),beeGeometry=stripedBeeGeometry();
  const headGeometry=new THREE.SphereGeometry(.047,8,6),wingGeometry=new THREE.SphereGeometry(1,8,4).scale(.105,.008,.051);
  const fireMaterial=new THREE.MeshBasicMaterial({color:0xffbd53}),beeMaterial=new THREE.MeshBasicMaterial({vertexColors:true});
  const headMaterial=new THREE.MeshBasicMaterial({color:0x302821});
  const wingMaterial=new THREE.MeshBasicMaterial({color:0xecf5ef,transparent:true,opacity:.72,depthWrite:false,side:THREE.DoubleSide});
  wingMaterial.forceSinglePass=true;
  const pose=new THREE.Object3D(),part=new THREE.Object3D(),matrix=new THREE.Matrix4(),orientation=new THREE.Euler();
  let time=0;
  function createSwarm(){
    const swarm=new THREE.Group();swarm.name='summoned-bees';
    const bodies=new THREE.InstancedMesh(beeGeometry,beeMaterial,BEE_COUNT),heads=new THREE.InstancedMesh(headGeometry,headMaterial,BEE_COUNT);
    const wings=new THREE.InstancedMesh(wingGeometry,wingMaterial,BEE_COUNT*2);
    bodies.name='Striped bee bodies';heads.name='Dark bee heads';wings.name='Fluttering bee wings';
    for(const mesh of [bodies,heads,wings]){mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;swarm.add(mesh);}
    swarm.userData.bees={bodies,heads,wings,last:null};return swarm;
  }
  function updateSwarm(swarm,effect,dt){
    const {bodies,heads,wings,last}=swarm.userData.bees;
    const vx=last&&dt>0?(effect.x-last.x)/dt:last?.vx??0,vz=last&&dt>0?(effect.z-last.z)/dt:last?.vz??0;
    for(let i=0;i<BEE_COUNT;i++){
      const phase=time*(5.4+(i%3)*.45)+i*2.399,radius=.43+(i%4)*.085,speed=5.4+(i%3)*.45;
      const bobPhase=time*6.1+i*1.71;
      pose.position.set(Math.sin(phase)*radius,Math.sin(bobPhase)*.24,Math.cos(phase)*radius);
      const dx=Math.cos(phase)*radius*speed+vx,dz=-Math.sin(phase)*radius*speed+vz,dy=Math.cos(bobPhase)*1.464;
      orientation.set(-Math.atan2(dy,Math.hypot(dx,dz))*.45,Math.atan2(dx,dz),Math.sin(phase)*.15,'YXZ');
      pose.quaternion.setFromEuler(orientation);pose.updateMatrix();bodies.setMatrixAt(i,pose.matrix);
      part.position.set(0,.008,.126);part.rotation.set(0,0,0);part.updateMatrix();
      matrix.multiplyMatrices(pose.matrix,part.matrix);heads.setMatrixAt(i,matrix);
      for(const side of [-1,1]){
        const flap=.3+Math.sin(time*49+i*1.93)*.78;
        part.position.set(side*.095,.041,-.008);part.rotation.set(0,side*.22,side*flap);part.updateMatrix();
        matrix.multiplyMatrices(pose.matrix,part.matrix);wings.setMatrixAt(i*2+(side===1?1:0),matrix);
      }
    }
    bodies.instanceMatrix.needsUpdate=heads.instanceMatrix.needsUpdate=wings.instanceMatrix.needsUpdate=true;
    swarm.userData.bees.last={x:effect.x,z:effect.z,vx,vz};
  }
  function release(object){object.removeFromParent();object.traverse(child=>{if(child.isInstancedMesh)child.dispose();});}
  function update(dt=0) {
    dt=Number.isFinite(dt)&&dt>0?dt:0;
    time+=dt;const state=magic.view(),present=new Set();
    for(const effect of [...state.projectiles,...state.swarms]) {
      present.add(effect.id);let object=objects.get(effect.id);
      if(!object){
        if(effect.profile.swarm)object=createSwarm();
        else object=new THREE.Mesh(fireGeometry,fireMaterial);
        group.add(object);objects.set(effect.id,object);
      }
      object.position.set(effect.x,effect.y,effect.z);
      if(effect.profile.swarm)updateSwarm(object,effect,dt);
      else {object.rotation.y=time*7;object.scale.setScalar(1+Math.sin(time*25)*.12);}
    }
    for(const [id,object]of objects)if(!present.has(id)){release(object);objects.delete(id);}
  }
  return {update,dispose(){for(const object of objects.values())release(object);group.removeFromParent();
    for(const geometry of [fireGeometry,beeGeometry,headGeometry,wingGeometry])geometry.dispose();
    for(const material of [fireMaterial,beeMaterial,headMaterial,wingMaterial])material.dispose();objects.clear();}};
}
