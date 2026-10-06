const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const colours = { empire:'#bb8545', imperial:'#bb8545', centaur:'#477e75', centaurs:'#477e75', yunethre:'#477e75', neutral:'#a5a98a', unknown:'#98998d' };
const colour = faction => colours[faction] ?? '#98998d';
const title = value => String(value ?? '').replace(/-/g,' ').replace(/^./,s=>s.toUpperCase());

/** The prototype has its own clock and ledger. Opening this view does not reveal
 * the traveler's chart or mutate the story campaign. All orders use the model. */
export function createStrategicPrototypeView({model,onClose=()=>{},onBattle=()=>{},save=()=>true,load=()=>false}={}) {
  const style=document.createElement('style');style.textContent=`
  .frontier-command{position:fixed;inset:3vh 3vw;z-index:180;background:#143c35;color:#eee4c5;border:1px solid #b9ad77;border-radius:9px;box-shadow:0 20px 90px #0009;display:flex;flex-direction:column;font:14px/1.45 system-ui,sans-serif;padding:23px;gap:14px;box-sizing:border-box}
  .frontier-command[hidden]{display:none}.frontier-command h2,.frontier-command h3{font-family:Georgia,serif;margin:0}.frontier-command h2{font-size:30px}.frontier-command h3{font-size:20px}.frontier-command p{margin:5px 0 10px}.frontier-command button,.frontier-command select{font:inherit;color:#eee4c5;background:#22483d;border:1px solid #728b73;padding:9px 12px;border-radius:3px;cursor:pointer}.frontier-command button:hover{background:#355e4e}.frontier-command button:focus-visible,.frontier-command select:focus-visible{outline:3px solid #f0d488;outline-offset:2px}.frontier-command button:disabled{opacity:.45;cursor:default}.frontier-command button.primary{background:#edcf90;color:#14332c;border-color:#edcf90}.frontier-command header{display:flex;justify-content:space-between;gap:15px;align-items:start}.frontier-command .eyebrow{letter-spacing:.17em;text-transform:uppercase;font-size:11px;color:#dfc280}.frontier-command .quiet{color:#b9cbbb;font-size:12px}.frontier-command .toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.frontier-command .clock{margin-right:auto;font-weight:700;font-size:16px}.frontier-command .layout{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:16px;flex:1;min-height:0}.frontier-command .map-wrap{background:#284e55;border:1px solid #928d6a;position:relative;min-height:300px;border-radius:4px;overflow:hidden}.frontier-command svg{width:100%;height:100%;min-height:300px}.frontier-command .sidebar{overflow:auto;display:flex;flex-direction:column;gap:14px;padding-right:6px}.frontier-command section{padding:12px;background:#1e453b;border:1px solid #6a806647;border-radius:4px}.frontier-command dl{display:grid;grid-template-columns:1fr auto;gap:3px 12px;margin:10px 0}.frontier-command dd{margin:0;text-align:right;color:#f3d993}.frontier-command dt{color:#ced8c8}.frontier-command .orders{display:grid;grid-template-columns:1fr 1fr;gap:6px}.frontier-command .orders .wide{grid-column:1/-1}.frontier-command .legend{display:flex;gap:15px;flex-wrap:wrap;font-size:12px}.frontier-command .legend i{display:inline-block;width:11px;height:11px;border-radius:50%;margin-right:5px}.frontier-command .warning{color:#f4bd89}.frontier-command .notice{min-height:20px;color:#e9d9af}.frontier-command .log{font-size:12px;margin:8px 0 0;padding-left:17px;color:#c4d2c1}.frontier-command .log li{margin-bottom:7px}.frontier-command .holding{display:block;margin:5px 0;width:100%;text-align:left}.frontier-command [data-cell]{cursor:pointer}.frontier-command [data-cell]:focus-visible{outline:none;stroke:#fff4c5;stroke-width:4}.frontier-command .army-banner{transition:transform .6s ease;pointer-events:none}
  .frontier-command .quick-start{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;border-left:3px solid #edcf90;background:#254a3f}.frontier-command .quick-start strong{display:block;color:#f3d993}.frontier-command .quick-start button{flex-shrink:0}.frontier-command .quick-start small{display:block;color:#c4d2c1;font-size:12px}
  @media(max-width:520px){.frontier-command .quick-start{flex-direction:column;align-items:stretch}}
  @media(max-width:850px){.frontier-command{inset:0;padding:12px;border-radius:0;overflow:auto}.frontier-command .layout{display:flex;flex-direction:column;min-height:auto;flex:none}.frontier-command .map-wrap{height:48vh}.frontier-command .sidebar{overflow:visible;display:grid;grid-template-columns:1fr 1fr}.frontier-command header p{display:none}}
  @media(max-width:520px){.frontier-command .sidebar{display:flex}.frontier-command h2{font-size:23px}.frontier-command button{padding:8px}}
  `;document.head.append(style);
  const root=document.createElement('div');root.className='frontier-command';root.hidden=true;root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Frontier command strategy playtest');document.body.append(root);
  let selectedArmy='imperial-field-force',selectedCell=null,selectedHolding=null,notice='',visible=false,previousFocus=null;
  let armyPositions=new Map();
  const arr=value=>Array.isArray(value)?value:Object.values(value??{});
  const current=()=>model.view();
  function persist(){if(save(model.snapshot())===false)notice='The orders are active, but this device could not save the prototype.';}
  function run(action,successMessage){const result=action();notice=result?.reason??(result?.ok!==false?successMessage:null)??result?.message??(result?.ok===false?'That order cannot be carried out.':'Orders recorded.');persist();render();return result;}
  function render(){
    if(!visible)return;
    const v=current(),cells=arr(v.cells),armies=arr(v.armies),holdings=arr(v.holdings);
    if(!armies.some(a=>a.id===selectedArmy))selectedArmy=armies[0]?.id;
    const army=armies.find(a=>a.id===selectedArmy),cell=cells.find(c=>c.id===selectedCell),holding=holdings.find(h=>h.id===selectedHolding&&h.cellId===selectedCell)??holdings.find(h=>h.cellId===selectedCell);
    const preview=selectedCell&&army?model.previewMarch(army.id,selectedCell):null;
    const pending=v.pendingBattle;
    root.innerHTML=`<header><div><div class="eyebrow">Testing tools · Strategic prototype</div><h2>Frontier command</h2><p>Isareos, Caricas &amp; Yunethre · March, protect supply, and hold the frontier.</p><div class="quiet">A separate scenario. Your adventure, personal map and story outcomes stay unchanged.</div></div><button data-action="close" aria-label="Return to the adventure">✕</button></header>
    <div class="quick-start"><div><strong>You command; the clock waits.</strong>Choose a force &rarr; select a hex or holding &rarr; queue an order &rarr; advance time.<small>${pending?'A battle has paused the clock. Choose how to resolve it in the sidebar.':v.hour===0?'Try the Imperial force at the White Bridge, then advance a day to meet the approaching centaur raid.':'Both forces follow their orders when you advance time. Watch their supplies and morale.'}</small></div>${v.hour===0&&!pending?'<button data-action="guide-bridge">Select White Bridge &rarr;</button>':''}</div>
    <div class="toolbar"><span class="clock">Day ${Math.floor((v.hour??0)/24)+1} · ${String((v.hour??0)%24).padStart(2,'0')}:00</span><span class="quiet">Time advances only when you choose.</span><button data-action="advance6" ${pending?'disabled':''}>Advance 6 hours</button><button data-action="advance24" ${pending?'disabled':''}>Advance a day</button><button data-action="load">Reload orders</button><button data-action="reset">Reset scenario</button></div>
    <div class="layout"><div class="map-wrap">${map(v,cells,armies,holdings,preview)}</div><aside class="sidebar">
    <section><div class="eyebrow">Frontier objective</div><h3>${escape(v.objective?.title??'Secure the frontier')}</h3><p>${escape(v.objective?.detail??v.objective?.description??'Keep your force supplied while protecting the frontier holdings.')}</p><div class="quiet">${escape(v.objective?.status??'In progress')}</div></section>
    ${pending?`<section><div class="eyebrow">Battle awaits your decision</div><h3>${escape(pending.title??'Frontier clash')}</h3><p>The campaign clock is paused. Enter the battle to fight alongside the Imperial force, or resolve it on this chart using each force's condition.</p><button class="primary holding" data-action="battle">Enter the adventure battle</button><button class="holding" data-action="resolve">Resolve from force condition</button><p class="quiet">Projected result: ${escape(title(pending.previewOutcome))}.</p><button class="holding" data-action="retreat-battle">Withdraw Imperial force</button></section>`:''}
    <section><label for="frontier-army">Command a force</label><select id="frontier-army" style="width:100%;margin:7px 0">${armies.map(a=>`<option value="${escape(a.id)}" ${a.id===selectedArmy?'selected':''}>${escape(a.name??title(a.id))}</option>`).join('')}</select>
    <dl><dt>Readiness</dt><dd>${escape(army?.strength??army?.troops??'—')}</dd><dt>Morale</dt><dd>${Math.round(army?.morale??0)}%</dd><dt>Carried supply</dt><dd>${Math.round(army?.supplies??army?.supply??0)}</dd><dt>Orders</dt><dd>${escape(title(army?.order?.type??'hold'))}</dd></dl>
    <div class="quiet">${escape(army?.supply?.ok?`Supply available: ${army.supply.name}`:army?.supply?.reason??'Choose a force.')}</div>
    <div class="orders" style="margin-top:10px"><button data-action="hold">Hold</button><button data-action="resupply">Resupply here</button><button data-action="retreat">Retreat home</button><button data-action="raid" ${!holding?'disabled':''}>Raid selected holding</button></div><p class="quiet">Orders wait for time to advance. Marching moves your force; raiding captures an opposing holding. Resupply works only at your current friendly supply source.</p></section>
    <section><div class="eyebrow">${cell?'Selected destination':'Choose a destination'}</div><h3>${escape(holding?.name??cell?.region??'Click a hex')}</h3>${cell?`<p>${escape(title(cell.terrain))} · ${escape(cell.region??'')}</p>`:'<p>Select a force, then a hex to preview the march before giving an order.</p>'}
    ${holding?`<dl><dt>Effective control</dt><dd>${escape(title(holding.controller))}</dd><dt>Claim</dt><dd>${escape(title(holding.sovereignClaim??'None: independent neutral town'))}</dd><dt>Local support</dt><dd>${Math.round(holding.localSupport)}%</dd><dt>Food reserve</dt><dd>${Math.round(holding.food??holding.reserves?.food??0)}</dd></dl>`:''}
    ${preview?`<p>${preview.ok===false?escape(preview.reason):`${Math.round(preview.hours??preview.totalHours??0)} hours · ${Math.round(preview.supplies??preview.supplyCost??0)} supply`}</p><p class="warning">${escape(arr(preview.warnings).join(' '))}</p><button class="primary holding" data-action="march" ${preview.ok===false?'disabled':''}>Queue march order</button>`:''}
    ${holding?.kind==='bridge'?`<p class="quiet">Crossing ${v.bridgeOpen?'open':'damaged; supply interrupted'}.</p><button class="holding" data-action="repair" ${v.bridgeOpen||holding.controller!=='empire'||pending?'disabled':''}>Test bridge repair</button>`:''}
    ${holding?.controller==='neutral'?'<button class="holding" data-action="passage">Request neutral passage</button>':''}</section>
    <section><h3>Places &amp; holdings</h3><p class="quiet">${Object.entries(v.ledger??{}).map(([id,ledger])=>`${escape(title(id))}: ${Math.round(ledger.food)} food / ${Math.round(ledger.coins)} coin`).join('<br>')}</p>${holdings.map(h=>`<button class="holding" data-holding="${escape(h.id)}">${escape(h.name)}<span class="quiet" style="display:block">${escape(title(h.controller))} · food ${Math.round(h.food??h.reserves?.food??0)}</span></button>`).join('')}</section>
    <section><h3>Dispatches</h3><ol class="log">${arr(v.log).slice(-7).reverse().map(e=>`<li>${escape(typeof e==='string'?e:e.text??e.message??title(e.type))}</li>`).join('')}</ol></section>
    </aside></div><div class="legend"><span><i style="background:#bb8545"></i>Imperial control</span><span><i style="background:#477e75"></i>Centaur control</span><span><i style="background:#a5a98a"></i>Neutral</span><span>Dashed outlines: claims · Flags: forces · Lines: planned marches</span></div><div class="notice" role="status">${escape(notice||'Scenario values are provisional. Occupying a holding does not change the atlas regions.')}</div>`;
    root.querySelector('#frontier-army').onchange=e=>{selectedArmy=e.target.value;render();};
    for(const el of root.querySelectorAll('[data-cell]')){const select=()=>{selectedCell=el.dataset.cell;selectedHolding=null;render();};el.onclick=select;el.onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();select();}};}
    for(const el of root.querySelectorAll('[data-holding]'))el.onclick=()=>{const h=holdings.find(h=>h.id===el.dataset.holding);selectedCell=h?.cellId??h?.cell;selectedHolding=h?.id??null;render();};
    for(const el of root.querySelectorAll('[data-action]'))el.onclick=()=>{
      const action=el.dataset.action;
      if(action==='close')return close();
      if(action==='guide-bridge'){
        const bridge=holdings.find(h=>h.id==='menora-lizeem-bridge');
        if(!bridge)return;
        selectedArmy='imperial-field-force';selectedCell=bridge.cellId;selectedHolding=bridge.id;
        notice='White Bridge selected. Queue the march below, then choose Advance a day.';render();
        const march=root.querySelector('[data-action="march"]');march?.scrollIntoView({block:'nearest'});march?.focus({preventScroll:true});return;
      }
      if(action==='advance6'||action==='advance24')return run(()=>model.advance(action==='advance6'?6:24));
      if(action==='load'){notice=load(model)?'Saved orders restored.':'No valid saved orders to restore.';render();return;}
      if(action==='reset')return run(()=>{selectedArmy='imperial-field-force';selectedCell=null;selectedHolding=null;return model.reset();});
      if(action==='battle'){persist();onBattle(pending);return;}
      if(action==='resolve')return run(()=>model.resolveAdventureBattle(pending.id,pending.previewOutcome));
      if(action==='retreat-battle')return run(()=>model.resolveAdventureBattle(pending.id,'retreat'));
      if(action==='repair')return run(()=>model.resolveAdventureAction(`bridge-repair-${v.hour}-${v.resolvedBattles.length}`,'repair-bridge'));
      if(action==='passage')return run(()=>model.setPassage(army.id,true));
      return run(()=>model.order(army.id,{type:action,target:action==='raid'?holding?.id:selectedCell}),'Order queued. Choose Advance 6 hours or Advance a day to carry it out.');
    };
    requestAnimationFrame(()=>{for(const el of root.querySelectorAll('[data-army-end]'))el.setAttribute('transform',el.dataset.armyEnd);});
  }
  function map(v,cells,armies,holdings,preview){
    if(!cells.length)return '<p>Preparing the frontier chart…</p>';
    const px=c=>c.x??c.q*86.6,pz=c=>c.z??c.r*75;
    const xs=cells.map(px),zs=cells.map(pz),left=Math.min(...xs)-85,top=Math.min(...zs)-90,w=Math.max(...xs)-left+85,h=Math.max(...zs)-top+90;
    const cellMap=new Map(cells.map(c=>[c.id,c]));const radius=Number(v.hexRadius)||55;
    const hex=c=>c.corners?.map(p=>`${p.x},${p.z}`).join(' ')??Array.from({length:6},(_,i)=>{const a=(30+i*60)*Math.PI/180;return `${px(c)+radius*Math.cos(a)},${pz(c)+radius*Math.sin(a)}`;}).join(' ');
    const effective=c=>holdings.find(h=>(h.cellId??h.cell)===c.id)?.controller??c.controller;
    const selected=armies.find(a=>a.id===selectedArmy);
    const path=[selected?.cellId,...(preview?.ok?preview.route:armyRoute(selected))];
    const route=arr(path).map(p=>typeof p==='string'?cellMap.get(p):p.cellId?cellMap.get(p.cellId):p).filter(Boolean);
    const regions=new Map();for(const c of cells){const name=c.region??'Frontier';if(!regions.has(name))regions.set(name,[]);regions.get(name).push(c);}
    const old=armyPositions;armyPositions=new Map();
    return `<svg viewBox="${left} ${top} ${w} ${h}" aria-label="Strategic hex map of the three frontier regions">
    <defs><clipPath id="frontier-land">${cells.map(c=>`<polygon points="${hex(c)}"/>`).join('')}</clipPath><pattern id="frontier-paper" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="#d2c69a"/><circle cx="3" cy="5" r=".6" fill="#7d7854" opacity=".18"/></pattern></defs>
    ${cells.map(c=>`<polygon data-cell="${escape(c.id)}" tabindex="0" role="button" aria-label="${escape(c.region)} ${escape(c.terrain)} ${escape(c.id)}" points="${hex(c)}" fill="${effective(c)?colour(effective(c)):'url(#frontier-paper)'}" fill-opacity="${effective(c)?'.7':'1'}" stroke="${c.id===selectedCell?'#fff3bd':'#777955'}" stroke-width="${c.id===selectedCell?5:1.1}"/><path d="M${px(c)-20},${pz(c)+8}l12,-15 12,15m-5,0l10,-12 10,12" fill="none" stroke="#6b7256" stroke-width="2" opacity="${/mountain|hill|highland/.test(c.terrain??'')?.65:0}" pointer-events="none"/>`).join('')}
    <g clip-path="url(#frontier-land)" pointer-events="none">
    ${arr(v.edges).filter(e=>e.road&&!e.blocked).map(e=>{const a=cellMap.get(e.a),b=cellMap.get(e.b);return `<line x1="${a.x}" y1="${a.z}" x2="${b.x}" y2="${b.z}" stroke="#b79756" stroke-width="4" opacity=".65"/>`;}).join('')}
    ${arr(v.rivers).map(r=>`<polyline points="${r.points.map(p=>`${p.x},${p.z}`).join(' ')}" fill="none" stroke="#5a8991" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}
    ${arr(v.edges).filter(e=>e.bridge).map(e=>{const a=cellMap.get(e.a),b=cellMap.get(e.b);return `<line x1="${a.x}" y1="${a.z}" x2="${b.x}" y2="${b.z}" stroke="${v.bridgeOpen?'#ede3bd':'#a63d30'}" stroke-width="7" stroke-dasharray="${v.bridgeOpen?'none':'7 7'}"/>`;}).join('')}
    </g>
    ${[...regions].map(([name,list])=>`<text x="${list.reduce((s,c)=>s+px(c),0)/list.length}" y="${list.reduce((s,c)=>s+pz(c),0)/list.length-33}" fill="#344336" text-anchor="middle" font-family="Georgia,serif" font-size="36" font-style="italic" opacity=".75" pointer-events="none">${escape(name)}</text>`).join('')}
    ${route.length?`<polyline points="${route.map(c=>`${px(c)},${pz(c)}`).join(' ')}" fill="none" stroke="#344e42" stroke-width="5" stroke-dasharray="9 6" pointer-events="none"/>`:''}
    ${holdings.map(h=>{const cell=cellMap.get(h.cellId);if(!cell)return '';const c=h.at??cell,small=h.kind==='farm',r=small?9:20,showName=!small||h.id===selectedHolding;return `<g pointer-events="none"><title>${escape(h.name)}: ${escape(title(h.controller))}; claim ${escape(h.sovereignClaim??'none')}</title><circle cx="${px(c)}" cy="${pz(c)}" r="${r}" fill="#f4e5b7" stroke="${colour(h.controller)}" stroke-width="${small?3:5}"/>${h.sovereignClaim?`<circle cx="${px(c)}" cy="${pz(c)}" r="${r+7}" fill="none" stroke="${colour(h.sovereignClaim)}" stroke-width="2.5" stroke-dasharray="5 4"/>`:''}${small?'':`<text x="${px(c)}" y="${pz(c)+7}" text-anchor="middle" fill="#344336" font-size="22">${h.kind==='bridge'?'&#8779;':h.controller==='yunethre'?'&#9651;':'&#9637;'}</text>`}${showName?`<text x="${px(c)}" y="${pz(c)+r+20}" text-anchor="middle" fill="#263e32" stroke="#e7d6a5" stroke-width="4" paint-order="stroke" font-size="25" font-weight="600">${escape(h.name)}</text>`:''}</g>`;}).join('')}
    ${armies.map((a,i)=>{const c=cellMap.get(a.cellId??a.cell??a.location);if(!c)return '';const x=(a.at?.x??px(c))+(i?20:-20),y=(a.at?.z??pz(c))-40,start=old.get(a.id)??{x,y};armyPositions.set(a.id,{x,y});return `<g class="army-banner" transform="translate(${start.x} ${start.y})" data-army-end="translate(${x} ${y})"><path d="M0,19V-22H35L28,-9L35,3H0" fill="${colour(a.faction??a.side)}" stroke="#22372d" stroke-width="3"/><text x="16" y="-5" text-anchor="middle" fill="#fff2c8" font-size="16" font-weight="700">${i?'C':'I'}</text></g>`;}).join('')}
    <text x="${left+25}" y="${top+30}" fill="#ecdba8" font-size="18">N ↑</text></svg>`;
  }
  function armyRoute(army){return army?.order?.route??[];}
  function open(){previousFocus=document.activeElement;visible=true;root.hidden=false;render();root.querySelector('[data-action="close"]').focus();}
  function close({notify=true}={}){visible=false;root.hidden=true;persist();if(notify){onClose();previousFocus?.focus?.();}}
  function suspend(){close({notify:false});}
  document.addEventListener('keydown',e=>{if(visible&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();}},true);
  return {open,close,suspend,render,get active(){return visible;},element:root,setNotice:text=>{notice=text;render();}};
}
