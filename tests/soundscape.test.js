import test from 'node:test';
import assert from 'node:assert/strict';
import {trialMusicTier} from '../src/world/audio/stillroom-score.js';
import {createSoundscape} from '../src/world/audio/soundscape.js';
import {SCORE,scorePhrase,soundScene,audioSettings,AUDIO_SETTINGS_KEY} from '../src/world/audio/score.js';
import {YUNETHRE_SCORES,yunethreMusicArea} from '../src/world/audio/yunethre-score.js';
import {installDemoAudio} from '../src/dev/demo/audio-capture.js';
import {recommendGain} from '../scripts/lib/audio-master.mjs';

function fixture(saved=null) {
  const devices=[],stored=new Map(saved?[[AUDIO_SETTINGS_KEY,JSON.stringify(saved)]]:[]);
  class Param {
    constructor(){this.value=0;this.events=[];}
    setValueAtTime(v,t){this.value=v;this.events.push([v,t]);}
    setTargetAtTime(v,t,constant){this.value=v;this.events.push([v,t,constant,'target']);}
    linearRampToValueAtTime(v,t){this.setValueAtTime(v,t);}
    exponentialRampToValueAtTime(v,t){this.setValueAtTime(v,t);}
    cancelScheduledValues(){}
  }
  class Node {
    constructor(c){this.c=c;this.connections=[];this.stopAt=Infinity;this.ended=false;this.disconnected=false;
      for(const name of ['gain','pan','frequency','Q','threshold','knee','ratio','attack','release'])this[name]=new Param();c.nodes.push(this);}
    connect(n){this.connections.push(n);return n;}
    disconnect(){this.disconnected=true;this.connections=[];}
    start(){}
    stop(at=this.c.currentTime){this.stopAt=at;}
    setPeriodicWave(){}
  }
  class Context {
    constructor(){this.currentTime=0;this.sampleRate=1000;this.nodes=[];this.destination={};this.state='suspended';devices.push(this);}
    createGain(){return new Node(this);} createOscillator(){return new Node(this);}
    createStereoPanner(){return new Node(this);} createBufferSource(){return new Node(this);}
    createConvolver(){return new Node(this);} createBiquadFilter(){return new Node(this);}
    createDynamicsCompressor(){return new Node(this);} createPeriodicWave(){return {};}
    createBuffer(n,length){return {getChannelData:()=>new Float32Array(length)};}
    resume(){this.state='running';return Promise.resolve();} suspend(){this.state='suspended';return Promise.resolve();}
    close(){this.state='closed';return Promise.resolve();}
    advance(dt){this.currentTime+=dt;for(const n of this.nodes)if(!n.ended&&n.stopAt<=this.currentTime){n.ended=true;n.onended?.();}}
  }
  const audio=createSoundscape({AudioContext:Context,random:()=>.5,storage:{getItem:k=>stored.get(k)??null,setItem:(k,v)=>stored.set(k,v)}});
  const frame=(input,seconds=.1)=>{devices[0]?.advance(seconds);audio.update(input);};
  const run=(input,seconds)=>{for(let i=0;i<seconds*10;i++)frame(input);};
  return {audio,devices,stored,frame,run};
}
const outdoors={mode:'playing',inside:false,active:true,hour:7};
const rainOutside={...outdoors,weather:{rain:.8,wind:.55,exterior:true}};
function weatherNodes(context){
  const sources=context.nodes.filter(n=>n.loop),rain=sources.find(n=>n.connections[0]?.type==='highpass'),air=sources.find(n=>n.connections[0]?.type==='lowpass');
  const rainLow=rain.connections[0].connections[0],rainGain=rainLow.connections[0],airGain=air.connections[0].connections[0];
  assert.equal(rainGain.connections[0],airGain.connections[0],'Both weather loops feed the existing Nature bus.');
  return {sources,rain,air,rainLow,rainGain,airGain,nature:rainGain.connections[0]};
}

