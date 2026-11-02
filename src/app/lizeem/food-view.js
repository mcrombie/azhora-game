import {foodReport,foodNumber as number,foodPercent as percent,importsClosed,importsOpen,foodTestActions} from './food-report.js';
import {foodRouteReport} from './food-war-report.js';

export function createFoodView({scenario,getCampaign,pause,refresh,war=false}){
  const $=id=>document.getElementById(id),name=id=>scenario.regions.find(r=>r.id===id).name;
  let renderedRegion=null;
  const signed=value=>value===null?'—':`${value>0?'+':''}${number(value)}`;
  function act(action){
    pause();
    if(getCampaign().snapshot().winner||getCampaign().snapshot().pending)return;
    for(const command of foodTestActions(action)){
      const result=getCampaign().foodAction(command);
      if(!result.ok)throw Error(result.reason);
    }
    refresh(action.includes('imports')?'isareos':action.includes('nethereum')?'nethereum':'nesdor');
  }
  for(const button of document.querySelectorAll('[data-food-action]'))button.onclick=()=>act(button.dataset.foodAction);
  function render(state,baseline,selected){
    const routesOpen=renderedRegion===selected&&$('region-detail').querySelector('.food-routes')?.open;
    const armiesOpen=renderedRegion===selected&&$('region-detail').querySelector('.regional-armies')?.open;
    renderedRegion=selected;
    const report=foodReport(scenario,state,baseline,selected),owner=scenario.factions.find(f=>f.id===state.regions[selected].owner);
    const rows=[['Produced',report.production],['Full food need',report.demand],['Received',report.imports],['Sent out',report.exports]];
    if(war)rows.push(['Packed for armies',report.day?report.provisioned:null]);
    $('region-detail').innerHTML=`<h2>${owner.name}</h2><div class="food-stock"><span>Food in store</span><strong>${number(report.store)}</strong></div>`+
      `<p class="food-period">${report.day?`Day ${report.day} · food units / day`:'No day completed yet'}</p>`+
      `<dl>${rows.map(([label,value])=>`<dt>${label}</dt><dd>${value===null?'—':number(value)}</dd>`).join('')}<dt>Balance at full rations</dt><dd>${signed(report.balance)}</dd></dl>`+
      `<p class="food-reserve">${report.reserveNote}</p>`+
      `<div class="food-health"><div><span>Civilian rations</span><strong>${percent(report.ration)}</strong></div><div><span>Stability</span><strong>${percent(report.stability)}</strong></div><div><span>Military readiness</span><strong>${percent(report.readiness)}</strong></div></div>`+
      `<p class="food-policy">Garrison: ${report.garrison} · Need includes civilians and soldiers.<br>Rationing: ${state.food.policies[owner.id].replaceAll('-',' ')}.</p>`+
      `<div id="food-explanation">${report.notes.map(note=>`<p>${note}</p>`).join('')}</div>`;
    const finished=!!state.winner||!!state.pending;
    $('cut-imports').disabled=finished||importsClosed(state);$('restore-imports').disabled=finished||importsOpen(state);
    for(const id of ['nesdor','nethereum']){
      $('disrupt-'+id).disabled=finished||state.regions[id].food.condition===.25;
      $('restore-'+id).disabled=finished||state.regions[id].food.condition===1;
    }
    $('food-condition').textContent=`Minora's developer blockade: ${importsClosed(state)?'on':importsOpen(state)?'off':'partial'}. Nesdor condition: ${percent(state.regions.nesdor.food.condition)}.${war?` Nethereum: ${percent(state.regions.nethereum.food.condition)}.`:''}`;
    $('food-action-note').textContent=state.winner?'War ended. Reset to try another intervention.':report.pending?'Changes apply next day. Press +1 day or Run.':war?'Only this run changes. Both wars still suffer their own battle disruptions.':'Only this run changes. The untouched run keeps its normal supply.';
    const outcome=s=>s.winner?`${scenario.factions.find(f=>f.id===s.winner).short} won on day ${s.day}`:`day ${s.day}`;
    $('comparison-note').textContent=war?`This run: ${outcome(state)}. Untouched war: ${outcome(baseline)}. Each cell shows owner, stores and stability. Wars freeze at their own victory; snapshots can be from different days.`:`Food stores at day ${state.day}. Each row shows stores / stability; the untouched run has no disruptions.`;
    $('finish-baseline').hidden=!war||!state.winner||!!baseline.winner;
    $('comparison').innerHTML=scenario.regions.map(r=>{
      const f=state.regions[r.id].food,b=baseline.regions[r.id].food;
      const owner=id=>scenario.factions.find(f=>f.id===id).short;
      return `<tr><td>${name(r.id)}</td><td>${war?owner(baseline.regions[r.id].owner)+'<br>':''}${number(b.store)} / ${percent(1-b.unrest)}</td><td class="${Math.abs(b.store-f.store)>.01||Math.abs(b.unrest-f.unrest)>.00001||state.regions[r.id].owner!==baseline.regions[r.id].owner?'changed':''}">${war?owner(state.regions[r.id].owner)+'<br>':''}${number(f.store)} / ${percent(1-f.unrest)}</td></tr>`;
    }).join('');
    if(war){
      const battle=state.engagements.find(b=>b.region===selected&&b.status==='active');
      const armyIds=new Set([...(battle?.attackingIds??[]),...state.armies.filter(a=>a.strength>0&&(a.region===selected||['marching','retreating'].includes(a.status)&&a.to===selected)).map(a=>a.id)]);
      const armies=state.armies.filter(a=>armyIds.has(a.id)&&a.strength>0);
      const routes=scenario.food.routes.filter(r=>r.regions.includes(selected)).map(r=>{const other=r.regions.find(id=>id!==selected),status=foodRouteReport(scenario,state,selected,other);return `<li><b>${name(other)}</b><br>${status.text}</li>`;}).join('');
      const summary=battle?`Battle underway · ends day ${battle.endsOn}. Food routes through ${name(selected)} are closed; battle-day production is halved.`:'No active battle here.';
      $('region-detail').insertAdjacentHTML('afterbegin',`<p class="food-battle-status">${summary}</p>`);
      $('region-detail').insertAdjacentHTML('beforeend',`<details class="food-routes" ${routesOpen?'open':''}><summary>Supply access now</summary><p>Applies to the next day. Open links still require surplus food and route capacity.</p><ul>${routes}</ul></details>${armies.length?`<details class="regional-armies" ${armiesOpen?'open':''}><summary>Armies here / approaching (${armies.length})</summary>${armies.map(a=>`<button class="army-link" data-inspect-army="${a.id}">${a.name}: ${a.strength} / ${a.status}</button>`).join('')}</details>`:''}`);
    }
  }
  return {render};
}
