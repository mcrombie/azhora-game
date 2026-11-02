import {writeHud} from './hud-write.js';

export function createPigeonHost({world,position,mode,setMode}){
  const prompt=document.createElement('button'),dialog=document.createElement('section');
  prompt.id='pigeon-interact';prompt.hidden=true;dialog.id='pigeon-dialog';dialog.hidden=true;
  dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','pigeon-title');
  dialog.innerHTML='<div class="tower-dialog-card"><span class="eyebrow">WIZARD GUILD / HOMING LOFT</span><h2 id="pigeon-title">Rock dove</h2><p id="pigeon-observation"></p><div class="tower-dialog-actions"><button id="pigeon-feed">Offer grain from the tray</button><button id="pigeon-fly">Let it take a flight</button><button id="pigeon-close">Leave the bird (Esc)</button></div></div>';
  document.body.append(prompt,dialog);let selected=null;
  const $=id=>dialog.querySelector('#pigeon-'+id),buttons=[...dialog.querySelectorAll('button')];
  const target=()=>mode()==='playing'?world.lookoutBirdTarget(position):null;
  function close(){if(!selected)return;selected=null;world.observeLookoutBird(null);dialog.hidden=true;setMode('playing');update();}
  function interact(){const bird=target();if(!bird)return false;selected=bird.id;world.observeLookoutBird(selected);setMode('briefing');dialog.hidden=false;prompt.hidden=true;
    $('observation').textContent='The dove turns an orange eye toward you. Two dark bars cross its folded slate wings; green glints at its neck. These living birds roost at the guild. They are ordinary birds, at home among the tower ledges.';
    $('feed').disabled=false;$('feed').focus();return true;}
  $('feed').onclick=()=>{if(world.feedLookoutBird(selected)){$('observation').textContent='You offer a pinch from the loft\'s grain tray. The dove bobs down to peck, then lifts its head to watch you. It takes another grain, then resumes preening.';$('feed').disabled=true;$('fly').focus();}};
  $('fly').onclick=()=>{if(world.flyLookoutBird(selected))close();else $('observation').textContent='The dove is still feeding, or another pigeon is circling the tower. Give it a moment.';};
  $('close').onclick=close;prompt.onclick=interact;
  function update(){const bird=target();writeHud(prompt,'hidden',!bird);if(bird)writeHud(prompt,'textContent','F / Observe guild pigeon');}
  return {interact,update,state:()=>({selected}),
    keydown(e){if(!selected)return false;if(e.code==='Escape'){e.preventDefault();close();}else if(e.code==='Tab'){e.preventDefault();const available=buttons.filter(b=>!b.disabled),i=available.indexOf(document.activeElement);available[(i+(e.shiftKey?-1:1)+available.length)%available.length].focus();}else if(!['Enter','Space'].includes(e.code))e.preventDefault();return true;},
    dispose(){world.observeLookoutBird(null);prompt.remove();dialog.remove();}
  };
}