test('rain and wind share one lazy device and noise buffer, fade smoothly, and preserve the playing score',()=>{
  const f=fixture(),weather=Object.freeze({...rainOutside.weather}),input=Object.freeze({...outdoors,weather});
  f.audio.update(input);assert.equal(f.devices.length,0);f.audio.unlock();f.run(outdoors,4);
  const before=f.audio.state(),nodes=weatherNodes(f.devices[0]);
  assert.equal(nodes.sources.length,2);assert.equal(nodes.rain.buffer,nodes.air.buffer);
  const dryWind=nodes.airGain.gain.value;
  f.run(input,3);const wet=f.audio.state();
  assert.equal(f.devices.length,1);assert.equal(wet.cue,before.cue);assert.equal(wet.phrases,before.phrases);
  assert.ok(Math.abs(wet.position-before.position-3)<.01,'Weather does not restart the track.');
  assert.ok(nodes.rainGain.gain.value>0&&nodes.airGain.gain.value>dryWind);
  assert.equal(nodes.rainGain.gain.value,wet.weather.rainGain);assert.equal(nodes.airGain.gain.value,wet.weather.windGain);
  assert.ok(nodes.rainGain.gain.events.some(([v,,constant,method])=>v>0&&method==='target'&&constant>=.18&&constant<=.25),'Rain settles over approximately one second.');
  const exposedRain=nodes.rainGain.gain.value,exposedWind=nodes.airGain.gain.value,exposedFrequency=nodes.rainLow.frequency.value;
  f.run({...input,weather:{...weather,sheltered:true}},1);
  assert.ok(nodes.rainGain.gain.value<exposedRain*.3);assert.ok(nodes.airGain.gain.value<exposedWind*.4);
  assert.ok(nodes.rainLow.frequency.value<exposedFrequency*.3,'Shelter muffles the bright rain frequencies.');
  assert.deepEqual(weather,{rain:.8,wind:.55,exterior:true},'The input is read only.');
  f.run({...input,weather:{rain:9,wind:Infinity,exterior:true}},1);
  assert.equal(f.audio.state().weather.rain,1);assert.equal(f.audio.state().weather.wind,0);
  for(let i=0;i<20;i++)f.run({...input,weather:{rain:i%2,wind:i%3/2,exterior:true}},.3);
  assert.equal(f.devices[0].nodes.filter(n=>n.loop).length,2,'Transitions never allocate another ambience source.');
  f.audio.dispose();assert.ok(nodes.sources.every(n=>Number.isFinite(n.stopAt)&&n.disconnected));
  assert.ok(f.devices[0].nodes.every(n=>n.disconnected));assert.equal(f.devices[0].state,'closed');
});

test('weather obeys Nature volume, mute, indoor/training/limbo gates, pause and background focus',()=>{
  const f=fixture();f.audio.unlock();f.run(rainOutside,2);const nodes=weatherNodes(f.devices[0]);
  const silence=()=>{assert.equal(f.audio.state().weather.enabled,false);assert.equal(nodes.rainGain.gain.value,0);assert.equal(nodes.airGain.gain.value,0);};
  const rain=()=>{f.run(rainOutside,.3);assert.ok(nodes.rainGain.gain.value>0);};
  for(const patch of [{inside:true,room:'tower'},{weather:{...rainOutside.weather,exterior:false}},{training:true},{mode:'training'},{mode:'limbo'},{mode:'reaper'},{mode:'pause'},{mode:'sailing-paused'},{mode:'loading'},{active:false}]){
    rain();f.run({...rainOutside,...patch},.3);silence();
    if(patch.active===false)assert.equal(f.devices[0].state,'suspended');
  }
  rain();assert.equal(f.devices[0].state,'running');
  f.audio.setSettings({nature:0});silence();assert.equal(nodes.nature.gain.value,0);
  f.audio.setSettings({nature:.2,music:0});rain();assert.equal(nodes.nature.gain.value,.4);
  const notes=f.audio.state().notes;f.run(rainOutside,3);assert.equal(f.audio.state().notes,notes,'Rain works without music.');
  f.audio.setSettings({muted:true});silence();f.audio.setSettings({muted:false});rain();
  f.audio.dispose();assert.equal(f.audio.state().weather.enabled,false);assert.ok(f.devices[0].nodes.every(n=>n.disconnected));
});

