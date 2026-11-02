import * as THREE from 'three';

export function trialActorKit(){
  const materials=new Map(),up=new THREE.Vector3(0,1,0);
  function material(color,glow=false){const key=color+':'+glow;if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,roughness:.76,metalness:glow?0:.18,flatShading:true,emissive:glow?color:0,emissiveIntensity:glow?.8:0}));return materials.get(key);}
  function part(parent,name,geometry,color,p=[0,0,0],scale=[1,1,1],glow=false){const m=new THREE.Mesh(geometry,material(color,glow));m.name=name;m.position.set(...p);m.scale.set(...scale);parent.add(m);return m;}
  const box=(p,n,c,at,size)=>part(p,n,new THREE.BoxGeometry(...size),c,at);
  const gem=(p,n,c,at,size,glow=false)=>part(p,n,new THREE.IcosahedronGeometry(1,0),c,at,size,glow);
  function rod(p,n,c,a,b,r=.025){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.sub(start);const m=part(p,n,new THREE.CylinderGeometry(r,r,delta.length(),6),c,start.addScaledVector(delta,.5).toArray());m.quaternion.setFromUnitVectors(up,delta.normalize());return m;}
  return {part,box,gem,rod,material};
}

// All ten new figures share a stable, grounded fall, including non-human rigs.
// The wrapper owns only presentation; simulation collision uses the profile.
export function withTrialFall(actor,id,overlay=()=>{}){
  const figure=actor.group,root=new THREE.Group();root.add(figure);root.userData.frontierTrial=id;
  const animate=actor.animate,bounds=new THREE.Box3(),origin=new THREE.Vector3();
  return {...actor,group:root,animate(time,speed,grounded,pose={}){
    figure.position.y=0;figure.rotation.z=0;
    const dead=pose.action==='dead';
    animate(time,dead?0:speed,grounded,dead?{action:'idle',defeated:true,progress:pose.progress??1}:pose);overlay(time,speed,dead?{...pose,veiled:false}:pose);
    if(dead){
      const p=THREE.MathUtils.smoothstep(pose.progress??1,0,.92);figure.rotation.z=-1.52*p;
      root.updateWorldMatrix(true,true);bounds.setFromObject(figure);root.getWorldPosition(origin);
      figure.position.y+=(origin.y-bounds.min.y)/(root.matrixWorld.elements[5]||1);
    }
  }};
}
