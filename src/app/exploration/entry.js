import {explorationStore} from './checkpoint.js';
import {worldWarStore} from './war-checkpoint.js';
import {launchMode,MODES} from './modes.js';
const $=id=>document.getElementById(id);
const storage=window.azhoraExplorationStorage??window.localStorage;
const params=new URLSearchParams(location.search);
let starting=false;
async function storeFor(id){
  if(id==='hearthfall')return (await import('../../experiments/hearthfall/checkpoint.js')).hearthfallStore(storage);
  return id==='war'?worldWarStore(storage):explorationStore(storage);
}
async function start(id,data=null){
  if(starting)return;starting=true;
  $('start-screen').hidden=true;$('loading-screen').hidden=false;
  const selection=MODES[id],begun=performance.now(),url=new URL(location.href);
  url.searchParams.delete('war');url.searchParams.delete('menu');url.searchParams.set('mode',id);history.replaceState(null,'',url);
  $('loading-message').textContent=id==='hearthfall'?'Preparing Feradom...':'Preparing Minora...';
  try{
    const store=await storeFor(id),{startExploration}=await import('./exploration.js');
    await startExploration({saved:id==='explore'?data:data?.exploration,warSaved:id==='war'?data:null,warMode:id==='war',
      hearthfallSaved:id==='hearthfall'?data:null,launch:selection,store,begun});
  }catch(error){
    console.error(error);window.__EXPLORATION_ERROR__=String(error.stack||error);
    $('loading-message').textContent='The world could not open: '+error.message;
    const retry=document.createElement('button');retry.textContent='Return to main menu';retry.onclick=()=>{
      const target=new URL(location.href);target.searchParams.delete('test');target.searchParams.delete('mode');location.href=target.href;
    };$('loading-message').after(retry);
  }
}
for(const button of document.querySelectorAll('[data-start-mode]'))button.onclick=()=>start(button.dataset.startMode);
for(const button of document.querySelectorAll('[data-continue-mode]')){
  const id=button.dataset.continueMode;
  storeFor(id).then(store=>{
    const saved=store.read();button.disabled=!saved.ok||!saved.data;
    if(!saved.ok)document.querySelector(`[data-save-note="${id}"]`).textContent=saved.reason;
    button.onclick=()=>start(id,saved.data);
  }).catch(()=>{document.querySelector(`[data-save-note="${id}"]`).textContent='This save is unavailable.';});
}
if(params.has('test')&&!params.has('menu')){
  const id=launchMode(location.search).id,store=await storeFor(id),saved=store.read();
  start(id,saved.ok?saved.data:null);
}
