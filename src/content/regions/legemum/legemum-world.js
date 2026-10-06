/** Natural Legemum: damp tin-bearing hills, Atlantic-facing headlands and peat
 * hollows. The atlas owns its coastline. Nothing here builds a town or a mine. */
import { REGION_CELLS, REGION_OUTLINES, hexAt, hexOwnerAt, regionAt, landDistance, SEA_LEVEL } from '../../../world/terrain/region-world.js';
const freeze=Object.freeze,point=(x,z)=>freeze({x,z});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
export const LEGEMUM='Legemum';
export const LEGEMUM_CELLS=REGION_CELLS.Legemum??freeze([]);
const cells=new Map(LEGEMUM_CELLS.map(c=>[`${c.q},${c.r}`,c]));
const outline=REGION_OUTLINES.Legemum??[];
export const LEGEMUM_BOUNDS=freeze({minX:Math.min(...LEGEMUM_CELLS.map(c=>c.x))-62,maxX:Math.max(...LEGEMUM_CELLS.map(c=>c.x))+62,
  minZ:Math.min(...LEGEMUM_CELLS.map(c=>c.z))-62,maxZ:Math.max(...LEGEMUM_CELLS.map(c=>c.z))+62});
export function legemumOwns(x,z){const b=LEGEMUM_BOUNDS;if(x<b.minX||x>b.maxX||z<b.minZ||z>b.maxZ)return false;const h=hexAt(x,z);return cells.has(`${h.q},${h.r}`);}
export function legemumSegment(x,z,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1),0,1);return Math.hypot(x-a.x-dx*t,z-a.z-dz*t);}
const edges=outline.flatMap(loop=>loop.map((a,i)=>[a,loop[(i+1)%loop.length]]));
// Only mainland seams feather the hill profile away. Coastal cliffs instead
// fall to the established shoreline; no offshore rock becomes new land.
const mainlandEdges=edges.filter(([a,b])=>landDistance((a.x+b.x)/2,(a.z+b.z)/2)>16);
export const legemumSeamDistance=(x,z)=>Math.min(...mainlandEdges.map(([a,b])=>legemumSegment(x,z,a,b)));
// Telemonia's border is a zigzag of hex edges, and the nearest of them changes along the lines halfway between
// two: a feather laid off that distance creased there, as a lit band down the hills. Off Telemonia's edges alone
// the distance is a smooth minimum (over SOFT_SEAM metres), so the hills come down to the rim's foot in one slope.
const SOFT_SEAM=8;
const besideTelemonia=([a,b])=>{const mx=(a.x+b.x)/2,mz=(a.z+b.z)/2,dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz)||1;
  return hexOwnerAt(mx-dz/l,mz+dx/l)==='Telemonia'||hexOwnerAt(mx+dz/l,mz-dx/l)==='Telemonia';};
const telemoniaEdges=mainlandEdges.filter(besideTelemonia),otherEdges=mainlandEdges.filter(edge=>!besideTelemonia(edge));
function legemumFeatherDistance(x,z){
  let other=Infinity,sum=0;
  for(const [a,b] of otherEdges)other=Math.min(other,legemumSegment(x,z,a,b));
  for(const [a,b] of telemoniaEdges)sum+=Math.exp(-legemumSegment(x,z,a,b)/SOFT_SEAM);
  return Math.min(other,sum>0?-SOFT_SEAM*Math.log(sum):Infinity);
}
export const LEGEMUM_ARRIVAL=point(-1970,1535);
export const LEGEMUM_LANDMARKS=freeze([
  freeze({id:'legemum-tin-saddle',name:'The Tin Hills',region:59,...LEGEMUM_ARRIVAL,radius:55}),
  freeze({id:'legemum-west-headland',name:'The Sea-plunger Headland',region:59,x:-2380,z:1590,radius:60}),
  freeze({id:'legemum-haur',name:'The Haur Meadow',region:59,x:-2060,z:1670,radius:44}),
  freeze({id:'legemum-peat-hollow',name:'The Sphagnum Hollow',region:59,x:-2080,z:1750,radius:42}),
  freeze({id:'legemum-alder-fold',name:'The Alder Fold',region:59,x:-1950,z:1740,radius:45}),
  freeze({id:'legemum-south-tor',name:'The Slate Tor',region:59,x:-1850,z:1920,radius:42}),
]);
const trail=(id,coords)=>freeze({id,width:3.2,points:freeze(coords.map(([x,z])=>point(x,z)))});
export const LEGEMUM_TRAILS=freeze([
  trail('legemum-natural-spine',[[-1970,1535],[-2050,1535],[-2110,1585],[-2060,1670],[-2080,1750],[-2010,1815],[-1930,1870],[-1850,1920]]),
  trail('legemum-headland-saddle',[[-2060,1670],[-2140,1678],[-2210,1658],[-2280,1620],[-2380,1590]]),
  trail('legemum-alder-fold-path',[[-2080,1750],[-2030,1720],[-1950,1740]]),
]);
const ellipse=(x,z,cx,cz,rx,rz)=>Math.hypot((x-cx)/rx,(z-cz)/rz);
export function legemumHabitat(x,z){
  if(!legemumOwns(x,z))return null;
  if(ellipse(x,z,-2080,1750,50,35)<1)return 'bog';
  if(ellipse(x,z,-1950,1740,62,56)<1||ellipse(x,z,-2220,1610,60,43)<1)return 'wood';
  if(ellipse(x,z,-2060,1670,59,42)<1)return 'meadow';
  if(landDistance(x,z)<24)return 'coast';
  if(z<1630&&x>-2245&&x<-2010)return 'tin-hills';
  return 'heath';
}
/** Called after existing rivers/coast shaping. Wet beds and the first metres
 * of shore are untouched. Broad smooth hills leave a walking route round every
 * exposed face; climbing is useful on the short rock faces, never mandatory. */