test('steady rain fades active bird sketches and stops scheduling them; light rain spaces calls out',()=>{
  const f=fixture({music:0,nature:.65});f.audio.unlock();
  for(let i=0;i<100&&f.audio.state().calls===0;i++)f.frame(outdoors);
  assert.equal(f.audio.state().calls,1);assert.ok(f.audio.state().voices>0);assert.equal(f.audio.state().ducked,true);
  const birds=f.audio.state().calls;f.run(rainOutside,.3);
  assert.equal(f.audio.state().voices,0,'An already playing bird phrase fades when steady rain begins.');
  assert.equal(f.audio.state().ducked,false,'Silent birds do not keep ducking the score.');
  f.run(rainOutside,60);assert.equal(f.audio.state().calls,birds);
  f.run(outdoors,1);assert.equal(f.audio.state().calls,birds,'Clearing rain does not immediately burst into birdsong.');
  f.run(outdoors,7);assert.ok(f.audio.state().calls>birds);f.audio.dispose();
  const dry=fixture({music:0}),drizzle=fixture({music:0});dry.audio.unlock();drizzle.audio.unlock();
  dry.run(outdoors,120);drizzle.run({...outdoors,weather:{rain:.1,wind:.2,exterior:true}},120);
  assert.ok(drizzle.audio.state().calls>0);assert.ok(drizzle.audio.state().calls<dry.audio.state().calls*.7);
  dry.audio.dispose();drizzle.audio.dispose();
});

test('Chapter 2 music follows its settlements with boundary hysteresis and no tower leakage',()=>{
  const sites={regionId:38,town:{x:0,z:0},centaurs:{x:300,z:0}};
  const area=(x,previous=null,extra={})=>yunethreMusicArea({...sites,position:{x,z:0},...extra},previous);
  assert.equal(area(72),'yunethre-town');
  assert.equal(area(80),'yunethre-wilds');
  assert.equal(area(80,'yunethre-town'),'yunethre-town');
  assert.equal(area(95,'yunethre-town'),'yunethre-wilds');
  assert.equal(area(300),'yunethre-centaurs');
  assert.equal(area(210,'yunethre-centaurs'),'yunethre-centaurs');
  for(const regionId of [61,62])assert.equal(area(0,null,{regionId}),'yunethre-celder');
  for(const regionId of [16,37,0])assert.equal(area(0,'yunethre-town',{regionId}),null);
  assert.equal(area(0,'yunethre-town',{inside:true}),null);
  assert.equal(yunethreMusicArea({regionId:38}),'yunethre-wilds');
  for(const musicArea of Object.keys(YUNETHRE_SCORES)){
    assert.equal(soundScene({...outdoors,musicArea}),musicArea);
    assert.equal(soundScene({...outdoors,mode:'briefing',musicArea}),musicArea);
    assert.equal(soundScene({...outdoors,inside:true,room:'tower',musicArea}),'tower');
    assert.equal(soundScene({...outdoors,inside:true,room:'lookout',musicArea}),'country');
    assert.equal(soundScene({...outdoors,mode:'skirmish',musicArea}),'battle');
    assert.equal(soundScene({...outdoors,mode:'loading',musicArea}),null);
  }
  assert.equal(soundScene({...outdoors,musicArea:'unknown'}),'country');
});

test('the four Chapter 2 pieces have original melodic identities and developed cadences',()=>{
  const signatures=new Set(),voices=new Set(['pad','pluck','reed','bell','bow','horn','drum']);
  for(const [id,score]of Object.entries(YUNETHRE_SCORES)){
    const events=scorePhrase(id),melody=events.filter(e=>e.pan===.12);
    assert.ok(melody.length>35,id+' has a real melody across the whole piece');
    assert.ok(new Set(melody.map(e=>e.note)).size>=7,id+' has a developed pitch vocabulary');
    signatures.add(JSON.stringify(melody.map(e=>[e.at,e.note,e.duration])));
    assert.ok(events.every(e=>voices.has(e.voice)&&Number.isFinite(e.note)&&e.note>=28&&e.note<=84));
    assert.ok(events.every(e=>e.at+e.duration<=score.length*score.beat),'cadence fits before the quiet interlude');
    assert.ok(events.some(e=>e.at>224*score.beat),'piece reaches its final section');
    assert.ok(score.fadeIn>=2&&score.fadeOut>=2,'settlement transitions breathe');
  }
  assert.equal(signatures.size,4,'area pieces are not the same melody with different instruments');
});

