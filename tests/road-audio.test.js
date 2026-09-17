import test from 'node:test';
import assert from 'node:assert/strict';
import {toWorld} from '../src/world-scale.js';
import {createRoadAudio,roadAudioProfile} from '../src/road-audio.js';

class FakeParam {
  constructor(){this.value=0;this.events=[];}
  setValueAtTime(value,time){this.value=value;this.events.push({method:'set',value,time});}
  setTargetAtTime(value,time,duration){this.value=value;this.events.push({method:'target',value,time,duration});}
  exponentialRampToValueAtTime(value,time){this.value=value;this.events.push({method:'ramp',value,time});}
}
class FakeNode {
  constructor(context,kind){this.context=context;this.kind=kind;this.gain=new FakeParam();this.frequency=new FakeParam();this.Q=new FakeParam();this.connections=[];this.disconnected=false;this.stopAt=null;this.ended=false;context.nodes.push(this);}
  connect(node){this.connections.push(node);return node;}
  disconnect(){this.connections=[];this.disconnected=true;}
  start(){this.started=true;}
  stop(time=this.context.currentTime){this.stopAt=time;}
}
function fixture(){
  const devices=[];
  class Device {
    constructor(){this.sampleRate=1000;this.currentTime=0;this.nodes=[];this.destination={};this.closed=false;devices.push(this);}
    createGain(){return new FakeNode(this,'gain');}
    createBufferSource(){return new FakeNode(this,'buffer');}
    createBiquadFilter(){return new FakeNode(this,'filter');}
    createOscillator(){return new FakeNode(this,'oscillator');}
    createBuffer(channels,length){const array=new Float32Array(length);return {getChannelData:()=>array};}
    resume(){return Promise.resolve();}
    close(){this.closed=true;return Promise.resolve();}
    advance(dt){this.currentTime+=dt;for(const node of this.nodes)if(!node.ended&&node.stopAt!==null&&node.stopAt<=this.currentTime){node.ended=true;node.onended?.();}}
  }
  const audio=createRoadAudio({AudioContext:Device,random:()=>.5});
  const frame=(dt,data)=>{devices[0]?.advance(dt);audio.update(dt,data);};
  return {audio,devices,frame};
}
const walking=(region=2,position={x:0,y:2,z:-240})=>({position,speed:3.6,region,playing:true});

test('sound is silent and allocates no device until explicitly enabled, then reuses that device',()=>{
  const {audio,devices,frame}=fixture();
  for(let i=0;i<100;i++)frame(.1,walking());
  assert.equal(audio.effect('hit'),false);assert.equal(devices.length,0);
  assert.equal(audio.toggle(),true);assert.equal(devices.length,1);
  assert.equal(audio.effect('bell'),true);assert.ok(audio.state().transients>0);
  assert.equal(audio.toggle(),false);assert.equal(audio.state().transients,0);
  assert.equal(audio.effect('success'),false);
  assert.equal(audio.toggle(),true);assert.equal(devices.length,1);
  audio.dispose();assert.equal(audio.toggle(),false);assert.ok(devices[0].closed);
});

test('ambient profiles distinguish shore, forest, fields, river proximity and exposed stone',()=>{
  const coast=roadAudioProfile({position:{x:9,z:29},region:1});
  const forest=roadAudioProfile({position:{x:-120,z:34},region:1});
  assert.ok(coast.sea>forest.sea);assert.ok(forest.forest>coast.forest);
  const plain=roadAudioProfile({position:toWorld(-520,320),region:3});assert.ok(plain.field>0);assert.equal(plain.river,0);
  const river=roadAudioProfile({position:toWorld(-345,93),region:2});
  const bank=roadAudioProfile({position:toWorld(-400,170),region:2});assert.ok(river.river>bank.river);
  assert.equal(coast.surface,'wood');assert.equal(river.surface,'wood');
  assert.equal(roadAudioProfile({position:toWorld(-380,150),region:2}).surface,'earth');
  const ridge=roadAudioProfile({region:{id:4}});assert.ok(ridge.ridge>0);assert.equal(ridge.surface,'stone');
  for(const value of Object.values(roadAudioProfile({position:{x:NaN,z:Infinity},region:99})))
    if(typeof value==='number')assert.ok(Number.isFinite(value));
});

