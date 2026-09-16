const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const EFFECTS=Object.freeze({
  swing:[180,70,.13,.10],hit:[240,85,.12,.17],'practice-hit':[330,110,.10,.11],
  dodge:[430,150,.17,.05],'player-hit':[105,48,.20,.20],windup:[180,260,.18,.05],
  bell:[720,718,1.8,.12],success:[520,1040,.48,.08],'enemy-defeated':[260,90,.22,.10],
  bite:[740,1120,.16,.055],
});

/** Geography and surface selection remain usable without opening an audio device. */
export function roadAudioProfile({position={},region=1}={}) {
  const id=[1,2,3,4].includes(region?.id??region)?(region?.id??region):1;
  const x=Number.isFinite(position.x)?position.x:0,z=Number.isFinite(position.z)?position.z:0;
  const shore=clamp((z+48)/78,0,1),water=clamp(1-Math.abs(z+412)/78,0,1);
  const wood=(id===1&&Math.abs(x)<3&&z>=24)||(id===3&&Math.abs(x)<2.8&&z>=-425&&z<=-399);
  return {region:id,surface:wood?'wood':id===4?'stone':'earth',
    sea:id===1?.22*shore:0,forest:id===1?.065*(1-shore*.7):0,
    field:id===2?.055:0,river:id===3?.14*water:0,ridge:id===4?.105:0};
}

