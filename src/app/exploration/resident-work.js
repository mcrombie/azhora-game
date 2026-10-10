import * as THREE from 'three';

// A few occupation gestures on the existing rig, not jobs or resource production.
// Props belong to the actor and are released by disposeCharacter with its rig.
export function residentWork(actor,id){
  const kind={melka:'bundle',pomona:'basket',messor:'rake',nepri:'measure',consus:'measure',ilmarinen:'hammer'}[id];
  const wrist=actor.group.getObjectByName('Right Wrist'),shoulder=actor.group.getObjectByName('Right Shoulder'),elbow=actor.group.getObjectByName('Right Elbow');
  if(!kind||!wrist||!shoulder||!elbow)return ()=>{};
  const prop=new THREE.Group();prop.name='Resident work / '+kind;wrist.add(prop);
  const material=new THREE.MeshStandardMaterial({color:kind==='bundle'?0x9d8764:0x80603c,roughness:1,flatShading:true});
  function block(x,y,z,w,h,d){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);prop.add(mesh);}
  if(kind==='bundle')block(0,-.13,.08,.38,.35,.26);
  if(kind==='basket'){block(0,-.20,0,.31,.23,.26);block(-.11,-.04,0,.035,.18,.035);block(.11,-.04,0,.035,.18,.035);block(0,.04,0,.25,.035,.035);}
  if(kind==='measure'){const cup=new THREE.Mesh(new THREE.CylinderGeometry(.09,.075,.16,6),material);cup.position.y=-.08;prop.add(cup);}
  if(kind==='hammer'){block(0,-.07,0,.035,.35,.035);block(0,-.25,0,.20,.10,.09);}
  if(kind==='rake'){block(0,-.35,0,.035,1.05,.035);block(0,-.87,0,.44,.055,.05);for(const x of [-.18,0,.18])block(x,-.89,.055,.035,.06,.14);}
  let weight=1;
  return (time,speed,working,dt=.1)=>{
    weight=THREE.MathUtils.damp(weight,working?1:0,6,dt);
    if(weight<.001)return;
    const restShoulder=shoulder.rotation.x,restElbow=elbow.rotation.x;
    if(kind==='bundle'||kind==='basket'){shoulder.rotation.x=-.22;elbow.rotation.x=-.65;}
    else if(speed<.1){
      const motion=Math.sin(time*(kind==='rake'?1.5:.8));
      shoulder.rotation.x=kind==='rake'?-.35+motion*.12:-.32;
      elbow.rotation.x=kind==='measure'?-.9+motion*.07:kind==='hammer'?-.7+motion*.12:-.25;
    }
    shoulder.rotation.x=THREE.MathUtils.lerp(restShoulder,shoulder.rotation.x,weight);
    elbow.rotation.x=THREE.MathUtils.lerp(restElbow,elbow.rotation.x,weight);
  };
}
