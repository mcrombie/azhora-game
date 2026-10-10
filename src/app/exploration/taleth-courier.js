import {createCourierPigeon} from '../../content/regions/minora-frontier/courier-pigeon.js';

export function createTalethCourier({scene,world,position,getMode,setMode,letters,opportunity=()=>null,onFollow=()=>{}}){
  const bird=createCourierPigeon(scene);bird.root.visible=false;
  const seen=new Set();let elapsed=0,delivery=null,returnMode='playing',previousFocus=null;
  const archive=document.createElement('button');archive.id='taleth-letters';archive.textContent='Letters from Taleth';document.getElementById('world-war-controls').append(archive);
  const read=document.createElement('button');read.id='taleth-read-letter';read.textContent='Read full letter';read.hidden=true;document.querySelector('.war-report-extra-actions').prepend(read);
  const next=document.createElement('button');next.id='world-war-next';document.querySelector('.war-report-actions').prepend(next);
  const mapNext=document.createElement('button');mapNext.id='world-war-map-next';document.getElementById('world-war-controls').append(mapNext);
  const other=document.createElement('button');other.id='world-war-alternative';document.querySelector('.war-report-extra-actions').append(other);
  const mapOther=document.createElement('button');mapOther.id='world-war-map-alternative';document.getElementById('world-war-controls').append(mapOther);
  const nextDetail=document.createElement('p');nextDetail.id='world-war-next-detail';document.getElementById('world-war-report-clock').before(nextDetail);
  const dialog=document.createElement('section');dialog.id='taleth-letter-dialog';dialog.hidden=true;dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','taleth-letter-title');
  dialog.innerHTML='<div class="tower-dialog-card"><header><span class="eyebrow">WIZARD GUILD / PIGEON POST</span><h2 id="taleth-letter-title">Letters from Taleth</h2><label>Dispatch <select id="taleth-letter-select"></select></label></header><div class="taleth-letter-body"><p id="taleth-campaign-now"></p><p id="taleth-letter-words"></p><p id="taleth-letter-note"></p><small>Carried by the guild’s rock doves: slate wings, two dark bars, a green neck and a tiny message tube. Watch for the green flash of the neck as the bird turns toward home.</small></div><div class="tower-dialog-actions"><button id="taleth-letter-follow"></button><button id="taleth-letter-alternative" hidden></button><button id="taleth-letter-close">Close letter</button></div></div>';
  document.body.append(dialog);const $=id=>dialog.querySelector('#'+id);
  function paint(){const letter=letters().find(l=>String(l.id)===$('taleth-letter-select').value);$('taleth-letter-title').textContent=letter?.title??'Letters from Taleth';$('taleth-letter-words').textContent=letter?.detail??'No pigeons have arrived yet. Taleth will write when the fighting changes the situation.';$('taleth-letter-note').textContent=letter?.note??'';paintOpportunity();dialog.querySelector('.taleth-letter-body').scrollTop=0;}
  function paintOpportunity(){
    const current=opportunity(),disabled=!current||current.kind==='briefing';
    for(const button of [next,mapNext,$('taleth-letter-follow')]){const label=current?.label??'Next opportunity';if(button.textContent!==label)button.textContent=label;button.disabled=disabled;button.title=current?.detail??'';}
    for(const button of [other,mapOther,$('taleth-letter-alternative')]){const alt=current?.alternative;button.hidden=!alt;button.disabled=!alt;if(button.textContent!==(alt?.label??''))button.textContent=alt?.label??'';button.title=alt?.detail??'';}
    const detail=current?'Campaign now: '+current.detail+(current.tradeoff?' '+current.tradeoff:''):'';
    if(nextDetail.textContent!==detail)nextDetail.textContent=detail;
    $('taleth-campaign-now').textContent=detail;
  }
  next.onclick=mapNext.onclick=()=>onFollow();$('taleth-letter-follow').onclick=()=>{close();onFollow();};
  other.onclick=mapOther.onclick=()=>onFollow(true);$('taleth-letter-alternative').onclick=()=>{close();onFollow(true);};
  function open(id){previousFocus=document.activeElement;returnMode=getMode();setMode('briefing');dialog.hidden=false;const select=$('taleth-letter-select');select.replaceChildren();for(const l of letters()){const o=document.createElement('option');o.value=l.id;o.textContent=`Day ${l.day} / ${l.title}`;select.append(o);}select.value=String(id??letters().at(-1)?.id??'');paint();$('taleth-letter-close').focus();}
  function close(){dialog.hidden=true;setMode(returnMode);if(previousFocus?.isConnected)previousFocus.focus();}
  archive.onclick=()=>open();read.onclick=()=>open(Number(read.dataset.letter));$('taleth-letter-select').onchange=paint;$('taleth-letter-close').onclick=close;
  return {
    present(report){paintOpportunity();read.hidden=!report?.taleth;if(report?.taleth)read.dataset.letter=report.id;},
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
    keydown(e){if(dialog.hidden)return false;if(e.code==='Escape'){e.preventDefault();close();}if(e.code==='F5')e.preventDefault();if(e.code==='Tab'){e.preventDefault();const controls=[$('taleth-letter-select'),$('taleth-letter-follow'),$('taleth-letter-alternative'),$('taleth-letter-close')].filter(b=>!b.disabled&&!b.hidden),i=controls.indexOf(document.activeElement);controls[(i+(e.shiftKey?-1:1)+controls.length)%controls.length].focus();}return true;},
    reset(){seen.clear();delivery=null;bird.root.visible=false;dialog.hidden=true;},
    state:()=>({delivery:delivery?.id??null,visible:bird.root.visible,elapsed,archiveOpen:!dialog.hidden}),
    dispose(){bird.dispose();archive.remove();read.remove();next.remove();mapNext.remove();other.remove();mapOther.remove();nextDetail.remove();dialog.remove();},
  };
}
