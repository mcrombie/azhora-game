import * as THREE from 'three';

// One rock dove: slate plumage, two dark wing bars, iridescent neck, orange
// eyes, pink feet and a small guild message tube. No population simulation.
export function createCourierPigeon(parent){
  const root=new THREE.Group(),geometries=new Set(),materials=new Map();root.name='Taleth’s courier / rock dove';parent.add(root);
  function part(color,x,y,z,sx,sy,sz,holder=root){
    const geo=new THREE.IcosahedronGeometry(1,0);geometries.add(geo);
    if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.8,flatShading:true}));
    const m=new THREE.Mesh(geo,materials.get(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);holder.add(m);return m;
  }
  part('#79878e',0,.23,0,.2,.25,.4);part('#526d69',0,.45,-.19,.14,.21,.16);part('#8e9ba0',0,.6,-.25,.15,.14,.15);
  part('#d2c3a5',0,.57,-.43,.055,.035,.11);part('#465159',0,.19,.4,.18,.05,.24);
  for(const side of [-1,1]){part('#d7943d',side*.13,.625,-.3,.025,.028,.026);part('#182326',side*.146,.625,-.31,.011,.014,.014);part('#ad786d',side*.1,.01,-.06,.025,.09,.08);}
  const wings=[-1,1].map(side=>{const pivot=new THREE.Group();pivot.position.set(side*.13,.32,0);root.add(pivot);part('#89979d',side*.18,0,.06,.24,.045,.35,pivot);for(const z of [.08,.23])part('#3e4851',side*.23,.025,z,.2,.025,.042,pivot);return pivot;});
  part('#b79d62',.11,.05,.01,.055,.045,.11);
  return {root,flap(time,flying){wings.forEach((w,i)=>w.rotation.z=flying?(i?1:-1)*(.4+Math.sin(time*18)*.8):(i?1:-1)*.65);root.rotation.x=flying?-.12:0;},
    dispose(){root.removeFromParent();for(const g of geometries)g.dispose();for(const m of materials.values())m.dispose();}};
}
