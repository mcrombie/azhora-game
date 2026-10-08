import {TOWER,TOWER_DOOR,TOWER_EXIT,TALETH_SPOT} from './tower-state.js';
import {preludeForScenario} from '../../content/scenarios/lizeem-prelude.js';
import {createChronicleView} from './chronicle-view.js';
import {councilBattleResponse} from './battle-consequences.js';
import {writeHud} from './hud-write.js';

export function createTowerHost({state,position,mode,setMode,notice,onBegin,onDoor,scenario=()=>null,campaign=()=>null,onChronicle=()=>{}}){
  const prompt=document.createElement('button');prompt.id='tower-interact';prompt.hidden=true;document.body.append(prompt);
  const objective=document.createElement('aside');objective.id='tower-objective';objective.setAttribute('role','status');document.body.append(objective);
  const dialog=document.createElement('section');dialog.id='tower-briefing';dialog.hidden=true;dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','tower-speaker');
  dialog.innerHTML='<div class="tower-dialog-card"><span class="eyebrow">MINORA / THE WIZARD GUILD</span><h2 id="tower-speaker">Taleth</h2><h3 id="tower-topic">Wizard Guild Master</h3><p id="tower-words"></p><p id="tower-road"></p><small id="tower-page"></small><div class="tower-dialog-actions"><button id="tower-next"></button><button id="tower-background">Background / the preceding thirty days</button><button id="tower-close">Not yet</button></div></div>';
  document.body.append(dialog);
  const $=id=>dialog.querySelector('#'+id);let prelude=null;
  const chronicle=createChronicleView({
    onClose(){onChronicle({active:false});setMode('briefing');dialog.hidden=false;paint();$('tower-background').focus();},
    onStart:begin,
    onFrame(frame){onChronicle({active:true,colors:['isareos','nethereum','ovesos','caricas','nesdor'].map(id=>prelude.factions.find(f=>f.id===frame.owners[id]).color)});},
  });
  const near=point=>Math.hypot(position.x-point.x,position.z-point.z)<3.7&&Math.abs(position.y-TOWER.y)<2.8;
  const target=()=>state().inside&&state().room!=='tower'?null:state().inside?(near(TALETH_SPOT)?'taleth':near(TOWER_DOOR)?'leave':null):near(TOWER_EXIT)?'enter':null;
  function close(){chronicle.close();onChronicle({active:false});dialog.hidden=true;setMode('playing');update();}
  function paint(){
    const done=state().briefed;
    $('tower-words').textContent=done
      ?'Minora remains neutral, Teresod. I sit on its Council of Three with Mayor Ishkur Vey of Ovesos and High Priest Haldor Sorn of Nesdor. The Mayor favors West Lizeem; the Priest favors East. I will not forbid you to intervene. The highest central flag at our gates shows whose voice leads the council. Visit them in the riverside Hall and Grand Temple. The Chronoscope can show you the month before this war again. Its memories cannot change what you have since done. Your campaign waits while we speak.'
      :'Welcome, Teresod. I am Taleth, Wizard Guild Master. I speak for neutral Minora; receiving you here does not enlist you in either army. Like the hidden paths of Elfland, this tower crosses the boundaries of the ordinary world. I hold this chamber between moments. The Chronoscope can show you the month that brought us here. When you are ready, I will release us into the present.';
    $('tower-road').textContent=done
      ?'Return through the southern door when you are ready. M shows the current campaign; the Chronoscope shows only the past.'
      :'West Lizeem holds Nethereum and Ovesos; East holds Caricas and Nesdor. Isareos stands apart. Bear has a horse waiting outside. Take the reins from him, then choose whether to follow the armies. The first clash is expected in nearby Caricas on day 3. M opens the campaign map. Ride or walk into a marked battlefield to choose whether to join; you can stay out and return later.';
    $('tower-page').textContent=done?'The past is a vision, not a rewind.':'Begin now, or let me show you how the provinces became five states and then two rival leagues.';
    const response=done&&councilBattleResponse('taleth',campaign());
    if(response){$('tower-topic').textContent=`Wizard Guild Master / After ${response.record.region}`;$('tower-words').textContent=response.words+' '+response.detail;$('tower-road').textContent=response.balance;$('tower-page').textContent=response.next;}
    else $('tower-topic').textContent='Wizard Guild Master';
    $('tower-next').textContent=done?'Return to the chamber':'Start campaign';
    $('tower-background').hidden=!preludeForScenario(scenario());
    $('tower-close').textContent=done?'Close':'Not yet';$('tower-next').focus();
  }
  function talk(){setMode('briefing');dialog.hidden=false;paint();update();}
  function begin(){if(!['briefing','chronicle'].includes(mode()))return;if(state().begin())onBegin();close();}
  $('tower-next').onclick=begin;
  $('tower-background').onclick=()=>{prelude=preludeForScenario(scenario());if(!prelude)return;dialog.hidden=true;setMode('chronicle');chronicle.open(prelude,{started:state().briefed});};
  $('tower-close').onclick=close;
  function interact(){
    if(mode()!=='playing')return false;
    const at=target();if(!at)return false;
    if(at==='taleth')talk();
    else if(at==='leave'&&!state().briefed)notice('Speak with Taleth and choose Start campaign before leaving the tower.');
    else onDoor(at==='enter');
    return true;
  }
  function update(){
    const s=state(),playing=mode()==='playing',at=target();writeHud(prompt,'hidden',!playing||!at);
    writeHud(prompt,'textContent',at==='taleth'?'F / Taleth, Wizard Guild Master':at==='enter'?'F / Enter the Wizard Guild':s.briefed?'F / Leave for Minora':'F / Door closed / Speak with Taleth first');
    writeHud(objective,'hidden',!playing||!s.inside||s.room!=='tower');
    writeHud(objective,'textContent',s.briefed?'Speak with Taleth, or leave through the southern door (F).':'Speak with Taleth / Time is held until you are ready.');
  }
  prompt.onclick=interact;
  function keydown(event){
    if(chronicle.keydown(event))return true;
    if(dialog.hidden)return false;
    if(event.code==='F5')event.preventDefault();
    if(event.code==='Escape'){event.preventDefault();close();}
    else if(event.code==='Tab'){
      event.preventDefault();const buttons=[$('tower-next'),$('tower-background'),$('tower-close')].filter(b=>!b.hidden),i=buttons.indexOf(document.activeElement);
      buttons[(i+(event.shiftKey?-1:1)+buttons.length)%buttons.length].focus();
    }
    return true;
  }
  return {update,interact,keydown,close,tick:(dt,active)=>chronicle.tick(dt,active),chronicleState:()=>chronicle.state(),dispose(){chronicle.dispose();prompt.remove();objective.remove();dialog.remove();}};
}
