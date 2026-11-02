import * as THREE from 'three';
import {createSceneryBuilder} from './scenery-builder.js';

// Separate standards can clear the follow camera without fading a whole town.
export function createLeagueStandards(parent,heightAt,points,{cloth='#8b633e',timber='#675240',gold='#ccb978'}={}){
  const ray=new THREE.Ray(),direction=new THREE.Vector3(),hit=new THREE.Vector3(),focus=new THREE.Vector3();
  const flags=points.map(([x,z])=>{
    const b=createSceneryBuilder('League standard'),y=heightAt(x,z);
    b.block(timber,x,y,z,.13,5,.13);const first=b.vertexCount;
    b.sheet(cloth,[x,y+4.8,z],[x+1.7,y+4.8,z],[x+1.7,y+2.6,z],[x,y+2.7,z]);
    const end=b.vertexCount;b.block(gold,x+.8,y+3.3,z+.02,.15,.85,.06);
    const mesh=b.finish(parent);mesh.material=mesh.material.clone();
    mesh.userData.cameraStandard=true;mesh.geometry.computeBoundingBox();
    return {mesh,first,end,box:new THREE.Box3(),faded:false};
  });
  return {
    setColor(value=cloth){const color=new THREE.Color(value??cloth);for(const f of flags){const a=f.mesh.geometry.attributes.color;for(let i=f.first;i<f.end;i++)a.setXYZ(i,color.r,color.g,color.b);a.needsUpdate=true;}},
    updateCamera(camera,hero){
      focus.set(hero.x,hero.y+1.4,hero.z);direction.subVectors(focus,camera.position);
      const length=direction.length();ray.set(camera.position,direction.normalize());
      for(const f of flags){
        f.mesh.updateWorldMatrix(true,false);f.box.copy(f.mesh.geometry.boundingBox).applyMatrix4(f.mesh.matrixWorld).expandByScalar(.55);
        const blocked=!!ray.intersectBox(f.box,hit)&&hit.distanceTo(camera.position)<length;
        if(blocked===f.faded)continue;f.faded=blocked;
        f.mesh.material.transparent=blocked;f.mesh.material.opacity=blocked?.12:1;
        f.mesh.material.depthWrite=!blocked;f.mesh.material.needsUpdate=true;
      }
    },
    state(){const f=flags[0],a=f.mesh.geometry.attributes.color;return {count:flags.length,color:'#'+new THREE.Color().setRGB(a.getX(f.first),a.getY(f.first),a.getZ(f.first)).getHexString(),faded:flags.filter(f=>f.faded).length};},
  };
}
