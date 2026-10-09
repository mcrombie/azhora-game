import {residentPeaceWords} from './league-settlement.js';
import {writeHud} from './hud-write.js';
import {RESIDENT_CONVERSATIONS} from '../../content/regions/minora-frontier/resident-conversations.js';

// Proximity dialogue only: six existing actors, no simulation agents or save state.
export function createResidentHost({world,position,mode,setMode,available,campaign=()=>null}){
  const prompt=document.createElement('button'),dialog=document.createElement('section');
  prompt.id='resident-interact';prompt.hidden=true;dialog.id='resident-dialog';dialog.hidden=true;
  dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','resident-speaker');
  dialog.innerHTML='<div class="tower-dialog-card"><span class="eyebrow">MINORA / A CONVERSATION</span><h2 id="resident-speaker"></h2><h3 id="resident-office"></h3><p id="resident-words"></p><div class="tower-dialog-actions"><button data-topic="work">What do you do here?</button><button data-topic="war">What do you think of the war?</button><button data-topic="close">Goodbye (Esc)</button></div></div>';
  document.body.append(prompt,dialog);let speaking=null,previousFocus=null,nextScan=0;
  const $=id=>dialog.querySelector('#resident-'+id),buttons=[...dialog.querySelectorAll('button')];
  const target=()=>mode()==='playing'&&available()?world.residentTarget(position):null;
  function close(){if(!speaking)return;dialog.hidden=true;speaking=null;world.setResidentTalking(null);setMode('playing');update();if(previousFocus?.isConnected)previousFocus.focus();}
  function interact(){const person=target();if(!person)return false;const words=RESIDENT_CONVERSATIONS[person.id];if(!words)return false;
    speaking=person.id;previousFocus=document.activeElement;world.setResidentTalking(speaking,position);setMode('briefing');prompt.hidden=true;dialog.hidden=false;
    $('speaker').textContent=person.name;$('office').textContent=person.occupation;$('words').textContent=residentPeaceWords(person.id,campaign())??words.hello;buttons[0].focus();return true;}
  for(const button of buttons)button.onclick=()=>{if(button.dataset.topic==='close')close();else if(speaking)$('words').textContent=(button.dataset.topic==='war'?residentPeaceWords(speaking,campaign()):null)??RESIDENT_CONVERSATIONS[speaking][button.dataset.topic];};
  prompt.onclick=interact;
  function update(){if(mode()!=='playing'){writeHud(prompt,'hidden',true);nextScan=0;return;}if(performance.now()<nextScan)return;nextScan=performance.now()+120;const person=target();writeHud(prompt,'hidden',!person);if(person)writeHud(prompt,'textContent',`F / Talk to ${person.name} / ${person.occupation}`);}
  return {interact,update,state:()=>({speaking}),
    keydown(e){if(!speaking)return false;if(e.code==='Escape'){e.preventDefault();close();}else if(e.code==='Tab'){e.preventDefault();const i=buttons.indexOf(document.activeElement);buttons[(i+(e.shiftKey?-1:1)+buttons.length)%buttons.length].focus();}else if(!['Enter','Space'].includes(e.code))e.preventDefault();return true;},
    dispose(){world.setResidentTalking(null);prompt.remove();dialog.remove();}
  };
}
