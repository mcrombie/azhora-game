import {createSoundscape} from '../../world/audio/soundscape.js';
import {SCORE} from '../../world/audio/score.js';
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const assert=(value,message)=>{if(!value)throw Error(message);return message;};

export async function opening(a){
  const checks=[];window.dispatchEvent(new Event('focus'));a.resume();
  checks.push(assert(!a.soundtrack.state().initialized,'Audio device stays unopened until a gesture'));
  const before=a.war?.clock().elapsedSeconds;
  a.soundtrack.unlock();await wait(2200);
  const s=a.soundtrack.state();checks.push(assert(s.initialized&&s.notes>0&&!s.error,'Real Web Audio plays an authored phrase'));
  checks.push(assert(s.cue===(a.tower?'tower':'country'),'Live host selects the correct opening theme'));
  if(a.minimap){
    const label=document.getElementById('music-now-playing'),map=document.getElementById('exploration-minimap');
    checks.push(assert(label?.textContent.includes(s.title)&&label.getBoundingClientRect().top>=map.getBoundingClientRect().bottom,'Current piece is named just below the minimap'));
    a.soundtrack.setSettings({music:0});checks.push(assert(label.textContent.includes('Music off'),'Label reflects music volume being off'));
    a.soundtrack.setSettings({muted:true});checks.push(assert(label.textContent.includes('Sound muted'),'Label reflects muted audio'));
    a.soundtrack.setSettings({music:.42,muted:false});
  }
  if(a.tower)checks.push(assert(a.war.clock().elapsedSeconds===before,'Music does not advance frozen tower time'));
  a.pause();await wait(1800);checks.push(assert(a.soundtrack.state().cue===null,'Pause silences and retires the score'));
  const panel=document.querySelector('#exploration-pause .sound-settings');panel.open=true;
  const music=panel.querySelector('[data-audio="music"]');music.value=23;music.dispatchEvent(new Event('input'));music.dispatchEvent(new Event('change'));
  checks.push(assert(a.soundtrack.state().settings.music===.23,'Pause-menu slider controls music'));
  checks.push(assert(document.querySelector('#start-screen [data-audio="music"]').value==='23','Launcher and pause preferences agree'));
  const stored=JSON.parse(window.azhoraExplorationStorage.getItem('azhora-sound-v1'));
  checks.push(assert(stored.music===.23,'Native preferences are stored independently of campaign saves'));
  a.resume();await wait(400);window.dispatchEvent(new Event('blur'));await wait(100);
  checks.push(assert(a.soundtrack.state().device==='suspended','Losing focus suspends the audio device'));
  window.dispatchEvent(new Event('focus'));await wait(400);checks.push(assert(a.soundtrack.state().device==='running','Returning focus resumes audio'));
  checks.push(assert(a.state().frameErrors.length===0,'Music produces no gameplay frame errors'));
  a.pause();panel.open=true;
  return {checks,state:a.soundtrack.state(),mode:a.state().mode};
}

export async function nowPlaying(a){
  a.resume();await wait(700);a.soundtrack.refresh();
  const label=document.getElementById('music-now-playing');
  if(!label||!label.textContent.includes(a.soundtrack.state().title))throw Error('Now-playing label missing');
  return {title:label.textContent,state:a.soundtrack.state()};
}

/** Render the very same runtime synth through Chromium's offline audio device.
 * The reel is a review artifact, not a streamed/loaded game asset. */
export async function renderPreview({settings=null,encode=true,stillroom=false,track=null}={}){
  const rate=24000,seconds=track?Math.ceil(SCORE[track].length*SCORE[track].beat+8):stillroom?80:56,context=new OfflineAudioContext(2,rate*seconds,rate);
  let seed=87;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const audio=createSoundscape({context,random});if(settings)audio.setSettings(settings);audio.unlock();
  const input=()=>{
    const t=context.currentTime;
    if(track)return {mode:['battle','duel'].includes(track)?'skirmish':'playing',inside:track==='tower',room:'tower',hour:track==='night'?23:7,training:track==='stillroom',trial:track==='duel'?{id:1,round:9,tier:3}:null,active:true,regionId:SCORE[track].area?38:1,musicArea:SCORE[track].area?track:null};
    if(!stillroom)return {mode:t>=38?'skirmish':'playing',inside:t<17,room:'tower',hour:7,active:true};
    const round=t<30?0:t<44?3:t<58?6:9;
    return {mode:'skirmish',training:true,active:true,reviewing:t<10||t>=29&&t<30||t>=43&&t<44||t>=57&&t<58||t>=70,
      trial:{id:t<75?1:2,round,outcome:t>=75?'defeat':t>=70?'success':null}};
  };
  audio.update(input());
  let suspended=context.suspend(.08);const rendered=context.startRendering();
  for(let t=.08;t<seconds-.12;t+=.08){
    await suspended;audio.update(input());
    const next=t+.08;if(next<seconds-.12)suspended=context.suspend(next);
    await context.resume();
  }
  const buffer=await rendered,left=buffer.getChannelData(0),right=buffer.getChannelData(1);
  let peak=0,sum=0;for(let i=0;i<left.length;i++)for(const sample of [left[i],right[i]]){if(!Number.isFinite(sample))throw Error('Non-finite audio sample');peak=Math.max(peak,Math.abs(sample));sum+=sample*sample;}
  if(peak<.001||peak>=.98)throw Error('Audio is silent or clipping: '+peak);
  const report={seconds,peak,rms:Math.sqrt(sum/(left.length*2)),state:audio.state(),chapters:track?'Complete piece: '+SCORE[track].title:stillroom?'0:00 mist; 0:10 early duel; 0:30 militia/soldier; 0:44 warriors/veterans; 0:58 ogre; 1:10 victory; 1:15 defeat':'0:00 tower; 0:17 morning country and birds; 0:38 combat'};
  audio.dispose();if(!encode)return report;
  const bytes=new ArrayBuffer(44+left.length*4),view=new DataView(bytes);
  const text=(offset,s)=>[...s].forEach((c,i)=>view.setUint8(offset+i,c.charCodeAt(0)));
  text(0,'RIFF');view.setUint32(4,bytes.byteLength-8,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,2,true);view.setUint32(24,rate,true);view.setUint32(28,rate*4,true);view.setUint16(32,4,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,bytes.byteLength-44,true);
  for(let i=0;i<left.length;i++){view.setInt16(44+i*4,Math.round(left[i]*32767),true);view.setInt16(46+i*4,Math.round(right[i]*32767),true);}
  let binary='';const data=new Uint8Array(bytes);for(let i=0;i<data.length;i+=16384)binary+=String.fromCharCode(...data.subarray(i,i+16384));
  return {wav:btoa(binary),...report};
}