test('Chapter 2 crossfades overlap briefly, retire old voices, and resume their own musical bookmarks',()=>{
  const f=fixture();f.audio.unlock();
  const town={...outdoors,musicArea:'yunethre-town'},camp={...outdoors,musicArea:'yunethre-centaurs'};
  f.run(town,35);const position=f.audio.state().position;
  f.run(camp,.5);assert.equal(f.audio.state().cue,'yunethre-centaurs');assert.equal(f.audio.state().groups,2,'both sides of the crossfade exist');
  f.run(camp,4);assert.equal(f.audio.state().groups,1,'old piece releases its voices');
  f.run(town,2);assert.ok(Math.abs(f.audio.state().position-position-2)<.5,'return to Laketown continues its composition');
  for(const musicArea of Object.keys(YUNETHRE_SCORES))f.run({...outdoors,musicArea},40);
  assert.ok(f.audio.state().maxVoices<40);assert.ok(f.audio.state().notes>100);
  f.run({...town,active:false},4);assert.equal(f.devices[0].state,'suspended');
  f.run({...outdoors,mode:'pause'},5);assert.equal(f.audio.state().groups,0);
  f.audio.dispose();assert.ok(f.devices[0].nodes.every(n=>n.disconnected));
});

test('demo mastering uses constant gain and prioritizes true-peak headroom',()=>{
  const quiet=recommendGain({integratedLufs:-39.15,truePeakDb:-29.68});
  assert.equal(quiet.gainDb,19.15);assert.equal(quiet.peakLimited,false);assert.ok(Math.abs(quiet.predictedLufs+20)<.001);
  const dynamic=recommendGain({integratedLufs:-28,truePeakDb:-4});
  assert.equal(dynamic.gainDb,2.45);assert.equal(dynamic.peakLimited,true);assert.ok(dynamic.predictedTruePeakDb<=-1.5);
  assert.equal(recommendGain({integratedLufs:-17,truePeakDb:-.5}).gainDb,-3);
  assert.throws(()=>recommendGain({integratedLufs:-Infinity,truePeakDb:-Infinity}),/silent/);
});

test('demo capture uses frame time, compact scene changes, cuts, and silent virtual devices',()=>{
  const original=function OriginalAudioContext(){},scope={AudioContext:original,__AZHORA_DEMO_TIME__:0};
  const capture=installDemoAudio({},scope);capture.start();
  const context=new scope.AudioContext();context.resume();let ended=0;
  const source=context.createOscillator();source.onended=()=>ended++;source.stop(2);
  const scene=(hour=10)=>scope.__AZHORA_DEMO_AUDIO__({kind:'scene',input:{...outdoors,hour},settings:{music:.42,nature:.65,muted:false}});
  scene();scope.__AZHORA_DEMO_TIME__=1;scene(10.2);
  assert.equal(capture.snapshot().events.filter(e=>e.kind==='scene').length,1,'Tiny time-of-day changes do not inflate scene payloads.');
  assert.equal(capture.snapshot().events.at(-1).kind,'tick','Scheduler ticks retain exact encoded-frame timing.');
  scope.__AZHORA_DEMO_AUDIO__({kind:'impact',cue:'hit'});scope.__AZHORA_DEMO_AUDIO__({kind:'impact',cue:'hit'});
  assert.equal(capture.snapshot().events.filter(e=>e.kind==='impact').length,1,'The runtime impact cooldown is preserved.');
  capture.setRecording(false);scope.__AZHORA_DEMO_TIME__=2;scene(23);
  assert.equal(context.currentTime,2);assert.equal(ended,1);assert.equal(context.state,'running');
  assert.equal(capture.snapshot().events.length,3,'Loading cuts add no audio directions.');
  capture.setRecording(true);scene(23);assert.equal(capture.snapshot().events.at(-1).input.hour,23);
  capture.dispose();assert.equal(scope.AudioContext,original);assert.equal(scope.__AZHORA_DEMO_AUDIO__,undefined);
});