/** Lazy, local synthesis. No audio context, timers, or sources exist until unmuted. */
export function createRoadAudio({AudioContext=globalThis.AudioContext??globalThis.webkitAudioContext,random=Math.random}={}) {
  let context=null,master=null,noise=null,ambientSource=null,enabled=false,disposed=false;
  let playing=false,lastY=null,region=1,surface='earth',steps=0,calls=0,elapsed=0;
  let stepDistance=0,callCountdown=5.5,mixTimer=0,profile=roadAudioProfile(),lastError=null;
  const layers={},transients=new Set();
  const rand=()=>clamp(Number(random())||0,0,1);

  function disconnect(node) {try{node?.disconnect();}catch{/* Already released by the audio device. */}}
  function stopTransient(entry) {
    try{entry.source.stop();}catch{/* A scheduled source may already have ended. */}
    entry.cleanup();
  }
  function track(source,nodes) {
    let cleaned=false;
    const entry={source,cleanup(){if(cleaned)return;cleaned=true;source.onended=null;
      for(const node of nodes)disconnect(node);transients.delete(entry);}};
    source.onended=entry.cleanup;transients.add(entry);return entry;
  }
  function ensureContext() {
    if(context)return true;
    if(typeof AudioContext!=='function'||disposed)return false;
    try {
      context=new AudioContext();master=context.createGain();master.gain.value=0;master.connect(context.destination);
      noise=context.createBuffer(1,context.sampleRate*5,context.sampleRate);
      const values=noise.getChannelData(0);
      for(let i=0;i<values.length;i++)values[i]=(rand()*2-1)*.42;
      ambientSource=context.createBufferSource();ambientSource.buffer=noise;ambientSource.loop=true;
      const settings={sea:['lowpass',410,.4],forest:['bandpass',1550,.5],field:['lowpass',720,.55],river:['lowpass',2100,.45],ridge:['bandpass',940,.45]};
      for(const [name,[type,frequency,q]] of Object.entries(settings)) {
        const filter=context.createBiquadFilter(),gain=context.createGain();
        filter.type=type;filter.frequency.value=frequency;filter.Q.value=q;gain.gain.value=0;
        ambientSource.connect(filter);filter.connect(gain);gain.connect(master);layers[name]={filter,gain};
      }
      ambientSource.start();return true;
    } catch(error) {
      lastError=error?.message||'Audio is unavailable.';
      try{ambientSource?.stop();}catch{}
      disconnect(ambientSource);disconnect(master);
      for(const layer of Object.values(layers)){disconnect(layer.filter);disconnect(layer.gain);}
      try{context?.close()?.catch?.(()=>{});}catch{}
      context=null;return false;
    }
  }
  function mix() {
    if(!context||!enabled)return;
    const pause=playing?1:.22,gust=.84+Math.sin(elapsed*.43)*.10+Math.sin(elapsed*.17)*.06;
    for(const [name,layer] of Object.entries(layers)) {
      const target=profile[name]*pause*((name==='field'||name==='ridge'||name==='sea')?gust:1);
      layer.gain.gain.setTargetAtTime(target,context.currentTime,.7);
    }
  }
  function tone(spec,{type='triangle',turn=null}={}) {
    if(!enabled||!context||disposed)return false;
    const now=context.currentTime,osc=context.createOscillator(),gain=context.createGain();
    osc.type=type;osc.frequency.setValueAtTime(spec[0],now);
    if(turn)osc.frequency.exponentialRampToValueAtTime(turn,now+spec[2]*.4);
    osc.frequency.exponentialRampToValueAtTime(spec[1],now+spec[2]);
    gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(spec[3],now+.012);
    gain.gain.exponentialRampToValueAtTime(.0001,now+spec[2]);
    osc.connect(gain);gain.connect(master);track(osc,[osc,gain]);osc.start(now);osc.stop(now+spec[2]+.03);return true;
  }
  function footstep() {
    const now=context.currentTime,source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();
    const surfaces={wood:[430,.080,.09],earth:[640,.048,.09],stone:[1650,.054,.07]},[frequency,volume,duration]=surfaces[surface];
    source.buffer=noise;filter.type='lowpass';filter.frequency.value=frequency;filter.Q.value=.65;
    gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(volume,now+.009);
    gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
    source.connect(filter);filter.connect(gain);gain.connect(master);track(source,[source,filter,gain]);
    source.start(now,rand()*4,duration+.025);source.stop(now+duration+.04);steps++;
  }
  function effect(type) {
    const spec=EFFECTS[type];return spec?tone(spec,{type:type==='bell'||type==='success'?'sine':'triangle'}):false;
  }
  function toggle() {
    if(disposed)return false;
    if(!enabled&&!ensureContext())return false;
    enabled=!enabled;
    try{context.resume()?.catch?.(()=>{});}catch{}
    master.gain.setTargetAtTime(enabled?.26:0,context.currentTime,.18);
    if(!enabled)for(const entry of [...transients])stopTransient(entry);
    stepDistance=0;mix();return enabled;
  }
  function update(dt,{position, speed=0,region:nextRegion=1,playing:nextPlaying=false}={}) {
    if(disposed||!Number.isFinite(dt)||dt<=0||!Number.isFinite(position?.x)||!Number.isFinite(position?.z))return;
    const step=Math.min(dt,.25),previousRegion=region,wasPlaying=playing;
    profile=roadAudioProfile({position,region:nextRegion});region=profile.region;surface=profile.surface;playing=Boolean(nextPlaying);
    if(!enabled||!context){lastY=Number.isFinite(position.y)?position.y:null;stepDistance=0;return;}
    elapsed+=step;mixTimer-=step;
    if(region!==previousRegion||playing!==wasPlaying||mixTimer<=0){mix();mixTimer=.18;}
    const verticalSpeed=lastY===null||!Number.isFinite(position.y)?0:Math.abs(position.y-lastY)/step;
    lastY=Number.isFinite(position.y)?position.y:null;
    if(!playing){stepDistance=0;return;}
    const pace=Number.isFinite(speed)?clamp(speed,0,10):0;
    if(pace>.2&&verticalSpeed<2.5){
      stepDistance+=pace*step;const stride=pace>5?1.75:1.35;
      if(stepDistance>=stride){stepDistance%=stride;footstep();}
    }else stepDistance=0;
    callCountdown-=step;
    if(callCountdown<=0) {
      let heard=false;
      if(region===2&&Math.hypot(position.x+32,position.z+248)<72)
        heard=tone([235,182,.48,.016],{turn:270});
      else if((region===1&&position.z<12)||(region===3&&Math.abs(position.z+412)<72))
        heard=tone([1450+rand()*280,1360,.29,.018],{type:'sine',turn:2190+rand()*160});
      if(heard)calls++;
      callCountdown=region===2?12+rand()*6:8+rand()*7;
    }
  }
  function dispose() {
    if(disposed)return;disposed=true;enabled=false;
    for(const entry of [...transients])stopTransient(entry);
    try{ambientSource?.stop();}catch{}
    disconnect(ambientSource);
    for(const layer of Object.values(layers)){disconnect(layer.filter);disconnect(layer.gain);}
    disconnect(master);try{context?.close()?.catch?.(()=>{});}catch{}
  }
  return {effect,toggle,update,dispose,state:()=>({enabled,initialized:Boolean(context),disposed,playing,region,surface,
    footsteps:steps,calls,transients:transients.size,profile:{...profile},lastError})};
}
