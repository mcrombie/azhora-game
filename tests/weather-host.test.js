import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './module-loader.js';
const THREE=await sourceModule('../vendor/three.module.js');
const {createWeatherHost}=await sourceModule('../src/world/environment/weather-host.js');

function fixture({sky=null}={}){
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(55,1.5,.1,700);
  scene.background=new THREE.Color(0xb6c8b0);scene.fog=new THREE.Fog(0xb6c8b0,180,560);
  const sun=new THREE.DirectionalLight(0xffe6ba,2.1),hemisphere=new THREE.HemisphereLight(0xf0f2d8,0x53644b,1.65);
  scene.add(sun,hemisphere);
  if(sky)scene.add(sky);
  let region={id:62,name:'North Celder'};
  const position={x:0,y:0,z:0},world={regionAt:()=>region};
  const context={time:1000,active:true,exterior:true,night:0,dayNight:false},calls=[];
  let sheltered=false,disposed=0;
  const weather=createWeatherHost({scene,camera,sun,hemisphere,world,position,context:()=>context,
    viewFactory(options){assert.equal(options.scene,scene);assert.equal(options.camera,camera);assert.equal(options.world,world);
      return {update(dt,frame){calls.push({dt,...frame});},state:()=>({sheltered}),dispose(){disposed++;}};}});
  const lighting=()=>({background:scene.background?.getHex(),fog:scene.fog?.color.getHex(),near:scene.fog?.near,far:scene.fog?.far,
    sun:sun.color.getHex(),sunIntensity:sun.intensity,sky:hemisphere.color.getHex(),skyIntensity:hemisphere.intensity,ground:hemisphere.groundColor.getHex()});
  return {scene,camera,sun,hemisphere,position,context,calls,weather,lighting,setRegion(value){region=value;},setSheltered(value){sheltered=value;},disposed:()=>disposed};
}

test('repeated weather frames compose once and preview selection never writes the source clock',()=>{
  const f=fixture(),baseline=f.lighting(),context={...f.context};
  assert.equal(f.weather.setPreview('rain'),true);
  const rainy=f.lighting();assert.ok(rainy.sunIntensity<baseline.sunIntensity);assert.ok(rainy.far<baseline.far);
  for(let i=0;i<120;i++)f.weather.update(.05);
  assert.deepEqual(f.lighting(),rainy,'Clouds and fog do not darken again each frame.');
  assert.deepEqual(f.context,context);assert.equal(f.weather.state().time,context.time);
  const before=f.weather.state();assert.equal(f.weather.setPreview('snowstorm'),false);assert.deepEqual(f.weather.state(),before);
  f.weather.restore();assert.deepEqual(f.lighting(),baseline);
  f.weather.setPreview(null);assert.deepEqual(f.context,context,'Natural weather selection changes no saved or elapsed time.');
  assert.equal(f.weather.state().preview,null);f.weather.dispose();assert.deepEqual(f.lighting(),baseline);
});

test('paused weather holds its source sample and passes a frozen frame to the visual layer',()=>{
  const f=fixture();f.weather.update(.05);const before=f.weather.state();
  f.context.active=false;f.context.time+=50000;
  for(let i=0;i<20;i++)f.weather.update(.1);
  assert.equal(f.weather.state().time,before.time);assert.deepEqual(f.weather.state().sample,before.sample);
  assert.ok(f.calls.slice(-20).every(frame=>frame.active===false&&frame.time===before.time));
  f.context.active=true;f.context.time=before.time+.05;f.weather.update(.05);
  assert.equal(f.weather.state().time,before.time+.05,'Resume follows the supplied existing clock without invented catch-up.');
  f.weather.dispose();
});