test('idle frames allocate no transient sources; walking makes paced surface footfalls and pause stops them',()=>{
  const {audio,devices,frame}=fixture();audio.toggle();
  for(let i=0;i<25;i++)frame(.1,{...walking(),speed:0});
  assert.equal(audio.state().footsteps,0);assert.equal(devices[0].nodes.filter(n=>n.kind==='buffer').length,1,'only the reused ambient loop exists at rest');
  for(let i=0;i<20;i++)frame(.1,walking());
  assert.ok(audio.state().footsteps>=4&&audio.state().footsteps<=6,'a walk has a measured pace rather than one source per frame');
  const paused=audio.state();
  for(let i=0;i<100;i++)frame(.1,{...walking(),playing:false});
  assert.equal(audio.state().footsteps,paused.footsteps);assert.equal(audio.state().calls,paused.calls);
  frame(.1,walking(1,{x:14,y:2,z:29}));assert.equal(audio.state().surface,'wood');
  frame(.1,walking(4,{x:-120,y:5,z:380}));assert.equal(audio.state().surface,'stone');
  audio.dispose();
});

test('regional crossfades reuse the ambient graph, and stopped one-shots release all their nodes',()=>{
  const {audio,devices,frame}=fixture();audio.toggle();
  const persistentCount=devices[0].nodes.length;
  for(const region of [1,2,3,4,1])frame(.1,{...walking(region),speed:0});
  assert.equal(devices[0].nodes.length,persistentCount,'changing regions adjusts gains without creating more loops');
  assert.ok(devices[0].nodes.filter(n=>n.kind==='gain').some(n=>n.gain.events.some(event=>event.method==='target'&&event.duration>0)),'ambient changes have smoothing');
  for(const effect of ['swing','hit','practice-hit','dodge','player-hit','windup','bell','success','enemy-defeated','bite'])assert.equal(audio.effect(effect),true);
  assert.equal(audio.effect('unknown'),false);
  const transients=devices[0].nodes.slice(persistentCount);
  devices[0].advance(3);
  assert.equal(audio.state().transients,0);assert.ok(transients.every(node=>node.disconnected));
  audio.dispose();assert.ok(devices[0].nodes.every(node=>node.disconnected));
});

test('soft regional calls are scheduled by active updates and freeze while paused or muted',()=>{
  const {audio,devices,frame}=fixture();audio.toggle();
  const meadow={position:{...toWorld(-500,312),y:2},speed:0,region:3,playing:true};
  for(let i=0;i<60;i++)frame(.1,meadow);
  assert.equal(audio.state().calls,1);
  const count=audio.state().calls;
  for(let i=0;i<400;i++)frame(.1,{...meadow,playing:false});
  assert.equal(audio.state().calls,count);
  audio.toggle();for(let i=0;i<400;i++)frame(.1,meadow);
  assert.equal(audio.state().calls,count);assert.equal(audio.state().transients,0);
  assert.equal(devices[0].nodes.filter(n=>n.kind==='buffer').length,1);
  audio.dispose();
});

test('missing audio devices and invalid updates fail quietly; disposal is safe twice',()=>{
  const silent=createRoadAudio({AudioContext:null});assert.equal(silent.toggle(),false);assert.equal(silent.effect('hit'),false);silent.dispose();silent.dispose();
  const {audio,frame}=fixture();audio.toggle();const before=audio.state();
  for(const dt of [NaN,Infinity,-1,0])frame(dt,walking());
  audio.update(.1,{position:{x:NaN,z:0},speed:5,playing:true});
  assert.deepEqual(audio.state(),before);
  audio.dispose();audio.dispose();assert.equal(audio.state().transients,0);
});
