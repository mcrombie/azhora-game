import test from 'node:test';
import assert from 'node:assert/strict';
import {stopAtHorse,HORSE_BODY} from '../src/gameplay/movement/horse-contact.js';
import {createRiding,dismountSpot,RIDE} from '../src/gameplay/movement/riding.js';

const horse={x:0,y:0,z:0,yaw:0},point=(x,z,y=0)=>({x,y,z});
test('parked horse stops walking or running through either flank or end',()=>{
  const r=HORSE_BODY.radius+.34;
  for(const sign of [-1,1]){
    const side=stopAtHorse(point(sign*4,0),point(-sign*4,0),horse);
    assert(side);assert(Math.abs(side.x-sign*r)<.002);assert.equal(side.z,0);
  }
  const front=stopAtHorse(point(0,4),point(0,-4),horse),rear=stopAtHorse(point(0,-4),point(0,4),horse);
  assert(Math.abs(front.z-(HORSE_BODY.front+r))<.002);
  assert(Math.abs(rear.z-(HORSE_BODY.rear-r))<.002);
  assert.equal(stopAtHorse(point(-4,2),point(4,2),horse),null,'A path beyond the muzzle stays clear');
});
test('contact turns with the horse and remains stable at large world coordinates',()=>{
  for(const yaw of [0,.4,Math.PI/2,Math.PI,4.7]){
    const h={x:-2400,y:18,z:170,yaw};
    const p=(x,z)=>point(h.x+x*Math.cos(yaw)+z*Math.sin(yaw),h.z-x*Math.sin(yaw)+z*Math.cos(yaw),18);
    const hit=stopAtHorse(p(3,0),p(-3,0),h);assert(hit);
    assert(Math.abs(Math.hypot(hit.x-h.x,hit.z-h.z)-.721)<1e-8);
  }
});
test('existing mounted-save overlap permits escape, and boundary contact permits walking away',()=>{
  for(const target of [point(2,0),point(-2,0),point(0,2),point(0,-2)])assert.equal(stopAtHorse(point(0,0),target,horse),null);
  assert.deepEqual(stopAtHorse(point(.5,0),point(.1,0),horse),{x:.5,z:0},'An existing side overlap cannot move further inward');
  assert.equal(stopAtHorse(point(.72,0),point(1,0),horse),null);
  assert.equal(stopAtHorse(point(.8,-2),point(.8,2),horse),null,'Can walk around the flank');
  const ride=createRiding();ride.grant(horse);ride.mount(horse);const restored=createRiding();restored.restore(ride.snapshot());
  assert(!restored.mounted);assert.equal(stopAtHorse(point(0,0),point(1,0),{...restored.horse,y:0}),null);
});
test('a low jump still meets the horse; a different bridge level or flight does not',()=>{
  assert(stopAtHorse(point(-2,0,1),point(2,0,1),horse));
  assert.equal(stopAtHorse(point(-2,0,3),point(2,0,3),horse),null);
  assert.equal(stopAtHorse(point(-2,0,-4),point(2,0,-4),horse),null);
});
test('solid horse retains mounting reach, dismount room and the whistle stopping gap',()=>{
  for(const yaw of [0,Math.PI/2,2.1]){
    const at={...horse,yaw},spot=dismountSpot(at,yaw,()=>true);
    assert(spot);assert(Math.hypot(spot.x,spot.z)<RIDE.reach);
    assert.equal(stopAtHorse({...spot,y:0},{...spot,x:spot.x+.001*Math.cos(yaw),y:0},at),null);
  }
  assert(RIDE.halt>HORSE_BODY.front+HORSE_BODY.radius+.34);
});
