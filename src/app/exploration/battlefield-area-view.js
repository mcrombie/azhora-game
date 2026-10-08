import * as THREE from 'three';
import {BATTLEFIELD_AREA} from './battlefield-area.js';

// A terrain-following opaque veil marks the active battle instance.
// Hidden during combat; nonparticipants stop at this same perimeter.
export function createBattlefieldAreaView(scene,world){
  const footprints=new Map(),radius=BATTLEFIELD_AREA.radius,segments=96,pennants=12;
  const lineMaterial=new THREE.MeshBasicMaterial({color:0xe3b959,transparent:true,opacity:.72,side:THREE.DoubleSide,depthWrite:false});
  const poleGeometry=new THREE.CylinderGeometry(.045,.055,2.1,4),flagGeometry=new THREE.PlaneGeometry(.95,.5);
  const poleMaterial=new THREE.MeshStandardMaterial({color:0x715734});
  const flagMaterial=new THREE.MeshBasicMaterial({color:0xd3ab5c,side:THREE.DoubleSide});
  const wallMaterial=new THREE.MeshBasicMaterial({color:0x846947,transparent:true,opacity:.76,side:THREE.DoubleSide,depthWrite:false});
  const dummy=new THREE.Object3D();
  function surface(x,z){
    if(!world.readyAt(x,z))return null;
    const height=world.heightAt(x,z),water=world.waterAt(x,z);
    return Number.isFinite(height)&&Number.isFinite(water)?Math.max(height,water):null;
  }
  function remove(entry){scene.remove(entry.root);entry.line.geometry.dispose();entry.wall.geometry.dispose();entry.poles.dispose();entry.flags.dispose();}
  function build(entry,at){
    const points=[],wallPoints=[];let count=0,complete=true;
    for(let i=0;i<segments;i++){
      const a=i/segments*Math.PI*2,b=(i+1)/segments*Math.PI*2;
      const ends=[a,b].map(t=>{const x=at.x+Math.sin(t)*radius,z=at.z+Math.cos(t)*radius,y=surface(x,z);return y===null?null:[x,y,z];});
      if(ends.some(p=>!p)){complete=false;continue;}
      const [p,q]=ends,quad=[p,q,[q[0],q[1]+8,q[2]],[p[0],p[1]+8,p[2]]];
      for(const n of [0,1,2,0,2,3])wallPoints.push(...quad[n]);
    }
    entry.wall.geometry.dispose();entry.wall.geometry=new THREE.BufferGeometry();entry.wall.geometry.setAttribute('position',new THREE.Float32BufferAttribute(wallPoints,3));entry.wall.geometry.computeBoundingSphere();
    for(let i=0;i<segments;i++){
      const a=i/segments*Math.PI*2,b=(i+.64)/segments*Math.PI*2;
      // A narrow ground ribbon stays readable from a normal player camera.
      // Pixel-thin lines disappear in the grass on the rolling Caricas approach.
      const corners=[[a,radius-.22],[a,radius+.22],[b,radius+.22],[b,radius-.22]].map(([angle,r])=>{
        const x=at.x+Math.sin(angle)*r,z=at.z+Math.cos(angle)*r,y=surface(x,z);
        return y===null?null:[x,y+.16,z];
      });
      if(corners.some(p=>!p)){complete=false;continue;}
      for(const i of [0,1,2,0,2,3])points.push(...corners[i]);
    }
    entry.line.geometry.dispose();entry.line.geometry=new THREE.BufferGeometry();
    entry.line.geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
    entry.line.geometry.computeBoundingSphere();
    for(let i=0;i<pennants;i++){
      const a=i/pennants*Math.PI*2,x=at.x+Math.sin(a)*radius,z=at.z+Math.cos(a)*radius,y=surface(x,z);
      if(y===null){complete=false;continue;}
      dummy.position.set(x,y+1.05,z);dummy.rotation.set(0,0,0);dummy.updateMatrix();entry.poles.setMatrixAt(count,dummy.matrix);
      // Pennants identify the edge where the player can opt into the battle.
      dummy.position.set(x+Math.cos(a)*.46,y+1.78,z-Math.sin(a)*.46);dummy.rotation.y=a;dummy.updateMatrix();entry.flags.setMatrixAt(count,dummy.matrix);count++;
    }
    entry.poles.count=entry.flags.count=count;entry.poles.instanceMatrix.needsUpdate=entry.flags.instanceMatrix.needsUpdate=true;
    entry.complete=complete;entry.age=0;entry.segments=points.length/18;entry.pennants=count;entry.location={x:at.x,z:at.z};
  }
  function update(battles,known,position,{enabled=true,dt=1/60}={}){
    const active=battles.filter(b=>b.status==='active'&&Number.isFinite(b.location?.x)&&Number.isFinite(b.location?.z)),ids=new Set(active.map(b=>b.id));
    for(const [id,entry]of footprints)if(!ids.has(id)){remove(entry);footprints.delete(id);}
    for(const battle of active){
      const at=battle.location,visible=!!(enabled&&known(at)&&world.readyAt(at.x,at.z)&&Math.hypot(position.x-at.x,position.z-at.z)<radius+180);
      let entry=footprints.get(battle.id);
      if(!entry&&visible){
        const root=new THREE.Group();root.name=`Battlefield perimeter / ${battle.id}`;
        const line=new THREE.Mesh(new THREE.BufferGeometry(),lineMaterial),poles=new THREE.InstancedMesh(poleGeometry,poleMaterial,pennants),flags=new THREE.InstancedMesh(flagGeometry,flagMaterial,pennants);
        poles.frustumCulled=false;flags.frustumCulled=false;const wall=new THREE.Mesh(new THREE.BufferGeometry(),wallMaterial);wall.name='Battle exclusion wall';root.add(line,poles,flags,wall);scene.add(root);
        entry={root,line,poles,flags,wall,location:null,age:0,complete:false};footprints.set(battle.id,entry);
      }
      if(!entry)continue;entry.root.visible=visible;if(!visible)continue;
      entry.age+=Math.max(0,Number.isFinite(dt)?dt:0);
      if(entry.location?.x!==at.x||entry.location?.z!==at.z||!entry.complete&&entry.age>=1)build(entry,at);
    }
  }
  return {update,
    state:()=>[...footprints].filter(([,e])=>e.root.visible).map(([id,e])=>({id,radius,wallHeight:8,wallOpacity:wallMaterial.opacity,location:{...e.location},segments:e.segments,pennants:e.pennants,complete:e.complete})),
    dispose(){for(const entry of footprints.values())remove(entry);footprints.clear();wallMaterial.dispose();lineMaterial.dispose();poleGeometry.dispose();flagGeometry.dispose();poleMaterial.dispose();flagMaterial.dispose();}
  };
}