test('weather restores sky uniforms and respects new room and nighttime lighting baselines',()=>{
  const sky=new THREE.Group();sky.name='Day/night atmosphere experiment';
  const material=new THREE.ShaderMaterial({uniforms:{horizon:{value:new THREE.Color(0xabcdee)},zenith:{value:new THREE.Color(0x3377bb)},opacity:{value:.82}}});
  const dome=new THREE.Mesh(new THREE.SphereGeometry(1,4,3),material),stars=new THREE.Points(new THREE.BufferGeometry(),new THREE.PointsMaterial({opacity:.72}));
  sky.add(dome,stars);const f=fixture({sky});
  const uniforms=()=>({horizon:material.uniforms.horizon.value.getHex(),zenith:material.uniforms.zenith.value.getHex(),opacity:material.uniforms.opacity.value,stars:stars.material.opacity});
  const original=uniforms();f.context.dayNight=true;f.weather.setPreview('overcast');const cloudy=uniforms();
  assert.notDeepEqual(cloudy,original);for(let i=0;i<40;i++)f.weather.update(.04);assert.deepEqual(uniforms(),cloudy);
  f.weather.restore();assert.deepEqual(uniforms(),original);
  f.context.exterior=false;f.scene.background=new THREE.Color(0x354751);f.scene.fog=null;f.sun.intensity=.45;
  const room=f.lighting();f.weather.update(.1);assert.deepEqual(f.lighting(),room);assert.equal(f.calls.at(-1).exterior,false);
  f.context.exterior=true;f.context.night=1;f.scene.background=new THREE.Color(0x111c29);f.scene.fog=new THREE.Fog(0x111c29,220,800);
  f.sun.intensity=.12;f.hemisphere.intensity=.38;f.sun.color.setHex(0x88aacc);const night=f.lighting();
  f.weather.setPreview('rain');
  assert.ok(f.sun.intensity>0&&f.sun.intensity<night.sunIntensity,'Clouds preserve the existing night instead of replacing it with daylight.');
  assert.ok(f.hemisphere.intensity>0&&f.hemisphere.intensity<=night.skyIntensity,'Night retains readable ambient light.');
  f.weather.dispose();assert.deepEqual(f.lighting(),night);assert.deepEqual(uniforms(),original);
  dome.geometry.dispose();material.dispose();stars.geometry.dispose();stars.material.dispose();
});

test('weather audio follows actual shelter and each scene restores and disposes its own view once',()=>{
  const a=fixture(),b=fixture(),baselineA=a.lighting(),baselineB=b.lighting();
  a.weather.setPreview('rain');b.weather.setPreview('clear');
  assert.ok(a.weather.audio().rain>0);assert.equal(b.weather.audio().rain,0);
  a.setSheltered(true);assert.equal(a.weather.audio().sheltered,true);assert.equal(b.weather.audio().sheltered,false);
  a.context.exterior=false;a.weather.update(0);assert.equal(a.weather.audio().exterior,false);
  a.weather.dispose();a.weather.dispose();assert.equal(a.disposed(),1);assert.deepEqual(a.lighting(),baselineA);
  const count=a.calls.length;a.weather.update(.1);assert.equal(a.calls.length,count,'Disposed weather never touches its view again.');
  assert.equal(b.disposed(),0);assert.equal(b.weather.state().disposed,false);b.weather.dispose();assert.deepEqual(b.lighting(),baselineB);
});

test('cloud tint changes continuously through the middle of twilight',()=>{
  const f=fixture();f.context.night=.499;f.weather.setPreview('rain');
  const colors=()=>[f.scene.background,f.scene.fog.color,f.sun.color,f.hemisphere.color].map(c=>c.toArray());
  const before=colors();f.context.night=.501;f.weather.update(0);const after=colors();
  for(let i=0;i<before.length;i++)assert.ok(Math.hypot(...before[i].map((v,j)=>v-after[i][j]))<.01,'No threshold abruptly changes a cloud or light color.');
  f.weather.dispose();
});

test('crossing from a rainy woodland into desert fades the existing rain instead of popping it away',()=>{
  const f=fixture();f.setRegion({id:71,name:'Ibenwood'});
  for(let seconds=0;seconds<=1800;seconds+=30){f.context.time=seconds;f.weather.update(0);if(f.weather.state().sample.rain>.5)break;}
  const wet=f.weather.state().sample;assert.ok(wet.rain>.5,'The natural woodland schedule provides a real wet spell.');
  f.setRegion({id:25,name:'Navarth Desert'});f.weather.update(0);
  assert.equal(f.weather.state().sample.rain,wet.rain,'Crossing the boundary itself does not remove the rain.');
  f.context.active=false;for(let i=0;i<30;i++)f.weather.update(.25);
  assert.equal(f.weather.state().sample.rain,wet.rain,'A paused border transition stays frozen.');
  f.context.active=true;let previous=wet.rain;
  for(let i=0;i<90;i++){
    f.context.time+=.1;f.weather.update(.1);const next=f.weather.state().sample.rain;
    assert.ok(next<=previous&&previous-next<.03,'Rain eases continuously on each active frame.');previous=next;
  }
  assert.equal(f.weather.state().sample.rain,0,'The desert settles to its dry climate.');f.weather.dispose();
});
