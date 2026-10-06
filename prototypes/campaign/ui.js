// Interface fixture only. No game simulation, persistence, save access or battle resolver.
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const NS = 'http://www.w3.org/2000/svg';
const stages = [
  {name:'An uneasy beginning', short:'Opening', date:'Day 1', events:[['Isareos','A prince arrives in Minora','Wilhelm appears to reinforce Cedric’s captured government.'],['East Lotharn Mountains','Imperial authority fractures','The Lotharn regions are in open rebellion.']]},
  {name:'The northern roads fall silent', short:'Northern pressure', date:'Day 18', events:[['East Witherst','A community is lost','Undead now hold the eastern road. The grain quest is no longer available.'],['North Riesov','A request for distant aid','Survivors ask the neighboring kingdoms to intervene.']]},
  {name:'Allegiances brought to light', short:'Revelations', date:'Day 64', events:[['Eshtor Plateau','The duke’s allegiance exposed','Sample hero evidence connects the Citadel to Thalmagar.'],['North Gorgi Mountains','A hidden muster','Reports expose North Gorgi’s vassalage and a growing invasion army.'],['Isareos','The Blood Prince unmasked','Wilhelm’s undead nature and true allegiance become known.']]},
  {name:'The southern offensive', short:'Invasion', date:'Day 180', events:[['Acor Wetlands','The main host turns south','In this example, the northern corridor has fallen to Thalmagar’s allies.'],['Yunethre','Fighting on the approach','An ongoing battle appears on the map. Inspect its hero-mode handoff.']]},
  {name:'A world beyond the crisis', short:'Aftermath', date:'Year 2 · Day 40', events:[['North Riesov','The northern bridge reopens','A relief convoy restores a route between surviving communities.'],['Elagos','The coalition meets in Ambron','Former allies negotiate reconstruction and their future obligations.'],['East Witherst','The losses remain','Liberation has not restored the people lost to undeath.']]},
];
const state = {stage:0, mode:'campaign', layer:'realms', tab:'region', selected:'Isareos', author:false, playing:false, notes:'', draft:null, islandOutcome:null};
let metadata, factions, svg, regionPaths, markerLayer, scale=1, fitScale=1, x=0, y=0, dragging=null, moved=false, timer=null, toastTimer;
const regions = new Map();
const imperial = new Set(['Elagos','Drent','Amod','Pueth','Luscia','Moros Plain','Vastos','Meneth','Peblos','East Lotharn Mountains','West Lotharn Mountains']);
const corridor = ['North Lond','West Lond','East Endevor','South Endevor','Acor Wetlands'];
const secretFactionIDs = new Set(['eshtor-undead','north-gorgi-goblins','wilhelm-undead']);
const revealed = () => state.author || state.stage >= 2;
const factionFor = name => factions.find(f => [...(f.regions || []),...(f.proposedRegions || [])].includes(name));
function publicName(f) {
  if(!f)return 'Unassigned in this draft';
  if(f.id==='eshtor-undead'&&!revealed())return 'Ganun · the duke’s claim';
  if(f.id==='wilhelm-undead')return revealed()?'Blood Prince’s undead faction':'Wilhelm’s island holdings';
  return f.name.replace(' (working name)','');
}
const colors = ['#538879','#c19857','#879e61','#a86f65','#7797ac','#a296b1','#ad956f','#83a1a1'];
function realmColor(name) {
  const f=factionFor(name); if (!f) return '#a9b39b';
  if(f.id==='wilhelm-undead') return revealed() ? '#8c6488' : '#7797ac';
  if (f.id==='eshtor-undead') return revealed() ? '#79628a' : '#7797ac';
  if (imperial.has(name)) return '#b97357';
  if (/gorgi|orgmala/.test(f.id)) return '#708343';
  if (/lond/.test(f.id)) return '#708fab';
  if (f.id==='minoran-league' || /independence/.test(f.id)) return '#bea556';
  if (f.id==='thalmagars-empire') return '#777083';
  return colors[factions.indexOf(f)%colors.length];
}
function status(name) {
  if(name.includes('Ithzel')) return state.islandOutcome ? [state.islandOutcome==='human'?'Human restoration · sample':'Western faction victory · sample','warn'] : ['Island restoration war','danger'];
  if (name==='East Witherst' && state.stage>=1) return state.stage===4 ? ['Scarred by the war','warn'] : ['Undead occupation','danger'];
  if (state.stage===3 && corridor.includes(name)) return ['Occupied corridor','danger'];
  if (/Lotharn/.test(name)) return ['Open rebellion','danger'];
  if (name==='Acor Wetlands') return ['Three-way dispute','warn'];
  if (name==='Isareos') return [state.stage>=2 ? 'Wilhelm holds Minora' : 'Captured government','warn'];
  if (['Caricas','Nethereum','Ovesos','Nesdor'].includes(name)) return ['Independence rebellion','danger'];
  if (imperial.has(name)) return ['Elagos','Drent'].includes(name) ? ['Stable',''] : ['Destabilized','warn'];
  if (name==='Eshtor Plateau') return [revealed() ? 'Undead stronghold' : 'Troubling reports','warn'];
  return ['No local assessment',''];
}
function controller(name) {
  if(name.includes('Ithzel')) return state.islandOutcome ? (state.islandOutcome==='human'?'Returned Lower King · sample victory':'Wilhelm’s island faction · sample victory') : name==='East Ithzel'?'Returned human Lower King':'Wilhelm’s remaining western garrison';
  if (name==='East Witherst' && state.stage>=1) return state.stage===4 ? 'Surviving local council · sample' : 'Forces from the Forsaken Citadel';
  if (state.stage===3 && corridor.includes(name)) return 'Thalmagar’s allied forces · sample';
  if (name==='Isareos') return state.stage>=2 ? 'Wilhelm in Minora; countryside unresolved' : 'Cedric in Minora; countryside unresolved';
  if (/Lotharn/.test(name)) return 'Rebel holdings; exact control unresolved';
  if (name==='Acor Wetlands') return 'Disputed · no sole controller assigned';
  if (name==='Eshtor Plateau') return revealed() ? 'The undead duke at the Forsaken Citadel' : 'The duke’s administration';
  return ['Elagos','Drent'].includes(name) ? 'Ambroni government' : 'Local holdings not yet specified';
}
function allegiance(f) {
  if (!f) return 'Not yet specified';
  if (secretFactionIDs.has(f.id) && revealed()) return 'Vassal of Thalmagar · concealed at the opening';
  if (f.id==='eshtor-undead') return 'Publicly claims to serve Ganun';
  if (f.id==='wilhelm-undead') return 'Ruled by Prince Wilhelm; superior unconfirmed';
  if (/gorgi|orgmala/.test(f.id)) return 'Independent Goblinland member · three loosely allied neighbors';
  if (['ambroni-empire','mithala','celder'].includes(f.id)) return 'Nominal vassal of the Stone Fist; effectively autonomous';
  if (['witherst','riesov','ganun','endevor','thoth','nonoth','orse','ithzel'].includes(f.id)) return 'Lower kingdom of the Stone Fist';
  if (/baldro/.test(f.id)) return 'Independent dwarf state · northern peace agreements';
  if (f.id==='minoran-league') return 'Recent league; its government has been seized';
  return 'Independent political actor';
}
function badge(name) {const [label,kind]=status(name);return `<span class="badge ${kind}">${esc(label)}</span>`;}
const fact=(label,value)=>`<div class="fact"><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`;
function toast(message) {clearTimeout(toastTimer);$('toast').textContent=message;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,3800);}
function showDialog(html) {if(state.playing){pause();render();}$('dialog-body').innerHTML=html;if(!$('dialog').open)$('dialog').showModal();}
function download(filename,content,type='application/json') {const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast(`${filename} exported`);}
function selectRegion(name,{focus=false}={}) {if(!regions.has(name))return;state.selected=name;state.tab='region';render();if(focus)focusRegion(name);}
function selectButtons(selector,attribute,value) {document.querySelectorAll(selector).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset[attribute]===value)));}
function render() {
  selectButtons('[data-mode]','mode',state.mode);selectButtons('[data-layer]','layer',state.layer);selectButtons('[data-tab]','tab',state.tab);
  $('world-date').textContent=stages[state.stage].date;
  $('clock-status').textContent=state.playing?'Playing sample events':state.mode==='observe'?'Observer · paused':'Paused · sample snapshot';
  $('play').textContent=state.playing?'Ⅱ':'▶';$('play').setAttribute('aria-label',state.playing?'Pause sample events':'Play sample events');
  $('advance').disabled=state.stage===stages.length-1;$('play').disabled=state.stage===stages.length-1;
  $('chapter-title').textContent=stages[state.stage].name;
  $('map-caption').textContent={realms:'Claims and allegiances',control:'Who holds the ground',unrest:'Instability and open conflict'}[state.layer];
  $('knowledge-note').textContent=state.author?'Author truth · not the hero’s discoveries':state.stage>=2?'Includes discoveries in this sample chapter.':'Showing the traveler’s information.';
  $('chapter-rail').innerHTML=stages.map((s,i)=>`<button data-stage="${i}" aria-pressed="${i===state.stage}">${s.short}<small>${s.date}</small></button>`).join('');
  $('event-feed').innerHTML=stages[state.stage].events.map(([region,title,detail])=>`<button class="event" data-region="${esc(region)}"><small>${esc(region)}</small><strong>${esc(title)}</strong><p>${esc(detail)}</p></button>`).join('');
  renderMap();renderDetails();
}
function renderMap() {
  if(!regionPaths)return;
  for(const path of regionPaths) {
    const name=path.dataset.region;const kind=status(name)[1];
    let fill=realmColor(name), opacity=.23;
    if(state.layer==='unrest'){fill=kind==='danger'?'#ba654d':kind==='warn'?'#c59b48':'#7a9670';opacity=kind ? .34 : .08;}
    if(state.layer==='control') {opacity=.12;if(name==='East Witherst'&&state.stage>=1){fill='#766080';opacity=.45;}if(state.stage===3&&corridor.includes(name)){fill='#866680';opacity=.43;}if(/Lotharn/.test(name)){fill='#b77748';opacity=.32;}}
    if(state.layer==='control'&&name.includes('Ithzel')){fill=(state.islandOutcome==='human'||(!state.islandOutcome&&name==='East Ithzel'))?'#608aad':revealed()?'#8c6488':'#b47b68';opacity=.43;}
    if(name===state.selected)opacity=.62;
    path.setAttribute('fill',fill);path.setAttribute('fill-opacity',opacity);
    path.setAttribute('aria-label',name);
  }
  const legends=state.layer==='realms' ? [['#b97357','Ambroni claims'],['#708fab','Lond and northern crowns'],['#708343','Goblinland · 4 independent allies'],['#bea556','League and secessions']] : state.layer==='unrest' ? [['#ba654d','Open conflict / occupation'],['#c59b48','Instability / disputed claims'],['#7a9670','No active conflict shown']] : [['#866680','Sample occupation'],['#b77748','Rebel-held areas'],['#a9b39b','Claim ≠ local control']];
  $('legend').innerHTML=`<span class="eyebrow">${state.layer==='realms'?'SELECTED REALMS':'MAP KEY'}</span>`+legends.map(([color,label])=>`<div class="legend-row"><i class="swatch" style="--swatch:${color}"></i>${label}</div>`).join('');
  markerLayer.replaceChildren();
  const marks=[['Elagos','♜','Ambron'],['Isareos','♜','Minora · your hero']];
  if(state.stage>=1)marks.push(['East Witherst','⚑',state.stage===4?'Lost community':'Northern front']);
  if(state.stage===3)marks.push(['Acor Wetlands','⚑','Main host'],['Yunethre','⚔','Ongoing battle']);
  if(state.stage===4)marks.push(['North Riesov','⚑','Relief convoy']);
  for(const [name,symbol,label] of marks){const r=regions.get(name);const g=document.createElementNS(NS,'g');g.dataset.region=name;g.setAttribute('transform',`translate(${r.centerX} ${r.centerY-22})`);const t=document.createElementNS(NS,'text');t.textContent=symbol;t.setAttribute('class','marker');t.setAttribute('text-anchor','middle');const l=document.createElementNS(NS,'text');l.textContent=label;l.setAttribute('class','marker-label');l.setAttribute('y','24');l.setAttribute('text-anchor','middle');g.append(t,l);markerLayer.append(g);}
}
function renderDetails() {
  const name=state.selected,f=factionFor(name);
  if(state.mode==='hero') {
    $('detail-content').innerHTML=`<span class="eyebrow">HERO VIEW · INTERFACE PREVIEW</span><h2 class="region-title" style="margin-top:12px">One life in<br>a changing world</h2><div class="hero-portrait" aria-hidden="true">♙</div><p class="region-subtitle">Your traveler starts in Minora and remains there while you inspect the campaign.</p><dl class="facts">${fact('Location','Minora · Isareos')}${fact('World date',stages[state.stage].date)}${fact('Campaign','Same world and event history')}</dl><div class="detail-section"><h3>Beyond this room</h3><p>${state.stage===3?'The southern invasion continues. Visiting a live battle would place you in its current state.':'Wars, journeys and political decisions continue around your character.'}</p></div><button class="primary" data-action="hero-handoff">Preview entering a battle</button><div class="notice">This tests the mode-switch interface. The 3D hero scene and battle loading are not part of this prototype.</div>`;return;
  }
  if(state.tab==='factions') {
    $('detail-content').innerHTML=`<span class="eyebrow">POLITICAL LANDSCAPE</span><h2 class="region-title" style="margin-top:10px">Factions</h2><p class="region-subtitle">${factions.length} actors. Goblinland groups four independent allies.</p>`+factions.map(f=>`<button class="faction-row" data-faction="${esc(f.id)}"><span>${esc(publicName(f))}</span><small>${esc((f.regions?.length?f.regions:f.proposedRegions||[]).join(' · ')||'No territory assigned')}</small></button>`).join('');return;
  }
  if(state.tab==='quests') {
    const lost=state.stage>=1;
    $('detail-content').innerHTML=`<span class="eyebrow">PEOPLE IN THE CAMPAIGN</span><h2 class="region-title" style="margin-top:10px">Opportunities</h2><p class="region-subtitle">Sample silver quests tied to living communities.</p><div class="detail-card"><strong>The Missing Winter Grain</strong><span class="badge ${lost?'danger':''}">${lost?'Lost · community transformed':'Available · East Witherst'}</span><small style="margin-top:9px">${lost?'The former giver became hostile undead. Liberation does not automatically reopen this quest.':'An overdue grain convoy leaves a community short of supplies.'}</small><button data-region="East Witherst">Locate on map →</button></div><div class="detail-card"><strong>A Hearing for the North</strong><span class="badge">${state.stage===0?'Not yet available':'Available · request distant aid'}</span><small>Turn eyewitness reports into practical help from another court.</small><button data-region="North Riesov">Locate on map →</button></div><div class="detail-card"><strong>The price of allegiance</strong><small>Southern rebel and monarchist disputes can build support for your chosen faction.</small><button data-region="Amod">Explore Amod →</button></div><div class="detail-card"><strong>The Divided Island</strong><span class="badge warn">Available - Ithzel</span><small>The returned Lower King contests Wilhelm's western holdings. Intervention can tip a roughly balanced war.</small><button data-region="West Ithzel">Inspect the island</button></div><div class="notice">Availability changes at scripted sample snapshots. These quests are not playable here.</div>`;return;
  }
  const isSecret=secretFactionIDs.has(f?.id);
  let specific='Select a political layer to compare nominal claims with what is happening on the ground.';
  if(name==='Elagos')specific='Ambron is the constitutional seat of Willard. The Empire honors its northern oath, although it is stronger than Lond and effectively autonomous.';
  if(name==='Acor Wetlands')specific='Acreland, Endevor and Thalmagar dispute this region. No sole starting controller is assigned.';
  if(name==='Eshtor Plateau')specific=revealed()?'The Forsaken Citadel is the seat of an undead duke who secretly serves Thalmagar. His North Ganun title does not put the Citadel there.':'An outlying duke claims the ancient Forsaken Citadel for Ganun. Reports from nearby communities are troubling and incomplete.';
  if(/gorgi|orgmala/.test(f?.id||''))specific=f.id==='north-gorgi-goblins'&&revealed()?'North Gorgi is preparing Thalmagar’s powerful later invasion army. Its three confederates are not automatically his vassals.':'One of four independent Goblinland allies. Periodic raids threaten wealthy Lond, but the confederation coordinates little.';
  if(name==='Isareos')specific=revealed()?'Wilhelm is undead and secretly serves Thalmagar. If his faction still holds Minora when the invasion arrives, the city can be an allied rendezvous.':'Cedric seized Minora’s government by infiltration. Wilhelm has just arrived, apparently to reinforce him. The four League members are rebelling separately.';
  if(name==='East Witherst')specific=state.stage>=1?'A once-living community has been lost. The original grain quest is unavailable even in the aftermath.':'One of the first communities threatened by the duke’s expansion. Early intervention could preserve people and future allies.';
  if(name.includes('Ithzel'))specific=revealed()?'Wilhelm formerly controlled the whole island. Since his army departed, the returned human king holds the east against the western undead. The conflict is roughly 50/50; Eshtor’s undead are stronger. An undead victory could threaten Ganun sooner.':'Wilhelm left the island with his main army. The returned human Lower King is reclaiming the east while the prince’s remaining forces hold the west. The balance is roughly 50/50, with reports of undead influence to investigate.';
  const modeNotice=state.mode==='observe'?'<div class="notice">Observer preview · sample factions advance when you press Play. No orders or autonomous simulation are running.</div>':'';
  $('detail-content').innerHTML=`<div class="region-kicker"><i class="swatch" style="--swatch:${realmColor(name)}"></i>${esc(publicName(f))}</div><h2 class="region-title">${esc(name)}</h2><p class="region-subtitle">${name==='Elagos'?'Ambron · seat of the constitutional crown':name==='Isareos'?'Minora · seat of the captured League':'A region in the shared campaign world'}</p>${badge(name)}<dl class="facts">${fact('Claim',publicName(f))}${fact('Control',controller(name))}${fact('Allegiance',allegiance(f))}</dl><div class="detail-section"><h3>${isSecret&&revealed()?'Behind the public claim':'The situation'}</h3><p>${esc(specific)}</p></div>${name==='Yunethre'&&state.stage===3?'<button class="primary" data-action="hero-handoff">Inspect ongoing battle →</button>':'<button class="primary" data-action="focus">Focus this region</button>'}<button class="secondary-action" data-action="aid">Preview a request for aid</button><div class="detail-section"><h3>Nearby stories</h3><button class="text-link" data-action="quests">View sample quest opportunities →</button></div>${state.draft?.region===name?`<div class="detail-card"><strong>Draft request · preview only</strong><small>${esc(state.draft.type)} for ${esc(name)}. No order was sent.</small></div>`:''}${modeNotice}`;
  if(name.includes('Ithzel'))$('detail-content').insertAdjacentHTML('beforeend',`<div class="detail-section"><h3>The divided island</h3><p>Preview either outcome. These buttons select sample UI states; no battle is being resolved.</p><button class="secondary-action" data-island="human">Preview human victory</button><button class="secondary-action" data-island="undead">Preview western faction victory</button><button class="secondary-action" data-island="reset">Restore the divided island</button></div>`);
}
function applyTransform() {document.querySelector('.atlas-heading').hidden=scale/fitScale>1.6;$('map-canvas').style.transform=`translate(${x}px,${y}px) scale(${scale})`;$('zoom-label').textContent=`${Math.round(scale/fitScale*100)}%`;}
function fit() {if(!metadata)return;const v=$('map-viewport');fitScale=Math.min((v.clientWidth-40)/metadata.width,(v.clientHeight-40)/metadata.height);scale=fitScale;x=(v.clientWidth-metadata.width*scale)/2;y=(v.clientHeight-metadata.height*scale)/2;applyTransform();}
function focusRegion(name,zoom=3) {const r=regions.get(name),v=$('map-viewport');if(!r)return;scale=Math.max(fitScale*zoom,Math.min(v.clientWidth/(r.width*3),v.clientHeight/(r.height*3)));scale=Math.min(scale,fitScale*14);x=v.clientWidth/2-r.centerX*scale;y=v.clientHeight/2-r.centerY*scale;applyTransform();}
function zoomBy(factor,cx=$('map-viewport').clientWidth/2,cy=$('map-viewport').clientHeight/2){const next=Math.min(fitScale*18,Math.max(fitScale*.7,scale*factor));x=cx-(cx-x)*next/scale;y=cy-(cy-y)*next/scale;scale=next;applyTransform();}
function pause(){clearInterval(timer);timer=null;state.playing=false;}
function goStage(index,{automatic=false}={}) {if(!automatic)pause();state.stage=Math.max(0,Math.min(stages.length-1,index));if(state.stage===stages.length-1)pause();render();}
function battlePreview(){showDialog(`<span class="eyebrow">HERO HANDOFF · UI MOCKUP</span><h2>Enter the fighting</h2><p>The battle in Yunethre has already been underway. The interface would show its current losses, surviving forces and your physical approach.</p><div class="detail-card"><strong>Traveler remains in Minora</strong><small>Looking at this battle does not teleport the hero. You would need to walk, ride or fly to its actual location.</small></div><p>In the game, arrival would load the ongoing battle at its current state. This prototype previews that information panel only.</p><button class="primary" id="return-map">Return to campaign map</button>`);$('return-map').onclick=()=>{$('dialog').close();state.mode='campaign';selectRegion('Yunethre',{focus:true});};}
function guide(){showDialog(`<span class="eyebrow">A FIVE-MINUTE UI WALKTHROUGH</span><h2>Try the campaign interface</h2><ol><li><b>Explore the atlas.</b> Drag, scroll to zoom, or search for a region. Click it to inspect its claims and local control.</li><li><b>Compare layers.</b> Try Realms, Control and Unrest. Use Northern front to inspect Witherst and the Citadel.</li><li><b>Advance the sample story.</b> Press Next event. Open Quests to see a northern opportunity disappear.</li><li><b>Test secrets.</b> At Opening, inspect North Gorgi or Eshtor. Toggle Author knowledge, then turn it off. Revelations supplies a later discovered view.</li><li><b>Switch perspectives.</b> Hero previews your character’s place in the world; Observe lets sample events play. Both keep the current date.</li><li><b>Inspect Ithzel.</b> Use Ithzel conflict to compare the human east with Wilhelm's western holdings and preview either outcome.</li><li><b>Read the aftermath.</b> Choose Aftermath, then export the chronicle or leave interface feedback.</li></ol><p>All dates, force locations and later outcomes are illustrative. Reset demo returns to the initial interface state.</p><button class="primary" id="start-guide">Start exploring</button>`);$('start-guide').onclick=()=>$('dialog').close();}
function feedback(){showDialog(`<span class="eyebrow">YOUR FEEDBACK</span><h2>What should change?</h2><p>Consider map readability, panel space, finding factions, understanding time, and what you expected a control to do.</p><label for="feedback-text">Notes about this interface</label><textarea id="feedback-text" placeholder="I expected… / I couldn’t find… / Keep this…">${esc(state.notes)}</textarea><button class="primary" id="download-feedback">Export feedback</button><p style="font-size:11px;margin-top:9px">Includes the selected region, chapter and view. Kept in this session until you export; nothing is sent.</p>`);$('feedback-text').oninput=e=>state.notes=e.target.value;$('download-feedback').onclick=()=>download('azhora-ui-feedback.json',JSON.stringify({prototype:'campaign-ui-v1',chapter:stages[state.stage].name,region:state.selected,mode:state.mode,layer:state.layer,notes:state.notes},null,2));}
function aidPreview(){showDialog(`<span class="eyebrow">DIPLOMACY · INTERACTION PREVIEW</span><h2>Request aid for ${esc(state.selected)}</h2><p>A commitment would specify real support, its source and when it could arrive.</p><label for="aid-type">Proposed support</label><select id="aid-type"><option>Grain and relief supplies</option><option>A defensive company</option><option>Safe passage for refugees</option></select><button class="primary" id="draft-aid">Keep a sample draft</button><p style="font-size:11px;margin-top:10px">UI preview only. This does not recruit troops or send a diplomatic order.</p>`);$('draft-aid').onclick=()=>{state.draft={region:state.selected,type:$('aid-type').value};$('dialog').close();renderDetails();toast('Sample draft added to the region panel');};}

