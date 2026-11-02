import test from 'node:test';
import assert from 'node:assert/strict';
import {createDayNightClock,daylightSample,DAY_NIGHT_SECONDS,NIGHT_LIGHT_FLOOR} from '../src/experiments/day-night/day-night-clock.js';
import {sourceModule} from './module-loader.js';
const THREE=await import('../vendor/three.module.js');
const {createDayNightExperiment}=await sourceModule('../src/experiments/day-night/day-night-experiment.js');
const near=(a,b,epsilon=1e-9)=>assert.ok(Math.abs(a-b)<epsilon,`${a} != ${b}`);

test('24 active real minutes produce a day; demo takes one minute without consuming campaign time',()=>{
  const clock=createDayNightClock({hour:6});clock.setEnabled(true);clock.setRunning(true);
  clock.update(DAY_NIGHT_SECONDS/2);near(clock.state().hour,18);
  clock.update(DAY_NIGHT_SECONDS/2);near(clock.state().hour,6);
  clock.setSpeed(24);clock.update(30);near(clock.state().hour,18);clock.update(30);near(clock.state().hour,6);
  assert.equal(clock.state().cycleSeconds,60);
});

test('disabled, paused, inactive and indoor clocks do not advance or accumulate catch-up time',()=>{
  const clock=createDayNightClock({hour:10});clock.setRunning(true);clock.update(200);clock.setEnabled(true);
  clock.update(200,{active:false});clock.update(200,{exterior:false});clock.setRunning(false);clock.update(200);
  near(clock.state().hour,10);clock.setRunning(true);clock.update(60);near(clock.state().hour,11);
  clock.update(NaN);clock.update(-20);clock.setSpeed(Infinity);clock.setHour(NaN);near(clock.state().hour,11);
});

test('sun rises east, sets west; two distinct moons share a continuous bounded readable cycle',()=>{
  const dawn=daylightSample(6),midday=daylightSample(12),dusk=daylightSample(18),night=daylightSample(0);
  assert.ok(dawn.sun.x>.99);assert.ok(dusk.sun.x<-.99);assert.ok(midday.sun.y>.9);assert.ok(night.sova.y>.9);
  assert.notDeepEqual(night.sova,night.vel);
  assert.ok(daylightSample(18.5).twilight>.4,'Dusk retains a visible afterglow after sunset');
  assert.equal(night.twilight,0,'The dusk afterglow does not brighten midnight');
  for(let h=0;h<24;h+=.01){const s=daylightSample(h);assert.ok(s.sunIntensity>=NIGHT_LIGHT_FLOOR.sun&&s.sunIntensity<=2.1);assert.ok(s.hemisphereIntensity>=NIGHT_LIGHT_FLOOR.hemisphere&&s.hemisphereIntensity<=1.65);near(Math.hypot(s.sun.x,s.sun.y,s.sun.z),1);}
  const before=daylightSample(24-1e-5),after=daylightSample(1e-5);near(before.sun.x,after.sun.x,1e-5);near(before.sunIntensity,after.sunIntensity,1e-5);
});

function fixture(){
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(55,1,.1,700);
  scene.background=new THREE.Color(0xb6c8b0);scene.fog=new THREE.Fog(0xb6c8b0,180,560);
  const sun=new THREE.DirectionalLight(0xffe6ba,2.1),hemisphere=new THREE.HemisphereLight(0xf0f2d8,0x53644b,1.65);
  sun.position.set(-100,180,70);scene.add(sun,hemisphere);const experiment=createDayNightExperiment({scene,camera,sun,hemisphere});
  return {scene,camera,sun,hemisphere,experiment};
}
function lighting(f){return {background:f.scene.background?.getHex(),fog:f.scene.fog?.color.getHex(),near:f.scene.fog?.near,far:f.scene.fog?.far,sun:f.sun.color.getHex(),position:f.sun.position.toArray(),intensity:f.sun.intensity,sky:f.hemisphere.color.getHex(),ground:f.hemisphere.groundColor.getHex(),hemisphere:f.hemisphere.intensity};}

