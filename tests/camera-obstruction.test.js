import test from 'node:test';
import assert from 'node:assert/strict';
import {createCameraObstruction} from '../src/app/exploration/camera-obstruction.js';
import {createColliderGrid} from '../src/world/collision/collider-grid.js';

test('camera keeps clear space and water open, but stops before a solid wall',()=>{
  const shapes=[{x:0,z:5,hx:4,hz:.5,minY:0,maxY:6,kind:'building'}];let queries=0;
  const grid=createColliderGrid(shapes),world={nearColliders(...args){queries++;return grid.near(...args);},heightAt:()=>0};
  const clip=createCameraObstruction(world),a={x:0,y:2,z:0},b={x:0,y:2,z:10};
  assert.equal(clip(a,b),10/24);assert.equal(queries,1);
  shapes[0].kind='river-water';assert.equal(clip(a,b),1);
  shapes[0].kind='building';assert.equal(clip({...a,y:8},{...b,y:8}),1);
  assert.equal(clip(a,{x:10,y:2,z:0}),1);
});

test('camera reads duplicate grid shapes once and preserves the minimum follow distance',()=>{
  const wall={x:0,z:.2,r:1,kind:'city-tower'};let heights=0;
  const clip=createCameraObstruction({nearColliders:()=>[wall,wall,wall],heightAt:()=>{heights++;return 0;}});
  assert.equal(clip({x:0,y:1,z:0},{x:0,y:1,z:8}),.12);assert.equal(heights,1);
});

test('conservative camera query never misses round or box colliders across grid boundaries',()=>{
  let seed=17;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
  const shapes=Array.from({length:80},(_,i)=>({x:random()*120-60,z:random()*120-60,minY:0,maxY:2+random()*12,...i%2?{r:1+random()*8}:{hx:1+random()*6,hz:1+random()*8}}));
  const grid=createColliderGrid(shapes),clip=createCameraObstruction({nearColliders:grid.near,heightAt:()=>0});
  for(let n=0;n<600;n++){
    const a={x:random()*100-50,y:1+random()*5,z:random()*100-50},b={x:a.x+random()*60-30,y:a.y+random()*15,z:a.z+random()*60-30};
    let expected=1;
    for(let i=1;i<=24;i++){
      const t=i/24,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t,z=a.z+(b.z-a.z)*t;
      if(shapes.some(c=>y>c.minY-.1&&y<c.maxY+.12&&(c.r!==undefined?Math.hypot(x-c.x,z-c.z)<c.r+.12:Math.abs(x-c.x)<c.hx+.12&&Math.abs(z-c.z)<c.hz+.12))){expected=Math.max(.12,(i-1)/24);break;}
    }
    assert.equal(clip(a,b),expected,`Camera path ${n}`);
  }
});
