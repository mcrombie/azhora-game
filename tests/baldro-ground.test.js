import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { refineBaldroGround } from '../src/content/regions/baldro/baldro-ground.js';
import { BALDRO_KINGDOMS, BALDRO_RIVERS, baldroSurfaceHeight, baldroWaterAt } from '../src/content/regions/baldro/baldro-world.js';

test('Baldro forecourt refinement draws the same ground its foot sampler returns',()=>{
  for(const kingdom of BALDRO_KINGDOMS){
    const g=kingdom.gate,minX=g.x-65,minZ=g.z-50,columns=20,rows=20,step=7.1,data=[],ids=[];
    for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){const x=minX+i*step,z=minZ+j*step;data.push(x,baldroSurfaceHeight(x,z),z);}
    for(let j=0;j<rows-1;j++)for(let i=0;i<columns-1;i++){const k=j*columns+i;ids.push(k,k+columns,k+1,k+1,k+columns,k+columns+1);}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(data,3));geometry.setIndex(ids);geometry.computeBoundingBox();geometry.computeBoundingSphere();
    const position=geometry.attributes.position,before=position.array.slice(),mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial()),root=new THREE.Group();root.add(mesh);
    const coarse=(x,z)=>{const i=Math.floor((x-minX)/step),j=Math.floor((z-minZ)/step);if(i<0||j<0||i>=columns-1||j>=rows-1)return baldroSurfaceHeight(x,z);const u=(x-minX)/step-i,v=(z-minZ)/step-j,k=j*columns+i,a=position.getY(k),b=position.getY(k+1),c=position.getY(k+columns),d=position.getY(k+columns+1);return u+v<=1?a+(b-a)*u+(c-a)*v:d+(c-d)*(1-u)+(b-d)*(1-v);};
    const result=refineBaldroGround({THREE,terrainRoot:root,heightAt:baldroSurfaceHeight,coarseHeightAt:coarse});
    assert.ok(result.metrics.removedTriangles>0);assert.ok(result.metrics.spacing<=2);assert.deepEqual(position.array,before,'shared source positions stay unchanged');
    root.updateMatrixWorld(true);const ray=new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,-1,0));
    for(const dx of[-28,-7,0,19,28])for(const dz of[-12,0,17,25]){
      const x=g.x+dx,z=g.z+dz;ray.ray.origin.set(x,1000,z);const hits=ray.intersectObjects(root.children,false);
      assert.ok(hits.length);assert.ok(Math.abs(hits[0].point.y-result.heightAt(x,z))<.0001,'physics matches rendered FLOAT32 faces');
      assert.ok(Math.abs(result.heightAt(x,z)-g.y)<.02,'entrance terrace remains level');
    }
    assert.equal(result.heightAt(0,0),coarse(0,0));
    for(const child of root.children)child.geometry.dispose();mesh.material.dispose();
  }
});

test('the refined mapped river bed remains beneath visible water between coarse terrain samples',()=>{
  const river=BALDRO_RIVERS[0],b=river.bounds,step=7.1,minX=b.minX-30,minZ=b.minZ-30;
  const columns=Math.ceil((b.maxX-minX+30)/step)+1,rows=Math.ceil((b.maxZ-minZ+30)/step)+1,data=[],ids=[];
  for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){const x=minX+i*step,z=minZ+j*step;data.push(x,baldroSurfaceHeight(x,z),z);}
  for(let j=0;j<rows-1;j++)for(let i=0;i<columns-1;i++){const k=j*columns+i;ids.push(k,k+columns,k+1,k+1,k+columns,k+columns+1);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(data,3));geometry.setIndex(ids);geometry.computeBoundingBox();geometry.computeBoundingSphere();
  const root=new THREE.Group(),mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial());root.add(mesh);
  const refined=refineBaldroGround({THREE,terrainRoot:root,heightAt:baldroSurfaceHeight,coarseHeightAt:baldroSurfaceHeight});
  for(let i=1;i<river.points.length;i+=3){const a=river.points[i-1],p=river.points[i],x=(a.x+p.x)/2,z=(a.z+p.z)/2;assert.ok(refined.heightAt(x,z)<baldroWaterAt(x,z)-.1,`buried river at ${x},${z}`);}
  for(const child of root.children)child.geometry.dispose();mesh.material.dispose();
});
