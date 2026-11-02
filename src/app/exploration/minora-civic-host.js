import {MINORA_WARDS,nearestMinoraCivicBuilding} from '../../content/regions/minora-frontier/minora-civic-layout.js';
import {minoraBuildingCondition,minoraCivicPublicReport} from '../../content/regions/minora-frontier/minora-civic-economy.js';
import {writeHud} from './hud-write.js';
import {localSight} from './local-sight.js';

// Read the place from its doorstep. Existing doors and people retain priority.
export function createMinoraCivicHost({world,position,mode,setMode,available,campaign=()=>null,occupied=()=>false}){
  const prompt=document.createElement('button'),dialog=document.createElement('section');
  prompt.id='minora-civic-interact';prompt.hidden=true;
  dialog.id='minora-civic-dialog';dialog.hidden=true;dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','minora-civic-name');
  dialog.innerHTML='<div class="tower-dialog-card"><span class="eyebrow"></span><h2 id="minora-civic-name"></h2><h3></h3><small></small><p data-description></p><p data-condition></p><details><summary>History of this place</summary><p data-history></p></details><div class="tower-dialog-actions"><button>Continue exploring (Esc)</button></div></div>';
  document.body.append(prompt,dialog);let selected=null,previousFocus=null,nextScan=0;
  function target(){
    if(mode()!=='playing'||!available()||occupied())return null;
    const building=nearestMinoraCivicBuilding(position,4.2);
    if(!building||!world.readyAt(position.x,position.z))return null;
    const height=world.heightAt(position.x,position.z);
    return Math.abs(position.y-height)<2.2&&localSight(world,{x:position.x,z:position.z,y:position.y+1.5},{...building.entrance,y:height+1.5})?building:null;
  }
  function close(){if(!selected)return;selected=null;dialog.hidden=true;setMode('playing');update();if(previousFocus?.isConnected)previousFocus.focus();}
  function interact(){
    const b=target();if(!b)return false;selected=b.id;previousFocus=document.activeElement;
    dialog.querySelector('.eyebrow').textContent='Minora / '+MINORA_WARDS[b.ward].name;
    dialog.querySelector('h2').textContent=b.name;dialog.querySelector('h3').textContent=b.purpose;
    dialog.querySelector('small').textContent='Managed by '+b.owner;
    dialog.querySelector('[data-description]').textContent=b.description;
    const condition=minoraBuildingCondition(b,minoraCivicPublicReport(campaign()));
    dialog.querySelector('[data-condition]').textContent=condition;dialog.querySelector('[data-condition]').hidden=!condition;
    dialog.querySelector('[data-history]').textContent=b.history;dialog.querySelector('details').open=false;
    setMode('briefing');prompt.hidden=true;dialog.hidden=false;dialog.querySelector('button').focus();return true;
  }
  prompt.onclick=interact;dialog.querySelector('button').onclick=close;
  function update(){
    if(mode()!=='playing'||!available()){writeHud(prompt,'hidden',true);nextScan=0;return;}
    if(performance.now()<nextScan)return;nextScan=performance.now()+120;
    const b=target();writeHud(prompt,'hidden',!b);if(b)writeHud(prompt,'textContent','F / About '+b.name);
  }
  return {interact,update,state:()=>({building:selected,target:target()?.id??null}),
    keydown(e){if(!selected)return false;if(e.code==='Escape'){e.preventDefault();close();}
      else if(e.code==='Tab'){e.preventDefault();const items=[dialog.querySelector('summary'),dialog.querySelector('button')],i=items.indexOf(document.activeElement);items[(i+1)%2].focus();}
      else if(!['Enter','Space'].includes(e.code))e.preventDefault();return true;},
    dispose(){prompt.remove();dialog.remove();}
  };
}
