// Pure screen-space placement. A blocked marker moves to an unobstructed edge;
// when the HUD occupies every edge the sidebar remains the navigation guide.
export function warPointerPlacement(point,viewport,size,obstacles=[]){
  const gap=10,hx=size.width/2,hy=size.height/2,w=viewport.width,h=viewport.height;
  if(w<size.width+gap*2||h<size.height+gap*2)return null;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const wanted={x:clamp(point.x,hx+gap,w-hx-gap),y:clamp(point.y,hy+gap,h-hy-gap)};
  const clear=p=>obstacles.every(r=>p.x+hx+gap<=r.left||p.x-hx-gap>=r.right||p.y+hy+gap<=r.top||p.y-hy-gap>=r.bottom);
  if(clear(wanted))return {...wanted,shifted:false};
  const candidates=[];
  for(const y of [wanted.y,h*.25,h*.4,h*.55,h*.7,h*.85])for(const x of [hx+gap,w-hx-gap])candidates.push({x,y:clamp(y,hy+gap,h-hy-gap)});
  for(const x of [wanted.x,w*.25,w*.5,w*.75])for(const y of [hy+gap,h-hy-gap])candidates.push({x:clamp(x,hx+gap,w-hx-gap),y});
  const safe=candidates.filter(clear).sort((a,b)=>Math.hypot(a.x-wanted.x,a.y-wanted.y)-Math.hypot(b.x-wanted.x,b.y-wanted.y))[0];
  return safe?{...safe,shifted:true}:null;
}
