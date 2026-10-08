import {drawMinimap} from '../../ui/map/minimap.js';
import {TRANSFORM} from '../../world/terrain/region-world.js';
import {projectWarMinimap,drawWarMinimap} from './war-minimap.js';
import {writeHud} from './hud-write.js';

// Use the collision index, not a full-world actor scan or another 3D render.
export function localMapColliders(world,position,radius){
  return world.nearColliders(position.x,position.z,radius*1.42).map(c=>
    ['building','city-wall','city-tower','tower-furnishing'].includes(c.kind)?{...c,kind:'house'}:c);
}
const boxes=new WeakMap();
export function localMapShapes(shapes,position,radius){
  return (shapes??[]).filter(shape=>{
    let b=boxes.get(shape);
    if(!b){
      const points=Array.isArray(shape)?shape:shape.points;
      if(!points?.length)return true;
      b={minX:Infinity,maxX:-Infinity,minZ:Infinity,maxZ:-Infinity};
      for(const p of points){b.minX=Math.min(b.minX,p.x);b.maxX=Math.max(b.maxX,p.x);b.minZ=Math.min(b.minZ,p.z);b.maxZ=Math.max(b.maxZ,p.z);}boxes.set(shape,b);
    }
    return b.minX<=position.x+radius&&b.maxX>=position.x-radius&&b.minZ<=position.z+radius&&b.maxZ>=position.z-radius;
  });
}
export function createLocalMap({world,position,heading,inside,mode,marker,openMap,chart,events=()=>[],track=()=>{}}){
  const panel=document.createElement('button');panel.id='exploration-minimap';panel.hidden=true;panel.setAttribute('aria-label','Minimap. Open campaign map (M)');
  panel.innerHTML='<span class="minimap-north" aria-hidden="true">N</span><canvas width="300" height="300" aria-hidden="true"></canvas><span class="minimap-caption"></span><small class="minimap-legend">\u2691 Armies \u00b7 \u2694 Battles<span class="minimap-legend-detail"><br>Gold outlines mark battle boundaries</span></small><small>M \u00b7 Campaign map</small>';
  document.body.append(panel);
  const canvas=panel.querySelector('canvas'),ctx=canvas.getContext('2d'),caption=panel.querySelector('.minimap-caption');let clock=1,result=null,markers=[];
  function pick(event){const b=canvas.getBoundingClientRect(),x=(event.clientX-b.left)*300/b.width,y=(event.clientY-b.top)*300/b.height;return markers.find(m=>Math.hypot(m.x-x,m.y-y)<17);}
  panel.onclick=event=>{const mark=event.detail?pick(event):null;if(mark){track(mark.target);clock=1;update(0,0);}else openMap();};
  panel.onpointermove=event=>{const m=pick(event);panel.title=m?`${m.label} / ${Math.round(m.distance)} m direct. ${m.detail} Click to track.`:'Click an event to track it, or open the campaign map with M.';};
  function update(dt,time){
    writeHud(panel,'hidden',mode()!=='playing');document.body.classList.toggle('has-local-map',!panel.hidden);if(panel.hidden)return;
    clock+=dt;if(clock<.12)return;clock=0;
    const room=inside(),radius=room?22:85,target=marker();
    const data=room?{}:world.minimapData?.(position,radius*1.42)??{};
    for(const key of ['paths','mapWaters','mapLands'])if(data[key])data[key]=localMapShapes(data[key],position,radius*1.42);
    result=drawMinimap(ctx,{world:{...data,regionAt:world.regionAt,colliders:localMapColliders(world,position,radius)},position,
      angle:heading(),time,tracked:target,radius,size:300,northOffset:TRANSFORM.northOffset,chart:room?null:chart()});
    markers=room?[]:projectWarMinimap(events(),{position,radius,size:300,northOffset:TRANSFORM.northOffset});drawWarMinimap(ctx,markers);
    const selected=markers.find(m=>m.selected);
    writeHud(caption,'textContent',selected?`${selected.label} \u00b7 ${Math.round(selected.distance)} m`:target?.label??(room?'Guild chamber':world.regionAt(position.x,position.z).name));
    writeHud(panel.querySelector('.minimap-legend'),'hidden',!!room);
    const accessibleLabel=`Minimap. ${markers.filter(m=>m.kind==='army').length} army sightings, ${markers.filter(m=>m.kind==='battle').length} active battles. ${selected?'Tracking '+selected.label+'. ':''}Open campaign map (M).`;
    if(panel.getAttribute('aria-label')!==accessibleLabel)panel.setAttribute('aria-label',accessibleLabel);
    writeHud(panel.dataset,'target',target?.id??'');
  }
  return {update,state:()=>({visible:!panel.hidden,target:panel.dataset.target,draw:result,events:markers.map(m=>({...m}))}),dispose(){panel.remove();document.body.classList.remove('has-local-map');}};
}
