import {parseCells,unionCells,labelAnchor} from '../../ui/map/campaign-map-geometry.js';

const NS='http://www.w3.org/2000/svg';
const REGIONS=[['isareos','Isareos'],['nethereum','Nethereum'],['ovesos','Ovesos'],['caricas','Caricas'],['nesdor','Nesdor']];
// The same atlas location as the city at the Isa–Lizeem confluence. This small
// presentation deliberately does not import the world or build any scenery.
const MINORA={x:1220.75,y:2585.22};
let atlasPromise=null,instanceId=0;
const svgNode=(tag,attrs={})=>{const el=document.createElementNS(NS,tag);for(const [key,value]of Object.entries(attrs))el.setAttribute(key,value);return el;};
function svgText(parent,x,y,value,className){const el=svgNode('text',{x,y,class:className});el.textContent=value;parent.append(el);return el;}

async function loadAtlas(){
  if(!atlasPromise)atlasPromise=(async()=>{
    const response=await fetch('./assets/azhora-world-map.svg');if(!response.ok)throw Error('The historical chart could not load. You can return to Taleth or begin without it.');
    const source=new DOMParser().parseFromString(await response.text(),'image/svg+xml');
    if(source.querySelector('parsererror'))throw Error('The historical chart is unreadable. You can begin without it.');
    const paths=[...source.querySelectorAll('#region-tints [data-region]')],regions=new Map();
    for(const [id,name]of REGIONS){
      const path=paths.find(p=>p.dataset.region===name);if(!path)throw Error(`The historical chart is missing ${name}.`);
      const cells=parseCells(path.getAttribute('d')),outline=unionCells(cells);
      regions.set(id,{id,name,cells,...outline,anchor:labelAnchor(cells,outline.loops)});
    }
    const points=[...regions.values()].flatMap(r=>r.loops.flat());
    const minX=Math.min(...points.map(p=>p[0])),maxX=Math.max(...points.map(p=>p[0])),minY=Math.min(...points.map(p=>p[1])),maxY=Math.max(...points.map(p=>p[1]));
    return {regions,bounds:{x:minX-20,y:minY-20,w:maxX-minX+40,h:maxY-minY+40},rivers:source.getElementById('rivers')?.cloneNode(true)};
  })().catch(error=>{atlasPromise=null;throw error;});
  return atlasPromise;
}