document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.mode){state.mode=b.dataset.mode;render();}
  if(b.dataset.island){state.islandOutcome=b.dataset.island==='reset'?null:b.dataset.island;state.layer='control';render();toast('Island outcome preview updated · no simulation ran');}
  if(b.dataset.layer){state.layer=b.dataset.layer;render();}
  if(b.dataset.tab){state.tab=b.dataset.tab;state.mode=state.mode==='hero'?'campaign':state.mode;render();}
  if(b.dataset.stage!==undefined)goStage(Number(b.dataset.stage));
  if(b.dataset.region){selectRegion(b.dataset.region,{focus:true});$('search-results').hidden=true;}
  if(b.dataset.faction){const f=factions.find(f=>f.id===b.dataset.faction);const name=(f.regions?.length?f.regions:f.proposedRegions||[])[0];if(name)selectRegion(name,{focus:true});else toast('This actor has no assigned region in the design fixture.');}
  if(b.dataset.action==='focus')focusRegion(state.selected);
  if(b.dataset.action==='quests'){state.tab='quests';render();}
  if(b.dataset.action==='hero-handoff')battlePreview();
  if(b.dataset.action==='aid')aidPreview();
});
$('advance').onclick=()=>goStage(state.stage+1);
$('play').onclick=()=>{if(state.playing)pause();else{state.playing=true;timer=setInterval(()=>goStage(state.stage+1,{automatic:true}),6000);}render();};
$('author-view').onchange=e=>{state.author=e.target.checked;render();};
$('fit').onclick=fit;$('focus-north').onclick=()=>{selectRegion('East Witherst');focusRegion('East Witherst',4);};
$('focus-island').onclick=()=>{selectRegion('West Ithzel');focusRegion('West Ithzel',4);};
$('zoom-in').onclick=()=>zoomBy(1.5);$('zoom-out').onclick=()=>zoomBy(1/1.5);
$('test-guide').onclick=guide;$('feedback').onclick=feedback;
$('export').onclick=()=>{const lines=['# Azhora — prototype chronicle','', 'Scripted UI examples, not a recorded game simulation.',`Knowledge scope: ${state.author?'author':'traveler'}`,''];for(let i=0;i<=state.stage;i++){lines.push(`## ${stages[i].date} — ${stages[i].name}`,'');for(const [r,title,detail]of stages[i].events)lines.push(`- **${title}** (${r}): ${detail}`);lines.push('');}download('azhora-sample-chronicle.md',lines.join('\n'),'text/markdown');};
$('reset').onclick=()=>{pause();Object.assign(state,{stage:0,mode:'campaign',layer:'realms',tab:'region',selected:'Isareos',author:false,draft:null, islandOutcome:null});$('author-view').checked=false;$('search').value='';$('search-results').hidden=true;render();fit();toast('Opening restored · feedback notes retained in this session');};
$('toggle-chronicle').onclick=()=>{const collapsed=document.querySelector('.chronicle').classList.toggle('collapsed');$('toggle-chronicle').setAttribute('aria-expanded',String(!collapsed));$('toggle-chronicle').setAttribute('aria-label',collapsed?'Expand chronicle':'Collapse chronicle');$('toggle-chronicle').textContent=collapsed?'⌃':'⌄';};
$('search').oninput=()=>{const query=$('search').value.trim().toLowerCase();const matches=[...regions.keys()].filter(n=>n.toLowerCase().includes(query)).slice(0,9);$('search-results').hidden=!query;$('search-results').innerHTML=matches.length?matches.map(n=>`<button data-region="${esc(n)}">${esc(n)}</button>`).join(''):'<p style="padding:12px">No matching region</p>';};
$('search').onkeydown=e=>{if(e.key==='Escape')$('search-results').hidden=true;if(e.key==='Enter'){e.preventDefault();$('search-results').querySelector('button')?.click();}if(e.key==='ArrowDown'){e.preventDefault();$('search-results').querySelector('button')?.focus();}};
document.addEventListener('keydown',e=>{if(e.key==='Escape')$('search-results').hidden=true;if(e.code==='Space'&&!$('dialog').open&&!/INPUT|TEXTAREA|SELECT|BUTTON/.test(e.target.tagName)){e.preventDefault();if(!$('play').disabled)$('play').click();}});
const viewport=$('map-viewport');
viewport.addEventListener('wheel',e=>{e.preventDefault();const rect=viewport.getBoundingClientRect();zoomBy(Math.exp(-e.deltaY*.0015),e.clientX-rect.left,e.clientY-rect.top);},{passive:false});
viewport.addEventListener('pointerdown',e=>{if(e.button!==0)return;dragging={cx:e.clientX,cy:e.clientY,x,y};moved=false;viewport.setPointerCapture(e.pointerId);});
viewport.addEventListener('pointermove',e=>{if(dragging){const dx=e.clientX-dragging.cx,dy=e.clientY-dragging.cy;if(Math.hypot(dx,dy)>4)moved=true;x=dragging.x+dx;y=dragging.y+dy;applyTransform();$('map-tooltip').hidden=true;}else{const region=e.target.closest('[data-region]')?.dataset.region;if(region){const r=viewport.getBoundingClientRect();$('map-tooltip').textContent=region;$('map-tooltip').hidden=false;$('map-tooltip').style.left=`${Math.min(e.clientX-r.left+14,r.width-180)}px`;$('map-tooltip').style.top=`${e.clientY-r.top+18}px`;}else $('map-tooltip').hidden=true;}});
viewport.addEventListener('pointerup',e=>{if(!dragging)return;dragging=null;viewport.releasePointerCapture(e.pointerId);if(!moved){const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-region]');if(target)selectRegion(target.dataset.region);}});
viewport.addEventListener('pointercancel',()=>{dragging=null;});viewport.addEventListener('pointerleave',()=>$('map-tooltip').hidden=true);
viewport.addEventListener('keydown',e=>{if(e.key==='+'||e.key==='=')zoomBy(1.3);if(e.key==='-')zoomBy(1/1.3);if(e.key==='Home')fit();});
new ResizeObserver(()=>{if(metadata)fit();}).observe(viewport);

try {
  const requests=['../../assets/azhora-world-map.json','./factions.json','../../assets/azhora-world-map.svg'];
  const [mapData,factionData,source]=await Promise.all(requests.map(async(url,i)=>{const response=await fetch(url);if(!response.ok)throw Error(`Could not load ${url}`);return i===2?response.text():response.json();}));
  metadata=mapData;factions=factionData;metadata.regions.forEach(r=>regions.set(r.name,r));
  const parsed=new DOMParser().parseFromString(source,'image/svg+xml');if(parsed.querySelector('parsererror'))throw Error('Atlas SVG could not be read');
  svg=document.importNode(parsed.documentElement,true);svg.removeAttribute('role');svg.removeAttribute('aria-labelledby');svg.querySelector('#unbuilt-regions')?.remove();svg.querySelector('#region-tints')?.remove();
  const originalPaths=parsed.querySelectorAll('#region-tints [data-region]');const overlay=document.createElementNS(NS,'g');overlay.id='campaign-overlays';
  for(const original of originalPaths){const path=document.importNode(original,true);path.setAttribute('class','hit');path.setAttribute('fill-opacity','.2');overlay.append(path);}
  svg.insertBefore(overlay,svg.querySelector('#region-labels'));regionPaths=[...overlay.children];
  // The export's terrain and lettering remain intact; only UI overlays are added.
  markerLayer=document.createElementNS(NS,'g');svg.append(markerLayer);$('map-canvas').append(svg);$('loading').hidden=true;fit();render();
  window.campaignUIPreview={ready:true,getState:()=>({...state,regionCount:regions.size,zoom:scale/fitScale}),selectRegion,goStage};
} catch(error){$('loading').textContent=`The atlas could not load. Launch with “Open campaign UI.cmd”. ${error.message}`;console.error(error);}
