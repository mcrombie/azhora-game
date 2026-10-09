import {localSight} from './local-sight.js';
import {soldierWords} from './soldier-contact.js';

// Conversations for the existing bounded aftermath/sentry cast only. No new
// persistent NPCs, troop strengths, pathfinding or campaign commands.
export function createSoldierHost({world,position,getMode,setMode,people,campaign,opportunity,faction,region,available}){
  const prompt=document.createElement('button');prompt.id='soldier-interact';prompt.hidden=true;
  const dialog=document.createElement('dialog');dialog.id='soldier-dialog';dialog.setAttribute('aria-labelledby','soldier-speaker');
  dialog.innerHTML='<span class="eyebrow">A MOMENT AFTER THE FIGHT</span><h2 id="soldier-speaker"></h2><p id="soldier-office"></p><p id="soldier-words"></p><div class="tower-dialog-actions"><button data-topic="battle">What happened here?</button><button data-topic="next">What now?</button><button data-topic="close">Goodbye (Esc)</button></div>';
  document.body.append(prompt,dialog);let speaking=null,words=null,scan=0;
  function target(){
    if(getMode()!=='playing'||!available())return null;
    return people().filter(p=>Math.abs(p.y-position.y)<2.6&&Math.hypot(p.x-position.x,p.z-position.z)<3.7)
      .sort((a,b)=>Math.hypot(a.x-position.x,a.z-position.z)-Math.hypot(b.x-position.x,b.z-position.z))
      .find(p=>localSight(world,{...position,y:position.y+1.5},{...p,y:p.y+1.5}));
  }
  function close(){if(!speaking)return;dialog.close();speaking=null;setMode('playing');update();document.getElementById('exploration-canvas').focus();}
  function interact(){const person=target();if(!person)return false;
    speaking=person;words=soldierWords(person,campaign(),opportunity(),faction,region);
    for(const [id,value]of [['speaker',words.name],['office',words.office],['words',words.hello]])dialog.querySelector('#soldier-'+id).textContent=value;
    setMode('briefing');prompt.hidden=true;dialog.showModal();dialog.querySelector('button').focus();return true;
  }
  prompt.onclick=interact;
  for(const b of dialog.querySelectorAll('button'))b.onclick=()=>{if(b.dataset.topic==='close')close();else dialog.querySelector('#soldier-words').textContent=words[b.dataset.topic];};
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  function update(dt=0){scan-=dt;if(getMode()!=='playing'){prompt.hidden=true;return;}if(scan>0)return;scan=.12;const p=target();prompt.hidden=!p;if(p)prompt.textContent=`F / Talk to ${campaign().winner?'Lizeemi League':faction(p.owner)} ${p.kind==='survivor'?'soldier':'sentry'}`;}
  return {update,interact,open:()=>!!speaking,state:()=>({speaking:speaking?{...speaking}:null}),
    keydown(e){if(!speaking)return false;if(e.code==='Escape'){e.preventDefault();close();}else if(!['Tab','Enter','Space'].includes(e.code))e.preventDefault();return true;},
    dispose(){if(dialog.open)dialog.close();prompt.remove();dialog.remove();}
  };
}