test('recorded weather retains rain, wind and shelter while quantizing inaudible frame drift',()=>{
  const scope={__AZHORA_DEMO_TIME__:0},capture=installDemoAudio({virtual:false},scope);
  const weather=Object.freeze({rain:.201,wind:.454,exterior:true,sheltered:false});
  const scene=next=>scope.__AZHORA_DEMO_AUDIO__({kind:'scene',input:{...outdoors,weather:next},settings:{music:.42,nature:.65,muted:false}});
  capture.start();scene(weather);
  assert.deepEqual(capture.snapshot().events[0].input.weather,{rain:.2,wind:.45,exterior:true,sheltered:false});
  scope.__AZHORA_DEMO_TIME__=.1;scene({...weather,rain:.204,wind:.451});
  assert.equal(capture.snapshot().events.filter(e=>e.kind==='scene').length,1);
  assert.equal(capture.snapshot().events.at(-1).kind,'tick');
  scope.__AZHORA_DEMO_TIME__=.2;scene({...weather,rain:.206});
  assert.equal(capture.snapshot().events.at(-1).input.weather.rain,.21);
  scope.__AZHORA_DEMO_TIME__=.3;scene({...weather,sheltered:true});
  assert.equal(capture.snapshot().events.at(-1).input.weather.sheltered,true);
  scope.__AZHORA_DEMO_TIME__=.4;scene({...weather,exterior:false});
  assert.equal(capture.snapshot().events.at(-1).input.weather.exterior,false);
  assert.deepEqual(weather,{rain:.201,wind:.454,exterior:true,sheltered:false});
  capture.dispose();
});

test('score routing distinguishes tower, daylight, night, combat, dialogue, pause and focus',()=>{
  assert.equal(soundScene({...outdoors,inside:true,room:'tower'}),'tower');
  assert.equal(soundScene({...outdoors,inside:true,room:'lookout'}),'country');
  assert.equal(soundScene({...outdoors,hour:23}),'night');
  assert.equal(soundScene({...outdoors,mode:'skirmish'}),'battle');
  assert.equal(soundScene({...outdoors,mode:'skirmish',reviewing:true}),'country');
  assert.equal(soundScene({...outdoors,mode:'briefing'}),'country');
  assert.equal(soundScene({...outdoors,mode:'encounter',combatActive:true}),'battle');
  assert.equal(soundScene({...outdoors,mode:'encounter',combatActive:false}),'country');
  assert.equal(soundScene({...outdoors,training:true}),'stillroom');
  for(const mode of ['loading','pause','sailing-paused','developer','combat-menu','crossing'])assert.equal(soundScene({...outdoors,mode}),null);
  assert.equal(soundScene({...outdoors,active:false}),null);
  for(const [id,score]of Object.entries(SCORE)){
    const events=scorePhrase(id);assert.ok(events.length>=6);assert.ok(score.once?score.length*score.beat<5:score.rest>=3);
    assert.ok(events.every(e=>e.at>=0&&e.at<score.length*score.beat&&e.duration>0&&e.level<.2));
  }
});
test('preferences are bounded, durable, independent of saves and tolerate unavailable storage',()=>{
  assert.deepEqual(audioSettings({music:NaN,nature:2,muted:'yes'}),{music:.42,nature:1,muted:false});
  const f=fixture({music:.2,nature:.9,muted:true});assert.equal(f.audio.state().settings.music,.2);
  f.audio.setSettings({music:.7},{persist:false});assert.equal(JSON.parse(f.stored.get(AUDIO_SETTINGS_KEY)).music,.2);
  f.audio.setSettings({music:.7});assert.equal(JSON.parse(f.stored.get(AUDIO_SETTINGS_KEY)).music,.7);
  const unavailable=createSoundscape({AudioContext:null,storage:{getItem(){throw Error();},setItem(){throw Error();}}});
  assert.equal(unavailable.unlock(),false);assert.doesNotThrow(()=>unavailable.setSettings({nature:.4}));
});
test('no audio device before a gesture; loading schedules nothing; music plays while stationary',()=>{
  const f=fixture();f.run(outdoors,10);assert.equal(f.devices.length,0);
  f.audio.update({mode:'loading'});f.audio.unlock();f.run({mode:'loading'},20);assert.equal(f.audio.state().notes,0);
  f.run(outdoors,5);assert.ok(f.audio.state().notes>4);assert.equal(f.devices.length,1);assert.equal(f.audio.state().musicPlaying,true);
  f.run(outdoors,SCORE.country.length*SCORE.country.beat);assert.equal(f.audio.state().musicPlaying,false,'the now-playing state stops during the quiet interlude');
  f.audio.dispose();assert.equal(f.devices[0].state,'closed');
});

