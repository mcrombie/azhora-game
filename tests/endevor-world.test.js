import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {scopedWorld} from './scoped-world.js';
import {sourceModule} from './module-loader.js';
import {ENDEVOR_BRIDGE,ENDEVOR_QUAYS,ENDEVOR_ROADS,endevorQuayHeight,endevorDry} from '../src/content/regions/endevor/endevor-layout.js';
import {ENDEVOR_BUILDINGS} from '../src/content/regions/endevor/endevor-country.js';
const {canStand}=await sourceModule('../src/gameplay/movement/locomotion.js');
const scene=new THREE.Scene(),world=await scopedWorld(scene,[77,78]);
test('production streaming constructs the port once and connects both banks',()=>{
  let towns=0;scene.traverse(o=>{if(o.name==='Endevor Town / river mouth')towns++;});assert.equal(towns,1);
  assert.ok(world.landmarks.some(m=>m.id==='endevor-town'));
  const b=ENDEVOR_BRIDGE;
  for(let x=b.x-b.length/2-2;x<=b.x+b.length/2+2;x+=.5){assert.ok(canStand(x,b.z,world,.34,world.heightAt(x,b.z)),`bridge approach ${x}`);}
  for(const q of ENDEVOR_QUAYS)for(let z=q.z-q.d/2;z<=q.z+q.d/2;z+=1){
    assert.ok(canStand(q.x,z,world,.34,world.heightAt(q.x,z)),'quay '+q.x+','+z);
    // At the bridge junction, the higher bridge deck wins.
    assert.ok(world.heightAt(q.x,z)>=endevorQuayHeight(q,z));
  }
});
test('buildings are solid, and the main market and bank streets are unobstructed',()=>{
  for(const p of ENDEVOR_BUILDINGS)assert.equal(canStand(p.x,p.z,world,.34,world.heightAt(p.x,p.z)),false,p.id);
  for(const line of ENDEVOR_ROADS)for(let i=1;i<line.length;i++){
    const a=line[i-1],b=line[i],n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/2);
    for(let j=0;j<=n;j++){
      const x=a.x+(b.x-a.x)*j/n,z=a.z+(b.z-a.z)*j/n;
      if(z> -3170||!endevorDry(x,z,2))continue;
      assert.ok(canStand(x,z,world,.34,world.heightAt(x,z)),`street ${x},${z}`);
    }
  }
});
