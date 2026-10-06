import * as THREE from 'three';

/** One cart-sized woodland spider, built from shared low-poly geometry.
 * Local +Z is its bite direction, matching the combat simulation. */
export function createSpider() {
  const group=new THREE.Group();group.name='Giant thorn spider';group.userData.creature='spider';
  const body=new THREE.Group();body.name='Spider carapace';group.add(body);
  const sphere=new THREE.IcosahedronGeometry(1,1),segment=new THREE.CylinderGeometry(1,1,1,5);
  const shell=new THREE.MeshStandardMaterial({color:0x493c32,roughness:.83,flatShading:true});
  const dark=new THREE.MeshStandardMaterial({color:0x282a23,roughness:.9,flatShading:true});
  const ochre=new THREE.MeshStandardMaterial({color:0x9a7849,roughness:.9,flatShading:true});
  const eye=new THREE.MeshStandardMaterial({color:0xec933d,emissive:0xc44514,emissiveIntensity:.75,roughness:.3});
  const fangMaterial=new THREE.MeshStandardMaterial({color:0xc5b78a,roughness:.8,flatShading:true});
  const lump=(parent,name,mat,p,scale)=>{const mesh=new THREE.Mesh(sphere,mat);mesh.name=name;mesh.position.set(...p);mesh.scale.set(...scale);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;};
  lump(body,'Large abdomen',shell,[0,1.1,-.7],[1.02,.85,1.3]);
  lump(body,'Banded thorax',dark,[0,1.05,.48],[.75,.59,.83]);
  lump(body,'Raised head',shell,[0,1.02,1.12],[.58,.44,.49]);
  for(const side of [-1,1]){
    for(let i=0;i<3;i++)lump(body,'Abdomen ochre marking',ochre,[side*(.36+i*.13),1.83-i*.14,-1.25+i*.45],[.13,.04,.24]);
    for(let i=0;i<3;i++)lump(body,'Amber eye',eye,[side*(.13+i*.14),1.13+i*.09,1.54-i*.085],[i===0?.092:.06,.07,.055]);
    const fang=lump(body,'Hooked fang',fangMaterial,[side*.26,.74,1.57],[.085,.27,.11]);fang.rotation.x=-.38;fang.rotation.z=-side*.35;
  }
  const legs=[];
  for(const side of [-1,1])for(let index=0;index<4;index++){
    const root=new THREE.Group();root.name=`Spider ${side<0?'left':'right'} leg ${index+1}`;group.add(root);
    const upper=new THREE.Mesh(segment,shell),lower=new THREE.Mesh(segment,dark);
    upper.name='Upper leg';lower.name='Lower leg';root.add(upper,lower);
    const joint=lump(root,'Leg joint',ochre,[0,0,0],[.115,.115,.115]);
    legs.push({side,index,upper,lower,joint,start:new THREE.Vector3(),knee:new THREE.Vector3(),foot:new THREE.Vector3()});
  }
  const delta=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
  function limb(mesh,a,b,thickness){delta.subVectors(b,a);const length=delta.length();mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.set(thickness,length,thickness);mesh.quaternion.setFromUnitVectors(up,delta.multiplyScalar(1/length));}
  function animate(time=0,speed=0,grounded=true,pose={}){
    const action=pose.action??'idle',progress=THREE.MathUtils.clamp(pose.progress??0,0,1),dead=action==='dead';
    const fold=dead?THREE.MathUtils.smoothstep(progress,0,.85):0;
    const walking=dead?0:Math.min(1,speed/1.5),phase=time*(4+Math.min(speed,4)*1.5);
    const rear=action==='windup'?Math.sin(progress*Math.PI/2):0;
    const bite=action==='attack'?Math.sin(progress*Math.PI):0;
    body.scale.y=1-fold*.42;
    body.position.y=-fold*.06+rear*.18+Math.sin(time*2)*.022*(1-fold);
    body.position.z=bite*.18;body.rotation.x=-rear*.16+bite*.15;body.rotation.z=action==='hurt'?Math.sin(progress*Math.PI)*.1:fold*.06;
    for(const leg of legs){const {side,index,start,knee,foot}=leg;
      const stride=Math.sin(phase+index*Math.PI*.7+(side<0?Math.PI:0))*walking;
      const baseZ=-.75+index*.53,spreadZ=[-2.05,-.8,.8,2.05][index];
      start.set(side*.53,1.04-fold*.52,baseZ);
      knee.set(side*(1.58+.23*Math.sin(index*Math.PI/3)-fold*.7),1.35+.22*Math.sin(index*Math.PI/3)-fold*.85,spreadZ*.65+stride*.12);
      foot.set(side*(2.28+.17*Math.sin(index*Math.PI/3)-fold*1.18),.09+Math.max(0,stride)*.24*(1-fold),spreadZ*(1-fold*.55)+stride*.28);
      if(index===3){knee.y+=rear*.55;foot.y+=rear*.48;}
      limb(leg.upper,start,knee,.09);limb(leg.lower,knee,foot,.057);leg.joint.position.copy(knee);
    }
  }
  animate();
  return {group,animate,setArmed() {}};
}
