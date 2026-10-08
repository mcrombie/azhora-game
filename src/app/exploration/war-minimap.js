import {battlefieldBoundary} from './battlefield-area.js';
import {TRANSFORM} from '../../world/terrain/region-world.js';
import {miniMapProjection} from '../../ui/map/minimap.js';

// Army sightings are already filtered by the same intelligence projection used
// by M. Do not derive positions from hidden simulation armies here.
export function warMinimapEvents({armies=[],battles=[],selected=null,known=()=>true,regionName=id=>id}){
  const isSelected=(kind,id)=>selected?.kind===kind&&selected.id===id;
  const events=armies.filter(a=>['marching','retreating'].includes(a.status)||isSelected('army',a.id)).map(a=>({
    id:`army-${a.id}`,target:{kind:'army',id:a.id},kind:'army',label:a.name,color:a.color,
    detail:a.detail+(a.physical?'':' Position is a daily estimate.'),...TRANSFORM.atlasToWorld(a.x,a.y),selected:isSelected('army',a.id),
  }));
  for(const b of battles)if(b.status==='active'&&known(b.location))events.push({
    id:b.id,target:{kind:'battle',id:b.id},kind:'battle',label:`Battle at ${regionName(b.region)}`,
    detail:`Active until day ${b.endsOn}. ${b.rally?.status==='available'?'Rally assault available: return on foot.':b.heroResult?'You have already participated.':'Approach the battle boundary to join on foot or horseback.'}`,
    boundary:b.entryRadius?battlefieldBoundary(b):null,color:'#f2b468',...b.location,selected:isSelected('battle',b.id),
  });
  return events.filter(e=>Number.isFinite(e.x)&&Number.isFinite(e.z));
}

export function projectWarMinimap(events,{position,radius=85,size=300,northOffset=0}){
  const view=miniMapProjection({position,radius,size});const placed=[];
  // Keep exact bearings when two distant armies share a direction: stack their
  // symbols inward along the same radial line rather than inventing positions.
  for(const event of [...events].sort((a,b)=>Number(b.selected)-Number(a.selected)||Number(b.kind==='battle')-Number(a.kind==='battle')||String(a.id).localeCompare(String(b.id)))){
    const p=view.project(event,{clampToRing:true,inset:13});if(!p)continue;
    const dx=p.x-view.center,dy=p.y-view.center;
    let x=view.center+dx*Math.cos(northOffset)-dy*Math.sin(northOffset),y=view.center+dx*Math.sin(northOffset)+dy*Math.cos(northOffset);
    const bearing=p.bearing+northOffset;
    if(p.clamped)for(let lane=0;lane<5&&placed.some(m=>Math.hypot(m.x-x,m.y-y)<21);lane++){x-=Math.sin(bearing)*22;y+=Math.cos(bearing)*22;}
    const boundary=event.boundary?.map(q=>{const p=view.project(q),dx=p.x-view.center,dy=p.y-view.center;return {x:view.center+dx*Math.cos(northOffset)-dy*Math.sin(northOffset),y:view.center+dx*Math.sin(northOffset)+dy*Math.cos(northOffset)};});
    placed.push({...event,boundary,x,y,distance:p.distance,clamped:p.clamped,bearing});
  }
  return placed;
}

export function drawWarMinimap(ctx,markers){
  ctx.save();ctx.beginPath();ctx.arc(150,150,148,0,Math.PI*2);ctx.clip();
  for(const m of markers)if(m.boundary?.length){ctx.beginPath();m.boundary.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle='#e3ad452e';ctx.fill();ctx.strokeStyle='#9a5c24';ctx.lineWidth=2.5;ctx.setLineDash([6,3]);ctx.stroke();ctx.setLineDash([]);}
  ctx.restore();
  for(const m of [...markers].reverse()){
    ctx.save();ctx.translate(m.x,m.y);
    ctx.beginPath();ctx.arc(0,0,m.selected?12:9,0,Math.PI*2);ctx.fillStyle='#17352fea';ctx.fill();
    ctx.lineWidth=m.selected?2.4:1;ctx.strokeStyle=m.selected?'#ffe8a0':m.color;ctx.stroke();
    ctx.strokeStyle=m.color;ctx.fillStyle=m.color;ctx.lineWidth=2;ctx.lineCap='round';
    if(m.kind==='battle'){
      ctx.beginPath();ctx.moveTo(-5,5);ctx.lineTo(5,-5);ctx.moveTo(-5,-5);ctx.lineTo(5,5);ctx.moveTo(-6,2);ctx.lineTo(-2,6);ctx.moveTo(2,6);ctx.lineTo(6,2);ctx.stroke();
    }else{
      ctx.beginPath();ctx.moveTo(-4,6);ctx.lineTo(-4,-6);ctx.stroke();ctx.beginPath();ctx.moveTo(-3,-6);ctx.lineTo(6,-3);ctx.lineTo(-3,0);ctx.closePath();ctx.fill();
    }
    if(m.clamped){ctx.rotate(m.bearing);ctx.beginPath();ctx.moveTo(-4,-12);ctx.lineTo(0,-18);ctx.lineTo(4,-12);ctx.closePath();ctx.fill();}
    ctx.restore();
  }
}
