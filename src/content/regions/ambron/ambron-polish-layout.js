import {AMBRON_BUILDINGS,AMBRON_STANDS,AMBRON_CIRCUIT,ambronDryDistance} from './ambron.js';
import {ambronHarbourDeck} from './ambron-capital.js';
import {AMBRON_CENTRE,CITY_STREETS,CITY_GATES,cityGatePoint,inAmbronOutline,segmentProjection,AMBRON_PALACE,CITY_GARDEN} from './ambron-city-layout.js';

const world=p=>({x:AMBRON_CENTRE.x+p.a,z:AMBRON_CENTRE.z+p.b});
const lanes=CITY_STREETS.flatMap(s=>s.points.slice(1).map((b,i)=>({a:s.points[i],b,width:s.width,id:s.id})));
const gates=CITY_GATES.map(g=>cityGatePoint(g.id)),stands=Object.values(AMBRON_STANDS);
const hits=(x,z,r,c)=>Number.isFinite(c.r)?Math.hypot(x-c.x,z-c.z)<r+c.r:
  Number.isFinite(c.hx)&&Number.isFinite(c.hz)&&Math.abs(x-c.x)<r+c.hx&&Math.abs(z-c.z)<r+c.hz;

/** Keep all new planting/furniture outside travel lanes, NPC stands, gate
 * approaches, canal banks and existing solids. No random positions or retries. */
export function ambronPolishClear(x,z,r,obstacles){
  const a=x-AMBRON_CENTRE.x,b=z-AMBRON_CENTRE.z;
  if(!inAmbronOutline(x,z)||ambronDryDistance(x,z)<r+2)return false;
  if(ambronHarbourDeck(x,z,r+1.5)!==null)return false;
  if(lanes.some(l=>segmentProjection(a,b,l.a,l.b).distance<l.width/2+r+.7))return false;
  if(gates.some(g=>Math.hypot(x-g.x,z-g.z)<10+r))return false;
  if(stands.some(s=>Math.hypot(x-s.x,z-s.z)<3+r))return false;
  if(a>CITY_GARDEN.minA-r-2&&a<CITY_GARDEN.maxA+r+2&&b>CITY_GARDEN.minB-r-2&&b<CITY_GARDEN.maxB+r+2)return false;
  if(Math.abs(x-AMBRON_PALACE.x)<AMBRON_PALACE.w/2+r+6&&Math.abs(z-AMBRON_PALACE.z)<AMBRON_PALACE.d/2+r+24)return false;
  if(AMBRON_BUILDINGS.some(h=>Math.abs(a-h.a)<h.w/2+r+.6&&Math.abs(b-h.b)<h.d/2+r+.6))return false;
  return !obstacles.some(c=>hits(x,z,r+.5,c));
}

export function* planAmbronPolishSteps({colliders,heightAt}){
  const occupied=[...colliders],plan={trees:[],lamps:[],benches:[],fountains:[],kerbs:[]};
  const place=(kind,x,z,r,yaw=0,variant=0)=>{
    if(!ambronPolishClear(x,z,r,occupied))return false;
    const y=heightAt(x,z),ys=[y,...[0,1,2,3].map(k=>heightAt(x+Math.cos(k*Math.PI/2)*r,z+Math.sin(k*Math.PI/2)*r))];
    if(Math.max(...ys)-Math.min(...ys)>(kind==='lamps'?.65:.38))return false;
    plan[kind].push({x,z,y:Math.min(...ys),yaw,variant,r});occupied.push({x,z,r});return true;
  };
  // A fountain in the market's unused western half, and a smaller southern court.
  for(const [a,b] of [[-16,-9],[25,165],[47,160]])place('fountains',AMBRON_CENTRE.x+a,AMBRON_CENTRE.z+b,2.7);
  let sample=0;
  for(const lane of lanes){
    const dx=lane.b.a-lane.a.a,dz=lane.b.b-lane.a.b,len=Math.hypot(dx,dz);
    for(let t=7;t<len-4;t+=15){
      if(++sample%8===0)yield;
      const x=AMBRON_CENTRE.x+lane.a.a+dx*t/len,z=AMBRON_CENTRE.z+lane.a.b+dz*t/len;
      for(const side of [-1,1]){
        const nx=dz/len*side,nz=-dx/len*side,yaw=Math.atan2(-nx,-nz);
        for(const extra of [2.8,4.6,6.5]){
          if(place('trees',x+nx*(lane.width/2+extra),z+nz*(lane.width/2+extra),1.55,yaw,sample%4))break;
        }
        const along=5.5,offset=lane.width/2+1.35;
        place('lamps',x+dx/len*along+nx*offset,z+dz/len*along+nz*offset,.25,yaw,sample%3);
        if(sample%3===0)place('benches',x-dx/len*5+nx*(lane.width/2+2.3),z-dz/len*5+nz*(lane.width/2+2.3),1.2,yaw);
      }
    }
    // Segmented kerbs lie flush with the walking surface, ending at crossings.
    for(let t=1;t<len-1;t+=2.5)for(const side of [-1,1]){
      const offset=lane.width/2+.12,p={a:lane.a.a+dx*t/len+dz/len*side*offset,b:lane.a.b+dz*t/len-dx/len*side*offset};
      const q=world(p);
      if(ambronDryDistance(q.x,q.z)<3||!inAmbronOutline(q.x,q.z))continue;
      if(ambronHarbourDeck(q.x,q.z,1)!==null)continue;
      if(lanes.some(other=>other!==lane&&segmentProjection(p.a,p.b,other.a,other.b).distance<other.width/2+.8))continue;
      if(AMBRON_CIRCUIT.gates.some(g=>Math.hypot(q.x-g.centre.x,q.z-g.centre.z)<10))continue;
      const half=Math.min(1.15,(len-t)/2),A={x:q.x-dx/len*half,z:q.z-dz/len*half},B={x:q.x+dx/len*half,z:q.z+dz/len*half};
      const ya=heightAt(A.x,A.z),yb=heightAt(B.x,B.z);
      if(Math.abs(ya-yb)<.7)plan.kerbs.push({a:{...A,y:ya},b:{...B,y:yb}});
    }
  }
  return plan;
}
