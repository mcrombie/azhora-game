import {SCORE,scorePhrase,soundScene,hasSongbirdAmbience,AUDIO_SETTINGS_KEY,audioSettings} from './score.js';

import {trialMusicTier,STILLROOM_SCORES} from './stillroom-score.js';
import {SCORE_SECTIONS} from './longform-score.js';

const frequency=note=>440*2**((note-69)/12);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const disconnect=node=>{try{node?.disconnect();}catch{}};
const randomSource=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};

/** One lazy Web Audio device, a bounded look-ahead scheduler, and reusable
 * effects. No fetches, audio files, workers, interval timers, or render objects. */
export function createSoundscape({AudioContext=globalThis.AudioContext??globalThis.webkitAudioContext,context:provided=null,storage=null,random=globalThis.__AZHORA_DEMO_AUDIO_RANDOM__??Math.random}={}) {
  let settings=audioSettings(),context=null,graph=null,disposed=false,error=null,unlocked=false;
  try{settings=audioSettings(JSON.parse(storage?.getItem(AUDIO_SETTINGS_KEY)??'null'));}catch{}
  let input={mode:'loading'},cue=null,phrase=null,nextPhrase=0,nextBird=0,duckUntil=0,mixDue=0;
  const bookmarks=new Map(),cycles=new Map();
  let phrases=0,notes=0,calls=0,maxVoices=0,focusSuspended=false;
  let lastResult=null,resultCue=null,resultUntil=0,resultPhrases=0;
  let birdsActive=false,weatherMix={enabled:false,rain:0,wind:0,sheltered:false,rainGain:0,windGain:0};
  const voices=new Set(),groups=new Set();
  const birdFlights=new Set();
  const rand=()=>clamp(Number(random())||0,0,1);
  function remember(now){
    if(!phrase||!cue||SCORE[cue].once)return;
    const duration=SCORE[cue].length*SCORE[cue].beat,offset=Math.max(0,now-phrase.start);
    bookmarks.set(cue,{offset:Math.min(duration,offset),variation:phrase.variation,rest:offset>=duration?Math.max(0,nextPhrase-now):0});
  }
  function retire(group,now,fade=1.5) {
    if(!group||group.retiring)return;
    group.retiring=true;
    group.gain.gain.cancelScheduledValues(now);group.gain.gain.setTargetAtTime(0,now,Math.max(.015,fade/5));
    group.end=now+fade;
    for(const entry of voices)if(entry.group===group){try{entry.source.stop(group.end);}catch{}}
  }
  function cleanup() {
    for(const group of [...groups])if(group.end<=context.currentTime){disconnect(group.gain);groups.delete(group);}
  }
  function track(source,nodes,group=null,onEnd=()=>{}) {
    let ended=false;
    const entry={source,group,cleanup(){if(ended)return;ended=true;source.onended=null;nodes.forEach(disconnect);voices.delete(entry);onEnd();}};
    source.onended=entry.cleanup;voices.add(entry);maxVoices=Math.max(maxVoices,voices.size);return entry;
  }
  function ensure() {
    if(context)return true;
    if(disposed||(!provided&&typeof AudioContext!=='function'))return false;
    try {
      context=provided??new AudioContext();
      const master=context.createGain(),music=context.createGain(),nature=context.createGain(),duck=context.createGain();
      const wet=context.createGain(),reverb=context.createConvolver(),filter=context.createBiquadFilter(),limiter=context.createDynamicsCompressor();
      master.gain.value=0;music.gain.value=0;nature.gain.value=0;duck.gain.value=1;wet.gain.value=.24;
      filter.type='lowpass';filter.frequency.value=2800;filter.Q.value=.4;
      limiter.threshold.value=-12;limiter.knee.value=18;limiter.ratio.value=3;limiter.attack.value=.015;limiter.release.value=.3;
      music.connect(filter);filter.connect(duck);duck.connect(master);filter.connect(reverb);reverb.connect(wet);wet.connect(duck);
      nature.connect(master);master.connect(limiter);limiter.connect(context.destination);
      // Deterministic, dark stereo room tail. Prepared once, approximately 0.8 MB.
      const impulse=context.createBuffer(2,Math.ceil(context.sampleRate*2.1),context.sampleRate),r=randomSource(97);
      for(let c=0;c<2;c++) {const data=impulse.getChannelData(c);let smooth=0;
        for(let i=0;i<data.length;i++){smooth=.65*smooth+.35*(r()*2-1);data[i]=smooth*(1-i/data.length)**3;}}
      reverb.buffer=impulse;
      const waves={};
      for(const [name,partials]of Object.entries({pad:[0,1,.28,.10,.04],pluck:[0,1,.48,.24,.13,.06],reed:[0,1,.18,.12,.035],bell:[0,1,.12,.025,.07],bow:[0,1,.32,.18,.06],horn:[0,1,.42,.18,.04]}))
        waves[name]=context.createPeriodicWave(new Float32Array(partials.length),new Float32Array(partials));
      const noise=context.createBuffer(1,context.sampleRate*2,context.sampleRate),values=noise.getChannelData(0);
      for(let i=0;i<values.length;i++)values[i]=(r()*2-1)*.25;
      const air=context.createBufferSource(),airFilter=context.createBiquadFilter(),airGain=context.createGain();
      air.buffer=noise;air.loop=true;airFilter.type='lowpass';airFilter.frequency.value=520;airGain.gain.value=0;
      air.connect(airFilter);airFilter.connect(airGain);airGain.connect(nature);air.start();
      // Rain borrows the same deterministic noise buffer. Its second loop starts
      // out of phase with the low wind bed; filtering keeps it below the score.
      // Two persistent sources total, with no per-frame buffers or rain voices.
      const rain=context.createBufferSource(),rainHigh=context.createBiquadFilter(),rainLow=context.createBiquadFilter(),rainGain=context.createGain();
      rain.buffer=noise;rain.loop=true;rainHigh.type='highpass';rainHigh.frequency.value=300;rainHigh.Q.value=.4;
      rainLow.type='lowpass';rainLow.frequency.value=4800;rainLow.Q.value=.4;rainGain.gain.value=0;
      rain.connect(rainHigh);rainHigh.connect(rainLow);rainLow.connect(rainGain);rainGain.connect(nature);rain.start(0,.731);
      graph={master,music,nature,duck,wet,reverb,filter,limiter,waves,air,airFilter,airGain,rain,rainHigh,rainLow,rainGain};
      return true;
    }catch(e){error=String(e.message??e);disposeGraph();return false;}
  }
  function disposeGraph() {
    for(const entry of [...voices]){try{entry.source.stop();}catch{}entry.cleanup();}
    for(const group of groups)disconnect(group.gain);groups.clear();
    if(graph){for(const source of [graph.air,graph.rain])try{source.stop();}catch{}for(const node of Object.values(graph))disconnect(node);}
    try{if(!provided)context?.close()?.catch?.(()=>{});}catch{}
    graph=null;context=null;birdFlights.clear();birdsActive=false;
    weatherMix={enabled:false,rain:0,wind:0,sheltered:false,rainGain:0,windGain:0};
  }
  function unlock() {
    if(disposed||!ensure())return false;
    unlocked=true;
    try{if(!provided)context.resume?.()?.catch?.(e=>{error=String(e.message??e);});}catch{}
    update(input);return true;
  }
  function setSettings(patch,{persist=true}={}) {
    settings=audioSettings({...settings,...patch});
    if(persist)try{storage?.setItem(AUDIO_SETTINGS_KEY,JSON.stringify(settings));}catch{}
    if(context&&(settings.muted||settings.music===0)){remember(context.currentTime);retire(phrase?.group,context.currentTime,.25);phrase=null;nextPhrase=context.currentTime+.3;}
    mixDue=0;if(context)update(input);return {...settings};
  }
  function tone(event,at,group) {
    if(voices.size>=40)return;
    const osc=context.createOscillator(),gain=context.createGain(),pan=context.createStereoPanner();
    const drum=event.voice==='drum',duration=event.duration,release=drum?.12:event.voice==='pad'?1.5:1.1;
    if(drum){osc.type='sine';osc.frequency.setValueAtTime(115,at);osc.frequency.exponentialRampToValueAtTime(46,at+.16);}
    else {osc.setPeriodicWave(graph.waves[event.voice]);osc.frequency.setValueAtTime(frequency(event.note),at);}
    pan.pan.value=event.pan??0;
    const attack=event.voice==='pad'?.9:['reed','bow','horn'].includes(event.voice)?.18:.012;
    gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(event.level,at+attack);
    if(event.voice==='pluck'||event.voice==='bell'||drum)gain.gain.exponentialRampToValueAtTime(.0001,at+duration+release);
    else {gain.gain.setValueAtTime(event.level*.75,at+Math.max(attack,duration));gain.gain.linearRampToValueAtTime(0,at+duration+release);}
    osc.connect(gain);gain.connect(pan);pan.connect(group.gain);track(osc,[osc,gain,pan],group);
    osc.start(at);osc.stop(at+duration+release+.03);notes++;
  }
  function begin(now) {
    if(phrase?.group.end===Infinity)retire(phrase.group,now);
    const score=SCORE[cue];
    const saved=bookmarks.get(cue);bookmarks.delete(cue);
    const resume=saved&&saved.offset<score.length*score.beat;
    const variation=resume?saved.variation:(cycles.get(cue)??0),offset=resume?saved.offset:0;
    if(!resume)cycles.set(cue,variation+1);
    const gain=context.createGain();gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(1,now+(score.once?.06:score.fadeIn??(cue==='duel'?.6:1.8)));gain.connect(graph.music);
    const group={gain,end:Infinity};groups.add(group);
    const tier=input.trial?.tier??trialMusicTier(input.trial?.round);
    phrase={group,start:now+.04-offset,variation,tier,events:scorePhrase(cue,variation,tier),index:0};phrases++;
    while(phrase.index<phrase.events.length&&phrase.events[phrase.index].at<offset)phrase.index++;
    if(score.once)resultPhrases++;
    nextPhrase=score.once?Infinity:phrase.start+score.length*score.beat+score.rest+rand()*(cue==='duel'?2:8);
  }
  // Provisional synthesized songbird phrases, not species-identification audio.
  // Kept independent from the score and from the journal or campaign state.
  function bird(now) {
    if(voices.size>32)return;
    const pan=context.createStereoPanner(),gain=context.createGain();pan.pan.value=rand()*1.5-.75;gain.gain.value=.035;
    gain.connect(pan);pan.connect(graph.nature);
    const flight={gain,kind:'bird',end:Infinity};birdFlights.add(flight);
    const count=3+Math.floor(rand()*3),base=2300+rand()*750;let remaining=count;
    for(let i=0;i<count;i++) {
      const at=now+i*.21+rand()*.025,osc=context.createOscillator(),env=context.createGain();
      osc.type='sine';osc.frequency.setValueAtTime(base+i%2*500,at);osc.frequency.exponentialRampToValueAtTime(base*1.38,at+.045);osc.frequency.exponentialRampToValueAtTime(base*.86,at+.13);
      env.gain.setValueAtTime(0,at);env.gain.linearRampToValueAtTime(.5,at+.015);env.gain.exponentialRampToValueAtTime(.0001,at+.14);
      osc.connect(env);env.connect(gain);track(osc,[osc,env],flight,()=>{if(--remaining===0){disconnect(gain);disconnect(pan);birdFlights.delete(flight);}});
      osc.start(at);osc.stop(at+.17);
    }
    // Bird channel can be muted without the score ducking around inaudible calls.
    duckUntil=now+count*.21+1.4;calls++;
  }
  function update(next=input) {
    input=next;
    if(!provided&&globalThis.__AZHORA_DEMO_AUDIO__?.({kind:'scene',input:next,settings})===false)return;
    if(!context||!graph||disposed||!unlocked)return;
    const now=context.currentTime,muted=settings.muted||input.active===false;
    const base=soundScene(input),outcome=input.trial?.outcome;
    if(!outcome||!base||muted||settings.music===0||now>=resultUntil)resultCue=null;
    const resultKey=outcome?`${input.trial.id}:${outcome}`:null;
    if(resultKey&&resultKey!==lastResult){
      lastResult=resultKey;
      // Consume silently when paused/muted; focus or unmute must not replay it.
      if(base&&!muted&&settings.music>0){
        resultCue=outcome==='success'?'trial-victory':'trial-defeat';
        resultUntil=now+SCORE[resultCue].length*SCORE[resultCue].beat+1.8;
      }
    }
    const selected=resultCue??base,changed=selected!==cue;
    if(changed){remember(now);retire(phrase?.group,now,selected&&SCORE[selected].once?.35:Math.max(SCORE[cue]?.fadeOut??1.5,SCORE[selected]?.fadeOut??1.5));phrase=null;cue=selected;nextPhrase=now+.15+(bookmarks.get(cue)?.rest??0);nextBird=now+4+rand()*5;duckUntil=0;mixDue=0;}
    else if(cue==='duel'&&phrase&&phrase.tier!==(input.trial?.tier??trialMusicTier(input.trial?.round))){
      remember(now);retire(phrase.group,now,.5);phrase=null;nextPhrase=now+.15;
    }
    // Blur/hidden stops scheduling immediately. AudioContext suspension also
    // prevents a background device from doing ongoing work.
    if(input.active===false&&!focusSuspended){focusSuspended=true;graph.master.gain.setValueAtTime(0,now);try{context.suspend?.()?.catch?.(()=>{});}catch{}}
    else if(input.active!==false&&focusSuspended){focusSuspended=false;try{context.resume?.()?.catch?.(()=>{});}catch{}}
    const exterior=(!input.inside||input.room==='lookout')&&input.weather?.exterior!==false;
    const outdoorAmbience=!!selected&&exterior&&!input.training&&!STILLROOM_SCORES[selected]&&!['training','limbo','reaper'].includes(input.mode);
    const natureOn=outdoorAmbience&&hasSongbirdAmbience(input.regionId)&&!['battle','night'].includes(selected);
    const audible=outdoorAmbience&&!muted&&settings.nature>0,enabled=audible&&input.weather?.exterior===true;
    const level=value=>Number.isFinite(value)?clamp(value,0,1):0;
    const rain=enabled?level(input.weather.rain):0,wind=enabled?level(input.weather.wind):0,sheltered=!!input.weather?.sheltered;
    weatherMix={enabled,rain,wind,sheltered,
      rainGain:enabled?.3*rain**.8*(sheltered?.24:1):0,
      windGain:audible?(.055+.12*wind)*(sheltered?.3:1):0};
    const birdsOn=!!natureOn&&!muted&&settings.nature>0&&rain<.18;
    if(birdsOn!==birdsActive){
      birdsActive=birdsOn;mixDue=0;
      if(birdsOn)nextBird=Math.max(nextBird,now+4+rand()*5);
      else {for(const flight of birdFlights)retire(flight,now,.12);duckUntil=0;}
    }
    const dialogue=!['playing','sailing','skirmish','training'].includes(input.mode)&&!input.combatActive;
    if(now>=mixDue){
      graph.master.gain.setTargetAtTime(muted?0:.72,now,.12);
      graph.music.gain.setTargetAtTime(selected?settings.music*3*(SCORE[selected].mix??1)*(dialogue?.4:1):0,now,.5);
      graph.nature.gain.setTargetAtTime(selected?settings.nature*2*(dialogue?.65:1):0,now,.3);
      // A .22s time constant settles in about a second. Closed/paused contexts
      // fade much faster, while shelter also removes the bright rain frequencies.
      const weatherFade=audible?.22:.04;
      graph.airGain.gain.setTargetAtTime(weatherMix.windGain,now,weatherFade);
      graph.airFilter.frequency.setTargetAtTime(sheltered?260:enabled?360+wind*600:520,now,.25);
      graph.rainGain.gain.setTargetAtTime(weatherMix.rainGain,now,weatherFade);
      graph.rainLow.frequency.setTargetAtTime(sheltered?1100:4800,now,.25);
      graph.duck.gain.setTargetAtTime(now<duckUntil&&settings.nature>0?.4:1,now,.25);
      mixDue=now+.1;
    }
    cleanup();
    if(muted||!selected)return;
    if(settings.music>0){
      if(now>=nextPhrase)begin(now);
      while(phrase&&phrase.index<phrase.events.length&&phrase.start+phrase.events[phrase.index].at<=now+.18) {
        const event=phrase.events[phrase.index++],at=phrase.start+event.at;
        // A suspended tab or loading stall must never dump missed notes at once.
        if(at>=now-.06)tone(event,Math.max(now+.005,at),phrase.group);
      }
      if(phrase&&phrase.index===phrase.events.length&&phrase.group.end===Infinity)
        phrase.group.end=phrase.start+Math.max(...phrase.events.map(e=>e.at+e.duration+1.6));
    }
    if(birdsOn&&now>=nextBird){bird(now+.01);nextBird=now+(9+rand()*12)*(1+rain*12);mixDue=0;}
  }
  return {unlock,update,setSettings,
    state:()=>({settings:{...settings},initialized:!!context,unlocked,device:context?.state??'unopened',cue,title:SCORE[cue]?.title??null,
      position:phrase&&context?Math.max(0,context.currentTime-phrase.start):0,duration:cue?SCORE[cue].length*SCORE[cue].beat:0,
      section:phrase&&cue&&!SCORE[cue].once?SCORE_SECTIONS[Math.min(7,Math.max(0,Math.floor((context.currentTime-phrase.start)/SCORE[cue].beat/32)))]:null,
      musicPlaying:!!context&&context.state==='running'&&!disposed&&!settings.muted&&settings.music>0&&!!cue&&!!phrase&&!phrase.group.retiring&&groups.has(phrase.group)&&context.currentTime>=phrase.start&&context.currentTime<phrase.group.end,
      phrases,resultPhrases,arrangement:cue==='duel'?(input.trial?.tier??trialMusicTier(input.trial?.round)):null,notes,calls,voices:voices.size,maxVoices,groups:groups.size,ducked:!!context&&context.currentTime<duckUntil&&settings.nature>0,weather:{...weatherMix},disposed,error}),
    dispose(){if(disposed)return;disposed=true;disposeGraph();},
  };
}