test('full pieces develop for minutes, vary their return, and resume after interruptions',()=>{
  for(const [id,score]of Object.entries(SCORE).filter(([,s])=>!s.once)){
    assert.ok(score.length*score.beat>=140,id+' lasts at least two minutes twenty');
    const first=scorePhrase(id,0,3),next=scorePhrase(id,1,3);
    assert.notDeepEqual(first,next,id+' changes on a later performance');
    const section=n=>first.filter(e=>e.at>=32*n*score.beat&&e.at<32*(n+1)*score.beat).map(e=>[Math.round(e.at/score.beat-32*n),e.note,e.voice]);
    assert.notDeepEqual(section(1),section(2),id+' has a distinct answering section');
    assert.notDeepEqual(section(1),section(4),id+' develops away from the opening theme');
  }
  const f=fixture();f.audio.unlock();f.run(outdoors,85);
  const position=f.audio.state().position;assert.ok(position>80);assert.equal(f.audio.state().phrases,1);
  f.run({...outdoors,mode:'pause'},8);f.run(outdoors,2);
  assert.ok(Math.abs(f.audio.state().position-position-2)<.5,'pause resumes the piece instead of replaying its intro');
  const before=f.audio.state().position;
  f.run({...outdoors,mode:'skirmish'},10);f.run(outdoors,2);
  assert.ok(Math.abs(f.audio.state().position-before-2)<.5,'return from battle continues the traveling piece');
  f.audio.dispose();
});
test('birdsong has its own volume and ducks music; nature-only never schedules score notes',()=>{
  const f=fixture();f.audio.unlock();f.run(outdoors,8);assert.ok(f.audio.state().calls>0);assert.ok(f.audio.state().ducked);
  const birds=f.audio.state().calls;f.audio.setSettings({nature:0});f.run(outdoors,40);assert.equal(f.audio.state().calls,birds);
  f.audio.setSettings({music:0,nature:.6});const notes=f.audio.state().notes;f.run(outdoors,50);
  assert.equal(f.audio.state().notes,notes);assert.ok(f.audio.state().calls>birds);f.audio.dispose();
});
test('daytime bird sketches are absent indoors, at night, in combat and training',()=>{
  for(const input of [{...outdoors,inside:true,room:'tower'},{...outdoors,hour:23},{...outdoors,mode:'skirmish'},{...outdoors,training:true},...[0,26,41,56,70].map(regionId=>({...outdoors,regionId}))]){
    const f=fixture();f.audio.unlock();f.run(input,45);assert.equal(f.audio.state().calls,0);f.audio.dispose();
  }
});
test('transitions, muting and a long run release old phrases and bound voice count',()=>{
  const f=fixture();f.audio.unlock();
  for(let i=0;i<60;i++){
    f.run({...outdoors,inside:i%3===0,room:'tower',mode:i%3===1?'skirmish':'playing'},6);
    f.audio.setSettings({muted:true});f.run(outdoors,1);f.audio.setSettings({muted:false});
  }
  f.run({...outdoors,mode:'pause'},5);
  assert.ok(f.audio.state().maxVoices<=40);assert.equal(f.audio.state().voices,0);assert.equal(f.audio.state().groups,0);
  const notes=f.audio.state().notes;f.run({...outdoors,mode:'pause'},10);assert.equal(f.audio.state().notes,notes);
  f.audio.dispose();f.audio.dispose();assert.ok(f.devices[0].nodes.every(n=>n.disconnected),'all connected nodes, including shared bird envelopes, are released');
});
test('blur suspends device, focus resumes it, and scheduler drops missed notes',()=>{
  const f=fixture();f.audio.unlock();f.run(outdoors,5);f.frame({...outdoors,active:false});
  assert.equal(f.devices[0].state,'suspended');f.frame(outdoors);assert.equal(f.devices[0].state,'running');
  const before=f.audio.state().notes;f.frame(outdoors,300);assert.ok(f.audio.state().notes-before<10,'no backlog burst after a stall');f.audio.dispose();
});

