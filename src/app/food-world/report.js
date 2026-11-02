import {foodReport,foodNumber as number,foodPercent as percent} from '../lizeem/food-report.js';
import {foodRouteReport} from '../lizeem/food-war-report.js';
import {housingSummary} from '../../simulation/housing.js';
import {foodExplanations} from './explanations.js';
import {foodReportTime} from './report-time.js';

// An explicitly opened, read-only report. All numbers are campaign snapshots.
export function createFoodWorldReport({scenario,known=()=>true,clock=()=>null}){
  const panel=document.createElement('details');panel.id='food-world-report';
  panel.style.cssText='position:relative;flex-basis:100%;z-index:8';
  const title=document.createElement('summary');title.textContent='Food and housing';panel.append(title);
  const body=document.createElement('div');body.style.cssText='position:absolute;top:100%;left:0;width:min(390px,75vw);max-height:55vh;overflow:auto;background:#203f35;padding:16px;border:1px solid #83947b;border-radius:4px;box-shadow:0 8px 24px #0005';panel.append(body);
  const select=document.createElement('select');select.setAttribute('aria-label','Food report region');body.append(select);
  const content=document.createElement('div');body.append(content);
  document.getElementById('world-war-controls').append(panel);
  let state=null,stamp='';
  function render(value=state){
    state=value;
    const regions=scenario.regions.filter(known),ids=regions.map(r=>r.id).join('|');
    if(ids!==stamp){const previous=select.value;select.replaceChildren(...regions.map(r=>new Option(r.name,r.id)));if(regions.some(r=>r.id===previous))select.value=previous;stamp=ids;}
    if(!select.value){content.textContent='Discover a region to inspect its food supplies.';return;}
    const id=select.value,r=state.regions[id],f=foodReport(scenario,state,state,id),housing=housingSummary(r);
    const time=foodReportTime(state,clock());
    const valueOrDash=n=>n===null?'—':number(n);
    const armies=state.armies.filter(a=>a.strength>0&&(a.region===id||a.to===id));
    content.innerHTML=`<p><strong>${time.heading} / ${number(f.store)} food in store</strong><br>${time.period}</p>`+
      `<p>Produced: ${valueOrDash(f.production)} · Needed: ${valueOrDash(f.demand)} · Received: ${valueOrDash(f.imports)} · Sent: ${valueOrDash(f.exports)}<br>Provisioned to armies: ${number(f.provisioned)}</p>`+
      `<p>Civilian rations: ${percent(f.ration)} · Stability: ${percent(f.stability)} · Garrison readiness: ${percent(f.readiness)}<br>${time.text(f.reserveNote)}</p>`+
      `<p>Population: ${number(housing.population)} · Housing capacity: ${number(housing.capacity)}<br>These are regional totals; visible homes and residents represent the wider population.</p>`+
      (f.pending?`<p>${time.pending}</p>`:'')+
      foodExplanations(scenario,state,id,key=>regions.some(r=>r.id===key)).map(note=>`<p>${time.text(note)}</p>`).join('')+
      `<p>${scenario.food.routes.filter(link=>link.regions.includes(id)).map(link=>{const other=link.regions.find(k=>k!==id),definition=regions.find(r=>r.id===other);return definition?`${definition.name}: ${time.text(foodRouteReport(scenario,state,id,other).text)}`:'';}).filter(Boolean).join('<br>')}</p>`+
      armies.map(a=>`<p>${a.name}: ${a.strength} troops · Carried food ${number(a.supply?.carried??0)} · Readiness ${percent(a.supply?.readiness??1)}</p>`).join('');
  }
  select.onchange=()=>render();
  return {render,open(id){render();if([...select.options].some(o=>o.value===id))select.value=id;panel.open=true;render();body.scrollTop=0;},dispose:()=>panel.remove()};
}
