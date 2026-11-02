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
// Authored agricultural scenery only. These plots have no production or
// population values; campaign.js remains the authority for any future economy.
export const YUNETHRE_FIELDS=freeze([
 {id:'laketown-hay',region:'Yunethre',x:YUNETHRE_TOWN.x+78,z:YUNETHRE_TOWN.z+65,w:48,d:40,kind:'meadow',yaw:.12,index:0},
 {id:'laketown-grain',region:'Yunethre',x:YUNETHRE_TOWN.x+12,z:YUNETHRE_TOWN.z+96,w:52,d:34,kind:'grain',yaw:-.12,index:1},
 {id:'laketown-south-grain',region:'Yunethre',x:YUNETHRE_TOWN.x+10,z:YUNETHRE_TOWN.z+143,w:58,d:32,kind:'grain',yaw:.06,index:2},
 {id:'laketown-east-oats',region:'Yunethre',x:YUNETHRE_TOWN.x+105,z:YUNETHRE_TOWN.z+116,w:44,d:38,kind:'grain',yaw:.13,index:3},
 {id:'laketown-kitchen-garden',region:'Yunethre',x:YUNETHRE_TOWN.x+80,z:YUNETHRE_TOWN.z-30,w:34,d:24,kind:'fallow',yaw:.08,index:4},
].map(freeze));
export const YUNETHRE_ORCHARD=freeze({id:'laketown-orchard',x:YUNETHRE_TOWN.x+62,z:YUNETHRE_TOWN.z-68,w:40,d:35,yaw:0});
export const YUNETHRE_FARMYARD=freeze({x:YUNETHRE_TOWN.x+55,z:YUNETHRE_TOWN.z+111,radius:14});
// Roughly concentric lanes let the settlement grow around its council common,
// rather than presenting six isolated houses on an empty square.
export const YUNETHRE_TOWN_LOTS=freeze([
 ['common-house',-7,-21,13,10,6.2,0,'human'],
 ['timber-house',22,-21,8,7,4.5,0,'human'],
 ['root-house',-20,19,8,8,4.7,2.3,'elf'],
 ['centaur-house',8,26,14,10,4.6,Math.PI,'centaur'],
 ['small-house',33,18,7,7,4.3,-2.07,'satyr'],
 ['tall-eaves',-3,-41,7,8,5.2,0,'elf'],
 ['weavers',-17,-39,8,8,4.5,.25,'elf'],
 ['inn',15,-43,9,9,6.4,-.12,'human'],
 ['potters',35,-42,9,8,4.6,-.35,'dwarf'],
 ['east-barn',48,-22,8,10,4.8,-1.25,'human'],
 ['herbalist',49,17,7,8,4.2,-1.7,'elf'],
 ['south-workshop',43,38,10,8,4.5,-2.4,'dwarf'],
 ['centaur-courtyard',23,47,10,9,4.2,Math.PI,'centaur'],
 ['south-cottage',5,48,8,8,4.3,Math.PI,'satyr'],
 ['willow-cottage',-15,47,8,7,4.2,2.8,'elf'],
 ['lake-smokehouse',-33,34,7,8,4.5,1.0,'human'],
 ['lakeside-workshop',-26,-13,7,8,4.2,1.3,'human'],
].map(([id,dx,dz,w,d,h,yaw,style])=>freeze({id:`yunethre-${id}`,x:YUNETHRE_TOWN.x+dx,z:YUNETHRE_TOWN.z+dz,w,d,h,yaw,style})));
const inPlot=(f,x,z,margin)=>{const dx=x-f.x,dz=z-f.z,c=Math.cos(f.yaw),s=Math.sin(f.yaw);return Math.abs(dx*c-dz*s)<f.w/2+margin&&Math.abs(dx*s+dz*c)<f.d/2+margin;};
export function yunethreFieldAt(x,z,margin=0){return [...YUNETHRE_FIELDS,YUNETHRE_ORCHARD].some(f=>inPlot(f,x,z,margin));}
export const YUNETHRE_CAMP=freeze({id:'yunethre-centaur-camp',name:"Bane's Camp",...anchor(-11,102),radius:52,level:16});
// A dry, gently sloping practice/assembly meadow, not a separate battle arena.
// Its grass remains terrain; reserving it keeps trees and wildlife homes out of
// the space used by the camp's archers and the chapter encounter.
export const YUNETHRE_CAMP_MEADOW=freeze({x:YUNETHRE_CAMP.x,z:YUNETHRE_CAMP.z+85,radius:38,clearance:44,
 approach:p(YUNETHRE_CAMP.x,YUNETHRE_CAMP.z+51)});
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
export function yunethreReserved(x,z,margin=0){return yunethreFieldAt(x,z,margin)||Math.hypot(x-YUNETHRE_CAMP_MEADOW.x,z-YUNETHRE_CAMP_MEADOW.z)<YUNETHRE_CAMP_MEADOW.clearance+margin||[YUNETHRE_TOWN,YUNETHRE_CAMP,YUNETHRE_FARMYARD].some(a=>Math.hypot(x-a.x,z-a.z)<a.radius+margin)||YUNETHRE_TOWN_LOTS.some(a=>Math.hypot(x-a.x,z-a.z)<Math.hypot(a.w,a.d)/2+4+margin)||yunethrePathDistance(x,z)<4+margin||YUNETHRE_RAID_ROUTE.some((p,i)=>i>0&&segment(x,z,YUNETHRE_RAID_ROUTE[i-1],p)<3+margin);}
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
export function yunethreTint(x,z){if(!yunethreOwns(x,z))return null;const v=Math.sin(x*.013)*Math.cos(z*.019);return v>.4?'#849766':v<-.4?'#a4a271':'#93a16c';}
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
