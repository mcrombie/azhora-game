import {postwarPlans,postwarMemory} from './postwar-conversations.js';
import {MINORA_COUNCIL,COUNCIL_ROOMS,councilDoor,councilPerson} from '../../content/regions/minora-frontier/minora-council.js';
import {councilInfluence,createCouncilState} from './council-state.js';
import {councilBalance,councilBattleResponse} from './battle-consequences.js';
import {councilPeaceWords} from './league-settlement.js';
import {writeHud} from './hud-write.js';
export function createCouncilHost({saved,state,position,mode,setMode,campaign,onDoor,onDirty}){
  const progress=createCouncilState(saved),prompt=document.createElement('button'),dialog=document.createElement('section');
  prompt.id='council-interact';prompt.hidden=true;dialog.id='council-dialog';dialog.hidden=true;dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','council-speaker');
  dialog.innerHTML='<div class="tower-dialog-card"><span class="eyebrow">MINORA / COUNCIL OF THREE</span><h2 id="council-speaker"></h2><h3 id="council-office"></h3><p id="council-words"></p><p id="council-balance"></p><div class="tower-dialog-actions"><button id="council-peace">Could the council help end this war?</button><button id="council-memory" hidden>Do you remember my part?</button><button id="council-close">Return to the room</button></div></div>';
  document.body.append(prompt,dialog);let speaking=null;
  const $=id=>dialog.querySelector('#'+id),near=p=>Math.hypot(position.x-p.x,position.z-p.z)<3.5&&Math.abs(position.y-21.3)<3;
  function target(){const room=state().room;if(room&&COUNCIL_ROOMS.includes(room)){if(near(councilPerson(room)))return {id:room,talk:true};if(near(councilDoor(room)))return {id:room,enter:false};return null;}if(state().inside)return null;const id=COUNCIL_ROOMS.find(id=>near(MINORA_COUNCIL[id].exit));return id?{id,enter:true}:null;}
  function balance(){return councilBalance(campaign());}
  function talk(id){speaking=id;if(progress.meet(id))onDirty();const c=MINORA_COUNCIL[id];setMode('briefing');dialog.hidden=false;$('council-speaker').textContent=c.name;$('council-office').textContent=c.title+' / '+c.origin;
    $('council-words').textContent=id==='mayor'?'I came here from Ovesos. My allies among its canal houses and the councils of Nethereum favor West Lizeem. I believe their league offers Minora the sounder alliance. The High Priest sees things differently. Taleth holds us apart from the war, but does not forbid you to intervene. Speaking with me commits you to nothing.':'I was raised in Nesdor. The sanctuaries there and my allies in Caricas look to East Lizeem. I believe their league can preserve the order these provinces need. The Mayor favors his western friends. Taleth is neutral; you are free to make your own choice. Hearing my counsel does not enlist you.';
    const response=councilBattleResponse(id,campaign());
    if(response)$('council-words').textContent=response.words+' '+response.detail;
    const peace=councilPeaceWords(id,campaign());if(peace)$('council-words').textContent=peace;
    $('council-peace').hidden=false;$('council-peace').textContent=campaign()?.winner?'What happens now?':'Could the council help end this war?';$('council-memory').hidden=!campaign()?.winner;
    $('council-balance').textContent=balance();$('council-close').focus();}
  function close(){dialog.hidden=true;speaking=null;setMode('playing');update();}
  $('council-close').onclick=close;$('council-memory').onclick=()=>{$('council-words').textContent=postwarMemory(speaking,campaign());};
  $('council-peace').onclick=()=>{if(campaign()?.winner){$('council-words').textContent=postwarPlans(speaking,campaign());return;}$('council-words').textContent=progress.bothMet?'You have heard both of us. A joint audience might yet offer another path, if the Mayor and High Priest could reconcile their allies. That negotiation is a future story branch; it cannot end or alter this war yet.':'There may be a path through both members of the council. Hear the Mayor in the riverside Hall and the High Priest in the Grand Temple. A negotiated peace is a future story branch, not an available solution yet.';$('council-balance').textContent='Peace negotiations / Placeholder / no campaign changes.';};
  function interact(){if(mode()!=='playing')return false;const t=target();if(!t)return false;if(t.talk)talk(t.id);else onDoor(t.enter?t.id:null);return true;}
  function update(){const t=target();writeHud(prompt,'hidden',mode()!=='playing'||!t);writeHud(prompt,'textContent',t?.talk?`F / ${MINORA_COUNCIL[t.id].title} ${MINORA_COUNCIL[t.id].name}`:t?.enter?`F / Enter ${MINORA_COUNCIL[t.id].room}`:'F / Return to Minora');}
  prompt.onclick=interact;
  return {update,interact,snapshot:progress.snapshot,restore:progress.restore,marker(){const t=state().room;if(!COUNCIL_ROOMS.includes(t))return null;return {...councilPerson(t),id:t,label:MINORA_COUNCIL[t].title};},
    state:()=>({...progress.snapshot(),influence:councilInfluence(campaign()),speaking}),
    keydown(e){if(dialog.hidden)return false;if(e.code==='Escape'){e.preventDefault();close();}if(e.code==='F5')e.preventDefault();if(e.code==='Tab'){e.preventDefault();const buttons=[$('council-peace'),$('council-memory'),$('council-close')].filter(b=>!b.hidden);buttons[(buttons.indexOf(document.activeElement)+(e.shiftKey?-1:1)+buttons.length)%buttons.length].focus();}return true;},
    dispose(){prompt.remove();dialog.remove();}};
}