test('experiment restores exact host light values and fog distances; sky follows camera with no new lights',()=>{
  const f=fixture(),before=lighting(f);f.experiment.update(60,{active:true,exterior:true});assert.deepEqual(lighting(f),before);
  f.experiment.setHour(0);f.experiment.setEnabled(true);f.camera.position.set(500,155,-230);f.experiment.update(0,{active:true,exterior:true});
  assert.notDeepEqual(lighting(f),before);assert.deepEqual(f.scene.getObjectByName('Day/night atmosphere experiment').position.toArray(),[500,155,-230]);
  assert.equal(f.scene.fog.near,before.near);assert.equal(f.scene.fog.far,before.far);assert.equal(f.scene.children.filter(c=>c.isLight).length,2);
  assert.ok(f.experiment.state().drawCalls<=6);f.experiment.setEnabled(false);assert.deepEqual(lighting(f),before);
  f.experiment.dispose();
});

test('room replacement restores indoor host environment and uses the new lookout baseline on exit',()=>{
  const f=fixture();f.experiment.setHour(0);f.experiment.setEnabled(true);
  f.scene.background=new THREE.Color(0x354751);f.scene.fog=null;f.sun.intensity=.45;f.experiment.update(0,{active:false,exterior:false});
  assert.equal(f.scene.background.getHex(),0x354751);assert.equal(f.scene.fog,null);assert.equal(f.sun.intensity,.45);assert.equal(f.experiment.state().visible,false);
  f.scene.background=new THREE.Color(0xaabbcc);f.scene.fog=new THREE.Fog(0xaabbcc,2500,4100);f.camera.far=6000;f.sun.intensity=2.1;
  f.experiment.update(0,{active:true,exterior:true});assert.notEqual(f.scene.background.getHex(),0xaabbcc);
  f.experiment.setEnabled(false);assert.equal(f.scene.background.getHex(),0xaabbcc);assert.equal(f.scene.fog.color.getHex(),0xaabbcc);assert.equal(f.scene.fog.far,4100);
  f.experiment.dispose();
});

test('constructing in Taleth’s indoor room still restores the later exterior intensity',()=>{
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(55,1,.1,700),sun=new THREE.DirectionalLight(0xffe6ba,.45),hemisphere=new THREE.HemisphereLight(0xf0f2d8,0x53644b,1.65);
  scene.background=new THREE.Color(0x354751);scene.fog=null;sun.position.set(-100,180,70);
  const experiment=createDayNightExperiment({scene,camera,sun,hemisphere});experiment.update(0,{exterior:false});
  scene.background=new THREE.Color(0xb6c8b0);scene.fog=new THREE.Fog(0xb6c8b0,180,560);sun.intensity=2.1;
  experiment.update(0,{exterior:true});experiment.setEnabled(true);experiment.setHour(0);experiment.setEnabled(false);
  assert.equal(sun.intensity,2.1);assert.equal(scene.background.getHex(),0xb6c8b0);experiment.dispose();
});

test('dispose releases every preview geometry/material exactly once and cannot recreate or advance it',()=>{
  const f=fixture(),before=lighting(f),root=f.scene.getObjectByName('Day/night atmosphere experiment');let geometryDisposals=0,materialDisposals=0;
  root.traverse(c=>{c.geometry?.addEventListener('dispose',()=>geometryDisposals++);c.material?.addEventListener('dispose',()=>materialDisposals++);});
  f.experiment.setEnabled(true);f.experiment.dispose();f.experiment.dispose();f.experiment.setEnabled(true);f.experiment.update(60,{active:true,exterior:true});
  assert.equal(geometryDisposals,6);assert.equal(materialDisposals,6);assert.equal(f.scene.getObjectByName(root.name),undefined);assert.deepEqual(lighting(f),before);assert.equal(f.experiment.state().visible,false);assert.equal(f.experiment.state().disposed,true);
});