const trialInput=(round=0,outcome=null,id=1)=>({...outdoors,mode:'skirmish',training:true,trial:{id,round,outcome},reviewing:!!outcome});
test('legacy round cues keep their arrangements without changing tempo',()=>{
  for(let round=0;round<10;round++){
    const input=trialInput(round);
    assert.equal(soundScene(input),'duel');
    assert.equal(soundScene({...input,reviewing:true}),'stillroom');
    assert.equal(soundScene({...input,mode:'pause'}),null);
    assert.equal(trialMusicTier(round),round<3?0:round<6?1:round<9?2:3);
  }
  const phrases=[0,1,2,3].map(tier=>scorePhrase('duel',0,tier));
  assert.ok(!phrases[0].some(e=>e.voice==='bow'||e.voice==='horn'));
  assert.ok(phrases[1].some(e=>e.voice==='bow'));
  assert.ok(phrases[2].some(e=>e.voice==='horn'));
  assert.ok(phrases[3].length>phrases[2].length);
  assert.deepEqual(phrases[0].filter(e=>e.voice==='drum'),phrases[3].filter(e=>e.voice==='drum'),'heavier fights keep the same restrained pulse');
  assert.ok(SCORE.duel.mix<1,'combat mix leaves room for attack cues');
});

test('measured difficulty tier overrides round position after a roster reorder',()=>{
  const f=fixture();f.audio.unlock();
  f.run(trialInput(),75);const before=f.audio.state().position;
  for(const [round,tier] of [[0,3],[24,0],[7,1],[12,2]]){
    const input=trialInput(round);input.trial.tier=tier;f.run(input,4);
    assert.equal(f.audio.state().arrangement,tier);
    assert.ok(f.audio.state().position>before,'Changing instrumentation continues the composition');
  }
  f.audio.dispose();
});
test('a result plays once, returns to mist, and a retry can produce a new result',()=>{
  const f=fixture();f.audio.unlock();f.run(trialInput(),3);
  f.run(trialInput(0,'success'),1);assert.equal(f.audio.state().cue,'trial-victory');
  assert.equal(f.audio.state().resultPhrases,1);
  f.run(trialInput(0,'success'),60);assert.equal(f.audio.state().cue,'stillroom');assert.equal(f.audio.state().resultPhrases,1);
  f.run(trialInput(0,null,2),3);f.run(trialInput(0,'defeat',2),1);
  assert.equal(f.audio.state().cue,'trial-defeat');assert.equal(f.audio.state().resultPhrases,2);
  f.run(trialInput(0,'defeat',2),8);assert.equal(f.audio.state().cue,'stillroom');f.audio.dispose();
});
test('mute, music off, help and lost focus never replay a result cadence',()=>{
  for(const interruption of ['mute','off','pause','blur']){
    const f=fixture(),result=trialInput(8,'success');f.audio.unlock();f.run(result,1);
    assert.equal(f.audio.state().resultPhrases,1);
    if(interruption==='mute'||interruption==='off'){
      f.audio.setSettings(interruption==='mute'?{muted:true}:{music:0});f.run(result,.5);
      f.audio.setSettings({muted:false,music:.42});
    }else f.run({...result,...(interruption==='pause'?{mode:'pause'}:{active:false})},.5);
    f.run(result,8);assert.equal(f.audio.state().cue,'stillroom');assert.equal(f.audio.state().resultPhrases,1);f.audio.dispose();
  }
  const f=fixture();f.audio.setSettings({muted:true});f.audio.unlock();f.run(trialInput(0,'defeat'),2);
  f.audio.setSettings({muted:false});f.run(trialInput(0,'defeat'),8);assert.equal(f.audio.state().resultPhrases,0);f.audio.dispose();
});
test('long duels, rapid retries and all arrangements stay bounded and contain no songbirds',()=>{
  const f=fixture();f.audio.unlock();
  for(let id=1;id<=20;id++){
    const round=id%10,input=trialInput(round,null,id);
    f.run({...input,reviewing:true,training:false},2);f.run({...input,training:false},40);
    f.run(trialInput(round,id%2?'success':'defeat',id),3);
  }
  assert.equal(f.audio.state().calls,0);
  assert.ok(f.audio.state().maxVoices<40,'room below the hard voice cap even at tier transitions');
  f.run({mode:'combat-menu'},5);assert.equal(f.audio.state().voices,0);assert.equal(f.audio.state().groups,0);
  f.audio.dispose();assert.ok(f.devices[0].nodes.every(n=>n.disconnected));
});
