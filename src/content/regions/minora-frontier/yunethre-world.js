/** Independent grass country between Oremindi and Lotharn. All features use the
 * atlas footprint; neighbouring mountain and lake elevations remain untouched. */
import { REGION_CELLS, REGION_OUTLINES, hexAt, hexCentre, seamlessTerrainMix, relief } from '../../../world/terrain/region-world.js';
import { SOUTH_OREMINDI_LAKES } from '../south-oremindi/south-oremindi-world.js';
const freeze=Object.freeze, clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
const p=(x,z)=>freeze({x,z}),anchor=(q,r,dx=0,dz=0)=>{const a=hexCentre(q,r);return p(a.x+dx,a.z+dz);};
export const YUNETHRE='Yunethre';
export const YUNETHRE_CELLS=freeze(REGION_CELLS[YUNETHRE]??[]);
const cells=new Map(YUNETHRE_CELLS.map(c=>[`${c.q},${c.r}`,c]));
const outlines=REGION_OUTLINES[YUNETHRE]??[],vertices=outlines.flat();
export const YUNETHRE_BOUNDS=freeze({minX:Math.min(...vertices.map(p=>p.x)),maxX:Math.max(...vertices.map(p=>p.x)),minZ:Math.min(...vertices.map(p=>p.z)),maxZ:Math.max(...vertices.map(p=>p.z))});
export function yunethreOwns(x,z){const b=YUNETHRE_BOUNDS;if(x<b.minX||x>b.maxX||z<b.minZ||z>b.maxZ)return false;const c=hexAt(x,z);return cells.has(`${c.q},${c.r}`);}
const segment=(x,z,a,b)=>{const dx=b.x-a.x,dz=b.z-a.z,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1),0,1);return Math.hypot(x-a.x-t*dx,z-a.z-t*dz);};
const edges=outlines.flatMap(loop=>loop.map((a,i)=>[a,loop[(i+1)%loop.length]]));
export function yunethreInset(x,z){if(!yunethreOwns(x,z))return 0;return Math.min(...edges.map(([a,b])=>segment(x,z,a,b)));}
export const YUNETHRE_TOWN=freeze({id:'yunethre-free-town',name:'Lakeside Free Town',...anchor(-14,102),radius:57,level:18});
export const YUNETHRE_CAMP=freeze({id:'yunethre-centaur-camp',name:"Bane's Camp",...anchor(-11,102),radius:52,level:16});
export const YUNETHRE_RAID_DEPARTURE=anchor(-14,105);
// Raiders keep to the open grass passage, entering the northwestern Isareos
// hills well east of Elfland. They never pass through the neutral lake town.
export const YUNETHRE_RAID_ROUTE=freeze([
 YUNETHRE_CAMP,anchor(-12,102),p(-2796,-252),p(-2796,-186),p(-2802,-180),p(-2802,-108),p(-2826,-84),p(-2826,-48),p(-2820,-42),p(-2814,-42),p(-2808,-48),p(-2802,-48),p(-2790,-60),p(-2748,-60),
]);
export const YUNETHRE_ARRIVAL=p(YUNETHRE_TOWN.x+29,YUNETHRE_TOWN.z);
export const YUNETHRE_LAKE=SOUTH_OREMINDI_LAKES.find(l=>l.id==='oremindi-forest-tarn');
export const YUNETHRE_PATHS=freeze([
 freeze({id:'yunethre-western-trade-track',name:'The free-town track',width:4,points:freeze([p(YUNETHRE_TOWN.x-24,YUNETHRE_TOWN.z),YUNETHRE_TOWN,anchor(-13,102,4,13),anchor(-12,102,0,-9),YUNETHRE_CAMP,anchor(-10,101),anchor(-10,100)])}),
 freeze({id:'yunethre-southern-track',name:'The southern grass passage',width:4,points:freeze([anchor(-12,100),anchor(-12,101,12,4),anchor(-12,102,0,-9),anchor(-13,103),anchor(-14,104),YUNETHRE_RAID_DEPARTURE])}),
]);
export function yunethrePathDistance(x,z){let d=Infinity;for(const path of YUNETHRE_PATHS)for(let i=1;i<path.points.length;i++)d=Math.min(d,segment(x,z,path.points[i-1],path.points[i]));return d;}
export function yunethreReserved(x,z,margin=0){return [YUNETHRE_TOWN,YUNETHRE_CAMP].some(a=>Math.hypot(x-a.x,z-a.z)<a.radius+margin)||yunethrePathDistance(x,z)<4+margin||YUNETHRE_RAID_ROUTE.some((p,i)=>i>0&&segment(x,z,YUNETHRE_RAID_ROUTE[i-1],p)<3+margin);}
const baseAt=(x,z)=>{const m=seamlessTerrainMix(x,z);return m.base+relief(x,z,m.amp,m.wave);};
export function yunethreGround(x,z,base){const b=Number.isFinite(base)?base:baseAt(x,z);if(!yunethreOwns(x,z))return b;
 const inset=yunethreInset(x,z),edge=smooth(0,34,inset);
 const roll=13+2.7*Math.sin(x*.014+Math.sin(z*.008))+.9*Math.cos(z*.018)+1.4*Math.sin((x+z)*.027);
 let height=b+(roll-b)*edge;
 for(const site of [YUNETHRE_TOWN,YUNETHRE_CAMP]){const d=Math.hypot(x-site.x,z-site.z),weight=(1-smooth(site.radius*.78,site.radius+23,d))*edge;height+=(site.level-height)*weight;}
 return height;
}
export function yunethreFeatures(x,z){if(!yunethreOwns(x,z))return null;const height=yunethreGround(x,z),grade=Math.hypot(yunethreGround(x+.6,z)-yunethreGround(x-.6,z),yunethreGround(x,z+.6)-yunethreGround(x,z-.6))/1.2;
 return {height,grade,pathDistance:yunethrePathDistance(x,z),reserved:yunethreReserved(x,z),grove:Math.sin(x*.027)*Math.cos(z*.021)>.52};}