/** Read-only, authored history: this view has no campaign, clock or save access. */
export function createChronicleView({onClose=()=>{},onStart=()=>{},onFrame=()=>{}}={}){
  const root=document.createElement('section');root.id='chronicle-view';root.hidden=true;root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby','chronicle-title');
  root.innerHTML=`<div class="chronicle-shell">
    <header class="chronicle-header"><div><span class="eyebrow">TALETH / WIZARD GUILD MASTER</span><h1 id="chronicle-title">Chronoscope</h1><p id="chronicle-held-caption">History is held here. The campaign waits for you.</p></div><nav aria-label="Leave the history"><button id="chronicle-start" class="chronicle-primary">Start campaign</button><button id="chronicle-close">Return to Taleth</button></nav></header>
    <div class="chronicle-body"><div class="chronicle-projection"><div id="chronicle-map" role="img" aria-label="Historical political boundaries of the five Lizeem regions"></div><p id="chronicle-map-message" role="status">Drawing the remembered borders…</p><div class="chronicle-map-caption"><span>THE LIZEEM PROVINCES</span><span>HISTORICAL PROJECTION / NORTH ↑</span></div></div>
    <article class="chronicle-narration"><span id="chronicle-day" class="eyebrow"></span><div id="chronicle-event" aria-live="polite" aria-atomic="true"><h2 id="chronicle-event-title"></h2><p id="chronicle-caption"></p></div><div id="chronicle-owners" aria-label="States visible on the chart"></div><p id="chronicle-present" hidden>The memory reaches the present. What happens next is yours.</p><small id="chronicle-play-state"></small></article></div>
    <footer class="chronicle-controls"><div class="chronicle-playback"><button id="chronicle-previous" aria-label="Previous historical event">← Previous</button><button id="chronicle-play">Pause</button><button id="chronicle-next" aria-label="Next historical event">Next →</button><span id="chronicle-duration"></span></div><div id="chronicle-progress" role="progressbar" aria-label="History playback" aria-valuemin="0" aria-valuemax="100"><span></span></div><nav id="chronicle-timeline" aria-label="Historical events"></nav><p class="chronicle-key-help">Space: pause / play · ← →: events · Esc: return to Taleth</p></footer>
  </div>`;
  document.body.append(root);
  const $=id=>root.querySelector('#'+id),map=$('chronicle-map'),timeline=$('chronicle-timeline'),clipId=`chronicle-scope-${++instanceId}`;
  let data=null,active=false,index=0,playing=false,elapsed=0,ready=false,error=null,disposed=false,request=0,completed=false,busy=false,previousFocus=null,focused=true,hasBegun=false;
  let shapes=new Map(),labels=new Map(),chart=null;
  const frame=()=>data?.frames[index];
  const faction=id=>data?.factions.find(f=>f.id===id);
  const duration=()=>data?.frames.reduce((sum,f)=>sum+f.seconds,0)??0;
  const progress=()=>data?.frames.slice(0,index).reduce((sum,f)=>sum+f.seconds,0)+elapsed;

  function buildMap(atlas){
    const svg=svgNode('svg',{viewBox:`${atlas.bounds.x} ${atlas.bounds.y} ${atlas.bounds.w} ${atlas.bounds.h}`,'aria-hidden':'true'}),defs=svgNode('defs'),clip=svgNode('clipPath',{id:clipId});
    const territories=svgNode('g'),rivers=svgNode('g',{'clip-path':`url(#${clipId})`,class:'chronicle-rivers'}),names=svgNode('g');
    shapes=new Map();labels=new Map();
    for(const r of atlas.regions.values()){
      clip.append(svgNode('path',{d:r.path}));
      const path=svgNode('path',{d:r.path,class:'chronicle-region','data-region':r.id});territories.append(path);shapes.set(r.id,path);
      const label=svgNode('g',{class:'chronicle-region-label','data-label-region':r.id});
      svgText(label,r.anchor.x,r.anchor.y-5,r.name,'chronicle-region-name');
      const owner=svgText(label,r.anchor.x,r.anchor.y+8,'','chronicle-owner-name');labels.set(r.id,owner);names.append(label);
    }
    // Rivers remain the atlas's own drawing, clipped to only these five regions.
    // No other regions, settlement labels, or undiscovered places enter the view.
    if(atlas.rivers){const water=atlas.rivers.cloneNode(true);water.removeAttribute('id');water.removeAttribute('clip-path');rivers.append(water);}
    defs.append(clip);svg.append(defs,territories,rivers,names);
    const city=svgNode('g',{class:'chronicle-minora',transform:`translate(${MINORA.x} ${MINORA.y})`});
    city.append(svgNode('circle',{r:4.5}),svgNode('path',{d:'M-2 2V-2H2V2M0-2V-4'}));svgText(city,9,3,'Minora','chronicle-city-name');svg.append(city);
    chart=svg;map.replaceChildren(svg);ready=true;renderFrame();
  }
  function renderFrame(){
    const current=frame();if(!current)return;
    $('chronicle-day').textContent=`HISTORICAL DAY ${current.day} / 30`;
    $('chronicle-event-title').textContent=current.title;$('chronicle-caption').textContent=current.caption;
    $('chronicle-present').hidden=!completed;
    for(const [id,path]of shapes){
      const owner=faction(current.owners[id]);path.style.fill=owner?.color??'#76867e';path.dataset.owner=current.owners[id];
      path.classList.toggle('changing',current.highlight?.includes(id)??false);
      path.classList.toggle('neutral',id==='isareos'&&current.owners[id]==='minora');
      labels.get(id).textContent=owner?.short??owner?.name??'';
    }
    chart?.classList.toggle('at-war',Boolean(current.war));
    $('chronicle-owners').replaceChildren();
    for(const ownerId of new Set(REGIONS.map(([id])=>current.owners[id]))){
      const owner=faction(ownerId);if(!owner)continue;
      const row=document.createElement('div'),swatch=document.createElement('span'),name=document.createElement('span');
      swatch.className='chronicle-swatch';swatch.style.background=owner.color;name.textContent=owner.name;row.append(swatch,name);$('chronicle-owners').append(row);
    }
    for(const [i,button]of [...timeline.children].entries()){button.setAttribute('aria-current',i===index?'step':'false');button.classList.toggle('seen',i<index);}
    onFrame(current);renderProgress();
  }
  function renderProgress(){
    const total=duration(),value=total?Math.min(100,progress()/total*100):0;
    $('chronicle-progress').firstElementChild.style.width=`${value}%`;$('chronicle-progress').setAttribute('aria-valuenow',String(Math.round(value)));
    $('chronicle-duration').textContent=`${Math.min(Math.round(progress()),Math.round(total))} / ${Math.round(total)} sec`;
    $('chronicle-play').textContent=completed?'Replay':playing?'Pause':'Play';$('chronicle-play').setAttribute('aria-label',completed?'Replay the history':playing?'Pause the history':'Play the history');
    $('chronicle-play-state').textContent=error?(hasBegun?'Your campaign is unchanged. Return to the chamber.':'The campaign can begin without the projection.'):!ready?'The memory is gathering.':completed?(hasBegun?'Your campaign is unchanged. Return whenever you are ready.':'The campaign is still waiting for your choice.'):!focused?'Paused while this window is in the background.':playing?'Taleth lets the days pass through the glass.':'Time is held. Continue whenever you are ready.';
    $('chronicle-previous').disabled=!ready||index===0;$('chronicle-next').disabled=!ready||index>=data.frames.length-1;$('chronicle-play').disabled=!ready;
  }
  function seek(next,{play=playing}={}){
    if(!data||!ready)return;
    index=Math.max(0,Math.min(data.frames.length-1,next));elapsed=0;completed=false;playing=play;renderFrame();
  }
  function toggle(){if(!ready)return;if(completed)seek(0,{play:true});else{playing=!playing;renderProgress();}}
  function close(){if(!active)return;active=false;playing=false;request++;root.hidden=true;previousFocus?.isConnected&&previousFocus.focus();onClose();}
  async function start(){
    if(busy||!active)return;busy=true;$('chronicle-start').disabled=true;
    try{await onStart();}catch(e){error=e.message;$('chronicle-map-message').hidden=false;$('chronicle-map-message').textContent=error;}
    finally{busy=false;$('chronicle-start').disabled=false;}
  }
  $('chronicle-start').onclick=start;$('chronicle-close').onclick=close;$('chronicle-play').onclick=toggle;
  $('chronicle-previous').onclick=()=>seek(index-1,{play:false});$('chronicle-next').onclick=()=>seek(index+1,{play:false});
  return {
    async open(nextData,{started=false}={}){
      if(disposed)return false;const token=++request;
      data=nextData;index=0;elapsed=0;playing=true;active=true;ready=false;error=null;completed=false;focused=true;hasBegun=started;previousFocus=document.activeElement;
      root.hidden=false;$('chronicle-title').textContent=data.deviceName??'Chronoscope';$('chronicle-start').textContent=started?'Return to the chamber':'Start campaign';
      $('chronicle-held-caption').textContent=started?'A memory of the war’s beginning. Your present waits outside the glass.':'History is held here. The campaign waits for you.';
      $('chronicle-present').textContent=started?'The memory ends where your campaign began. Return to the chamber to continue.':'The memory reaches the present. What happens next is yours.';
      map.replaceChildren();shapes=new Map();labels=new Map();chart=null;
      $('chronicle-map-message').hidden=false;$('chronicle-map-message').textContent='Drawing the remembered borders…';
      timeline.replaceChildren();
      data.frames.forEach((f,i)=>{const button=document.createElement('button');button.textContent=`${f.day}`;button.title=`Day ${f.day}: ${f.title}`;button.setAttribute('aria-label',button.title);button.dataset.chronicleFrame=String(i);button.onclick=()=>seek(i,{play:false});timeline.append(button);});
      renderFrame();$('chronicle-start').focus();
      try{const atlas=await loadAtlas();if(disposed||!active||token!==request)return false;buildMap(atlas);$('chronicle-map-message').hidden=true;return true;}
      catch(e){if(disposed||!active||token!==request)return false;error=e.message;playing=false;$('chronicle-map-message').textContent=error;renderProgress();return false;}
    },
    close,
    tick(dt,windowActive=true){
      if(!active)return;focused=windowActive;
      if(ready&&playing&&windowActive&&Number.isFinite(dt)&&dt>0){
        elapsed+=dt;
        while(elapsed>=frame().seconds){
          if(index===data.frames.length-1){elapsed=frame().seconds;playing=false;completed=true;$('chronicle-present').hidden=false;break;}
          elapsed-=frame().seconds;index++;renderFrame();
        }
      }
      renderProgress();
    },
    keydown(event){
      if(!active)return false;
      if(event.code==='Escape'){event.preventDefault();close();}
      else if(event.code==='F5'){event.preventDefault();}
      else if(event.code==='ArrowLeft'||event.code==='ArrowRight'){event.preventDefault();seek(index+(event.code==='ArrowLeft'?-1:1),{play:false});}
      else if(event.code==='Space'){event.preventDefault();if(!event.repeat)toggle();}
      else if(event.code==='Tab'){
        event.preventDefault();const buttons=[...root.querySelectorAll('button:not(:disabled)')].filter(b=>!b.hidden),i=buttons.indexOf(document.activeElement);
        buttons[(i+(event.shiftKey?-1:1)+buttons.length)%buttons.length]?.focus();
      }
      return true;
    },
    state:()=>({active,index,playing,elapsed,ready,error,completed,day:frame()?.day??null,owners:frame()?{...frame().owners}:{},duration:duration()}),
    dispose(){disposed=true;request++;active=false;playing=false;root.remove();}
  };
}
