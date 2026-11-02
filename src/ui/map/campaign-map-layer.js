import {parseCells,unionCells,labelAnchor,visibleAnchor} from './campaign-map-geometry.js';
import {ownerOf,factionName,factionColor,stability,stabilityColors,chapterSnapshot,CHAPTER_REGIONS,publicProfiles} from './campaign-map-model.js';
import {escapeHTML as esc,factionHTML,chapterHTML} from './campaign-map-info.js';
import {cellKey,discoveredCells} from './campaign-map-discovery.js';
import {surroundingFactionHTML,nomadicPresenceHTML} from './surrounding-map-info.js';
import {createNomadicMapPresence} from './nomadic-map-presence.js';

// Alternate, read-only layers on the ordinary M map. No commands or simulation.
export function createCampaignMapLayer({viewport,onResize,onFocus,includeQuests=true,regionScope=null}){
  const root=document.getElementById('world-map'),toolbar=root.querySelector('.atlas-toolbar');
  let simulation=null,authoredFactions=[];
  let view='regions',snapshot='opening',factions=[],metadata,svg,groups=new Map(),originals=[],regionCells=new Map(),countryLayer;
  let selected='ambroni-empire',tab='factions',path=null,transform={scale:1,x:0,y:0},start=null;
  let reveal=false,knownCells=[],knownKeys=new Set(),knownRegions=new Set(),knowledgeStamp='',clip,chartedContent;
  const views=document.createElement('div');views.className='atlas-view-switch';views.setAttribute('role','group');views.setAttribute('aria-label','Map view');
  views.innerHTML=['regions','geopolitical','stability'].map(id=>`<button data-atlas-view="${id}" aria-pressed="${id===view}" disabled>${id[0].toUpperCase()+id.slice(1)}</button>`).join('');
  toolbar.before(views);
  const body=document.createElement('div');body.className='atlas-map-body';viewport.before(body);body.append(viewport);
  const aside=document.createElement('aside');aside.className='atlas-campaign-info';aside.setAttribute('aria-label','Political information');aside.hidden=true;
  aside.innerHTML='<nav aria-label="Campaign information"><button data-info-tab="factions" aria-pressed="true">Factions</button><button data-info-tab="quests" aria-pressed="false">Quests</button></nav><div class="atlas-campaign-content"></div>';
  body.append(aside);const content=aside.lastElementChild;
  const nomads=createNomadicMapPresence(viewport,id=>{selected=id;tab='presence';renderInfo();});
  if(!includeQuests)aside.querySelector('[data-info-tab="quests"]').remove();
  const labels=document.createElement('div');labels.id='atlas-country-labels';labels.hidden=true;viewport.append(labels);
  const key=document.createElement('div');key.id='atlas-stability-key';key.hidden=true;key.innerHTML=Object.entries(stabilityColors).map(([id,color])=>`<span><i style="background:${color}"></i>${({stable:'Stable',unstable:'Unstable',conflict:'Conflict',unknown:'Unassessed'})[id]}</span>`).join('');viewport.append(key);
  const territories=id=>['yunethre-free-state','yunethre-centaurs'].includes(id)?(knownRegions.has('Yunethre')?['Yunethre']:[]):groups.get(id)?.regions||[];
  const name=id=>id?.startsWith('charted:')?id.slice(8):simulation?(id==='unassigned'?'Outside scenario':factions.find(f=>f.id===id)?.short??id):factionName(id,factions);
  const reference=()=>simulation?.reference;
  const refFaction=id=>reference()?.factions.find(f=>f.id===id);
  const knownPresences=()=>reference()?.presences.filter(p=>knownRegions.has(p.region))??[];
  const owner=region=>simulation?simulation.regions[region]?.owner??reference()?.regions[region]?.owner??`charted:${region}`:ownerOf(region,factions,snapshot);
  const condition=region=>simulation?simulation.regions[region]?.condition??reference()?.regions[region]?.condition??['Charted from the Guild lookout; outside the playable scenario','unknown']:stability(region,snapshot);
  const color=id=>simulation?factions.find(f=>f.id===id)?.color??'#c4c8b8':factionColor(id,factions);
  const knownClaim=id=>!simulation&&factions.some(f=>f.id===id&&!f.hidden&&f.disputedRegions?.some(r=>knownRegions.has(r)));
  function renderInfo(){
    aside.querySelectorAll('[data-info-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.infoTab===tab)));
    if(includeQuests&&tab==='quests'){content.innerHTML=chapterHTML(path,snapshot,{preview:false});return;}
    if(tab==='presence'){
      const presence=knownPresences().find(p=>p.id===selected);
      if(presence){content.innerHTML=nomadicPresenceHTML(presence,reference()?.description);return;}
      selected=null;tab='factions';
    }
    if(tab==='region'){
      if(!knownRegions.has(selected)){content.innerHTML='<h2 class="title">Uncharted territory</h2><p>Explore this area to learn who controls it.</p>';return;}
      if(simulation&&!simulation.regions[selected]){
        const controller=refFaction(owner(selected));
        content.innerHTML=`<button class="text-button" id="back-factions">All factions</button><span class="eyebrow">Surrounding region</span><h2 class="title">${esc(selected)}</h2><p>${esc(condition(selected)[0])}</p>${controller?`<h3>${controller.kind==='disputed'?'Disputed claims':'Territorial control'}</h3><button class="text-button" data-faction="${controller.id}">${esc(controller.name)}</button>`:''}${knownPresences().filter(p=>p.region===selected).map(p=>`<p><button class="text-button" data-presence="${p.id}">${esc(p.name)} / nomadic presence</button></p>`).join('')}<p>${esc(reference()?.description??'Charted from the Guild lookout. This land is shown for reference, outside the five playable regions.')}</p>`;return;
      }
      const heldBy=owner(selected),[status]=condition(selected);
      const claimants=!simulation&&heldBy==='disputed'?factions.filter(f=>f.disputedRegions?.includes(selected)):[];
      const control=claimants.length?`<p>Disputed between ${claimants.map(f=>`<button class="text-button" data-faction="${f.id}">${esc(name(f.id))}</button>`).join(' and ')}. No sole region-wide control.</p>`:`<button class="text-button" data-faction="${heldBy}">${esc(name(heldBy))}</button>`;
      content.innerHTML=`<span class="eyebrow">Region</span><h2 class="title">${esc(selected)}</h2><p>${esc(status)}</p><div class="section"><h3>Territorial control</h3>${control}</div>${includeQuests&&CHAPTER_REGIONS.includes(selected)?'<div class="section"><button class="text-button" data-chapter="overview">Chapter 1 · The Border War →</button></div>':''}`;return;
    }
    if(selected?.startsWith('charted:')){
      content.innerHTML=`<button class="text-button" id="back-factions">All factions</button><span class="eyebrow">Surrounding country</span><h2 class="title">${esc(name(selected))}</h2><p>Charted from the Guild lookout. Taleth can tell you about this country on his tour.</p><p>This land is shown for reference; it is outside the five playable regions of this scenario.</p>`;return;
    }
    if(!selected||!reveal&&!territories(selected).length&&!knownClaim(selected)){
      const listed=factions.filter(f=>refFaction(f.id)?territories(f.id).length:reveal||territories(f.id).length||knownClaim(f.id));
      content.innerHTML='<span class="eyebrow">Discovered territory</span><h2 class="title">Factions</h2>'+(reference()&&listed.some(f=>refFaction(f.id))?'<p>Stripes: disputed control.<br>Tent: nomadic encampment.</p>':'')+listed.filter(f=>f.kind!=='disputed').map(f=>`<button class="faction-row" data-faction="${f.id}">${esc(name(f.id))}<small>${territories(f.id).length} ${refFaction(f.id)?'charted':'discovered'} regions</small></button>`).join('')+
        (listed.some(f=>f.kind==='disputed')?'<h3>Disputed territories</h3>'+listed.filter(f=>f.kind==='disputed').map(f=>`<button class="faction-row" data-faction="${f.id}">${esc(name(f.id))}<small>No secure controller</small></button>`).join(''):'')+
        (knownPresences().length?'<h3>Nomadic peoples</h3>'+knownPresences().map(p=>`<button class="faction-row" data-presence="${p.id}">${esc(p.name)}<small>${esc(p.region)} / encampment</small></button>`).join(''):'')+
        (simulation?[...groups.values()].filter(g=>g.id.startsWith('charted:')).map(g=>`<button class="faction-row" data-faction="${esc(g.id)}">${esc(name(g.id))}<small>Control not yet established</small></button>`).join(''):'');return;
    }
    if(refFaction(selected)){content.innerHTML=surroundingFactionHTML(refFaction(selected),reference(),territories(selected));return;}
    if(simulation){content.innerHTML=`<button class="text-button" id="back-factions">All factions</button><span class="eyebrow">Lizeemi War / ${esc(simulation.timeLabel??'Day '+simulation.day)}</span><h2 class="title">${esc(name(selected))}</h2><p>${selected==='minora'?'Neutral city-state.':'A league in the East-West War.'}</p><h3>${reveal?'Controlled':'Discovered'} regions</h3><ul>${territories(selected).map(n=>`<li><button class="text-button" data-region="${esc(n)}">${esc(n)}</button></li>`).join('')}</ul>`;return;}
    content.innerHTML=factionHTML(selected,{includeQuests,factions,territories:territories(selected),snapshot,limited:!reveal,knownRegions,relation:publicProfiles[selected]?.ties||'Only publicly established territory is shown here. Further diplomatic information is not yet specified.'});
  }
  function buildGroups(){
    groups=new Map();knownRegions=new Set();
    for(const [region,allCells] of regionCells){if(regionScope&&!regionScope.includes(region))continue;const cells=discoveredCells(allCells,knownKeys,reveal);if(!cells.length)continue;knownRegions.add(region);const id=owner(region);if(!groups.has(id))groups.set(id,{id,regions:[],cells:[]});groups.get(id).regions.push(region);groups.get(id).cells.push(...cells);}
    for(const group of groups.values()){Object.assign(group,unionCells(group.cells));group.anchor=labelAnchor(group.cells,group.loops);}
  }
  function renderLabels(){
    labels.replaceChildren();if(view!=='geopolitical')return;
    const taken=[];
    for(const group of [...groups.values()].sort((a,b)=>b.cells.length-a.cells.length)){
      if(['disputed','unassigned'].includes(group.id))continue;
      const anchor=visibleAnchor(group,{...transform,width:viewport.clientWidth,height:viewport.clientHeight});if(!anchor)continue;
      const x=transform.x+anchor.x*transform.scale,y=transform.y+anchor.y*transform.scale;
      if(x<0||y<0||x>viewport.clientWidth||y>viewport.clientHeight)continue;
      const label=document.createElement('span');label.dataset.faction=group.id;label.textContent=name(group.id);label.style.left=x+'px';label.style.top=y+'px';labels.append(label);
      const box=label.getBoundingClientRect();
      if(taken.some(b=>box.left<b.right+4&&box.right>b.left-4&&box.top<b.bottom+4&&box.bottom>b.top-4))label.hidden=true;else taken.push(box);
    }
  }
  function render(){
    if(!svg)return;
    svg.style.clipPath=regionScope?`path('${originals.filter(p=>regionScope.includes(p.dataset.region)).map(p=>p.getAttribute('d')).join('')}')`:'';
    chartedContent.setAttribute('clip-path',reveal?'none':'url(#atlas-campaign-discovered)');
    // Use the already-unioned discovered polygons, avoiding hairline holes at
    // every hex edge when a large lookout chart is shown without developer reveal.
    clip.replaceChildren();if(!reveal)for(const group of groups.values()){const p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d',group.path);clip.append(p);}
    const political=view==='geopolitical';
    svg.querySelector('#region-labels').style.display=political?'none':'';svg.querySelector('#region-boundaries').style.display=political?'none':'';
    svg.querySelector('#terrain').style.opacity=political?'.2':'1';svg.querySelector('#relief').style.opacity=political?'.1':'1';
    countryLayer.replaceChildren();countryLayer.style.display=political?'':'none';
    for(const group of groups.values()){
      const p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d',group.path);p.setAttribute('fill',color(group.id));p.classList.add('atlas-country');p.dataset.faction=group.id;p.setAttribute('vector-effect','non-scaling-stroke');countryLayer.append(p);
      if(refFaction(group.id)?.kind==='disputed'){p.setAttribute('fill','url(#atlas-disputed-hatch)');p.setAttribute('stroke-dasharray','5 3');}
    }
    for(const p of originals){const region=p.dataset.region;p.setAttribute('fill',political?'transparent':stabilityColors[condition(region)[1]]);p.setAttribute('fill-opacity',political?'0':'.6');p.dataset.owner=owner(region);}
    nomads.render(reference()?.presences??[],regionCells,knownRegions,knownKeys,reveal,cellKey,political);
    renderLabels();renderInfo();
  }
  function setView(next){
    if(!['regions','geopolitical','stability'].includes(next))return;
    view=next;root.dataset.campaignView=view;aside.hidden=view==='regions';labels.hidden=view!=='geopolitical';key.hidden=view!=='stability';
    views.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.atlasView===view)));
    render();onResize();
  }
  views.addEventListener('click',e=>{const b=e.target.closest('[data-atlas-view]');if(b)setView(b.dataset.atlasView);});
  aside.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.infoTab){tab=b.dataset.infoTab;selected=null;}
    if(b.id==='back-factions'){tab='factions';selected=null;}
    if(b.dataset.faction){tab='factions';selected=b.dataset.faction;}
    if(b.dataset.presence){tab='presence';selected=b.dataset.presence;}
    if(b.dataset.region){tab='region';selected=b.dataset.region;onFocus(selected);}
    if(b.dataset.chapter){tab='quests';path=b.dataset.chapter;}
    renderInfo();
  });
  viewport.addEventListener('pointerdown',e=>{start={x:e.clientX,y:e.clientY};});
  viewport.addEventListener('pointerup',e=>{
    if(view==='regions'||!start||e.target.closest('[data-presence]')||Math.hypot(e.clientX-start.x,e.clientY-start.y)>5)return;
    start=null;const region=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-campaign-region]')?.dataset.campaignRegion;if(!region||!knownRegions.has(region))return;
    if(view==='geopolitical'&&owner(region)!=='disputed'){tab='factions';selected=owner(region);}else{tab='region';selected=region;}
    renderInfo();
  });
  root.dataset.campaignView=view;
  return {
    async load(data,source){
      const response=await fetch('./assets/campaign-factions.json');if(!response.ok)throw Error('Campaign map roster missing');authoredFactions=await response.json();factions=simulation?[...simulation.factions,...(reference()?.factions??[])]:authoredFactions;metadata=data;
      svg=document.importNode(new DOMParser().parseFromString(source,'image/svg+xml').documentElement,true);svg.id='atlas-campaign-layer';
      svg.setAttribute('width',data.width);svg.setAttribute('height',data.height);svg.style.width=data.width+'px';svg.style.height=data.height+'px';
      const pattern=document.createElementNS('http://www.w3.org/2000/svg','pattern');pattern.id='atlas-disputed-hatch';pattern.setAttribute('width','8');pattern.setAttribute('height','8');pattern.setAttribute('patternUnits','userSpaceOnUse');pattern.innerHTML='<rect width="8" height="8" fill="#aaa18e"/><path d="M-2 2L2-2 M0 8L8 0 M6 10L10 6" stroke="#6e6251" stroke-width="1.4" opacity=".55"/>';svg.querySelector('defs').append(pattern);
      svg.querySelector('#unbuilt-regions')?.remove();svg.querySelector('#ornaments')?.remove();
      const tints=svg.querySelector('#region-tints');originals=[...tints.querySelectorAll('[data-region]')];
      tints.setAttribute('opacity','1');
      for(const p of originals){regionCells.set(p.dataset.region,parseCells(p.getAttribute('d')));p.dataset.campaignRegion=p.dataset.region;p.style.pointerEvents='all';}
      countryLayer=document.createElementNS('http://www.w3.org/2000/svg','g');svg.insertBefore(countryLayer,tints);svg.append(tints);
      clip=document.createElementNS('http://www.w3.org/2000/svg','clipPath');clip.id='atlas-campaign-discovered';clip.setAttribute('clipPathUnits','userSpaceOnUse');
      svg.querySelector('defs').append(clip);chartedContent=document.createElementNS('http://www.w3.org/2000/svg','g');chartedContent.id='atlas-discovered-content';
      for(const child of [...svg.children])if(!['defs','style','title','desc'].includes(child.tagName))chartedContent.append(child);
      svg.append(chartedContent);
      viewport.insertBefore(svg,viewport.firstChild);buildGroups();render();views.querySelectorAll('button').forEach(b=>b.disabled=false);
    },
    setView,
    setRegionScope(names){regionScope=names?[...names]:null;if(metadata){buildGroups();render();}},
    setSimulation(value){const changed=simulation?.id!==value?.id;simulation=value?JSON.parse(JSON.stringify(value)):null;factions=simulation?[...simulation.factions,...(reference()?.factions??[])]:authoredFactions;if(changed){selected=null;tab='factions';}if(metadata){buildGroups();render();}},
    setChapter(chapter,aftermath){const next=chapterSnapshot(chapter,aftermath);if(next===snapshot)return;snapshot=next;if(metadata){buildGroups();render();}},
    setKnowledge({cells=[],reveal:all=false}){const keys=cells.map(cellKey),stamp=JSON.stringify([!!all,keys]);if(stamp===knowledgeStamp)return;knowledgeStamp=stamp;reveal=!!all;knownCells=cells;knownKeys=new Set(keys);if(metadata){buildGroups();render();}},
    transform(scale,x,y){transform={scale,x,y};if(svg)svg.style.transform=`translate(${x}px,${y}px) scale(${scale})`;nomads.transform(transform);renderLabels();},
    state:()=>({view,snapshot,simulation:simulation?{id:simulation.id,day:simulation.day}:null,reveal,knownRegions:[...knownRegions],owner:region=>knownRegions.has(region)?owner(region):null,countries:groups.size,presences:nomads.state()}),
  };
}
