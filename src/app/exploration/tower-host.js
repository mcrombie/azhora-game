import {TOWER,TOWER_DOOR,TOWER_EXIT,TALETH_SPOT,LOOKOUT,LOOKOUT_DOOR,LOOKOUT_TALETH} from './tower-state.js';
import {campaignChronicle} from './campaign-chronicle.js';
import {councilPeaceWords} from './league-settlement.js';
import {talethFinale} from './taleth-correspondence.js';
import {preludeForScenario} from '../../content/scenarios/lizeem-prelude.js';
import {createChronicleView} from './chronicle-view.js';
import {councilBattleResponse} from './battle-consequences.js';
import {writeHud} from './hud-write.js';

export function createTowerHost({state,position,mode,setMode,notice,onBegin,onDoor,onLookout=()=>{},onConclude=()=>{},onLookoutView=()=>{},scenario=()=>null,campaign=()=>null,onChronicle=()=>{}}){
  const prompt=document.createElement('button');prompt.id='tower-interact';prompt.hidden=true;document.body.append(prompt);
  const objective=document.createElement('aside');objective.id='tower-objective';objective.setAttribute('role','status');document.body.append(objective);
  const dialog=document.createElement('section');dialog.id='tower-briefing';dialog.hidden=true;dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','tower-speaker');
  dialog.innerHTML='<div class="tower-dialog-card"><span class="eyebrow">MINORA / THE WIZARD GUILD</span><h2 id="tower-speaker">Taleth</h2><h3 id="tower-topic">Wizard Guild Master</h3><div class="tower-narration"><p id="tower-words"></p><p id="tower-road"></p></div><small id="tower-page"></small><div class="tower-dialog-actions"><button id="tower-previous" hidden>Previous view</button><button id="tower-next"></button><button id="tower-background">Background / the preceding thirty days</button><button id="tower-review-campaign" hidden>Chronoscope / Review this campaign</button><button id="tower-close">Not yet</button></div></div>';
  document.body.append(dialog);
  const $=id=>dialog.querySelector('#'+id);let prelude=null,finalePage=0,lookoutMenu=!!state().snapshot().concluded;
  const chronicle=createChronicleView({
    onClose(){onChronicle({active:false});setMode('briefing');dialog.hidden=false;paint();$(prelude?.kind==='campaign'?'tower-review-campaign':'tower-background').focus();},
    onStart(){if(prelude?.kind==='campaign')chronicle.close();else begin();},
    onFrame(frame){onChronicle({active:true,colors:['isareos','nethereum','ovesos','caricas','nesdor'].map(id=>prelude.factions.find(f=>f.id===frame.owners[id]).color)});},
  });
  const near=point=>Math.hypot(position.x-point.x,position.z-point.z)<3.7&&Math.abs(position.y-(point.y??TOWER.y))<2.8;
  const target=()=>state().room==='lookout'?(near(LOOKOUT_TALETH)?'taleth':near(LOOKOUT_DOOR)?'chamber':null):state().inside&&state().room!=='tower'?null:state().inside?(near(TALETH_SPOT)?'taleth':near(TOWER_DOOR)?'leave':null):near(TOWER_EXIT)?'enter':null;
  function close(){chronicle.close();onChronicle({active:false});onLookoutView(null);dialog.hidden=true;setMode('playing');update();}
  function paint(){
    const done=state().briefed;
    const finale=state().room==='lookout'?talethFinale(campaign()):[];
    dialog.dataset.lookout=String(!!finale.length);$('tower-previous').hidden=!finale.length||finalePage===0;
    if(finale.length){
      if(!state().snapshot().concluded){lookoutMenu=false;if(finalePage>=2)finalePage=0;}
      const page=finale[finalePage];
      $('tower-previous').hidden=lookoutMenu||finalePage===0;
      $('tower-background').hidden=true;$('tower-review-campaign').hidden=!lookoutMenu;
      $('tower-topic').textContent=lookoutMenu?'The Lizeemi War is complete':page.title;
      $('tower-words').textContent=lookoutMenu?'The fighting is over, Teresod. Minora must now make a country of the peace. Visit the Mayor, the High Priest, Bear and the people below; they will have their own thoughts about what comes next.':page.words;
      $('tower-road').textContent=lookoutMenu?'I have marked the surrounding countries on your map. You may explore the lookout, review your campaign in the Chronoscope, or let me show you those countries.':page.closing??'Taleth gestures across the country below.';
      $('tower-page').textContent=lookoutMenu?'Chapter complete / The wider tour is optional':finalePage<2?`Campaign review / ${finalePage+1} of 2`:`Surrounding countries / ${finalePage-1} of ${finale.length-2}`;
      $('tower-next').textContent=lookoutMenu?'Show me the surrounding countries':finalePage===1?'Complete the Lizeemi War campaign':finalePage===finale.length-1?'Finish the tour':'Look with Taleth';
      $('tower-close').textContent=lookoutMenu?'Explore the lookout':'Continue this conversation later';
      onLookoutView(lookoutMenu?'river':page.view);$('tower-next').focus();return;
    }
    $('tower-words').textContent=done
      ?'Minora remains neutral, Teresod. I sit on its Council of Three with Mayor Ishkur Vey of Ovesos and High Priest Haldor Sorn of Nesdor. The Mayor favors West Lizeem; the Priest favors East. I will not forbid you to intervene. The highest central flag at our gates shows whose voice leads the council. Visit them in the riverside Hall and Grand Temple. The Chronoscope can show you the month before this war again. Its memories cannot change what you have since done. Your campaign waits while we speak.'
      :'Welcome, Teresod. I am Taleth, Wizard Guild Master. I speak for neutral Minora; receiving you here does not enlist you in either army. Like the hidden paths of Elfland, this tower crosses the boundaries of the ordinary world. I hold this chamber between moments. The Chronoscope can show you the month that brought us here. End this war as swiftly as you can: we must preserve the people’s strength for greater troubles to come. My pigeons will carry news and counsel. When you are ready, I will release us into the present.';
    $('tower-road').textContent=done
      ?'Return through the southern door when you are ready. M shows the current campaign; the Chronoscope shows only the past.'
      :'West Lizeem holds Nethereum and Ovesos; East holds Caricas and Nesdor. Isareos stands apart. Bear has a horse waiting outside. Take the reins from him, then choose whether to follow the armies. The first clash is expected in nearby Caricas on day 3. M opens the campaign map. Ride or walk into a marked battlefield to choose whether to join; you can stay out and return later.';
    $('tower-page').textContent=done?'The past is a vision, not a rewind.':'Begin now, or let me show you how the provinces became five states and then two rival leagues.';
    const response=done&&councilBattleResponse('taleth',campaign());
    if(response){$('tower-topic').textContent=`Wizard Guild Master / After ${response.record.region}`;$('tower-words').textContent=response.words+' '+response.detail;$('tower-road').textContent=response.balance;$('tower-page').textContent=response.next;}
    else $('tower-topic').textContent='Wizard Guild Master';
    $('tower-review-campaign').hidden=!done;
    const settled=done&&!!campaign()?.winner;
    if(settled){$('tower-words').textContent=councilPeaceWords('taleth',campaign())+' Come to the lookout above this chamber. Let us see what remains of the river country, and what your choices mean for Minora.';$('tower-road').textContent='We will look along the Lizeem first. Then I must turn your eyes eastward, toward Ambron.';}
    $('tower-next').textContent=settled?'Join Taleth at the lookout':done?'Return to the chamber':'Start campaign';
    if(settled&&state().snapshot().concluded){
      $('tower-topic').textContent='After the Lizeemi War';
      $('tower-words').textContent=councilPeaceWords('taleth',campaign())+' We have looked back on the war together. Our review is complete; you are welcome to return to the lookout or speak with the people of Minora.';
      $('tower-road').textContent='The Chronoscope keeps the record of your campaign. The lookout tour is there whenever you wish to see the surrounding countries again.';
      $('tower-page').textContent='Campaign complete / Further visits are optional';$('tower-next').textContent='Return to the lookout / optional';
    }
    $('tower-background').hidden=!preludeForScenario(scenario());
    $('tower-close').textContent=done?'Close':'Not yet';$('tower-next').focus();
  }
  function talk(){setMode('briefing');dialog.hidden=false;paint();update();}
  function begin(){if(!['briefing','chronicle'].includes(mode()))return;
    if(state().room==='lookout'&&campaign()?.winner){
      if(lookoutMenu){lookoutMenu=false;finalePage=2;paint();}
      else if(finalePage===1){if(state().conclude())onConclude();lookoutMenu=true;paint();update();}
      else if(finalePage<talethFinale(campaign()).length-1){finalePage++;paint();}
      else{lookoutMenu=true;close();}return;
    }
    if(state().briefed&&campaign()?.winner){close();onLookout(true);return;}
    if(state().begin())onBegin();close();}
  $('tower-next').onclick=begin;
  $('tower-previous').onclick=()=>{if(state().room==='lookout'&&mode()==='briefing'&&finalePage>0){if(finalePage===2)lookoutMenu=true;else finalePage--;paint();}};
  $('tower-background').onclick=()=>{prelude=preludeForScenario(scenario());if(!prelude)return;dialog.hidden=true;setMode('chronicle');chronicle.open(prelude,{started:state().briefed});};
  $('tower-review-campaign').onclick=()=>{prelude=campaignChronicle(campaign());if(!prelude)return;dialog.hidden=true;setMode('chronicle');chronicle.open(prelude,{started:true});};
  $('tower-close').onclick=close;
  function interact(){
    if(mode()!=='playing')return false;
    const at=target();if(!at)return false;
    if(at==='taleth')talk();
    else if(at==='leave'&&!state().briefed)notice('Speak with Taleth and choose Start campaign before leaving the tower.');
    else if(at==='chamber')onLookout(false);
    else onDoor(at==='enter');
    return true;
  }
  function update(){
    const s=state(),playing=mode()==='playing',at=target();writeHud(prompt,'hidden',!playing||!at);
    writeHud(prompt,'textContent',at==='taleth'?'F / Taleth, Wizard Guild Master':at==='chamber'?'F / Descend to the guild chamber':at==='enter'?'F / Enter the Wizard Guild':s.briefed?'F / Leave for Minora':'F / Door closed / Speak with Taleth first');
    writeHud(objective,'hidden',!playing||!s.inside||!['tower','lookout'].includes(s.room));
    writeHud(objective,'textContent',s.room==='lookout'?(s.snapshot().concluded?'Lizeemi War complete / Talk to Taleth for the optional tour, visit the pigeons, or descend to Minora.':'Speak with Taleth at the river lookout.'):s.briefed?'Speak with Taleth, or leave through the southern door (F).':'Speak with Taleth / Time is held until you are ready.');
  }
  prompt.onclick=interact;
  function keydown(event){
    if(chronicle.keydown(event))return true;
    if(dialog.hidden)return false;
    if(event.code==='F5')event.preventDefault();
    if(event.code==='Escape'){event.preventDefault();close();}
    else if(event.code==='Tab'){
      event.preventDefault();const buttons=[$('tower-previous'),$('tower-next'),$('tower-background'),$('tower-review-campaign'),$('tower-close')].filter(b=>!b.hidden),i=buttons.indexOf(document.activeElement);
      buttons[(i+(event.shiftKey?-1:1)+buttons.length)%buttons.length].focus();
    }
    return true;
  }
  return {update,interact,keydown,close,lookoutState:()=>({page:finalePage,pages:talethFinale(campaign()).length,menu:lookoutMenu,view:lookoutMenu?'river':talethFinale(campaign())[finalePage]?.view,open:!dialog.hidden&&state().room==='lookout'}),marker:()=>state().room==='lookout'?{...(state().snapshot().concluded?LOOKOUT_DOOR:LOOKOUT_TALETH),id:'lookout',label:state().snapshot().concluded?'Guild chamber':'Taleth'}:null,tick:(dt,active)=>chronicle.tick(dt,active),chronicleState:()=>chronicle.state(),dispose(){chronicle.dispose();prompt.remove();objective.remove();dialog.remove();}};
}
