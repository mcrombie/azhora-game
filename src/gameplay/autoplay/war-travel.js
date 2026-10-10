import {colliderOverlapsHeight} from '../../world/collision/walk-surfaces.js';

// Bounded, time-sliced route search for the spectator driver only. The rider
// still uses ordinary input/collision; this cannot move or teleport the hero.
export async function planWarTravel(world,from,to,{radius=.9,cancelled=()=>false,spacing=4,maxNodes=60000,obstacles=[]}={}){
  if(cancelled())return null;
  const clearance=radius+.35;
  const groundCache=new Map();
  const floor=(x,z)=>{const key=`${x.toFixed(3)},${z.toFixed(3)}`;if(!groundCache.has(key))groundCache.set(key,world.supportAt?.(x,z,{maxY:1000,stepUp:.45,groundSlope:false})?.height??world.heightAt(x,z));return groundCache.get(key);};
  const cache=new Map();
  const pass=(x,z)=>{
    const key=`${x.toFixed(2)},${z.toFixed(2)}`;if(cache.has(key))return cache.get(key);
    let ok=world.canExploreAt(x,z)&&world.readyAt(x,z)&&x>world.bounds.minX+clearance&&x<world.bounds.maxX-clearance&&z>world.bounds.minZ+clearance&&z<world.bounds.maxZ-clearance;
    if(ok)for(const c of world.nearColliders(x,z,clearance)){
      if(['river-water','pond-water'].includes(c.kind))continue;
      const overlaps=c.r!==undefined?Math.hypot(x-c.x,z-c.z)<c.r+clearance:Math.abs(x-c.x)<c.hx+clearance&&Math.abs(z-c.z)<c.hz+clearance;
      if(!overlaps)continue;
      if((Number.isFinite(c.minY)||Number.isFinite(c.maxY))&&!colliderOverlapsHeight(c,floor(x,z)))continue;
      ok=false;break;
    }
    if(ok)for(const c of obstacles){
      const reach=c.r+.35,d=Math.hypot(x-c.x,z-c.z),start=Math.hypot(from.x-c.x,from.z-c.z);
      // A moving soldier may overlap the start: allow motion away from them.
      if(d<reach&&!(start<reach&&d>=start-.001)&&(!Number.isFinite(c.y)||Math.abs(floor(x,z)-c.y)<2.6)){ok=false;break;}
    }
    cache.set(key,ok);return ok;
  };
  const line=(a,b)=>{const n=Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/.5);for(let i=1;i<=n;i++)if(!pass(a.x+(b.x-a.x)*i/n,a.z+(b.z-a.z)*i/n))return false;return true;};
  if(line(from,to))return [{...to}];
  const heap=[];
  function push(v){let i=heap.length;heap.push(v);while(i){const p=(i-1)>>1;if(heap[p].f<=v.f)break;heap[i]=heap[p];i=p;}heap[i]=v;}
  function pop(){const top=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&heap[c+1].f<heap[c].f)c++;if(heap[c].f>=last.f)break;heap[i]=heap[c];i=c;}heap[i]=last;}return top;}
  const gap=p=>Math.hypot(p.x-to.x,p.z-to.z),key=(i,j)=>`${i},${j}`;
  const start={x:from.x,z:from.z,i:0,j:0,g:0,f:gap(from),parent:null},best=new Map([[key(0,0),0]]);
  const bounds={minX:Math.min(from.x,to.x)-220,maxX:Math.max(from.x,to.x)+220,minZ:Math.min(from.z,to.z)-220,maxZ:Math.max(from.z,to.z)+220};
  push(start);let count=0,until=performance.now()+6;
  while(heap.length&&count++<maxNodes){
    if(cancelled())return null;
    if(performance.now()>until){await new Promise(r=>setTimeout(r,0));until=performance.now()+6;}
    const p=pop();if(p.g!==best.get(key(p.i,p.j)))continue;
    if(gap(p)<spacing*2&&line(p,to)){
      const path=[{...to}];for(let q=p;q.parent;q=q.parent)path.unshift({x:q.x,z:q.z});
      const smooth=[];let at=from,index=0;
      while(index<path.length){let end=index;while(end+1<path.length&&end-index<24&&line(at,path[end+1]))end++;smooth.push(path[end]);at=path[end];index=end+1;}
      return smooth;
    }
    for(const [di,dj] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]){
      const i=p.i+di,j=p.j+dj,x=from.x+i*spacing,z=from.z+j*spacing,q={x,z,i,j};
      if(x<bounds.minX||x>bounds.maxX||z<bounds.minZ||z>bounds.maxZ)continue;
      // Prefer land and bridges to a long swim without forbidding real water.
      const g=p.g+Math.hypot(di,dj)*spacing*(floor(x,z)<world.waterAt(x,z)-.8?2.5:1);
      if(g>=(best.get(key(i,j))??Infinity)||!line(p,q))continue;
      best.set(key(i,j),g);push({...q,g,f:g+gap(q)*1.08,parent:p});
    }
  }
  return null;
}
