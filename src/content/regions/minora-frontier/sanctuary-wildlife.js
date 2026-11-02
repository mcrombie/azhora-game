import * as THREE from 'three';
import {buildSanctuaryAnimal} from './sanctuary-animal-models.js';

export function createSanctuaryWildlife(parent,ground,records){
  const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.93,flatShading:true});
  const shadowGeometry=new THREE.CircleGeometry(1,12);shadowGeometry.rotateX(-Math.PI/2);
  const shadowMaterial=new THREE.MeshBasicMaterial({color:'#263b2d',transparent:true,opacity:.18,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  const root=new THREE.Group();root.name='North American sanctuary wildlife';parent.add(root);
  const groups=new Map(),matrix=new THREE.Matrix4(),base=new THREE.Matrix4(),part=new THREE.Matrix4(),q=new THREE.Quaternion(),v=new THREE.Vector3(),one=new THREE.Vector3(1,1,1),shadowScale=new THREE.Vector3(),euler=new THREE.Euler();
  const animals=records.flatMap((r,ri)=>Array.from({length:r.count},(_,i)=>({species:r.species,name:r.name,home:r,index:i,phase:ri*.73+i*2.4,clock:0,x:r.x+Math.sin(i*2.4)*6,z:r.z+Math.cos(i*2.4)*6,y:0,heading:i,hidden:true})));
  function groupFor(r){
    if(groups.has(r.species))return groups.get(r.species);
    const model=buildSanctuaryAnimal(r.species),g={model,meshes:{}};
    for(const name of ['body','head','leg','wing'])if(model[name]){
      const mesh=new THREE.InstancedMesh(model[name],material,r.count*(name==='leg'?(model.profile.bird?2:4):1));
      mesh.name=r.name+' / '+name;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.castShadow=false;mesh.frustumCulled=false;root.add(mesh);g.meshes[name]=mesh;
    }
    if(!model.profile.flight){
      const shadow=new THREE.InstancedMesh(shadowGeometry,shadowMaterial,r.count);shadow.name=r.name+' / ground contact';shadow.frustumCulled=false;root.add(shadow);g.meshes.shadow=shadow;
    }
    groups.set(r.species,g);return g;
  }
  function put(mesh,index,x,y,z,rx=0,rz=0){
    q.setFromEuler(euler.set(rx,0,rz));part.compose(v.set(x,y,z),q,one);matrix.multiplyMatrices(base,part);mesh.setMatrixAt(index,matrix);
  }
  function update(dt,player){
    root.visible=true;const step=Math.max(0,Math.min(.1,dt));
    for(const r of records){
      const distance=Math.hypot(player.x-r.x,player.z-r.z),near=distance<190;
      const existing=groups.get(r.species);if(!near){if(existing)for(const mesh of Object.values(existing.meshes))mesh.visible=false;for(const a of animals)if(a.home===r)a.hidden=true;continue;}
      const {model,meshes}=groupFor(r),p=model.profile;for(const mesh of Object.values(meshes))mesh.visible=true;
      for(const a of animals.filter(a=>a.home===r)){
        a.hidden=false;a.clock+=step;
        const t=a.clock*.035+a.phase,walking=Math.sin(a.clock*.18+a.phase)>.15||p.flight;
        if(walking){
          const rate=p.flight?.18:.035,angle=a.clock*rate+a.phase,radius=p.flight?30:Math.min(11,r.r*.58);
          const targetX=r.x+Math.sin(angle)*radius,targetZ=r.z+Math.cos(angle)*radius;
          const dx=targetX-a.x,dz=targetZ-a.z,span=Math.hypot(dx,dz),speed=p.flight?6:p.body>.8?.75:.48;
          if(span>.001){const move=Math.min(span,speed*step);a.x+=dx/span*move;a.z+=dz/span*move;a.heading=Math.atan2(dx,dz);}
        }
        a.y=ground.heightAt(a.x,a.z)+(p.flight?8+Math.sin(t)*1.5:0);
        if(/beaver|otter/.test(a.species))a.y=Math.max(a.y,ground.waterAt(a.x,a.z)-.16);
        q.setFromEuler(euler.set(0,a.heading,0));base.compose(v.set(a.x,a.y,a.z),q,one);
        put(meshes.body,a.index,0,0,0,0,p.flight?Math.sin(t)*.10:0);
        const graze=!walking&&['american-bison','elk','white-tailed-deer','moose'].includes(r.species);
        put(meshes.head,a.index,0,model.headAt.y,model.headAt.z,graze?.34+Math.sin(a.clock*.8)*.08:Math.sin(a.clock*.6+a.phase)*.035);
        const sides=p.bird?[[1,0],[-1,0]]:[[1,1],[-1,1],[1,-1],[-1,-1]];
        sides.forEach(([side,fore],i)=>{
          const swing=walking&&!p.flight?Math.sin(a.clock*(p.body>.8?3:5)+i*Math.PI*.7)*.25:0;
          const lx=side*p.w*.68,lz=fore*p.hip,wx=a.x+Math.cos(a.heading)*lx+Math.sin(a.heading)*lz,wz=a.z-Math.sin(a.heading)*lx+Math.cos(a.heading)*lz;
          const dy=p.flight?0:ground.heightAt(wx,wz)-a.y;
          put(meshes.leg,a.index*sides.length+i,lx,dy+p.leg*Math.cos(swing),lz,swing);
        });
        if(meshes.wing)put(meshes.wing,a.index,0,p.body+.12,0,0,Math.sin(t)*.10);
        if(meshes.shadow){
          const floor=ground.heightAt(a.x,a.z),wet=ground.waterAt(a.x,a.z)>floor+.03;
          q.setFromEuler(euler.set(0,a.heading,0));part.compose(v.set(a.x,floor+.035,a.z),q,shadowScale.set(wet?0:p.w*.9,1,p.d));
          meshes.shadow.setMatrixAt(a.index,part);
        }
      }
      for(const mesh of Object.values(meshes))mesh.instanceMatrix.needsUpdate=true;
    }
  }
  return {update,hide(){root.visible=false;},snapshot:()=>animals.map(a=>({species:a.species,name:a.name,x:a.x,y:a.y,z:a.z,heading:a.heading,hidden:a.hidden})),
    stats:()=>({loadedGroups:groups.size,activeGroups:[...groups.values()].filter(g=>g.meshes.body.visible&&root.visible).length,drawCalls:[...groups.values()].reduce((n,g)=>n+Object.values(g.meshes).filter(m=>m.visible&&root.visible).length,0),animals:animals.length}),
    dispose(){for(const g of groups.values())for(const name of ['body','head','leg','wing'])g.model[name]?.dispose();material.dispose();shadowGeometry.dispose();shadowMaterial.dispose();root.removeFromParent();},
  };
}
