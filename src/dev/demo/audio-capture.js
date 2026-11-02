/** Frame-timestamped audio directions. Imported only by the internal demo recorder.
 * The output clock belongs to encoded frames, never to slow screenshot wall time. */
export function installDemoAudio(options={},scope=globalThis){
  scope.__AZHORA_DEMO_AUDIO_CAPTURE__?.dispose();
  let recording=false,events=[],settings=null,lastScene='',lastImpact=-Infinity,lastTick=-Infinity,latestScene=null,seed=options.seed??87;
  const time=()=>Math.max(0,Number(scope.__AZHORA_DEMO_TIME__)||0);
  const copy=value=>JSON.parse(JSON.stringify(value));
  const originalContext=scope.AudioContext,originalWebkit=scope.webkitAudioContext;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  // The capture tab advances much slower than wall time. It needs a silent
  // bookkeeping device so the visible Now playing label shares the film clock.
  // This is installed before app boot; the audio-render page never imports it.
  class Param{
    constructor(){this.value=0;}
    setValueAtTime(value){this.value=value;}setTargetAtTime(value){this.value=value;}
    linearRampToValueAtTime(value){this.value=value;}exponentialRampToValueAtTime(value){this.value=value;}
    cancelScheduledValues(){}
  }
  class Node{
    constructor(context){this.context=context;this.stopAt=Infinity;this.ended=false;context.nodes.add(this);
      for(const name of ['gain','pan','frequency','Q','threshold','knee','ratio','attack','release'])this[name]=new Param();}
    connect(node){return node;}disconnect(){this.context.nodes.delete(this);}start(){}setPeriodicWave(){}
    stop(at=this.context.currentTime){this.stopAt=at;}
  }
  class Context{
    constructor(){this.nodes=new Set();this.sampleRate=48000;this.destination={};this.state='suspended';}
    get currentTime(){const now=time();for(const node of this.nodes)if(!node.ended&&node.stopAt<=now){node.ended=true;node.onended?.();}return now;}
    createGain(){return new Node(this);}createOscillator(){return new Node(this);}createStereoPanner(){return new Node(this);}
    createBufferSource(){return new Node(this);}createConvolver(){return new Node(this);}createBiquadFilter(){return new Node(this);}
    createDynamicsCompressor(){return new Node(this);}createPeriodicWave(){return {};}
    createBuffer(channels,length,rate){return {numberOfChannels:channels,length,sampleRate:rate,getChannelData:()=>new Float32Array(length)};}
    resume(){this.state='running';return Promise.resolve();}suspend(){this.state='suspended';return Promise.resolve();}
    close(){this.state='closed';this.nodes.clear();return Promise.resolve();}
  }
  if(options.virtual!==false){scope.AudioContext=Context;scope.webkitAudioContext=Context;}
  scope.__AZHORA_DEMO_AUDIO_RANDOM__=random;
  const weatherLevel=value=>Number.isFinite(value)?Math.round(Math.max(0,Math.min(1,value))*100)/100:0;
  const normalized=input=>({mode:input.mode,active:true,inside:!!input.inside,room:input.room??null,training:!!input.training,
    reviewing:!!input.reviewing,combatActive:!!input.combatActive,hour:(input.hour??10)<5.5||(input.hour??10)>=19.5?23:10,
    regionId:input.regionId??1,trial:input.trial?{id:input.trial.id,round:input.trial.round,tier:input.trial.tier,outcome:input.trial.outcome??null}:null,
    // Rain/wind drift every frame. Hundredths retain audible changes without
    // expanding the recording into a new full scene event on every frame.
    ...(input.weather?{weather:{rain:weatherLevel(input.weather.rain),wind:weatherLevel(input.weather.wind),
      exterior:input.weather.exterior===true,sheltered:input.weather.sheltered===true}}:{})});
  function scene(event){
    latestScene=copy(event);
    if(!recording)return false;
    const input=normalized(event.input),key=JSON.stringify({input,settings:event.settings});
    if(key===lastScene){
      if(lastTick!==time())events.push({time:time(),kind:'tick'});
      lastTick=time();return;
    }
    lastScene=key;settings=copy(event.settings??settings);
    lastTick=time();events.push({time:time(),kind:'scene',input,settings:copy(settings)});
  }
  function receive(event){
    if(event.kind==='scene')return scene(event);
    if(!recording||event.kind!=='impact'||time()-lastImpact<.06)return;
    lastImpact=time();events.push({time:time(),kind:'impact',cue:event.cue});
  }
  const api={
    start(startOptions={}){events=[];lastScene='';lastImpact=-Infinity;lastTick=-Infinity;seed=options.seed??87;settings=copy(startOptions.settings??null);recording=true;if(latestScene)scene(latestScene);return api;},
    setRecording(value){const resume=!recording&&!!value;recording=!!value;if(resume)lastScene='';return recording;},
    snapshot(){return {version:1,events:copy(events),settings:copy(settings),duration:time(),recording};},
    dispose(){recording=false;if(scope.__AZHORA_DEMO_AUDIO__===receive)delete scope.__AZHORA_DEMO_AUDIO__;if(scope.__AZHORA_DEMO_AUDIO_CAPTURE__===api)delete scope.__AZHORA_DEMO_AUDIO_CAPTURE__;
      if(scope.AudioContext===Context)scope.AudioContext=originalContext;if(scope.webkitAudioContext===Context)scope.webkitAudioContext=originalWebkit;
      if(scope.__AZHORA_DEMO_AUDIO_RANDOM__===random)delete scope.__AZHORA_DEMO_AUDIO_RANDOM__;},
  };
  scope.__AZHORA_DEMO_AUDIO__=receive;scope.__AZHORA_DEMO_AUDIO_CAPTURE__=api;
  return api;
}
