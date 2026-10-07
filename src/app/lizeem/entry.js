import {LIZEEM_SCENARIO as scenario} from '../../content/scenarios/lizeem.js';
import {createCampaign,normalizeSeed,replayCampaign} from '../../simulation/campaign.js';
import {createScenarioMap} from './map.js';
import {isAlive,isMoving,stationed,defendingStrength} from '../../simulation/forces.js';
import {createReports} from './reports.js';
import {createHeroControls} from './hero-controls.js';

const $=id=>document.getElementById(id),started=performance.now();
const reports=createReports(scenario),regionName=reports.region;
const factionName=id=>scenario.factions.find(f=>f.id===id)?.short??id;
let campaign=createCampaign(scenario),baseline=createCampaign(scenario),selected='isareos',selectedArmy=null,view='geopolitical',running=false,timer=null,map,heroUI;
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const eventText=reports.event;
function selectArmy(id){selectedArmy=id;document.getElementById('army-inspector').open=true;render();}
function renderArmy(state){
  const list=$('selected-army');list.replaceChildren(new Option('Select an army',''));
  for(const army of state.armies)list.add(new Option(`${army.name} - ${army.status}`,String(army.id)));
  list.value=selectedArmy===null?'':String(selectedArmy);
  $('army-count').textContent=`(${state.armies.filter(isAlive).length} active)`;
  const a=state.armies.find(one=>one.id===selectedArmy);
  if(!a){$('army-detail').innerHTML='<p>Click an army marker or choose a name to follow its orders and battle history.</p>';return;}
  const history=state.events.filter(e=>e.type==='battle'&&(e.armyId===a.id||e.defendingIds.includes(a.id)));
  $('army-detail').innerHTML=`<h2>${escape(a.name)}</h2><dl><dt>Status</dt><dd>${escape(a.status)}</dd><dt>Strength</dt><dd>${a.strength}</dd><dt>Raised in</dt><dd>${escape(regionName(a.origin))}</dd><dt>Battles fought</dt><dd>${a.battles}</dd></dl>`+
    (isMoving(a)?`<p><b>${escape(regionName(a.from))} to ${escape(regionName(a.to))}</b><br>Departed day ${a.departed}; arrives day ${a.arrives} (${a.arrives-state.day} days left).</p><p>${escape(reports.route(a.route))}</p>`
      :a.region?`<p>Stationed in ${escape(regionName(a.region))}.${a.readyOn?` Ready for orders on day ${a.readyOn}.`:''}</p>`:'')+
    `<p><b>Order:</b> ${escape(a.reason)}</p>`+
    (history.length?`<h3>Latest battle</h3><p>${escape(eventText(history.at(-1)))}</p>`:'');
}
function render(){
  const state=campaign.snapshot(),base=baseline.snapshot(),region=state.regions[selected],definition=scenario.regions.find(r=>r.id===selected);
  map.render(state,view,selected,selectedArmy);renderArmy(state);heroUI?.render(state);
  $('day').textContent='Day '+state.day;$('play').textContent=running?'Pause':'Run';
  $('war-status').textContent=state.pending?'Local battle awaits you':state.winner?`${factionName(state.winner)} wins`:running?'Running':'Paused';
  $('play').disabled=!!state.winner||!!state.pending;$('advance').disabled=!!state.winner||!!state.pending||running;
  $('selected-region').value=selected;
  document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));
  const incoming=state.armies.filter(a=>isMoving(a)&&a.to===selected),local=stationed(state,selected),outgoing=state.armies.filter(a=>isMoving(a)&&a.from===selected);
  $('region-detail').innerHTML=`<h2>${escape(scenario.factions.find(f=>f.id===region.owner).name)}</h2><dl><dt>Defending strength</dt><dd>${defendingStrength(state,selected)}</dd><dt>Local garrison</dt><dd>${region.garrison}</dd><dt>Stationed armies</dt><dd>${local.length}</dd><dt>Recruitment / day</dt><dd>${region.recovery?0:definition.recruits}</dd><dt>Armies approaching</dt><dd>${incoming.length}</dd></dl><p>${region.owner==='minora'?'Neutral. Neither league can attack or march through Isareos. Teresod begins in Minora.':region.recovery?`Recovering after capture: ${region.recovery} days before recruitment resumes.`:'New recruits gather here; armies choose targets along shared borders.'}</p>${[...new Map([...incoming,...local,...outgoing].map(a=>[a.id,a])).values()].map(a=>`<button class="army-link" data-inspect-army="${a.id}">${escape(a.name)}: ${a.strength} / ${a.status}</button>`).join('')}`;
  $('reinforce').disabled=region.owner==='minora'||!!state.winner||!!state.pending;
  $('intervention-note').textContent=state.winner?'Reset to test another intervention.':region.owner==='minora'?'Select a league region. Minora stays neutral.':`Adds 80 strength to ${factionName(region.owner)} in ${definition.name}. Only this run changes.`;
  $('comparison-note').textContent=`Same seed, no interventions. ${base.winner?`${factionName(base.winner)} won on day ${base.day}.`:`Baseline advanced to day ${base.day}.`} This run: ${state.winner?`${factionName(state.winner)} won on day ${state.day}`:`day ${state.day}`}.`;
  $('finish-baseline').hidden=!state.winner||!!base.winner;
  $('comparison').innerHTML=scenario.regions.map(r=>`<tr><td>${escape(r.name)}</td><td>${escape(factionName(base.regions[r.id].owner))}</td><td class="${base.regions[r.id].owner!==state.regions[r.id].owner?'changed':''}">${escape(factionName(state.regions[r.id].owner))}</td></tr>`).join('');
  $('event-count').textContent=`(${state.events.length})`;
  $('events').innerHTML=state.events.slice(-25).reverse().map(e=>`<li><b>Day ${e.day}</b> ${escape(eventText(e))}</li>`).join('');
  $('faction-key').innerHTML=scenario.factions.map(f=>`<span><i style="background:${f.color}"></i>${escape(f.short)} · ${Object.values(state.regions).filter(r=>r.owner===f.id).length} regions</span>`).join('');
}
function advance(days=1){
  const before=campaign.snapshot().day,state=campaign.step(days),elapsed=state.day-before;
  if(elapsed)baseline.step(elapsed);
  if(state.winner||state.pending){running=false;clearTimeout(timer);timer=null;}
  render();return state;
}
function schedule(){clearTimeout(timer);if(running)timer=setTimeout(()=>{advance();schedule();},Number($('speed').value));}
function pause(){running=false;clearTimeout(timer);timer=null;if(map)render();}
function toggle(){if(campaign.snapshot().winner||campaign.snapshot().pending)return;running=!running;schedule();render();}
function reset(seed=$('seed').value){
  const valid=normalizeSeed(seed);pause();heroUI?.clear();selectedArmy=null;campaign=createCampaign(scenario,valid);baseline=createCampaign(scenario,valid);$('seed').value=String(valid);render();
  $('experiment-note').textContent='Both runs reset. No interventions; same seed.';
}
function reinforce(){
  const result=campaign.reinforce(selected,80);render();
  if(!result.ok)$('intervention-note').textContent=result.reason;return result;
}
function exportRun(){const {seed,day,commands}=campaign.snapshot();return {format:'azhora-lizeem-experiment',version:1,scenario:scenario.id,seed,day,commands};}
function importRun(data){
  if(data?.format!=='azhora-lizeem-experiment'||data.version!==1||data.scenario!==scenario.id||!Array.isArray(data.commands)||data.commands.length>10000)throw Error('This experiment uses different scenario rules. Import a v3 Lizeem experiment; older exports are kept unchanged.');
  const restored=replayCampaign(scenario,data),untouched=createCampaign(scenario,data.seed);if(data.day)untouched.step(data.day);
  pause();heroUI?.clear();selectedArmy=null;campaign=restored;baseline=untouched;$('seed').value=String(data.seed);render();$('experiment-note').textContent='Experiment replayed and paused at day '+data.day+'.';
}
try{
  map=await createScenarioMap($('scenario-map'),scenario,id=>{selected=id;render();},selectArmy);
  heroUI=createHeroControls({scenario,getCampaign:()=>campaign,pause,refresh:region=>{if(region)selected=region;render();}});
  for(const region of scenario.regions)$('selected-region').add(new Option(region.name,region.id));
  $('selected-army').onchange=()=>{selectedArmy=$('selected-army').value?Number($('selected-army').value):null;render();};
  $('region-detail').onclick=e=>{const button=e.target.closest('[data-inspect-army]');if(button)selectArmy(Number(button.dataset.inspectArmy));};
  $('selected-region').onchange=()=>{selected=$('selected-region').value;render();};
  for(const button of document.querySelectorAll('[data-view]'))button.onclick=()=>{view=button.dataset.view;render();};
  $('fit-map').onclick=map.fit;$('play').onclick=toggle;$('advance').onclick=()=>advance();$('speed').onchange=schedule;
  $('finish-baseline').onclick=()=>{baseline.step(1000);render();};
  $('reinforce').onclick=reinforce;$('reset').onclick=()=>{try{reset();}catch(error){$('experiment-note').textContent=error.message;}};
  $('export-run').onclick=()=>{
    const blob=new Blob([JSON.stringify(exportRun(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=`azhora-lizeem-seed-${campaign.snapshot().seed}-day-${campaign.snapshot().day}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    $('experiment-note').textContent='Export requested. The file contains the seed, day and intervention history.';
  };
  $('import-run').onchange=async()=>{
    const file=$('import-run').files[0];if(!file)return;pause();
    try{if(file.size>2_000_000)throw Error('Experiment file is too large.');importRun(JSON.parse(await file.text()));}
    catch(error){$('experiment-note').textContent='Import failed: '+error.message;}finally{$('import-run').value='';}
  };
  document.addEventListener('keydown',e=>{if(!$('encounter-dialog').open&&e.code==='Space'&&!['INPUT','SELECT','BUTTON','TEXTAREA','SUMMARY'].includes(document.activeElement?.tagName)){e.preventDefault();if(!e.repeat)toggle();}});
  window.addEventListener('pagehide',()=>clearTimeout(timer));render();
  const readyMs=Math.round(performance.now()-started);console.log('LIZEEM_READY '+readyMs+'ms');
  if(new URLSearchParams(location.search).has('test'))window.__LIZEEM__={advance,reset,pause,toggle,reinforce,exportRun,importRun,
    state:()=>({campaign:campaign.snapshot(),baseline:baseline.snapshot(),running,selected,selectedArmy,view,map:map.state(),hero:heroUI.state(),readyMs})};
}catch(error){console.error(error);$('scenario-map').textContent='Could not open the scenario: '+error.message;window.__LIZEEM_ERROR__=String(error.stack||error);}
