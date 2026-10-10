import {residentWords} from './resident-dialogue.js';
import {writeHud} from './hud-write.js';

// Proximity dialogue only; no simulation agents or save state.
export function createResidentHost({world,position,mode,setMode,available,campaign=()=>null}){
  const prompt=document.createElement('button'),dialog=document.createElement('section');
  prompt.id='resident-interact';prompt.hidden=true;dialog.id='resident-dialog';dialog.hidden=true;
  dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','resident-speaker');
  dialog.innerHTML='<div class="tower-dialog-card"><span class="eyebrow">MINORA / A CONVERSATION</span><h2 id="resident-speaker"></h2><h3 id="resident-office"></h3><p id="resident-words"></p><div class="tower-dialog-actions"><button data-topic="news">What is happening nearby?</button><button data-topic="work">What do you do here?</button><button data-topic="war">What do you think of the war?</button><button data-topic="future" hidden>What happens now?</button><button data-topic="memory" hidden>Do you remember my part?</button><button data-topic="close">Goodbye (Esc)</button></div></div>';
  document.body.append(prompt,dialog);let speaking=null,previousFocus=null,nextScan=0;
  const $=id=>dialog.querySelector('#resident-'+id),buttons=[...dialog.querySelectorAll('button')];
  const target=()=>mode()==='playing'&&available()?world.residentTarget(position):null;
  function close(){if(!speaking)return;dialog.hidden=true;speaking=null;world.setResidentTalking(null);setMode('playing');update();if(previousFocus?.isConnected)previousFocus.focus();}
  function interact(){const person=target();if(!person)return false;const words=residentWords(person.id,'hello',campaign());if(!words)return false;
    for(const topic of ['future','memory'])dialog.querySelector(`[data-topic="${topic}"]`).hidden=!campaign()?.winner;
    speaking=person.id;previousFocus=document.activeElement;world.setResidentTalking(speaking,position);setMode('briefing');prompt.hidden=true;dialog.hidden=false;
    dialog.querySelector('.eyebrow').textContent=(person.place??'Minora')+' / A conversation';
    $('speaker').textContent=person.name;$('office').textContent=person.occupation;$('words').textContent=words;buttons[0].focus();return true;}
  for(const button of buttons)button.onclick=()=>{
    const topic=button.dataset.topic;if(topic==='close'){close();return;}if(!speaking)return;
    $('words').textContent=residentWords(speaking,topic,campaign());
  };
  prompt.onclick=interact;
  function update(){if(mode()!=='playing'){writeHud(prompt,'hidden',true);nextScan=0;return;}if(performance.now()<nextScan)return;nextScan=performance.now()+120;const person=target();writeHud(prompt,'hidden',!person);if(person)writeHud(prompt,'textContent',`F / Talk to ${person.name} / ${person.occupation}`);}
  return {interact,update,state:()=>({speaking}),
    keydown(e){if(!speaking)return false;if(e.code==='Escape'){e.preventDefault();close();}else if(e.code==='Tab'){e.preventDefault();const visible=buttons.filter(b=>!b.hidden),i=visible.indexOf(document.activeElement);visible[(i+(e.shiftKey?-1:1)+visible.length)%visible.length].focus();}else if(!['Enter','Space'].includes(e.code))e.preventDefault();return true;},
    dispose(){world.setResidentTalking(null);prompt.remove();dialog.remove();}
  };
}
