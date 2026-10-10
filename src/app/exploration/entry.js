import {installLoadingLore} from './loading-lore.js';
import {explorationStore} from './checkpoint.js';
import {worldWarStore} from './war-checkpoint.js';
import {createRehearsalStore,rehearsalSide} from './rehearsal-store.js';
import {launchMode,MODES} from './modes.js';
import {createCombatTestingMenu,COMBAT_TEST_STORE} from './combat-testing.js';
const $=id=>document.getElementById(id);
const storage=window.azhoraExplorationStorage??window.localStorage;
const params=new URLSearchParams(location.search);
let starting=false,combatSession=null;
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
  if(id==='combat')return COMBAT_TEST_STORE;
  if(id==='hearthfall')return (await import('../../experiments/hearthfall/checkpoint.js')).hearthfallStore(storage);
  return id==='war'?worldWarStore(storage):explorationStore(storage);
}
async function start(id,data=null,combatExercise=null,autoplaySide=null,lookoutPreview=false){
  if(starting)return;starting=true;
  combatMenu.hide();$('start-screen').hidden=true;$('loading-screen').hidden=false;
  const selection=MODES[id],begun=performance.now(),url=new URL(location.href);
  url.searchParams.delete('war');url.searchParams.delete('menu');if(!autoplaySide)url.searchParams.delete('autoplay');if(!lookoutPreview)url.searchParams.delete('preview');url.searchParams.set('mode',id);history.replaceState(null,'',url);
  document.querySelector('#loading-screen h1').textContent=id==='combat'?'Opening the combat camp.':'Opening the world.';
  document.querySelector('#loading-screen small').textContent=id==='combat'?'Prepare once, then retry or switch exercises immediately.':'The country is prepared as you explore.';
  $('loading-message').textContent=id==='hearthfall'?'Preparing Feradom...':id==='combat'?'Preparing Minora combat camp...':'Preparing Minora...';
  installLoadingLore(id);
  try{
    if(lookoutPreview)data=(await import('../../dev/tools/lizeem-lookout-preview.js')).createUnattendedLookout();
    const store=autoplaySide||lookoutPreview?createRehearsalStore():await storeFor(id),{startExploration}=await import('./exploration.js');
    const session=await startExploration({saved:id==='explore'?data:data?.exploration,warSaved:id==='war'?data:null,warMode:id==='war',
      hearthfallSaved:id==='hearthfall'?data:null,launch:selection,store,begun,combatExercise,autoplaySide,lookoutPreview,onCombatMenu:()=>combatMenu.show()});
    if(id==='combat')combatSession=session;
  }catch(error){
    console.error(error);window.__EXPLORATION_ERROR__=String(error.stack||error);
    $('loading-message').textContent='The world could not open: '+error.message;
    const retry=document.createElement('button');retry.textContent='Return to main menu';retry.onclick=()=>{
      const target=new URL(location.href);target.searchParams.delete('test');target.searchParams.delete('mode');target.searchParams.delete('autoplay');target.searchParams.delete('preview');location.href=target.href;
    };$('loading-message').after(retry);
  }
}
for(const button of document.querySelectorAll('[data-start-mode]'))button.onclick=()=>button.dataset.startMode==='combat'?combatMenu.show():start(button.dataset.startMode);
for(const button of document.querySelectorAll('[data-continue-mode]')){
  const id=button.dataset.continueMode;
  storeFor(id).then(store=>{
    const saved=store.read();button.disabled=!saved.ok||!saved.data;
    if(!saved.ok)document.querySelector(`[data-save-note="${id}"]`).textContent=saved.reason;
    button.onclick=()=>start(id,saved.data);
  }).catch(()=>{document.querySelector(`[data-save-note="${id}"]`).textContent='This save is unavailable.';});
}
for(const button of document.querySelectorAll('[data-watch-war]'))button.onclick=()=>{const url=new URL(location.href);url.searchParams.delete('menu');url.searchParams.delete('war');url.searchParams.set('mode','war');url.searchParams.delete('preview');url.searchParams.set('autoplay',button.dataset.watchWar);location.href=url.href;};
for(const button of document.querySelectorAll('[data-lookout-preview]'))button.onclick=()=>{const url=new URL(location.href);for(const key of ['menu','war','autoplay'])url.searchParams.delete(key);url.searchParams.set('mode','war');url.searchParams.set('preview','unattended-lookout');location.href=url.href;};
if(params.get('preview')==='unattended-lookout'&&!params.has('menu'))start('war',null,null,null,true);
else if(rehearsalSide(location.search)&&!params.has('menu'))start('war',null,null,rehearsalSide(location.search));
else if(params.has('test')&&!params.has('menu')){
  const id=launchMode(location.search).id,store=await storeFor(id),saved=store.read();
  if(id==='combat')combatMenu.show();else start(id,saved.ok?saved.data:null);
}
else if(!params.has('menu')&&launchMode(location.search).id==='combat')combatMenu.show();
