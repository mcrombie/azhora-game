import {createEncounterDialog} from './encounter-dialog.js';
export function createHeroControls({scenario,getCampaign,pause,refresh}){
  const $=id=>document.getElementById(id),name=id=>scenario.regions.find(r=>r.id===id)?.name??id,faction=id=>scenario.factions.find(f=>f.id===id);
  const dialog=createEncounterDialog({scenario,getCampaign,pause,onClose:region=>{refresh(region);$('hero-encounter').hidden?$('hero-travel').focus():$('hero-encounter').focus();}});
  function render(state){
    const hero=state.hero,pending=state.pending,select=$('hero-destination'),old=select.value;
    select.replaceChildren();for(const id of scenario.regions.find(r=>r.id===hero.region).neighbors)select.add(new Option(name(id),id));if([...select.options].some(o=>o.value===old))select.value=old;
    $('hero-position').textContent=hero.journey?`${hero.name}: traveling to ${name(hero.journey.to)}, arriving day ${hero.journey.arrives}.`:`${hero.name} in ${name(hero.region)}. ${hero.readyOn>state.day?`Recovering until day ${hero.readyOn}.`: 'Unaffiliated; choose whom to help at each battle.'}`;
    $('hero-watch').checked=hero.watching;$('hero-watch').disabled=!!pending||!!state.winner;
    select.disabled=$('hero-travel').disabled=!!hero.journey||!!pending||!!state.winner;
    $('hero-encounter').hidden=!pending;$('hero-encounter').textContent=pending?`Battle in ${name(pending.region)} — inspect`:'';
    $('hero-waiting').textContent=pending?'Campaign paused for your decision. Join either side, or let the armies resolve it.':hero.watching?'Battles in your region pause for your decision while you are ready. Other battles resolve automatically.':'Enable local encounters to be offered battles where Teresod is present.';
    const intervention=state.events.findLast(e=>e.type==='hero-result'),battle=intervention&&state.events.find(e=>e.type==='battle'&&e.id>intervention.id&&e.region===intervention.region);
    $('hero-last-result').hidden=!battle;
    if(battle)$('hero-last-result').textContent=`Last encounter: ${intervention.outcome==='withdraw'?'stayed out':`${intervention.outcome} helping ${faction(intervention.faction).short}`}. ${name(battle.region)} ${battle.captured?'captured by '+faction(battle.attacker).short:'held by '+faction(battle.defender).short}. Attacker chance: ${(battle.baseChance*100).toFixed(0)}% → ${(battle.chance*100).toFixed(0)}%.`;
    if(pending)$('hero-panel').open=true;
  }
  $('hero-travel').onclick=()=>{const answer=getCampaign().heroTravel($('hero-destination').value);refresh();if(!answer.ok)$('hero-waiting').textContent=answer.reason;};
  $('hero-watch').onchange=()=>{getCampaign().watchBattles($('hero-watch').checked);refresh();};
  $('hero-encounter').onclick=dialog.open;
  return {render,clear:dialog.clear,state:dialog.state};
}
