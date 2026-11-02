import * as THREE from 'three';
import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';

const WOOD='#84633f',SKIN='#b68b69',DARK='#463b30',CREAM='#d1c39d',TEAL='#356560';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

// These seated river hands are one vertex-coloured draw batch per boat. Only
// their small rigid-part ranges move; no character AI, skeleton or per-frame
// geometry allocation is needed for the distant harbor traffic.
export function createRiverboatCrew(parent,{kind='barge',deck=.68,beam=2.4,length=10}={}){
  const b=createSceneryBuilder(kind+' river crew / working sweeps and tiller'),parts=[],actors=[],oars=[];
  const matrix=new THREE.Matrix4(),normalMatrix=new THREE.Matrix3(),point=new THREE.Vector3(),normal=new THREE.Vector3();
  const axis=new THREE.Vector3(0,0,1),direction=new THREE.Vector3(),quaternion=new THREE.Quaternion(),scale=new THREE.Vector3();
  const cameraPosition=new THREE.Vector3(),boatPosition=new THREE.Vector3();
  let distanceSq=0,lastTime=-Infinity,updates=0,disposed=false,phase='moored',rowing=false,steering=0,lastSignature='';
  function part(build){const start=b.vertexCount;build();const item={start,end:b.vertexCount,matrix:new THREE.Matrix4()};parts.push(item);return item;}
  function segment(color,width){return part(()=>b.box(color,0,0,.5,width,width,1));}
  function moveSegment(item,a,c){
    direction.subVectors(c,a);const length=direction.length();quaternion.setFromUnitVectors(axis,direction.multiplyScalar(1/Math.max(.0001,length)));
    item.matrix.compose(a,quaternion,scale.set(1,1,length));
  }
  function actor(x,z,{standing=false,tunic=TEAL,cap=CREAM,role='rower',yaw=0,y=deck}={}){
    const hip=standing?.83:.38;
    // Feet and bent knees stay planted on deck. Full caps cover the scalp.
    b.frame(x,y,z,yaw,()=>{
      for(const side of [-1,1]){
        const knee=[side*.15,standing?.43:.33,standing?0:.38],foot=[side*.15,.08,standing?.06:.43];
        b.beam(DARK,[side*.14,hip,0],knee,.19);b.beam(DARK,knee,foot,.15);b.box(DARK,foot[0],.065,foot[2]+.06,.19,.13,.32);
      }
      if(!standing)b.box(WOOD,0,.32,0,.72,.12,.37);
    });
    const body=part(()=>{
      b.box(tunic,0,.22,0,.43,.5,.27);b.box(DARK,0,-.015,0,.46,.09,.29);
      b.cylinder(SKIN,0,.46,0,.075,.13);b.rock(SKIN,0,.68,.015,.16,.21,.155);
      b.rock(SKIN,0,.67,.16,.05,.065,.06);b.rock(DARK,0,.575,.09,.115,.08,.09);
      b.cylinder(cap,0,.78,-.005,.17,.095);b.box(cap,0,.79,.11,.29,.035,.2);
    });
    const arms=[-1,1].map(()=>({upper:segment(tunic,.135),fore:segment(SKIN,.105)}));
    const record={x,y,z,hip,standing,role,yaw,body,arms,shoulder:new THREE.Vector3(),elbow:new THREE.Vector3(),hand:new THREE.Vector3(),frame:new THREE.Matrix4()};actors.push(record);return record;
  }
  function rower(z){
    const person=actor(0,z,{yaw:Math.PI,tunic:actors.length%2?CREAM:TEAL,cap:DARK});
    for(const side of [-1,1]){
      const pivot=new THREE.Vector3(side*(beam/2-.17),deck+.29,z),oar=part(()=>{
        b.beam(WOOD,[-.79,0,0],[1.17,0,0],.065);b.box(CREAM,1.02,0,0,.42,.055,.18);
      });
      b.box(DARK,pivot.x,pivot.y-.01,pivot.z,.13,.16,.16);
      oars.push({side,pivot,oar,person,hand:new THREE.Vector3()});
    }
  }
  if(kind==='guard'){
    actor(0,-length*.4,{standing:true,role:'helmsman',cap:DARK});
    actor(-1.7,2.5,{standing:true,role:'watch',yaw:-.45,tunic:CREAM,cap:TEAL});
    actor(.85,5.45,{standing:true,role:'ballista',yaw:-.55,cap:DARK});
  }else{
    actor(0,-length*.38,{role:'helmsman',cap:DARK});
    rower(kind==='passage'?3.05:2.85);
    if(kind==='passage')rower(-2.85);
  }
  const tillerPivot=new THREE.Vector3(0,deck+(kind==='guard'?.6:.18),-length*.47),tiller=part(()=>{
    b.beam(WOOD,[0,0,0],[0,.23,1.13],.11);b.beam(DARK,[0,0,0],[0,-tillerPivot.y,0],.1);
    b.box(DARK,0,-tillerPivot.y-.15,-.06,.1,kind==='guard'?2:1.4,.65);
  });
  const mesh=b.finish(parent,{castShadow:false}),positions=mesh.geometry.attributes.position,normals=mesh.geometry.attributes.normal;
  const restPositions=positions.array.slice(),restNormals=normals.array.slice();
  mesh.userData.riverboatCrew=true;mesh.userData.crewCount=actors.length;
  // A deliberately conservative bound covers the oars throughout their stroke.
  mesh.geometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,deck+.6,0),Math.hypot(length/2+1,beam/2+1.1,2));
  mesh.onBeforeRender=(_renderer,_scene,camera)=>{camera.getWorldPosition(cameraPosition);mesh.getWorldPosition(boatPosition);distanceSq=cameraPosition.distanceToSquared(boatPosition);};

  function update(time,pose={},observer=null){
    if(disposed)return;
    for(let p=mesh;p;p=p.parent)if(!p.visible)return;
    if(observer){mesh.getWorldPosition(boatPosition);distanceSq=(observer.x-boatPosition.x)**2+(observer.z-boatPosition.z)**2;}
    const nextPhase=pose.phase??'sailing',nextRowing=kind!=='guard'&&pose.rowing!==false&&nextPhase!=='moored';
    const signature=nextPhase+':'+nextRowing,interval=distanceSq>320**2?Infinity:distanceSq>160**2?.65:distanceSq>65**2?.2:1/15;
    if(signature===lastSignature&&time>=lastTime&&time-lastTime<interval)return;
    phase=nextPhase;rowing=nextRowing;lastSignature=signature;lastTime=time;updates++;
    steering=clamp((pose.turnRate??0)*1.8,-.38,.38)+(phase==='moored'?0:Math.sin(time*.43)*.035);
    tiller.matrix.makeRotationY(steering).setPosition(tillerPivot);
    const pulse=time*(1.35+Math.min(3,Math.max(0,pose.speed??1.9))*.16),stroke=Math.sin(pulse),recovery=Math.max(0,Math.cos(pulse));
    for(const item of oars){
      // Sweep blades dip on the pull and lift on recovery. Near masonry the
      // entire sweep is shipped lengthways along the rail, inside the beam.
      const yaw=rowing?item.side*(.22*stroke):item.side*Math.PI/2;
      const dip=rowing?-.72+recovery*.2:0;
      const euler=new THREE.Euler(0,yaw+(item.side<0?Math.PI:0),dip,'YXZ');quaternion.setFromEuler(euler);
      item.oar.matrix.compose(item.pivot,quaternion,scale.set(1,1,1));
      item.hand.set(-.73,0,0).applyMatrix4(item.oar.matrix);
    }
    for(let i=0;i<actors.length;i++){
      const person=actors[i],lean=person.role==='rower'&&rowing?stroke*.08:person.role==='ballista'?.11+Math.sin(time*.6)*.035:Math.sin(time*.65+i)*.012;
      const watch=person.role==='watch'?Math.sin(time*.23+i)*.16:0;
      person.frame.makeRotationY(person.yaw+watch).setPosition(person.x,person.y+person.hip,person.z);
      matrix.makeRotationX(lean);person.body.matrix.multiplyMatrices(person.frame,matrix);
      for(let j=0;j<2;j++){
        const side=j?1:-1;
        person.shoulder.set(side*.25,.4,0).applyMatrix4(person.body.matrix);
        if(person.role==='rower'&&rowing){
          // Rowers face astern: their right hand takes the port sweep.
          person.hand.copy(oars.find(o=>o.person===person&&o.side===-side).hand);
        }else if(person.role==='rower')person.hand.set(side*.2,-.13,.27).applyMatrix4(person.body.matrix);
        else if(person.role==='helmsman'){
          person.hand.set(side*.08,.23,.97).applyMatrix4(tiller.matrix);
        }else if(person.role==='ballista')person.hand.set(.48+side*.12,deck+1.23,5.91);
        else person.hand.set(side*.31,-.24,.12).applyMatrix4(person.body.matrix);
        person.elbow.copy(person.shoulder).lerp(person.hand,.5);person.elbow.x+=side*.09;person.elbow.z-=.075;
        moveSegment(person.arms[j].upper,person.shoulder,person.elbow);moveSegment(person.arms[j].fore,person.elbow,person.hand);
      }
    }
    for(const item of parts){
      normalMatrix.getNormalMatrix(item.matrix);
      for(let i=item.start;i<item.end;i++){
        point.fromArray(restPositions,i*3).applyMatrix4(item.matrix);positions.setXYZ(i,point.x,point.y,point.z);
        normal.fromArray(restNormals,i*3).applyMatrix3(normalMatrix).normalize();normals.setXYZ(i,normal.x,normal.y,normal.z);
      }
    }
    positions.needsUpdate=true;normals.needsUpdate=true;
  }
  update(0,{phase:'moored',rowing:false});
  return {mesh,update,state:()=>({crew:actors.length,helmsmen:1,rowers:actors.filter(a=>a.role==='rower').length,phase,rowing,steering,updates,triangles:positions.count/3}),
    dispose(){if(disposed)return;disposed=true;mesh.onBeforeRender=()=>{};mesh.removeFromParent();mesh.geometry.dispose();}
  };
}
