import {launcherPresentation,automaticExploreLoading,presentLauncher,presentContinue} from './launcher-presentation.js';
import {installLoadingLore} from './loading-lore.js';
import {installLoadingFeedback} from './loading-feedback.js';
import {createExplorationAudio} from './audio-host.js';
import {chooseLoadingMode} from '../startup/loading-choice.js';
import {explorationStore} from './checkpoint.js';
import {worldWarStore} from './war-checkpoint.js';
import {FOOD_WORLD_KEY} from '../food-world/scenario.js';
import {createRehearsalStore,rehearsalSide} from './rehearsal-store.js';
import {launchMode,MODES} from './modes.js';
import {createCombatTestingMenu,COMBAT_TEST_STORE} from './combat-testing.js';
import {createCampaignAllegianceMenu} from './campaign-allegiance-menu.js';
import {savedCampaignCommitment,legacyCampaignSidesConflict,campaignSideFromSearch,isCampaignSide,isUnbriefedTowerCheckpoint} from './campaign-allegiance.js';
import {arrivalStore,PRACTICE_KEY} from './training/arrival-progress.js';
import {continuationMode,loadChapterContinuation} from './chapter-continuation.js';
const $=id=>document.getElementById(id);
const storage=window.azhoraExplorationStorage??window.localStorage;
const arrival=arrivalStore(storage);
const soundtrack=createExplorationAudio({storage});
const params=new URLSearchParams(location.search);
const presentation=launcherPresentation(location.search);
presentLauncher(document,presentation);
const loadingFeedback=installLoadingFeedback(document);
let starting=false,combatSession=null;
const allegianceMenu=createCampaignAllegianceMenu({
  choose:({id,data,side})=>start(id,data,null,null,false,false,id==='war'&&!data?true:null,side),
  back:request=>{
    allegianceMenu.hide();$('start-screen').hidden=false;
    document.querySelector(`[data-${request?.data?'continue':'start'}-mode="${request?.id??'war'}"]`)?.focus();
  },
});
async function chooseCampaign(id,data=null){
  // New journeys begin in the timeless tower. Taleth asks for allegiance in
  // person; an undecided checkpoint returns to that same explorable opening.
  if(!data||isUnbriefedTowerCheckpoint(data))return start(id,data,null,null,false,false,id==='war'&&!data?true:null,data?.campaignSide??null);
  if(isCampaignSide(data?.campaignSide))return start(id,data,null,null,false,false,null,data.campaignSide);
  let commitment=null;
  if(data){
    const factory=data.fullCampaign?(await import('../../experiments/day-night/opening-war.js')).createAdventureWar:
      data.sharedOpening!==undefined?(await import('../../experiments/day-night/opening-war.js')).createOpeningWar:
        (await import('./world-war.js')).createWorldWar;
    const state=factory(data).snapshot();
    if(legacyCampaignSidesConflict(data,state))return allegianceMenu.show({id,data,legacy:true});
    if(state.winner&&!data.afterlife?.death)return start(id,data);
    commitment=savedCampaignCommitment(data,state);
  }
  allegianceMenu.show({id,data,commitment});
}
const combatMenu=createCombatTestingMenu({
  choose:exercise=>{
    if(combatSession){combatMenu.hide();combatSession.practice.start(exercise);}
    else start('combat',null,exercise);
  },
  back:()=>{
    if(combatSession){const url=new URL(location.href);url.searchParams.delete('mode');url.searchParams.delete('war');url.searchParams.set('menu','1');location.href=url.href;return;}
    combatMenu.hide();$('start-screen').hidden=false;$('new-combat-testing').focus();
  },
});
async function storeFor(id){
  if(id==='oremindi')return (await import('../../content/chapters/oremindi/checkpoint.js')).oremindiStore(storage);
  if(id==='yunethre')return (await import('../../content/chapters/yunethre/checkpoint.js')).yunethreStore(storage);
  if(id==='food-world')return worldWarStore(storage,FOOD_WORLD_KEY);
  if(id==='combat')return COMBAT_TEST_STORE;
  if(id==='hearthfall')return (await import('../../experiments/hearthfall/checkpoint.js')).hearthfallStore(storage);
  return id==='war'?worldWarStore(storage):explorationStore(storage);
}
async function start(id,data=null,combatExercise=null,autoplaySide=null,lookoutPreview=false,openingClock=false,adventureClock=null,campaignSide=null,arrivalSaved=null){
  if(starting)return;starting=true;
  combatMenu.hide();allegianceMenu.hide();$('start-screen').hidden=true;$('loading-screen').hidden=false;
  const selection=MODES[id],url=new URL(location.href);
  url.searchParams.delete('continuation');url.searchParams.delete('war');url.searchParams.delete('menu');if(!autoplaySide)url.searchParams.delete('autoplay');if(!lookoutPreview&&!openingClock)url.searchParams.delete('preview');url.searchParams.set('mode',id);history.replaceState(null,'',url);
  document.querySelector('#loading-screen h1').textContent=id==='combat'?'Opening the combat camp.':'Opening the world.';
  $('loading-help').textContent=id==='combat'?'Prepare once, then retry or switch exercises immediately.':'The country is prepared as you explore.';
  $('loading-message').textContent=id==='hearthfall'?'Preparing Feradom...':id==='combat'?'Preparing Minora combat camp...':'Preparing Minora...';
  installLoadingLore(id);
  try{
    if(id==='oremindi'&&!data)data=(await import('../../content/chapters/oremindi/checkpoint.js')).newOremindiSave();
    if(id==='yunethre'&&!data)data=(await import('../../content/chapters/yunethre/checkpoint.js')).newYunethreSave();
    const newArrival=id==='war'&&!data&&!autoplaySide&&!lookoutPreview&&!openingClock
      &&!(params.has('test')&&params.get('fixture')==='tower');
    if(newArrival){
      $('loading-message').textContent='Opening the Spirit and Time Realm...';
      const {runStillroomArrival}=await import('./training/arrival.js');
      await runStillroomArrival({saved:arrivalSaved,store:arrival,soundtrack});
      arrivalStore(storage,PRACTICE_KEY).save(arrival.read());
      $('loading-screen').hidden=false;$('loading-message').textContent='Entering the tower in Minora...';
      adventureClock=true;
    }
    const loadingMode=id==='explore'?(automaticExploreLoading(presentation)??await chooseLoadingMode({search:location.search,ids:{status:'loading-message',loading:'loading-screen'}})):'fast';
    const begun=performance.now();
    if(id==='explore')$('loading-help').textContent=loadingMode==='full'
      ?'Full loading · Preparing all supported regions before you begin.'
      :'Preparing your starting area can take about a minute. Nearby places will then load as you travel.';
    if(lookoutPreview)data=(await import('../../dev/tools/lizeem-lookout-preview.js')).createUnattendedLookout();
    // New campaigns use elapsed adventure time. Continuing a legacy save or a
    // legacy native/autoplay fixture preserves its original campaign rules.
    adventureClock??=id==='war'&&!openingClock&&!autoplaySide&&!lookoutPreview&&(data?.fullCampaign===true||!data&&!params.has('test'));
    const store=autoplaySide||lookoutPreview||openingClock?createRehearsalStore():await storeFor(id),{startExploration}=await import('./exploration.js');
    const launch=params.get('test')==='1'&&params.get('fixture')==='canerd'&&id==='explore'
      ?{...selection,start:(await import('../../content/regions/canerd/canerd-world.js')).CANERD.gate}:selection;
    const session=await startExploration({saved:id==='explore'?data:data?.exploration,warSaved:['war','food-world'].includes(id)?data:null,warMode:['war','food-world'].includes(id),
      chapterSaved:['yunethre','oremindi'].includes(id)?data:null,hearthfallSaved:id==='hearthfall'?data:null,launch,store,begun,loadingMode,combatExercise,autoplaySide,lookoutPreview,openingClock,adventureClock,soundtrack,
      campaignSide:data?.campaignSide??campaignSide,fromStillroom:newArrival,onCombatMenu:()=>combatMenu.show()});
    if(id==='combat')combatSession=session;
    if(newArrival){const result=session.save();if(result.ok)arrival.clear();}
  }catch(error){
    loadingFeedback.fail();
    soundtrack.bind(()=>({mode:'loading'}));
    console.error(error);window.__EXPLORATION_ERROR__=String(error.stack||error);
    $('loading-message').textContent='The world could not open: '+error.message;
    const retry=document.createElement('button');retry.textContent='Return to main menu';retry.onclick=()=>{
      const target=new URL(location.href);target.searchParams.delete('test');target.searchParams.delete('mode');target.searchParams.delete('autoplay');target.searchParams.delete('preview');location.href=target.href;
    };$('loading-message').after(retry);
  }
}
for(const button of document.querySelectorAll('[data-start-mode]'))button.onclick=()=>button.dataset.startMode==='combat'?combatMenu.show():
  ['war','food-world'].includes(button.dataset.startMode)?chooseCampaign(button.dataset.startMode):start(button.dataset.startMode);
