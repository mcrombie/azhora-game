import {parseCells,unionCells,labelAnchor} from '../../ui/map/campaign-map-geometry.js';
import {isAlive,isMoving,defendingStrength} from '../../simulation/forces.js';
const NS='http://www.w3.org/2000/svg';
function node(tag,attrs={}){const el=document.createElementNS(NS,tag);for(const [key,value]of Object.entries(attrs))el.setAttribute(key,value);return el;}
export async function createScenarioMap(root,scenario,onSelect,onSelectArmy){
  const response=await fetch('./assets/azhora-world-map.svg');if(!response.ok)throw Error('The atlas could not load.');
  const source=new DOMParser().parseFromString(await response.text(),'image/svg+xml');
  if(source.querySelector('parsererror'))throw Error('The atlas is not valid SVG.');
  const svg=node('svg',{role:'group','aria-label':'Lizeem campaign map'}),defs=node('defs'),clip=node('clipPath',{id:'lizeem-scope'});
  const data=new Map();
  for(const region of scenario.regions){
    const original=[...source.querySelectorAll('#region-tints [data-region]')].find(p=>p.dataset.region===region.name);
    if(!original)throw Error('Atlas region missing: '+region.name);
    const cells=parseCells(original.getAttribute('d')),outline=unionCells(cells),anchor=labelAnchor(cells,outline.loops);
    data.set(region.id,{cells,...outline,anchor});clip.append(node('path',{d:outline.path}));
  }
  defs.append(clip);svg.append(defs);
  const terrain=node('g',{'clip-path':'url(#lizeem-scope)'});
  terrain.append(node('rect',{x:0,y:0,width:4000,height:5000,fill:'#e3d1a5'}));
  // Exact existing terrain/river artwork, clipped to five regions. No 3D imports.
  for(const id of ['terrain','relief','rivers']){const original=source.getElementById(id);if(original){const group=document.importNode(original,true);group.removeAttribute('clip-path');group.removeAttribute('id');terrain.append(group);}}
  const territories=node('g'),hits=node('g'),labels=node('g'),armies=node('g');
  svg.append(terrain,territories,hits,labels,armies);root.replaceChildren(svg);
  const points=[...data.values()].flatMap(r=>r.loops.flat());
  const minX=Math.min(...points.map(p=>p[0])),maxX=Math.max(...points.map(p=>p[0])),minY=Math.min(...points.map(p=>p[1])),maxY=Math.max(...points.map(p=>p[1]));
  let viewBox,drag=null,lastState,layer='geopolitical',selected='isareos',selectedArmy=null;
  const fit=()=>{viewBox={x:minX-25,y:minY-25,w:maxX-minX+50,h:maxY-minY+50};apply();};
  const apply=()=>svg.setAttribute('viewBox',`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`);
  const faction=id=>scenario.factions.find(f=>f.id===id);
  for(const region of scenario.regions){const p=node('path',{d:data.get(region.id).path,class:'region-hit','data-region-id':region.id});hits.append(p);}
  function text(parent,at,label,cls){const el=node('text',{x:at.x,y:at.y,class:cls});el.textContent=label;parent.append(el);return el;}
  function render(state,nextLayer=layer,nextSelected=selected,nextArmy=selectedArmy){
    lastState=state;layer=nextLayer;selected=nextSelected;selectedArmy=nextArmy;territories.replaceChildren();labels.replaceChildren();armies.replaceChildren();
    for(const f of scenario.factions){
      const owned=scenario.regions.filter(r=>state.regions[r.id].owner===f.id);if(!owned.length)continue;
      const cells=owned.flatMap(r=>data.get(r.id).cells),outline=unionCells(cells),anchor=labelAnchor(cells,outline.loops);
      territories.append(node('path',{d:outline.path,fill:f.color,'fill-opacity':layer==='geopolitical'?'.77':'.17',class:'territory','data-owner':f.id}));
      if(layer==='geopolitical'){
        const label=text(labels,anchor,f.short,'country-label');label.dataset.faction=f.id;
        const second=node('tspan',{x:anchor.x,dy:13,'font-size':9});second.textContent=f.id==='minora'?'NEUTRAL CITY-STATE':'LEAGUE';label.append(second);
      }
    }
    for(const region of scenario.regions){
      const d=data.get(region.id),s=state.regions[region.id],path=hits.querySelector(`[data-region-id="${region.id}"]`);
      path.classList.toggle('selected',region.id===selected);path.dataset.owner=s.owner;
      if(layer==='regions'){
        territories.append(node('path',{d:d.path,fill:'none',stroke:'#59664b','stroke-width':1,'stroke-dasharray':'4 2'}));
        text(labels,d.anchor,region.name,'region-name');text(labels,{x:d.anchor.x,y:d.anchor.y+14},`${defendingStrength(state,region.id)} defending`,'hero-label');
      }
    }
    const hero=state.hero,home=data.get(hero.region).anchor,destination=hero.journey?data.get(hero.journey.to).anchor:home;
    const progress=hero.journey?Math.min(1,(state.day-hero.journey.departed)/(hero.journey.arrives-hero.journey.departed)):0;
    text(labels,{x:home.x+(destination.x-home.x)*progress,y:home.y+(destination.y-home.y)*progress+32},`${hero.name}${hero.journey?' (traveling)':''}`,'hero-label');
    const localCounts=new Map(),usedPositions=new Map();
    for(const army of state.armies.filter(isAlive)){
      const moving=isMoving(army),from=data.get(moving?army.from:army.region).anchor,to=data.get(moving?army.to:army.region).anchor;
      const t=moving?Math.max(.18,Math.min(.86,(state.day-army.departed+.5)/(army.arrives-army.departed))):0;
      let x=from.x+(to.x-from.x)*t,y=from.y+(to.y-from.y)*t;
      if(moving){
        const length=Math.max(1,Math.hypot(to.x-from.x,to.y-from.y)),offset=army.owner==='west'?6:-6;
        x-=(to.y-from.y)/length*offset;y+=(to.x-from.x)/length*offset;
        armies.append(node('path',{d:`M${from.x},${from.y}L${to.x},${to.y}`,class:'army-route'+(army.status==='retreating'?' retreat-route':'')}));
      }else{
        const count=localCounts.get(army.region)??0;localCounts.set(army.region,count+1);
        const used=usedPositions.get(army.region)??new Set();usedPositions.set(army.region,used);
        const desired={x:from.x+count*27-14,y:from.y+22};
        const candidates=data.get(army.region).cells.map(c=>({x:c.reduce((n,p)=>n+p[0],0)/c.length,y:c.reduce((n,p)=>n+p[1],0)/c.length}));
        const at=candidates.filter(p=>!used.has(`${p.x},${p.y}`)).sort((a,b)=>Math.hypot(a.x-desired.x,a.y-desired.y)-Math.hypot(b.x-desired.x,b.y-desired.y))[0]??from;
        x=at.x;y=at.y;used.add(`${x},${y}`);
      }
      const g=node('g',{class:'army-marker'+(army.id===selectedArmy?' selected':'')+(army.status==='recovering'?' recovering':''),'data-army':army.id,transform:`translate(${x} ${y})`,tabindex:0,role:'button','aria-label':`${army.name}, ${army.status}, ${army.strength} strength`});
      g.append(node('circle',{r:11,fill:faction(army.owner).color,stroke:army.status==='retreating'?'#f4d47c':'#faf0d6','stroke-width':1.5}));text(g,{x:0,y:0},army.strength,'');
      const title=node('title');title.textContent=`${army.name}: ${army.status}. Click for orders and battle history.`;g.append(title);armies.append(g);
    }
  }
  root.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={x:e.clientX,y:e.clientY,box:{...viewBox},army:e.target.closest('[data-army]')?.dataset.army,target:e.target.closest('[data-region-id]')?.dataset.regionId};root.setPointerCapture(e.pointerId);});
  root.addEventListener('pointermove',e=>{if(!drag)return;const scale=Math.min(root.clientWidth/drag.box.w,root.clientHeight/drag.box.h);viewBox={...drag.box,x:drag.box.x-(e.clientX-drag.x)/scale,y:drag.box.y-(e.clientY-drag.y)/scale};apply();});
  root.addEventListener('pointerup',e=>{if(drag&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<5){if(drag.army)onSelectArmy(Number(drag.army));else if(drag.target)onSelect(drag.target);}drag=null;});
  root.addEventListener('pointercancel',()=>drag=null);
  root.addEventListener('wheel',e=>{e.preventDefault();const factor=e.deltaY>0?1.12:1/1.12,w=Math.max(100,Math.min((maxX-minX)*3,viewBox.w*factor)),ratio=w/viewBox.w;viewBox={x:viewBox.x+(viewBox.w-w)/2,y:viewBox.y+(viewBox.h-viewBox.h*ratio)/2,w,h:viewBox.h*ratio};apply();},{passive:false});
  root.addEventListener('keydown',e=>{const army=e.target.closest('[data-army]');if(army&&['Enter','Space'].includes(e.code)){e.preventDefault();e.stopPropagation();onSelectArmy(Number(army.dataset.army));}});
  fit();return {render,fit,state:()=>({layer,selected,owners:Object.fromEntries([...hits.children].map(p=>[p.dataset.regionId,p.dataset.owner])),armies:lastState?.armies.filter(isAlive).length??0,selectedArmy,viewBox:{...viewBox}})};
}
