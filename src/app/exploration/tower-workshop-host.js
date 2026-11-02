import {guildExhibitTarget} from '../../content/regions/minora-frontier/guild-exhibits.js';
import {TOWER} from './tower-state.js';
import {writeHud} from './hud-write.js';

export function createTowerWorkshopHost({state,position,mode,setMode,demonstrate,travel,guides=()=>[],available=()=>true}){
  const prompt=document.createElement('button');prompt.id='tower-workshop-interact';prompt.hidden=true;
  const dialog=document.createElement('section');dialog.id='tower-workshop-dialog';dialog.hidden=true;
  dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','tower-workshop-name');
  dialog.innerHTML='<div class="tower-workshop-card"><span class="eyebrow">WIZARD GUILD</span><h2 id="tower-workshop-name"></h2><p id="tower-workshop-description"></p><p id="tower-workshop-note"></p><p id="tower-workshop-response" role="status" hidden></p><div class="tower-dialog-actions"><button id="tower-workshop-action" hidden></button><button id="tower-workshop-close">Continue exploring</button></div><small>Time stands still throughout the tower.</small></div>';
  document.body.append(prompt,dialog);
  const $=id=>dialog.querySelector('#tower-workshop-'+id);
  let inspecting=null,previousFocus=null,busy=false,extras=[],audio=null;
  const target=()=>available()?guildExhibitTarget({x:position.x-TOWER.x,y:position.y-TOWER.y,z:position.z-TOWER.z},{room:state().room,mode:mode()},guides()):null;
  function update(){const e=target();writeHud(prompt,'hidden',!e);if(e)writeHud(prompt,'textContent',`F / Observe ${e.name}`);}
  function interact(){
    const e=target();if(!e)return false;
    previousFocus=document.activeElement;inspecting=e;
    dialog.querySelector('.eyebrow').textContent=e.note?.split(' / ')[0]??'WIZARD GUILD';
    $('close').textContent='Continue exploring';
    for(const button of extras)button.remove();extras=[];
    for(const option of e.alternatives??[]){const button=document.createElement('button');button.textContent=option.label;button.dataset.action=option.id;$('close').before(button);button.onclick=()=>perform(option.id,option.response);extras.push(button);}
    $('name').textContent=e.name;$('description').textContent=e.description;$('note').textContent=e.note;
    $('response').hidden=true;$('response').textContent='';$('action').hidden=!e.action;$('action').textContent=e.action??'';
    setMode('briefing');prompt.hidden=true;dialog.hidden=false;(e.action?$('action'):$('close')).focus();return true;
  }
  function restore(){inspecting=null;previousFocus=null;dialog.hidden=true;prompt.hidden=true;}
  function close(){
    if(!inspecting||busy)return false;
    inspecting=null;dialog.hidden=true;setMode('playing');update();
    if(previousFocus?.isConnected)previousFocus.focus();previousFocus=null;return true;
  }
  prompt.onclick=interact;$('close').onclick=close;
  function chime(id){
    if(!['whisper','silence-candles'].includes(id))return;
    try{
      const Context=globalThis.AudioContext??globalThis.webkitAudioContext;if(!Context)return;
      audio??=new Context();void audio.resume();const oscillator=audio.createOscillator(),gain=audio.createGain();
      oscillator.type='sine';oscillator.frequency.value=id==='whisper'?440:523.25;
      gain.gain.setValueAtTime(0,audio.currentTime);gain.gain.linearRampToValueAtTime(.045,audio.currentTime+.03);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+1.2);
      oscillator.connect(gain);gain.connect(audio.destination);oscillator.start();oscillator.stop(audio.currentTime+1.3);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
    }catch{ /* Visual motion and captions always carry the same demonstration. */ }
  }
  async function perform(id,response){
    if(!inspecting||busy)return;const selected=inspecting;busy=true;$('action').disabled=true;
    try{
      if(selected.travel){
        $('response').textContent='Opening the folded passage…';$('response').hidden=false;dialog.setAttribute('aria-busy','true');
        // Paint the feedback before the first optional landscape is built.
        await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
        if(await travel?.(selected.travel)){busy=false;close();}return;
      }
      if(!demonstrate(id))return;
      chime(id);$('response').textContent=response;$('response').hidden=false;
    }catch(error){$('response').textContent='The demonstration could not open. '+error.message;$('response').hidden=false;}
    finally{busy=false;$('action').disabled=false;dialog.removeAttribute('aria-busy');}
  }
  $('action').onclick=()=>perform(inspecting?.id,inspecting?.response);
  return {update,interact,restore,close,
    state:()=>({open:!!inspecting,id:inspecting?.id??null,near:target()?.id??null}),
    view:()=>inspecting?{...inspecting,x:TOWER.x+inspecting.x,y:TOWER.y+inspecting.y,z:TOWER.z+inspecting.z}:null,
    keydown(event){
      if(!inspecting)return false;
      if(event.code==='Escape'){event.preventDefault();close();}
      else if(event.code==='Tab'){
        event.preventDefault();const buttons=[$('action'),...extras,$('close')].filter(b=>!b.hidden&&!b.disabled),at=buttons.indexOf(document.activeElement);
        buttons[(at+(event.shiftKey?-1:1)+buttons.length)%buttons.length].focus();
      }else if(!['Enter','Space'].includes(event.code))event.preventDefault();
      return true;
    },
    dispose(){restore();if(audio)void audio.close();prompt.remove();dialog.remove();},
  };
}
