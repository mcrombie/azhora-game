/** An independent west-flowing stream along the North/South Orsa boundary.
 * Its spring stops in the eastern hills, well short of the larger river. */
export const ORSA_RIVER_EDGES=Object.freeze([
  [[31,49],[30,50]],[[31,49],[31,50]],[[32,49],[31,50]],
  [[32,49],[32,50]],[[33,49],[32,50]],[[33,50],[32,50]],
].map(([a,b])=>Object.freeze({a:Object.freeze(a),b:Object.freeze(b),size:'small'})));
// Remove the mistaken connection too when refreshing an already-adjusted atlas.
export const ORSA_RETIRED_RIVER_KEYS=Object.freeze([
  '32,51|33,50','33,50|33,51','33,51|34,50',
]);
// A connected upland belt on Orsa's eastern side; western coastal ground stays low.
export const ORSA_HEADWATER_HILLS=Object.freeze([
  [37,45],[37,46],[36,47],[35,48],[36,48],[34,49],[35,49],
  [33,50],[34,50],[31,51],[32,51],[33,51],[30,52],[29,53],[28,54],
].map(([q,r])=>Object.freeze({q,r,region:r<=50?'North Orsa':'South Orsa'})));
export const riverEdgeKey=e=>[e.a.join(','),e.b.join(',')].sort().join('|');
const keys=new Set(ORSA_RIVER_EDGES.map(riverEdgeKey));
export function orsaRiverProfile(course,headHeight=()=>12){
  if(!course.edges.length||!course.edges.every(e=>keys.has(riverEdgeKey(e))))return null;
  const points=course.points.map(p=>({...p}));
  if(points[0].x>points.at(-1).x)points.reverse();
  // Mouth first; no uphill humps that could trap the stream inland.
  const length=points.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-points[i].x,p.z-points[i].z),0),head=Math.max(.1,headHeight(points.at(-1)));
  let distance=0;
  return {name:'Orsa boundary stream',orsa:true,width:1.6,depth:.6,points:points.map((p,i)=>{
    if(i)distance+=Math.hypot(p.x-points[i-1].x,p.z-points[i-1].z);
    return {...p,y:.025+(head-.025)*distance/length};
  })};
}
