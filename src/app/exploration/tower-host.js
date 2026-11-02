import {elapsedTimeLabel} from '../../experiments/day-night/opening-time-label.js';
import {TOWER,TOWER_DOOR,TOWER_EXIT,TALETH_SPOT,LOOKOUT,LOOKOUT_DOOR,LOOKOUT_TALETH} from './tower-state.js';
import {campaignChronicle} from './campaign-chronicle.js';
import {councilPeaceWords} from './league-settlement.js';
import {talethFinale} from './taleth-correspondence.js';
import {preludeForScenario} from '../../content/scenarios/lizeem-prelude.js';
import {createChronicleView} from './chronicle-view.js';
import {councilBattleResponse} from './battle-consequences.js';
import {writeHud} from './hud-write.js';
import {towerFloorAt} from '../../content/regions/minora-frontier/tower-floor-layout.js';
import {sanctuaryContains} from '../../content/regions/minora-frontier/guild-sanctuary-layout.js';
import {STILLROOM_THRESHOLD} from './training/stillroom-door.js';
import {createTowerQuestView} from './tower-quest-view.js';

export function createTowerHost({state,position,mode,setMode,notice,onBegin,onDoor,onLookout=()=>{},onConclude=()=>{},onContinueChapter=null,onLookoutView=()=>{},onTrain=()=>{},scenario=()=>null,campaign=()=>null,onChronicle=()=>{},openingClock=false,openingForecast=()=>null,campaignClock=()=>null,campaignSide=()=>null,campaignChoiceRequired=()=>false,onChooseCampaignSide=()=>({ok:false})}){
  const mainQuest=createTowerQuestView({state,position,mode});
  const prompt=document.createElement('button');prompt.id='tower-interact';prompt.hidden=true;document.body.append(prompt);
  const objective=document.createElement('aside');objective.id='tower-objective';objective.setAttribute('role','status');document.body.append(objective);
  const dialog=document.createElement('section');dialog.id='tower-briefing';dialog.hidden=true;dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','tower-speaker');
  dialog.innerHTML='<div class="tower-dialog-card"><span class="eyebrow">MINORA / THE WIZARD GUILD</span><h2 id="tower-speaker">Taleth</h2><h3 id="tower-topic">Master Time Wizard of the Guild</h3><div class="tower-narration"><p id="tower-words"></p><p id="tower-road"></p></div><small id="tower-page"></small><div class="tower-dialog-actions"><button id="tower-previous" hidden>Previous view</button><button id="tower-next"></button><button id="tower-background">Background / the preceding thirty days</button><button id="tower-review-campaign" hidden>Chronoscope / Review this campaign</button><button id="tower-close">Not yet</button></div></div>';
  document.body.append(dialog);
  const $=id=>dialog.querySelector('#'+id);let prelude=null,finalePage=0,lookoutMenu=!!state().snapshot().concluded,selectedSide=null;
  const trainingButton=document.createElement('button');trainingButton.id='tower-training-start';trainingButton.textContent='Visit Uguth / Enter Spirit and Time';$('tower-close').before(trainingButton);
  trainingButton.onclick=()=>{if(mode()!=='briefing')return;close();onTrain();};
  const nextChapter=document.createElement('button');nextChapter.id='tower-next-chapter';nextChapter.textContent='Continue / Chapter 2: Yunethre';nextChapter.hidden=true;nextChapter.onclick=()=>onContinueChapter?.();$('tower-close').before(nextChapter);
  const choices=document.createElement('div');choices.id='tower-allegiance';choices.hidden=true;choices.setAttribute('role','group');choices.setAttribute('aria-label','Choose the league you will support');
  choices.innerHTML='<button id="tower-allegiance-west" aria-pressed="false"><strong>West Lizeem</strong><span>The western councils of Nethereum and Ovesos. Captain Meret Voss commands their forces.</span></button><button id="tower-allegiance-east" aria-pressed="false"><strong>East Lizeem</strong><span>The eastern league of Caricas and Nesdor. Captain Serevan Dain commands their forces.</span></button>';
  $('tower-page').before(choices);
  const needsChoice=()=>!state().briefed&&campaignChoiceRequired();
  const forecastButton=document.createElement('button');forecastButton.id='tower-forecast';forecastButton.textContent='Chronoscope / Next expected event';forecastButton.hidden=!openingClock;$('tower-background').after(forecastButton);
  forecastButton.onclick=()=>{
    const forecast=openingForecast();
    $('tower-topic').textContent='Chronoscope / The likely course ahead';
    $('tower-words').textContent=forecast?.ok?`${forecast.title}. Expected at Adventure ${elapsedTimeLabel(forecast.elapsedSeconds)}. ${forecast.consequences.join(' ')}`:forecast?.reason??'No event is currently forecast.';
    $('tower-road').textContent=campaignClock()?.fullCampaign?'This is a forecast of the armies\u2019 orders. Looking does not change the present. Outside the tower, dismount on quiet ground to preview a wait until the next event.':'This is a forecast of the armies\u2019 orders. Looking does not change the present. Return to the stable or the north road into Caricas if you choose to wait.';
    $('tower-page').textContent='Forecast only / No time passes';
  };
  const chronicle=createChronicleView({
    onClose(){onChronicle({active:false});setMode('briefing');dialog.hidden=false;paint();$(prelude?.kind==='campaign'?'tower-review-campaign':'tower-background').focus();},
    onStart(){if(prelude?.kind==='campaign')chronicle.close();else begin();},
    onFrame(frame){onChronicle({active:true,colors:['isareos','nethereum','ovesos','caricas','nesdor'].map(id=>prelude.factions.find(f=>f.id===frame.owners[id]).color)});},
  });
  const near=point=>Math.hypot(position.x-point.x,position.z-point.z)<3.7&&Math.abs(position.y-(point.y??TOWER.y))<2.8;
  const target=()=>state().room==='lookout'?(near(LOOKOUT_TALETH)?'taleth':near(LOOKOUT_DOOR)?'chamber':null):state().inside&&state().room!=='tower'?null:state().inside?(near(STILLROOM_THRESHOLD)?'stillroom':near(TALETH_SPOT)?'taleth':near(TOWER_DOOR)?'leave':null):near(TOWER_EXIT)?'enter':null;
  function close(){chronicle.close();onChronicle({active:false});onLookoutView(null);dialog.hidden=true;setMode('playing');update();}
  // Dialogue pages are transient. A loaded checkpoint owns completion; it must
  // not inherit the page or open projection from the previously played save.
  function restore(){chronicle.close();prelude=null;finalePage=0;selectedSide=null;lookoutMenu=!!state().snapshot().concluded;dialog.hidden=true;onChronicle({active:false});onLookoutView(null);}
  function paint(){
    nextChapter.hidden=!onContinueChapter||!state().snapshot().concluded||!lookoutMenu;
    const done=state().briefed;
    const choosing=needsChoice();choices.hidden=!choosing;
    for(const side of ['west','east']){$('tower-allegiance-'+side).hidden=!choosing;$('tower-allegiance-'+side).setAttribute('aria-pressed',String(selectedSide===side));}
    $('tower-next').disabled=false;
    forecastButton.hidden=!openingClock||!!campaignClock()?.complete||choosing;
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
      $('tower-next').textContent=lookoutMenu?'Look toward Ambron / Begin the tour':finalePage===1?'Complete the Lizeemi War campaign':finalePage===finale.length-1?'Finish the tour':finalePage===0?'Review my impact on the war':finale[finalePage+1].arrival;
      $('tower-close').textContent=lookoutMenu?'Explore the lookout':'Continue this conversation later';
      onLookoutView(lookoutMenu?'river':page.view);$('tower-next').focus();return;
    }
    $('tower-words').textContent=done
      ?'Minora remains neutral, Teresod. I sit on its Council of Three with Mayor Ishkur Vey of Ovesos and High Priest Haldor Sorn of Nesdor. The Mayor favors West Lizeem; the Priest favors East. I will not forbid you to intervene. The highest central flag at our gates shows whose voice leads the council. Visit them in the riverside Hall and Grand Temple. The Chronoscope can show you the month before this war again. Its memories cannot change what you have since done. The whole tower, including its lookout, is my timeless refuge. Your campaign waits even while you walk here; it resumes when you leave. Outside, I can reach you through your thoughts.'
      :'Welcome to Minora, Teresod. Neither league commands you here. Help bring their war to a swift end: we must preserve the people’s strength for greater troubles to come. This tower stands outside time. Stay as long as you wish; time resumes when you leave. I will speak into your thoughts when there is news.';
    $('tower-road').textContent=done
      ?'Return through the southern door when you are ready. M shows the current campaign; the Chronoscope shows only the past.'
      :'Bear will greet you outside with your horse. Then follow the army toward Caricas; the first battle is expected on day 3. Choose a side at the battlefield, or stay out. M opens your map. You can ask the Chronoscope for the background before leaving.';
    $('tower-page').textContent=done?'The past is a vision, not a rewind.':'Begin now, or let me show you how the provinces became five states and then two rival leagues.';
    const response=done&&councilBattleResponse('taleth',campaign());
    if(response){$('tower-topic').textContent=`Master Time Wizard of the Guild / After ${response.record.region}`;$('tower-words').textContent=response.words+' '+response.detail;$('tower-road').textContent=response.balance;$('tower-page').textContent=response.next;}
    else $('tower-topic').textContent='Master Time Wizard of the Guild';
    $('tower-review-campaign').hidden=!done;
    const settled=done&&!!campaign()?.winner;
    if(settled){$('tower-words').textContent=councilPeaceWords('taleth',campaign())+' Come to the lookout above this chamber. Let us see what remains of the river country, and what your choices mean for Minora.';$('tower-road').textContent='We will look along the Lizeem first. Then I must turn your eyes eastward, toward Ambron.';}
    $('tower-next').textContent=settled?'Join Taleth at the lookout':done?'Return to the chamber':'Start campaign';
    if(openingClock&&!settled&&!done){
      $('tower-road').textContent='Bear will greet you outside with your horse. Follow the army toward Caricas, then choose a side at the battlefield. The first battle opens at Adventure 03:00 and runs until 06:00. M opens your map; Listen to Taleth (V) opens my counsel.';
      $('tower-page').textContent=(campaignClock()?.fullCampaign?'The Lizeemi War':'Opening rehearsal')+' / The tower is timeless. Outside, time resumes when you close a conversation.';
      if(!done)$('tower-next').textContent='Prepare to leave';
    }
    const allegiance=campaignSide();
    if(allegiance&&!settled){
      const league=allegiance==='west'?'West Lizeem':'East Lizeem';
      if(!done){
        $('tower-words').textContent=`You have chosen to support ${league}, Teresod. I will guide you toward a swift peace. This tower stands outside time; your campaign resumes when you leave. Outside, I can speak into your thoughts.`;
        $('tower-road').textContent=`Bear will greet you outside and offer your horse. Then head to Caricas: ${allegiance==='west'?'help your army take the town':'hold the town against the western attack'}. The battle opens ${openingClock?'at Adventure 03:00':'on day 3'}. My current directive stays on screen and updates as the war changes. You may explore or fight on another front for ${league}; my advice will follow the result.`;
        $('tower-page').textContent=`Your cause: ${league} / M opens your map. V lets you hear my counsel.`;
      }else{
        $('tower-road').textContent=`You remain committed to ${league}. Follow my current directive, or choose another front for your cause. I will guide you again when the situation changes. The tower holds time while you consider your next move.`;
      }
    }
    if(scenario()?.openingBattles?.length&&!done){
      $('tower-road').textContent='Go to Caricas first: West Lizeem is attacking as you leave. East Lizeem reaches Ovesos at Adventure 02:00. Follow my recommendation on the left to the gold battlefield boundary. Bear offers a horse outside; the White Bridge boatkeeper can take you to the front.';
      $('tower-page').textContent='You can attack or defend for your chosen league. The armies will settle any battle you leave to them. Time remains held here.';
    }
    if(settled&&state().snapshot().concluded){
      $('tower-topic').textContent='After the Lizeemi War';
      $('tower-words').textContent=councilPeaceWords('taleth',campaign())+' We have looked back on the war together. Our review is complete; you are welcome to return to the lookout or speak with the people of Minora.';
      $('tower-road').textContent='The Chronoscope keeps the record of your campaign. The lookout tour is there whenever you wish to see the surrounding countries again.';
      $('tower-page').textContent='Campaign complete / Further visits are optional';$('tower-next').textContent='Return to the lookout / optional';
    }
    $('tower-background').hidden=!preludeForScenario(scenario());
    $('tower-close').textContent=done?'Close':'Explore the tower';
    if(choosing){
      $('tower-topic').textContent='Which league will you support?';
      $('tower-words').textContent='You have arrived in Minora, Teresod. Before you leave, choose which league you will help unite the river country. A swift peace will preserve our people\u2019s strength for greater troubles ahead.';
      $('tower-road').textContent='I will guide you as the war changes. You may follow my counsel or choose another front for your cause. Take your time: '+($('tower-background').hidden?'explore my tower before deciding.':'explore my tower or view the war\u2019s background in the Chronoscope.')+' Nothing outside advances while you are here.';
      if(selectedSide)$('tower-road').textContent=`Bear will greet you outside and offer your horse. Then head to Caricas: ${selectedSide==='west'?'help the western army take the town':'defend the town against the western army'}. I will guide you again as the war changes. You may follow my counsel or choose another front. Time stays still until you leave the tower.`;
      if(scenario()?.openingBattles?.length)$('tower-road').textContent=selectedSide
        ?`When you leave, ${selectedSide==='west'?'help take Caricas':'help defend Caricas'} first. East Lizeem reaches Ovesos at Adventure 02:00. My recommendation stays on the left; you may track another front from the map. Bear offers a horse outside, and the White Bridge boatkeeper can take you to the front. Review the fight at the gold boundary before joining.`
        :'West attacks Caricas when you leave. East reaches Ovesos two minutes later. I will recommend where to help your chosen league as the war changes. You may explore the tower before deciding; time stands still here.';
      $('tower-page').textContent=selectedSide?'Confirm below when you are ready. Your choice lasts for this campaign.':'Choose a league, or keep exploring. The door to Minora opens after we have prepared your campaign.';
      $('tower-next').disabled=!selectedSide;
      $('tower-next').textContent=selectedSide?`Support ${selectedSide==='west'?'West Lizeem':'East Lizeem'} / Prepare to leave`:'Choose a league first';
    }
    (choosing?$('tower-allegiance-'+(selectedSide??'west')):$('tower-next')).focus();
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
    if(needsChoice()){
      // History is read-only. Its Start action returns to Taleth so neither the
      // Chronoscope nor a synthetic click can skip the player's commitment.
      if(mode()==='chronicle'){chronicle.close();return;}
      if(!selectedSide){paint();return;}
      const result=onChooseCampaignSide(selectedSide);
      if(!result?.ok||campaignSide()!==selectedSide){notice(result?.reason??'Choose your league with Taleth before beginning.');paint();return;}
    }
    if(state().begin())onBegin();close();}
  for(const side of ['west','east'])$('tower-allegiance-'+side).onclick=()=>{if(mode()!=='briefing'||!needsChoice())return;selectedSide=side;paint();};
  $('tower-next').onclick=begin;
  $('tower-previous').onclick=()=>{if(state().room==='lookout'&&mode()==='briefing'&&finalePage>0){if(finalePage===2)lookoutMenu=true;else finalePage--;paint();}};
  $('tower-background').onclick=()=>{prelude=preludeForScenario(scenario());if(!prelude)return;dialog.hidden=true;setMode('chronicle');chronicle.open(prelude,{started:state().briefed});};
  $('tower-review-campaign').onclick=()=>{prelude=campaignChronicle(campaign(),openingClock?campaignClock():null);if(!prelude)return;dialog.hidden=true;setMode('chronicle');chronicle.open(prelude,{started:true});};
  $('tower-close').onclick=close;
  function interact(){
    if(mode()!=='playing')return false;
    const at=target();if(!at)return false;
    if(at==='stillroom')onTrain();
    else if(at==='taleth')talk();
    else if(at==='leave'&&(!state().briefed||needsChoice()))notice(needsChoice()?'Speak with Taleth and decide which league to support before leaving. You can explore the tower first.':'Speak with Taleth and prepare your campaign before leaving the tower.');
    else if(at==='chamber')onLookout(false);
    else onDoor(at==='enter');
    return true;
  }
  function update(){
    if(mode()!=='playing')mainQuest.hide();
    writeHud(forecastButton,'hidden',!openingClock||!!campaignClock()?.complete||needsChoice());
    const s=state(),playing=mode()==='playing',at=target();writeHud(prompt,'hidden',!playing||!at);
    writeHud(prompt,'textContent',at==='stillroom'?'F / Enter Spirit and Time \u00b7 Train with Uguth':at==='taleth'?'F / Taleth, Master Time Wizard':at==='chamber'?'F / Descend to the guild chamber':at==='enter'?'F / Enter the Wizard Guild':s.briefed?'F / Leave for Minora':'F / Door closed / Speak with Taleth first');
    writeHud(objective,'hidden',!playing||!s.inside||!['tower','lookout'].includes(s.room));
    writeHud(objective,'textContent',"Taleth's timeless tower / Time stands still. "+(s.room==='lookout'?(s.snapshot().concluded?'Lizeemi War complete / Talk to Taleth for the optional tour, visit the pigeons, or descend to Minora.':'Speak with Taleth at the river lookout.'):s.briefed?'Speak with Taleth, or leave through the southern door (F).':needsChoice()?'Explore freely. Speak with Taleth to choose your league before leaving.':'Speak with Taleth / Time is held until you are ready.'));
    if(s.room==='tower'){
      const floor=towerFloorAt(position.y);
      writeHud(objective,'textContent',floor.id==='taleth'?"Taleth's chamber / Time stands still. Explore the spiral stair: Snero below, Hadrin above. "+(s.briefed?'The southern door leads to Minora.':'Speak with Taleth before leaving for Minora.'):!['senro','hadrin'].includes(floor.id)?`${floor.name} / Speak with ${floor.wizard}, or approach a display and press F. Time stands still. Taleth is ${Math.abs(Math.round(floor.y/10.8))} flights ${floor.y>0?'below':'above'}.`:floor.id==='hadrin'?'The Brightlock Workshop / Speak with Hadrin or approach his golem and enchanted tables. F to observe. Taleth is one flight below.':'The Folded Chamber / Explore Snero’s strange study and distant windows. Speak with him about the guild’s hidden paths. Taleth is one flight above.');
      if(sanctuaryContains(position.x,position.z,position.y))writeHud(objective,'textContent','Bolbur’s folded sanctuary / Time stands still. Walk the meadow, woods and wetland. Bolbur waits by the entrance; the same doorway returns to the spiral stair.');
    }
  }
  prompt.onclick=interact;
  function keydown(event){
    if(chronicle.keydown(event))return true;
    if(dialog.hidden)return false;
    if(event.code==='F5')event.preventDefault();
    if(event.code==='Escape'){event.preventDefault();close();}
    else if(event.code==='Tab'){
      event.preventDefault();const buttons=[$('tower-allegiance-west'),$('tower-allegiance-east'),$('tower-previous'),$('tower-next'),$('tower-background'),forecastButton,$('tower-review-campaign'),trainingButton,$('tower-close')].filter(b=>!b.hidden&&!b.disabled),i=buttons.indexOf(document.activeElement);
      buttons[(i+(event.shiftKey?-1:1)+buttons.length)%buttons.length].focus();
    }
    return true;
  }
  return {drawQuest:mainQuest.draw,update,interact,keydown,close,restore,lookoutState:()=>({page:finalePage,pages:talethFinale(campaign()).length,menu:lookoutMenu,view:lookoutMenu?'river':talethFinale(campaign())[finalePage]?.view,open:!dialog.hidden&&state().room==='lookout'}),marker:()=>state().room==='lookout'?{...(state().snapshot().concluded?LOOKOUT_DOOR:LOOKOUT_TALETH),id:'lookout',label:state().snapshot().concluded?'Guild chamber':'Taleth'}:null,tick:(dt,active)=>chronicle.tick(dt,active),chronicleState:()=>chronicle.state(),dispose(){mainQuest.dispose();chronicle.dispose();prompt.remove();objective.remove();dialog.remove();}};
}