export function yunethreTint(x,z){if(!yunethreOwns(x,z))return null;const v=Math.sin(x*.013)*Math.cos(z*.019);return v>.4?'#92955f':v<-.4?'#aaa365':'#a0a067';}
export const YUNETHRE_LANDMARKS=freeze([YUNETHRE_TOWN,YUNETHRE_CAMP]);
// Every plains cell has permanent homes. Small herds retain stable IDs and move
// within their own patch, rather than spawning around the player.
export const YUNETHRE_WILDLIFE_ZONES=freeze(YUNETHRE_CELLS.map((cell,index)=>{
 const species=index%5===0?'boar':index%3===0?'upland-hare':'red-deer',sites=[];
 for(let i=0;i<72&&sites.length<2;i++){const angle=i*2.3999632297,rad=10+Math.sqrt(i/72)*31,x=cell.x+Math.cos(angle)*rad,z=cell.z+Math.sin(angle)*rad,f=yunethreFeatures(x,z);
  if(!f||f.reserved||f.grade>.45||sites.some(a=>Math.hypot(x-a[0],z-a[1])<9))continue;sites.push(freeze([x,z]));}
 if(!sites.length){for(let i=0;i<100&&sites.length<1;i++){const a=i*2.39996,r=47,x=cell.x+Math.cos(a)*r,z=cell.z+Math.sin(a)*r,f=yunethreFeatures(x,z);if(f&&!f.reserved&&f.grade<.6)sites.push(freeze([x,z]));}}
 return freeze({id:`yunethre-${cell.q}-${cell.r}`,region:YUNETHRE,species,habitat:'countryside',keepRegion:true,sourceCell:freeze([cell.q,cell.r]),minX:cell.x-46,maxX:cell.x+46,minZ:cell.z-46,maxZ:cell.z+46,sites:freeze(sites),radius:species==='boar'?.7:species==='upland-hare'?.3:.55,scale:1,minHeight:1,maxHeight:65,maxSlope:.65,note:'Persistent wildlife of the Yunethre steppe.'});
}).filter(z=>z.sites.length));