export function legemumGround(x,z,incoming){
  if(!legemumOwns(x,z)||incoming<=SEA_LEVEL+.45)return incoming;
  const shore=landDistance(x,z);if(shore<=2)return incoming;
  let target=10+2*Math.sin(x*.018+z*.011)+1.2*Math.cos(z*.026-x*.009);
  target+=34*Math.exp(-(((x+2115)/155)**2+((z-1563)/96)**2));
  target+=18*Math.exp(-(((x+2230)/95)**2+((z-1600)/71)**2));
  target+=28*Math.exp(-(((x+2391)/71)**2+((z-1583)/55)**2));
  target+=25*Math.exp(-(((x+1860)/78)**2+((z-1923)/63)**2));
  target+=6*Math.exp(-(((x+2000)/128)**2+((z-1815)/88)**2));
  const meadow=1-smooth(.4,1.5,ellipse(x,z,-2060,1670,59,42));
  target=mix(target,18+.01*(x+2060)+.35*Math.sin(z*.052),meadow);
  const peat=1-smooth(.25,1.45,ellipse(x,z,-2080,1750,50,35));
  target=mix(target,11.5+.45*Math.sin(x*.04)*Math.sin(z*.04),peat);
  // Headlands keep a rocky bluff; sheltered bays have a longer, gentler fall.
  const exposed=x<-2250||z>1875,shoreWeight=smooth(2,exposed?22:40,shore);
  const seamWeight=smooth(0,48,legemumFeatherDistance(x,z));
  return mix(incoming,target,shoreWeight*seamWeight);
}
export function legemumTint(x,z){
  const habitat=legemumHabitat(x,z);if(!habitat)return null;
  return habitat==='bog'?0x66745a:habitat==='coast'?0x87917a:habitat==='wood'?0x66845e:habitat==='tin-hills'?0x849077:habitat==='meadow'?0x87995e:0x7e9367;
}
/** Exposed slate headlands retain stone below the tide so shore triangles stay grey; sheltered bays keep sand. */
export function legemumShoreTint(x,z,distance){
  if(distance<-30||distance>24||!(x<-2250||z>1875)||regionAt(x,z)?.name!==LEGEMUM)return null;
  return {sand:0,rock:1-smooth(12,24,distance),stone:'#78817e'};
}
export function legemumSlope(x,z,heightAt){const r=1;return Math.hypot((heightAt(x+r,z)-heightAt(x-r,z))/(2*r),(heightAt(x,z+r)-heightAt(x,z-r))/(2*r));}
/** Routes and landmark arrival circles stay free of scenery collision. */
export function legemumClear(x,z,margin=0){
  if(LEGEMUM_LANDMARKS.some(p=>Math.hypot(x-p.x,z-p.z)<5+margin))return true;
  return LEGEMUM_TRAILS.some(p=>p.points.slice(1).some((b,i)=>legemumSegment(x,z,p.points[i],b)<p.width/2+1.4+margin));
}
export const LEGEMUM_VIEWS=freeze({
  'legemum-headland':freeze({eye:{x:-2455,z:1700,y:65},target:{x:-2380,z:1590,y:22}}),
  'legemum-hills':freeze({eye:{x:-1980,z:1660,y:67},target:{x:-2140,z:1565,y:28}}),
  'legemum-hollow':freeze({eye:{x:-2168,z:1820,y:38},target:{x:-2058,z:1725,y:12}}),
  'legemum-woods':freeze({eye:{x:-1980,z:1790,y:28},target:{x:-1940,z:1720,y:17}}),
  // The border with Telemonia (src/content/regions/telemonia/telemonia-world.js, `telemoniaSeamBedrock`): the south pass's mouth from the
  // tin hills' flank, the rim's foot from Legemum, and the same foot from over the rim's outer face.
  'legemum-south-pass':freeze({eye:{x:-2133,z:1505,y:39},target:{x:-2121,z:1440,y:18}}),
  'legemum-border':freeze({eye:{x:-1985,z:1535,y:36},target:{x:-2075,z:1462,y:14}}),
  'legemum-border-from-telemonia':freeze({eye:{x:-2080,z:1440,y:46},target:{x:-2010,z:1500,y:18}}),
});
