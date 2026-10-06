import {parseCells,unionCells,labelAnchor,visibleAnchor} from './geometry.js';
import {SNAPSHOTS,CHAPTER_PATHS,CHAPTER_REGIONS,disputed,factionRegions,factionName,factionColor,ownerOf as territoryOwner,stability as territoryStability} from '../../src/ui/map/campaign-map-model.js';
import {chapterHTML,factionHTML} from '../../src/ui/map/campaign-map-info.js';

// Read-only interface fixture. A snapshot changes presentation, never a game save.
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const NS='http://www.w3.org/2000/svg';
const state={layer:'regions',tab:'region',selected:'Moros Plain',faction:null,snapshot:'opening',questPath:null};
const regions=new Map(),cellsByRegion=new Map(),groupCache=new Map();
let metadata,factions,svg,paths,countryLayer,groups=new Map(),fitScale=1,scale=1,x=0,y=0,dragging=null,moved=false,bounds;
const factionById=id=>factions.find(f=>f.id===id);
const nameOf=id=>factionName(id,factions);
const colorOf=id=>id==='disputed'?'url(#disputed-hatch)':factionColor(id,factions);
const ownerOf=name=>territoryOwner(name,factions,state.snapshot);
const stability=name=>territoryStability(name,state.snapshot);
function relation(id){
  if(id==='eshtor-undead')return 'The duke publicly claims authority from Ganun. His wider allegiance is unconfirmed.';
  if(id==='wilhelm-undead')return 'Wilhelm holds the west of Ithzel. His main army has departed for Minora.';
  if(id.includes('gorgi')||id.includes('orgmala'))return 'Independent member of Goblinland’s loose confederation. Allied with three other goblin factions, with little coordination.';
  if(['ambroni-empire','mithala','celder'].includes(id))return 'Nominal vassal of the Stone Fist, with little practical northern oversight.';
  if(id==='stonefist-lond')return 'The High King’s northern heartland. Its lower kingdoms keep their own territories and governments.';
  if(['witherst','riesov','ganun','endevor','thoth','nonoth','orse','ithzel'].includes(id))return 'A lower kingdom acknowledging the High King of the Stone Fist.';
  if(id==='disputed')return 'Authority is contested. A single region-wide controller has not been assigned.';
  if(id==='yunethre-shared')return 'The free town and independent centaur society share this region. They are distinct allied political actors.';
  if(id==='minoran-league')return 'Cedric holds the captured government in Minora. The four other League members are rebelling; countryside control remains unresolved.';
  if(id==='unassigned')return 'This territory has no political allocation in the current design.';
  return 'A separate political actor. Its territory is shown independently of its diplomatic relationships.';
}
function regionNote(name){
  const branch=CHAPTER_PATHS[SNAPSHOTS[state.snapshot]?.path];
  if(branch&&[branch.target,'West Suval','Moros Plain'].includes(name))return branch.consequence;
  if(name==='Moros Plain')return 'The Ambroni army holds Moros. Your Chapter 1 envoy mission begins here. A successful Coalition campaign takes this region for Izol.';
  if(name==='West Suval')return 'The republicans and Coalition hold Solis and West Suval. A successful monarchist Chapter 1 campaign takes the city and region for Ambron.';
  if(name==='North Riesov'&&state.snapshot==='north-riesov')return 'In this sample, Undeadland has captured North Riesov. It now shares the same country fill and outer border as Eshtor Plateau.';
  if(name==='East Lond'&&state.snapshot==='east-lond')return 'In this sample, East Lond has been lost to Undeadland. Lond’s territory and label are recalculated from its four remaining regions.';
  if(name==='Isareos')return 'You begin in Minora. Cedric has seized the League government and Wilhelm has arrived with his army. This does not establish control of the whole countryside.';
  if(name.includes('Ithzel'))return 'The returned Lower King holds the east against Wilhelm’s remaining western forces. The opening balance is roughly even; local intervention could tip it.';
  if(name==='Acor Wetlands')return 'Acreland, Endevor and Thalmagar dispute the wetlands. No sole controller is assigned.';
  if(name.includes('Lotharn'))return 'Ambron still claims this province, but it is in open rebellion. Exact rebel and outside holdings remain to be specified.';
  if(name==='Eshtor Plateau')return 'The Forsaken Citadel stands on the plateau. The duke’s northern expansion threatens nearby human kingdoms.';
  return relation(ownerOf(name));
}
function buildGroups(){
  if(groupCache.has(state.snapshot)){groups=groupCache.get(state.snapshot);return;}
  const next=new Map();
  for(const name of regions.keys()){
    const id=ownerOf(name);if(!next.has(id))next.set(id,{id,regions:[],cells:[]});
    const group=next.get(id);group.regions.push(name);group.cells.push(...cellsByRegion.get(name));
  }
  for(const group of next.values()){
    Object.assign(group,unionCells(group.cells));
    group.anchor=labelAnchor(group.cells,group.loops);
  }
  groups=next;groupCache.set(state.snapshot,next);
}
function selectRegion(name,{focus=false}={}){
  if(!regions.has(name))return;
  state.selected=name;state.tab='region';state.faction=null;render();
  if(focus)focusRegion(name);
}
function selectFaction(id,{focus=false}={}){
  state.faction=id;state.tab='factions';render();if(focus)focusFaction(id);
}
function render(){
  document.querySelectorAll('[data-layer]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.layer===state.layer)));
  document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tab===state.tab)));
  $('sample-note').hidden=state.snapshot==='opening';$('sample-note').textContent=SNAPSHOTS[state.snapshot].label;$('stability-key').hidden=state.layer!=='stability';
  renderMap();renderDetails();
}
function renderMap(){
  if(!svg)return;
  const political=state.layer==='geopolitical';
  svg.querySelector('#region-labels').style.display=political?'none':'';
  svg.querySelector('#region-boundaries').style.display=political?'none':'';
  svg.querySelector('#relief').style.opacity=political?'.09':'1';
  svg.querySelector('#terrain').style.opacity=political?'.18':'1';
  countryLayer.style.display=political?'':'none';$('country-labels').hidden=!political;
  countryLayer.replaceChildren();
  const selectedOwner=state.faction||ownerOf(state.selected);
  for(const group of groups.values()){
    const path=document.createElementNS(NS,'path');path.setAttribute('d',group.path);path.setAttribute('fill',colorOf(group.id));path.setAttribute('fill-opacity','.9');
    path.setAttribute('class','country-shape'+(group.id===selectedOwner?' selected':''));path.dataset.faction=group.id;path.dataset.regions=JSON.stringify(group.regions);countryLayer.append(path);
  }
  const stabilityColors={stable:'#769b80',unstable:'#d0b273',conflict:'#be7970',unknown:'#c4c7bb'};
  for(const path of paths){
    const name=path.dataset.region;path.dataset.owner=ownerOf(name);
    path.setAttribute('fill',state.layer==='stability'?stabilityColors[stability(name)[1]]:name===state.selected?'#496e52':'transparent');
    path.setAttribute('fill-opacity',political?'0':state.layer==='stability'?'.59':'.2');
  }
  positionLabels();
}
const line=(label,value)=>`<div class="fact"><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`;
function territoriesFor(id){
  if(['yunethre-free-state','yunethre-centaurs'].includes(id))return ['Yunethre'];
  return groups.get(id)?.regions||[];
}
function renderDetails(){
  if(state.tab==='quests'){
    $('detail-content').innerHTML=chapterHTML(state.questPath,state.snapshot);return;
  }
  if(state.tab==='factions'){
    if(state.faction){
      const id=state.faction,names=territoriesFor(id);
      $('detail-content').innerHTML=factionHTML(id,{factions,territories:names,snapshot:state.snapshot,relation:relation(id)});
    }else{
      $('detail-content').innerHTML='<span class="eyebrow">Political actors</span><h2 class="title">Factions</h2>'+factions.map(f=>{const count=territoriesFor(f.id).length;return `<button class="faction-row" data-faction="${esc(f.id)}"><i class="dot" style="background:${colorOf(f.id)}"></i>${esc(nameOf(f.id))}<small>${count?`${count} ${count===1?'region':'regions'}`:'Local control unresolved'}${f.confederation==='goblinland'?' · Goblinland member':''}</small></button>`;}).join('');
    }return;
  }
  const name=state.selected,owner=ownerOf(name),[condition,kind]=stability(name);
  $('detail-content').innerHTML=`<span class="eyebrow">Region</span><h2 class="title">${esc(name)}</h2><span class="badge ${kind}">${condition}</span><dl class="facts">${line('Territorial control',nameOf(owner))}${name==='Isareos'?line('Local authority','Cedric in Minora; countryside unresolved'):''}${name==='Acor Wetlands'?line('Claimants','Acreland · Endevor · Thalmagar'):''}${name.includes('Lotharn')?line('Nominal claim','Ambroni Empire'):''}</dl><button class="text-button" data-faction="${esc(owner)}">About ${esc(nameOf(owner))} →</button><div class="section"><h3>The situation</h3><p>${esc(regionNote(name))}</p></div>${CHAPTER_REGIONS.includes(name)?'<div class="section"><h3>Related quest</h3><button class="text-button" data-chapter="overview">Chapter 1 &middot; The Border War &rarr;</button></div>':''}`;
}
const measure=document.createElement('canvas').getContext('2d');
function positionLabels(){
  $('country-labels').replaceChildren();if(state.layer!=='geopolitical')return;
  const viewport=$('map-viewport'),taken=[];
  const ordered=[...groups.values()].filter(g=>!['unassigned','disputed'].includes(g.id)).sort((a,b)=>b.cells.length-a.cells.length);
  for(const group of ordered){
    const anchor=visibleAnchor(group,{x,y,scale,width:viewport.clientWidth,height:viewport.clientHeight});if(!anchor)continue;
    const cx=x+anchor.x*scale,cy=y+anchor.y*scale;
    if(cx<0||cy<0||cx>viewport.clientWidth||cy>viewport.clientHeight)continue;
    const label=nameOf(group.id),words=label.length>15?label.split(' '):[label];
    const lines=words.length>1?[words.slice(0,Math.ceil(words.length/2)).join(' '),words.slice(Math.ceil(words.length/2)).join(' ')]:words;
    const size=Math.max(10,Math.min(20,Math.sqrt(group.cells.length)*1.1* Math.sqrt(scale/fitScale)));
    measure.font=`600 ${size}px Georgia`;
    const width=Math.max(...lines.map(s=>measure.measureText(s).width))+8,height=size*1.15*lines.length;
    const box={x:cx-width/2,y:cy-height/2,w:width,h:height};
    const visible=!taken.some(a=>box.x<a.x+a.w+3&&box.x+box.w+3>a.x&&box.y<a.y+a.h+3&&box.y+box.h+3>a.y);
    const el=document.createElement('div');el.className='country-label';el.dataset.faction=group.id;el.style.left=`${cx}px`;el.style.top=`${cy}px`;el.style.fontSize=`${size}px`;el.hidden=!visible;
    for(const text of lines){const span=document.createElement('span');span.textContent=text;el.append(span);}
    $('country-labels').append(el);if(visible)taken.push(box);
  }
}
function applyTransform(){$('map-canvas').style.transform=`translate(${x}px,${y}px) scale(${scale})`;positionLabels();}
function fit(){if(!metadata)return;const v=$('map-viewport');fitScale=Math.min((v.clientWidth-65)/bounds.width,(v.clientHeight-120)/bounds.height);scale=fitScale;x=(v.clientWidth-bounds.width*scale)/2-bounds.x*scale;y=70+(v.clientHeight-120-bounds.height*scale)/2-bounds.y*scale;applyTransform();}
function focusBounds(box){const v=$('map-viewport');scale=Math.max(fitScale,Math.min(fitScale*14,(v.clientWidth-100)/(box.width*1.5),(v.clientHeight-140)/(box.height*1.5)));x=v.clientWidth/2-(box.x+box.width/2)*scale;y=v.clientHeight/2-(box.y+box.height/2)*scale;applyTransform();}
function focusRegion(name){const r=regions.get(name);if(r)focusBounds(r);}
function focusFaction(id){const names=territoriesFor(id);if(!names.length)return;const rs=names.map(n=>regions.get(n));const bx=Math.min(...rs.map(r=>r.x)),by=Math.min(...rs.map(r=>r.y));focusBounds({x:bx,y:by,width:Math.max(...rs.map(r=>r.x+r.width))-bx,height:Math.max(...rs.map(r=>r.y+r.height))-by});}
function zoomBy(factor,cx=$('map-viewport').clientWidth/2,cy=$('map-viewport').clientHeight/2){const next=Math.min(fitScale*18,Math.max(fitScale*.8,scale*factor));x=cx-(cx-x)*next/scale;y=cy-(cy-y)*next/scale;scale=next;applyTransform();}
function openChapter(path=null,{focus=true}={}){
  state.questPath=CHAPTER_PATHS[path]?path:null;state.tab='quests';state.faction=null;render();
  if(focus)focusRegion(CHAPTER_PATHS[path]?.target||'Moros Plain');
}
function setSnapshot(value,{focus=true,quest=false}={}){
  if(!SNAPSHOTS[value])return;
  state.snapshot=value;buildGroups();state.faction=null;state.tab=quest?'quests':'region';state.selected=SNAPSHOTS[value].region;
  if(SNAPSHOTS[value].path){state.questPath=SNAPSHOTS[value].path;state.tab='quests';state.layer='geopolitical';}
  $('sample').value=value;render();
  $('search').value='';$('search-results').hidden=true;$('map-tooltip').hidden=true;
  if(focus){if(value==='opening')fit();else focusRegion(SNAPSHOTS[value].region);}
}
document.addEventListener('click',event=>{
  const b=event.target.closest('button');if(!b)return;
  if(b.dataset.chapter)openChapter(b.dataset.chapter);
  if(b.dataset.snapshot)setSnapshot(b.dataset.snapshot,{quest:true});
  if(b.dataset.layer){state.layer=b.dataset.layer;render();}
  if(b.dataset.tab){state.tab=b.dataset.tab;state.faction=null;render();}
  if(b.dataset.region){selectRegion(b.dataset.region,{focus:true});$('search-results').hidden=true;}
  if(b.dataset.faction){selectFaction(b.dataset.faction,{focus:true});$('search-results').hidden=true;}
  if(b.id==='back-factions'){state.faction=null;renderDetails();}
});
$('preview-tools').onclick=()=>{$('sample').value=state.snapshot;$('dialog').showModal();};
$('apply-sample').onclick=()=>{setSnapshot($('sample').value);$('dialog').close();};
$('fit').onclick=fit;$('zoom-in').onclick=()=>zoomBy(1.5);$('zoom-out').onclick=()=>zoomBy(1/1.5);
$('search').oninput=()=>{
  const query=$('search').value.trim().toLowerCase();$('search-results').hidden=!query;if(!query)return;
  const fs=factions.filter(f=>nameOf(f.id).toLowerCase().includes(query)).slice(0,5);
  const rs=[...regions.keys()].filter(n=>n.toLowerCase().includes(query)).slice(0,7);
  $('search-results').innerHTML=fs.map(f=>`<button data-faction="${esc(f.id)}">${esc(nameOf(f.id))}<small>Faction</small></button>`).join('')+rs.map(n=>`<button data-region="${esc(n)}">${esc(n)}<small>Region</small></button>`).join('')||'<p>No matching faction or region</p>';
};
$('search').onkeydown=e=>{if(e.key==='Escape')$('search-results').hidden=true;if(e.key==='Enter'){e.preventDefault();$('search-results').querySelector('button')?.click();}if(e.key==='ArrowDown'){e.preventDefault();$('search-results').querySelector('button')?.focus();}};
document.addEventListener('click',e=>{if(!e.target.closest('.search'))$('search-results').hidden=true;});
const viewport=$('map-viewport');
viewport.addEventListener('wheel',e=>{e.preventDefault();const r=viewport.getBoundingClientRect();zoomBy(Math.exp(-e.deltaY*.0015),e.clientX-r.left,e.clientY-r.top);},{passive:false});
viewport.addEventListener('pointerdown',e=>{if(e.button!==0)return;dragging={cx:e.clientX,cy:e.clientY,x,y};moved=false;viewport.setPointerCapture(e.pointerId);});
viewport.addEventListener('pointermove',e=>{
  if(dragging){const dx=e.clientX-dragging.cx,dy=e.clientY-dragging.cy;if(Math.hypot(dx,dy)>4)moved=true;x=dragging.x+dx;y=dragging.y+dy;applyTransform();$('map-tooltip').hidden=true;return;}
  const name=e.target.closest('[data-region]')?.dataset.region;
  $('map-tooltip').hidden=!name;if(!name)return;const r=viewport.getBoundingClientRect();
  $('map-tooltip').textContent=state.layer==='geopolitical'?nameOf(ownerOf(name)):name;
  $('map-tooltip').style.left=`${Math.max(5,Math.min(e.clientX-r.left+14,r.width-180))}px`;$('map-tooltip').style.top=`${Math.min(e.clientY-r.top+16,r.height-32)}px`;
});
viewport.addEventListener('pointerup',e=>{if(!dragging)return;dragging=null;viewport.releasePointerCapture(e.pointerId);if(!moved){const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-region]');if(target){const name=target.dataset.region;state.selected=name;if(state.layer==='geopolitical'&&factionById(ownerOf(name)))selectFaction(ownerOf(name));else selectRegion(name);}}});
viewport.addEventListener('pointercancel',()=>dragging=null);viewport.addEventListener('pointerleave',()=>$('map-tooltip').hidden=true);
viewport.addEventListener('keydown',e=>{if(e.key==='+'||e.key==='=')zoomBy(1.3);if(e.key==='-')zoomBy(1/1.3);if(e.key==='Home')fit();});
new ResizeObserver(()=>{if(metadata)fit();}).observe(viewport);

try{
  const urls=['../../assets/azhora-world-map.json','../../assets/campaign-factions.json','../../assets/azhora-world-map.svg'];
  const [data,roster,source]=await Promise.all(urls.map(async(url,i)=>{const r=await fetch(url);if(!r.ok)throw Error(`Could not load ${url}`);return i===2?r.text():r.json();}));
  metadata=data;factions=roster;data.regions.forEach(r=>regions.set(r.name,r));
  const parsed=new DOMParser().parseFromString(source,'image/svg+xml');if(parsed.querySelector('parsererror'))throw Error('Invalid atlas SVG');
  svg=document.importNode(parsed.documentElement,true);svg.removeAttribute('role');svg.removeAttribute('aria-labelledby');
  // Let the atlas's water blend into the viewport instead of showing a rectangular paper edge.
  for(const child of [...svg.children])if(child.tagName==='rect')child.remove();
  const originals=[...parsed.querySelectorAll('#region-tints [data-region]')];originals.forEach(p=>cellsByRegion.set(p.dataset.region,parseCells(p.getAttribute('d'))));
  svg.querySelector('#unbuilt-regions')?.remove();svg.querySelector('#region-tints')?.remove();svg.querySelector('#ornaments')?.remove();
  const pattern=document.createElementNS(NS,'pattern');pattern.id='disputed-hatch';pattern.setAttribute('width','18');pattern.setAttribute('height','18');pattern.setAttribute('patternUnits','userSpaceOnUse');pattern.innerHTML='<rect width="18" height="18" fill="#c8c1ab"/><path d="M0 18L18 0" stroke="#958e7c" stroke-width="3" opacity=".6"/>';svg.querySelector('defs').append(pattern);
  countryLayer=document.createElementNS(NS,'g');countryLayer.id='countries';svg.insertBefore(countryLayer,svg.querySelector('#region-labels'));
  const hitLayer=document.createElementNS(NS,'g');hitLayer.id='campaign-overlays';
  for(const p of originals){const hit=document.importNode(p,true);hit.classList.add('hit');hitLayer.append(hit);}
  svg.insertBefore(hitLayer,svg.querySelector('#region-labels'));paths=[...hitLayer.children];
  $('map-canvas').style.width=`${data.width}px`;$('map-canvas').style.height=`${data.height}px`;$('map-canvas').append(svg);
  const rs=[...regions.values()],bx=Math.min(...rs.map(r=>r.x))-65,by=Math.min(...rs.map(r=>r.y))-45;
  bounds={x:bx,y:by,width:Math.max(...rs.map(r=>r.x+r.width))+65-bx,height:Math.max(...rs.map(r=>r.y+r.height))+45-by};
  buildGroups();fit();render();$('loading').hidden=true;
  window.campaignUIPreview={ready:true,getState:()=>({...state,regionCount:regions.size,zoom:scale/fitScale}),selectRegion,selectFaction,openChapter,setSnapshot,ownerOf,getTerritory:id=>groups.get(id),fit};
}catch(error){$('loading').textContent=`The map could not load: ${error.message}. Launch with Open campaign UI.cmd.`;console.error(error);}
