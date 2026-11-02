import {createSoundscape} from '../../world/audio/soundscape.js';

/** The launcher owns audio so its first click unlocks the device even when
 * world loading takes minutes. Settings live outside any campaign save. */
export function createExplorationAudio({document=globalThis.document,window=globalThis.window,storage=null}={}) {
  const audio=createSoundscape({storage}),abort=new AbortController(),panels=[];
  const nowPlaying=document.createElement('span');nowPlaying.id='music-now-playing';nowPlaying.setAttribute('role','status');nowPlaying.setAttribute('aria-live','polite');
  nowPlaying.innerHTML='<span class="music-label"></span><span class="music-title"></span>';
  const musicLabel=nowPlaying.firstElementChild,musicTitle=nowPlaying.lastElementChild;
  let read=()=>({mode:'loading'}),due=0,focused=true;
  const listen=(target,name,fn,options={})=>target.addEventListener(name,fn,{...options,signal:abort.signal});
  function updateNowPlaying(){
    const minimap=document.getElementById('exploration-minimap');
    if(!minimap)return;
    if(nowPlaying.parentElement!==minimap){minimap.insertBefore(nowPlaying,minimap.lastElementChild);minimap.setAttribute('aria-describedby',nowPlaying.id);}
    const s=audio.state(),title=s.settings.muted?'Sound muted':s.settings.music===0?'Music off':s.error?'Music unavailable':!s.unlocked?'Music ready':s.musicPlaying?s.title:s.device==='suspended'?'Music paused':'Quiet interlude';
    const label=s.musicPlaying?'\u266a Now playing':'\u266a Music';
    if(musicLabel.textContent!==label)musicLabel.textContent=label;
    if(musicTitle.textContent!==title){musicTitle.textContent=title;nowPlaying.title=title;}
  }
  function refresh(){const context=read();audio.update({...context,active:focused&&!document.hidden&&context.active!==false});updateNowPlaying();}
  function unlock(event){if(event.isTrusted&&!audio.state().unlocked){audio.unlock();refresh();}}
  listen(document,'pointerdown',unlock,{capture:true});listen(document,'keydown',unlock,{capture:true});
  listen(window,'blur',()=>{focused=false;refresh();});listen(window,'focus',()=>{focused=true;refresh();});
  listen(document,'visibilitychange',refresh);
  const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('./audio.css',import.meta.url).href;document.head.append(css);
  function sync(){
    const s=audio.state().settings;
    for(const panel of panels){
      panel.querySelector('[data-audio="muted"]').checked=s.muted;
      for(const key of ['music','nature']){panel.querySelector(`[data-audio="${key}"]`).value=Math.round(s[key]*100);panel.querySelector(`[data-level="${key}"]`).textContent=`${Math.round(s[key]*100)}%`;}
    }
    updateNowPlaying();
  }
  for(const [i,parent]of [document.querySelector('#start-screen .start-card'),document.querySelector('#exploration-pause .start-card'),document.querySelector('#combat-testing-menu .start-card'),document.getElementById('world-skirmish-controls')].entries()){
    if(!parent)continue;
    const panel=document.createElement('details');panel.className='sound-settings';panel.dataset.soundSettings=String(i);
    panel.innerHTML=`<summary>Music &amp; nature</summary><div class="sound-controls">
      <label class="sound-mute"><input type="checkbox" data-audio="muted"> Mute music and nature</label>
      <label for="sound-music-${i}">Music <output data-level="music"></output></label>
      <input id="sound-music-${i}" data-audio="music" type="range" min="0" max="100" step="1">
      <label for="sound-nature-${i}">Nature &amp; birdsong <output data-level="nature"></output></label>
      <input id="sound-nature-${i}" data-audio="nature" type="range" min="0" max="100" step="1">
      <small>Music leaves quiet moments for the world. Set music to zero to listen to nature alone.</small>
      </div>`;
    for(const control of panel.querySelectorAll('[data-audio]')){
      const apply=persist=>{audio.unlock();const key=control.dataset.audio;audio.setSettings({[key]:key==='muted'?control.checked:Number(control.value)/100},{persist});sync();};
      listen(control,'input',()=>apply(false));listen(control,'change',()=>apply(true));
    }
    parent.append(panel);panels.push(panel);
  }
  sync();
  const api={
    bind(getContext){read=getContext;refresh();},
    tick(dt){due-=dt;if(due<=0){due=.08;refresh();}},
    refresh,unlock:()=>{const result=audio.unlock();refresh();return result;},
    setSettings(patch){const s=audio.setSettings(patch);sync();return s;},state:audio.state,
    dispose(){abort.abort();audio.dispose();panels.forEach(p=>p.remove());nowPlaying.remove();css.remove();},
  };
  listen(window,'pagehide',api.dispose);
  return api;
}
