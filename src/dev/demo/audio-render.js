import {createSoundscape} from '../../world/audio/soundscape.js';
import {playImpactSound} from '../../app/lizeem/impact-sound.js';

let output=null;
const seeded=initial=>{let seed=initial>>>0;return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};};

/** Replays the game's actual score and cues on the film's clock. Offline rendering
 * can run faster or slower than real time without changing pitch or synchronization.
 * Return metadata only; retrieve the WAV in bounded chunks with readDemoAudioChunk. */
export async function renderDemoAudio({events=[],duration,settings=null,rate=48000,seed=87,encode=false}={}){
  if(!Number.isFinite(duration)||duration<=0||duration>7200)throw Error('Demo audio duration must be between 0 and 7200 seconds.');
  if(![24000,44100,48000].includes(rate))throw Error('Unsupported demo sample rate.');
  output=null;
  const ordered=events.map((event,index)=>({...event,index})).filter(event=>Number.isFinite(event.time)&&event.time>=0&&event.time<duration)
    .sort((a,b)=>a.time-b.time||a.index-b.index);
  const length=Math.ceil(duration*rate),context=new OfflineAudioContext(2,length,rate),audio=createSoundscape({context,random:seeded(seed)});
  if(settings)audio.setSettings(settings,{persist:false});
  let input={mode:'loading',active:true},next=0,impacts=0,scenes=0,settingsKey=JSON.stringify(settings);
  audio.unlock();
  // Preserve captured scheduler ticks: at 30 video frames per second the host's
  // .08 s refresh happens every three frames. Audio must follow those same calls.
  // Standalone audition fixtures without ticks retain the .08 s fallback.
  const recordedTicks=ordered.some(event=>event.kind==='tick'),quantum=128/rate,times=new Set();
  if(!recordedTicks)for(let time=.08;time<duration-quantum;time+=.08)times.add(Math.floor(time/quantum));
  for(const event of ordered)if(event.time>=quantum)times.add(Math.floor(event.time/quantum));
  const boundaries=[...times].filter(block=>block>0&&block*quantum<duration-quantum).sort((a,b)=>a-b).map(block=>block*quantum);
  const apply=now=>{
    let refresh=!recordedTicks;
    while(next<ordered.length&&ordered[next].time<=now+quantum){
      const event=ordered[next++];
      if(event.kind==='scene'){
        input={...event.input,active:true};refresh=true;
        const key=JSON.stringify(event.settings);if(event.settings&&key!==settingsKey){audio.setSettings(event.settings,{persist:false});settingsKey=key;}scenes++;
      }else if(event.kind==='tick')refresh=true;
      else if(event.kind==='impact'){
        playImpactSound(context,event.cue,context.destination,Math.max(now,event.time));impacts++;
      }
    }
    if(refresh)audio.update(input);
  };
  apply(0);
  let suspended=boundaries.length?context.suspend(boundaries[0]):null;
  const rendered=context.startRendering();
  for(let index=0;index<boundaries.length;index++){
    await suspended;apply(context.currentTime);
    if(index+1<boundaries.length)suspended=context.suspend(boundaries[index+1]);
    await context.resume();
  }
  const buffer=await rendered,left=buffer.getChannelData(0),right=buffer.getChannelData(1);
  let peak=0,sum=0,nonzero=0;
  for(const channel of [left,right])for(let i=0;i<length;i++){
    const value=channel[i];if(!Number.isFinite(value))throw Error('Non-finite demo audio sample.');
    peak=Math.max(peak,Math.abs(value));sum+=value*value;if(Math.abs(value)>.0001)nonzero++;
  }
  if(ordered.length&&peak<.001)throw Error('Recorded demo soundtrack is silent.');
  if(peak>=.999)throw Error('Recorded demo soundtrack clips: '+peak);
  const report={duration:length/rate,sampleRate:rate,channels:2,peak,rms:Math.sqrt(sum/(length*2)),nonzero,scenes,impacts,events:ordered.length,state:audio.state()};
  audio.dispose();
  output=new Uint8Array(44+length*4);const view=new DataView(output.buffer);
  const text=(offset,s)=>[...s].forEach((c,i)=>view.setUint8(offset+i,c.charCodeAt(0)));
  text(0,'RIFF');view.setUint32(4,output.length-8,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);
  view.setUint16(20,1,true);view.setUint16(22,2,true);view.setUint32(24,rate,true);view.setUint32(28,rate*4,true);view.setUint16(32,4,true);view.setUint16(34,16,true);
  text(36,'data');view.setUint32(40,output.length-44,true);
  for(let i=0;i<length;i++){view.setInt16(44+i*4,Math.round(left[i]*32767),true);view.setInt16(46+i*4,Math.round(right[i]*32767),true);}
  if(encode&&output.length>32*1024*1024)throw Error('Use readDemoAudioChunk for WAVs larger than 32 MB.');
  return {report,bytes:output.length,...(encode?{wav:readDemoAudioChunk(0,output.length)}:{})};
}

export function readDemoAudioChunk(offset=0,length=1024*1024){
  if(!output)throw Error('Render demo audio before reading it.');
  if(!Number.isInteger(offset)||offset<0||!Number.isInteger(length)||length<=0)throw Error('Invalid audio chunk bounds.');
  let binary='';const bytes=output.subarray(offset,Math.min(output.length,offset+length));
  for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));
  return btoa(binary);
}

export function releaseDemoAudio(){output=null;}