for(const button of document.querySelectorAll('[data-continue-mode]')){
  const id=button.dataset.continueMode;
  storeFor(id).then(store=>{
    const saved=store.read();presentContinue(button,!!(saved.ok&&saved.data),presentation);
    if(id==='war'&&arrival.read()){
      presentContinue(button,true,presentation);button.textContent='Continue journey';
      document.querySelector('[data-save-note="war"]').textContent='Saved in the Spirit and Time Realm. Completed preparation is kept.';
      button.onclick=()=>start('war',null,null,null,false,false,true,null,arrival.read());return;
    }
    if(!saved.ok)document.querySelector(`[data-save-note="${id}"]`).textContent=saved.reason;
    else if(id==='war'&&saved.data)document.querySelector('[data-save-note="war"]').textContent=['lizeem-adventure-food-v1','lizeem-adventure-food-v2','lizeem-adventure-food-v3','lizeem-adventure-food-v4'].includes(saved.data.simulation.scenario)
      ?'Saved campaign: reviewed countryside, food economy and adventure clock.'
      :'Earlier campaign saved. Continue keeps its original rules; Begin Lizeemi War starts with farms and food supplies.';
    button.onclick=()=>['war','food-world'].includes(id)?chooseCampaign(id,saved.data):start(id,saved.data);
  }).catch(()=>{document.querySelector(`[data-save-note="${id}"]`).textContent='This save is unavailable.';});
}
const continuingChapter=continuationMode(location.search);
if(continuingChapter){
  const next=await loadChapterContinuation(continuingChapter,storage);
  if(next.ok){
    const url=new URL(location.href);url.searchParams.delete('continuation');history.replaceState(null,'',url);
    start(next.mode,next.data);
  }else document.getElementById('start-note').textContent=next.reason;
}
for(const button of document.querySelectorAll('[data-watch-war]'))button.onclick=()=>{const url=new URL(location.href);url.searchParams.delete('menu');url.searchParams.delete('war');url.searchParams.set('mode','war');url.searchParams.delete('preview');url.searchParams.set('autoplay',button.dataset.watchWar);location.href=url.href;};
for(const button of document.querySelectorAll('[data-lookout-preview]'))button.onclick=()=>{const url=new URL(location.href);for(const key of ['menu','war','autoplay'])url.searchParams.delete(key);url.searchParams.set('mode','war');url.searchParams.set('preview','unattended-lookout');location.href=url.href;};
for(const button of document.querySelectorAll('[data-opening-clock]'))button.onclick=()=>{const url=new URL(location.href);for(const key of ['menu','war','autoplay'])url.searchParams.delete(key);url.searchParams.set('mode','war');url.searchParams.set('preview','shared-clock-opening');location.href=url.href;};
if(!continuingChapter&&params.get('preview')==='adventure-war'&&!params.has('menu'))start('war',null,null,null,false,false,true,campaignSideFromSearch(location.search));
else if(!continuingChapter&&params.get('preview')==='shared-clock-opening'&&!params.has('menu'))start('war',null,null,null,false,true,null,campaignSideFromSearch(location.search));
else if(!continuingChapter&&params.get('preview')==='unattended-lookout'&&!params.has('menu'))start('war',null,null,null,true);
else if(!continuingChapter&&rehearsalSide(location.search)&&!params.has('menu'))start('war',null,null,rehearsalSide(location.search));
else if(!continuingChapter&&params.has('test')&&!params.has('menu')){
  const id=launchMode(location.search).id,store=await storeFor(id),saved=store.read();
  if(id==='combat')combatMenu.show();else start(id,saved.ok?saved.data:null,null,null,false,false,null,campaignSideFromSearch(location.search));
}
else if(!continuingChapter&&!params.has('menu')&&launchMode(location.search).id==='combat')combatMenu.show();
