import * as THREE from 'three';

// A brief local shimmer; no shadow-casting lights or full-screen flash.
export function createHorseSummonEffect(parent){
  const root=new THREE.Group();root.name='Horse / blue arrival wisps';root.visible=false;parent.add(root);
  const ribbonMaterial=new THREE.MeshBasicMaterial({color:0x369dff,transparent:true,opacity:0,depthWrite:false,toneMapped:false,fog:false,side:THREE.DoubleSide});
  const curve=new THREE.CatmullRomCurve3(Array.from({length:25},(_,i)=>{const t=i/24,a=t*Math.PI*2.1;return new THREE.Vector3(Math.cos(a)*.8,t*2.4,Math.sin(a)*1.15);}));
  const ribbonGeometry=new THREE.TubeGeometry(curve,32,.035,3,false),ribbons=[];
  for(let i=0;i<3;i++){const ribbon=new THREE.Mesh(ribbonGeometry,ribbonMaterial);ribbon.rotation.y=i*Math.PI*2/3;root.add(ribbon);ribbons.push(ribbon);}
  const particles=new Float32Array(32*3),geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(particles,3));
  const material=new THREE.PointsMaterial({color:0x70c9ff,size:.075,transparent:true,opacity:0,depthWrite:false,toneMapped:false,fog:false,blending:THREE.AdditiveBlending});
  const sparks=new THREE.Points(geometry,material);root.add(sparks);let elapsed=1.15,disposed=false;
  function cancel(){elapsed=1.15;root.visible=false;}
  function update(dt){
    if(disposed||!root.visible)return;
    elapsed+=Math.max(0,dt);const t=Math.min(1,elapsed/1.15),strength=Math.sin(Math.PI*t)*(1-t*.35);
    if(t>=1){cancel();return;}
    ribbonMaterial.opacity=strength*.8;material.opacity=strength*.85;
    for(let i=0;i<ribbons.length;i++){ribbons[i].rotation.y=i*Math.PI*2/3+t*2.8;ribbons[i].scale.setScalar(.7+t*.4);}
    for(let i=0;i<32;i++){const a=i*2.39996+t*3.8,r=.6+(i%5)*.12;particles[i*3]=Math.cos(a)*r;particles[i*3+1]=((i/32+t*.65)%1)*2.8;particles[i*3+2]=Math.sin(a)*r;}
    geometry.attributes.position.needsUpdate=true;
  }
  return {start(point){if(disposed)return;root.position.set(point.x,point.y+.03,point.z);elapsed=0;root.visible=true;update(.001);},update,cancel,
    get active(){return root.visible;},
    dispose(){if(disposed)return;disposed=true;cancel();root.removeFromParent();ribbonGeometry.dispose();ribbonMaterial.dispose();geometry.dispose();material.dispose();}};
}
