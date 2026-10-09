const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

// One bounded search when a soldier breaks, not a per-frame navigation system.
// Prefer an unobstructed way out; use a small grid only when scenery blocks it.
export function findRetreatRoute(start,hero,{centre,radius,clear,segment}){
  const heading=Math.atan2(start.x-hero.x,start.z-hero.z);
  const edge=Math.max(2,radius-1.5),steps=[0,.4,-.4,.8,-.8,1.3,-1.3,2,-2,Math.PI];
  const exits=steps.map(turn=>({x:centre.x+Math.sin(heading+turn)*edge,z:centre.z+Math.cos(heading+turn)*edge}));
  for(const p of exits)if(clear(p.x,p.z,.5)&&segment(start,p,.45))return [p];
  const stride=2.5,origin={x:start.x,z:start.z},queue=[{...origin,i:0,j:0,parent:null}],seen=new Set(['0,0']);
  let best=queue[0];
  const score=p=>distance(p,hero)+distance(p,centre)*.5;
  const directions=Array.from({length:8},(_,i)=>({i:Math.round(Math.sin(i*Math.PI/4)),j:Math.round(Math.cos(i*Math.PI/4))}));
  directions.sort((a,b)=>(b.i*Math.sin(heading)+b.j*Math.cos(heading))-(a.i*Math.sin(heading)+a.j*Math.cos(heading)));
  for(let head=0;head<queue.length&&head<1600;head++){
    const at=queue[head];if(score(at)>score(best))best=at;
    if(distance(at,centre)>=edge-stride&&distance(at,start)>8){best=at;break;}
    for(const d of directions){
      const i=at.i+d.i,j=at.j+d.j,key=`${i},${j}`;
      if(seen.has(key))continue;
      const p={x:origin.x+i*stride,z:origin.z+j*stride,i,j,parent:at};
      if(distance(p,centre)>edge||!clear(p.x,p.z,.5)) {seen.add(key);continue;}
      if(!segment(at,p,.45))continue;
      seen.add(key);queue.push(p);
    }
  }
  const path=[];for(let p=best;p.parent;p=p.parent)path.unshift({x:p.x,z:p.z});
  // Smooth only checked segments; never cut a corner through a house or cliff.
  const route=[];let at=start;
  while(path.length){let next=path.length-1;while(next>0&&!segment(at,path[next],.45))next--;at=path[next];route.push(at);path.splice(0,next+1);}
  return route;
}
