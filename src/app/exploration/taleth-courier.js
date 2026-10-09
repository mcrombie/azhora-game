import {createCourierPigeon} from '../../content/regions/minora-frontier/courier-pigeon.js';

export function createTalethCourier({scene,world,position,getMode,setMode,letters}){
  const bird=createCourierPigeon(scene);bird.root.visible=false;
  const seen=new Set();let elapsed=0,delivery=null,returnMode='playing';
  const archive=document.createElement('button');archive.id='taleth-letters';archive.textContent='Letters from Taleth';document.getElementById('world-war-controls').append(archive);
  const read=document.createElement('button');read.id='taleth-read-letter';read.textContent='Read letter';read.hidden=true;document.querySelector('.war-report-actions').prepend(read);
  const dialog=document.createElement('section');dialog.id='taleth-letter-dialog';dialog.hidden=true;dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','taleth-letter-title');
  dialog.innerHTML='<div class="tower-dialog-card"><span class="eyebrow">WIZARD GUILD / PIGEON POST</span><h2 id="taleth-letter-title">Letters from Taleth</h2><label>Dispatch <select id="taleth-letter-select"></select></label><p id="taleth-letter-words"></p><p id="taleth-letter-note"></p><small>Carried by the guild’s rock doves: slate wings, two dark bars, a green neck and a tiny message tube. Watch for the green flash of the neck as the bird turns toward home.</small><div class="tower-dialog-actions"><button id="taleth-letter-close">Close letter</button></div></div>';
  document.body.append(dialog);const $=id=>dialog.querySelector('#'+id);
  function paint(){const letter=letters().find(l=>String(l.id)===$('taleth-letter-select').value);$('taleth-letter-title').textContent=letter?.title??'Letters from Taleth';$('taleth-letter-words').textContent=letter?.detail??'No pigeons have arrived yet. Taleth will write when the fighting changes the situation.';$('taleth-letter-note').textContent=letter?.note??'';}
  function open(id){returnMode=getMode();setMode('briefing');dialog.hidden=false;const select=$('taleth-letter-select');select.replaceChildren();for(const l of letters()){const o=document.createElement('option');o.value=l.id;o.textContent=`Day ${l.day} / ${l.title}`;select.append(o);}select.value=String(id??letters().at(-1)?.id??'');paint();$('taleth-letter-close').focus();}
  function close(){dialog.hidden=true;setMode(returnMode);}
  archive.onclick=()=>open();read.onclick=()=>open(Number(read.dataset.letter));$('taleth-letter-select').onchange=paint;$('taleth-letter-close').onclick=close;
  return {
    present(report){read.hidden=!report?.taleth;if(report?.taleth)read.dataset.letter=report.id;},
    update(report,dt,enabled){
      if(enabled&&report?.taleth&&!seen.has(report.id)){
        seen.add(report.id);elapsed=0;const x=position.x+2.6,z=position.z-1.5;
        delivery={id:report.id,x,y:Math.max(world.heightAt(x,z),world.waterAt(x,z))+.12,z};
      }
      bird.root.visible=!!delivery&&enabled&&elapsed<14;
      if(!bird.root.visible)return;elapsed+=dt;const incoming=Math.max(0,1-elapsed/4),outgoing=Math.max(0,(elapsed-10)/4),fly=Math.max(incoming,outgoing);
      bird.root.position.set(delivery.x+incoming*12-outgoing*12,delivery.y+fly*7,delivery.z-incoming*9-outgoing*9);
      bird.root.rotation.y=elapsed<4?-2.2:elapsed>10?-.9:Math.atan2(position.x-delivery.x,position.z-delivery.z);bird.flap(elapsed,fly>0);
    },
    keydown(e){if(dialog.hidden)return false;if(e.code==='Escape'){e.preventDefault();close();}if(e.code==='F5')e.preventDefault();if(e.code==='Tab'){e.preventDefault();const select=$('taleth-letter-select');(document.activeElement===select?$('taleth-letter-close'):select).focus();}return true;},
    reset(){seen.clear();delivery=null;bird.root.visible=false;dialog.hidden=true;},
    state:()=>({delivery:delivery?.id??null,visible:bird.root.visible,elapsed,archiveOpen:!dialog.hidden}),
    dispose(){bird.dispose();archive.remove();read.remove();dialog.remove();},
  };
}
