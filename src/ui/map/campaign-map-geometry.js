// Union the existing atlas hex polygons by cancelling shared edges. No new geography.
export function parseCells(path) {
  return path.split(/[zZ]/).filter(s=>s.trim()).map(segment=>{
    const values=segment.match(/-?\d+(?:\.\d+)?/g).map(Number);
    return Array.from({length:values.length/2},(_,i)=>[values[i*2],values[i*2+1]]);
  });
}
const key=p=>p.map(n=>n.toFixed(3)).join(',');
export function unionCells(cells) {
  const edges=new Map();
  for(const cell of cells)for(let i=0;i<cell.length;i++){
    const a=cell[i],b=cell[(i+1)%cell.length],ka=key(a),kb=key(b),id=[ka,kb].sort().join('|');
    if(edges.has(id))edges.delete(id);else edges.set(id,{a,b,ka,kb});
  }
  const starts=new Map();
  for(const [id,edge]of edges){if(!starts.has(edge.ka))starts.set(edge.ka,new Map());starts.get(edge.ka).set(id,edge);}
  const loops=[];
  while(edges.size){
    let [id,edge]=edges.entries().next().value;const first=edge.ka,points=[edge.a];
    while(edge){edges.delete(id);starts.get(edge.ka).delete(id);points.push(edge.b);if(edge.kb===first)break;const next=starts.get(edge.kb)?.entries().next().value;if(!next)throw Error('Unclosed atlas territory boundary');[id,edge]=next;}
    loops.push(points);
  }
  const area=points=>Math.abs(points.reduce((sum,a,i)=>{const b=points[(i+1)%points.length];return sum+a[0]*b[1]-b[0]*a[1];},0)/2);
  loops.sort((a,b)=>area(b)-area(a));
  return {path:loops.map(loop=>'M'+loop.map(p=>p.join(',')).join('L')+'Z').join(''),loops,edgeCount:loops.reduce((n,p)=>n+p.length-1,0)};
}
export function inside(point,polygon){let hit=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;}
export function labelAnchor(cells,loops){
  const outer=loops[0];if(!outer)return {x:0,y:0,width:0,height:0};
  const candidates=cells.map(c=>[c.reduce((n,p)=>n+p[0],0)/c.length,c.reduce((n,p)=>n+p[1],0)/c.length]).filter(p=>inside(p,outer));
  const minX=Math.min(...outer.map(p=>p[0])),maxX=Math.max(...outer.map(p=>p[0])),minY=Math.min(...outer.map(p=>p[1])),maxY=Math.max(...outer.map(p=>p[1]));
  const cx=(minX+maxX)/2,cy=(minY+maxY)/2;
  let best=candidates[0]||outer[0],score=-Infinity;
  for(const p of candidates){let distance=Infinity;for(const loop of loops)for(let i=1;i<loop.length;i++){const a=loop[i-1],b=loop[i],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy)));distance=Math.min(distance,Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy));}const value=distance-Math.hypot(p[0]-cx,p[1]-cy)*.12;if(value>score){score=value;best=p;}}
  return {x:best[0],y:best[1],width:maxX-minX,height:maxY-minY};
}
// Keep a single country name visible when looking at an acquired exclave.
export function visibleAnchor(group,{x,y,scale,width,height}){
  const visible=p=>{const sx=x+p.x*scale,sy=y+p.y*scale;return sx>50&&sy>75&&sx<width-50&&sy<height-35;};
  if(visible(group.anchor))return group.anchor;
  const cx=(width/2-x)/scale,cy=(height/2-y)/scale;
  let best=null,distance=Infinity;
  for(const cell of group.cells){const p={x:cell.reduce((n,c)=>n+c[0],0)/cell.length,y:cell.reduce((n,c)=>n+c[1],0)/cell.length};if(!visible(p))continue;const d=Math.hypot(p.x-cx,p.y-cy);if(d<distance){distance=d;best=p;}}
  return best;
}
