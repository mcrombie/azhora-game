/** Selemis: an unwalled trading city on the atlas island Selemi.
 * Local U follows the crescent; V points inland from the Seloca. Canals are
 * excavated tidal channels, not painted roads. The surrounding sea is unchanged.
 */
import { hexOwnerAt, landDistance, SEA_LEVEL } from './region-world.js';
const freeze=Object.freeze, clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
export const SELAMUS=freeze({id:'selamus',name:'Selemis',region:54,x:-824,z:2454,yaw:-Math.PI/6,
  bounds:freeze({minX:-1020,maxX:-580,minZ:2280,maxZ:2620}),waterline:SEA_LEVEL});
export const selamusPoint=(u,v)=>({x:SELAMUS.x+Math.sqrt(3)/2*u-.5*v,z:SELAMUS.z+.5*u+Math.sqrt(3)/2*v});
export const selamusLocal=(x,z)=>({u:(x-SELAMUS.x)*Math.sqrt(3)/2+(z-SELAMUS.z)*.5,v:-(x-SELAMUS.x)*.5+(z-SELAMUS.z)*Math.sqrt(3)/2});
export const inSelamusBox=(x,z)=>x>SELAMUS.bounds.minX&&x<SELAMUS.bounds.maxX&&z>SELAMUS.bounds.minZ&&z<SELAMUS.bounds.maxZ;
export const selamusFloor=(x,z)=>{const {v}=selamusLocal(x,z);return 3.2+Math.max(0,v-10)*.055;};
const canal=(id,name,width,points)=>freeze({id,name,width,points:freeze(points.map(([u,v])=>freeze(selamusPoint(u,v))))});
export const SELAMUS_CANALS=freeze([
  canal('selamus-grand-canal','The Grand Canal',13,[[-225,8],[-165,6],[-110,-3],[-55,-7],[0,0],[55,7],[115,1],[172,15],[222,18]]),
  canal('selamus-harbor-canal','The Exchange Canal',10,[[25,3.2],[25,-27],[18,-49],[17,-80],[17,-108]]),
  canal('selamus-west-canal','The Chandlers Canal',7,[[-110,-3],[-110,-36],[-116,-66],[-116,-115]]),
  canal('selamus-east-canal','The Silk Canal',7,[[115,1],[115,-25],[125,-58],[128,-112]]),
]);
const segments=SELAMUS_CANALS.flatMap(c=>c.points.slice(1).map((b,i)=>({a:c.points[i],b,width:c.width,id:c.id})));
export function selamusCanalAt(x,z){
  if(!inSelamusBox(x,z))return null;
  let best=null;
  for(const segment of segments){const {a,b,width}=segment,dx=b.x-a.x,dz=b.z-a.z,l2=dx*dx+dz*dz,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/l2),distance=Math.hypot(x-a.x-dx*t,z-a.z-dz*t),edge=distance-width/2;
    if(!best||edge<best.edge)best={...segment,t,distance,edge,x:a.x+dx*t,z:a.z+dz*t};}
  return best;
}
export function selamusUrban(x,z,margin=0){
  if(!inSelamusBox(x,z)||hexOwnerAt(x,z)!=='Selemi')return false;
  const {v}=selamusLocal(x,z);
  return landDistance(x,z)>9-margin&&v<88+margin;
}
export const SELAMUS_PLAZAS=freeze([
  freeze({id:'selamus-tide-square',name:'The Square of Tides',...selamusPoint(0,30),u:0,v:30,width:48,depth:26}),
  freeze({id:'selamus-exchange-square',name:'The Merchants Exchange',...selamusPoint(-43,-37),u:-43,v:-37,width:34,depth:22}),
  freeze({id:'selamus-east-market',name:'The Saffron Market',...selamusPoint(79,-35),u:79,v:-35,width:30,depth:20}),
]);
const spec=(id,name,kind,u,v,width,depth,height,palette=0)=>freeze({id,name,kind,...selamusPoint(u,v),u,v,width,depth,height,palette,yaw:SELAMUS.yaw});
const landmarks=[
  spec('selamus-temple','Palace of the Tides','temple',0,60,42,30,32),
  spec('selamus-bell-tower','The Mariners Beacon','campanile',-36,39,10,10,49),
  spec('selamus-exchange','The Exchange Hall','exchange',-48,-58,29,16,18,1),
  spec('selamus-archive','The Sea Archive','archive',68,56,28,21,23,4),
  spec('selamus-arsenal','The Shipwrights Hall','arsenal',161,-21,24,19,15,2),
];
const buildings=[...landmarks];
const accessClear=(u,v,width,depth)=>{
  // Side-canal bridge approaches are east/west, unlike the five cross streets.
  for(const [bu,bv,length,w] of [[23,-34,29,5],[-111,-40,26,4],[118,-36,26,4]])
    if(Math.abs(u-bu)<(width+length)/2+2&&Math.abs(v-bv)<(depth+w)/2+2)return false;
  // Keep the shore ends of the three surveyed freight piers open to the city.
  for(const [x,z] of [[-810,2378],[-736,2438],[-716,2419]]){
    const p=selamusLocal(x,z);if(Math.hypot(u-p.u,v-p.v)<Math.hypot(width,depth)/2+8)return false;
  }
  return true;
};
// Blocks are small enough for narrow lanes, broad enough for water-facing
// palazzi. Rejection is deterministic and tests the entire foundation.
for(let row=0;row<13;row++)for(let col=0;col<30;col++){
  const u=-218+col*16,v=-105+row*16;
  const width=9+(col%2),depth=10+(row+col)%2,height=10+((col*7+row*11)%5)*2.3;
  const p=selamusPoint(u,v),corners=[[-1,-1],[-1,1],[1,-1],[1,1]].map(([a,b])=>selamusPoint(u+a*(width/2+2),v+b*(depth/2+2)));
  if(!corners.every(q=>selamusUrban(q.x,q.z)&&selamusCanalAt(q.x,q.z).edge>3))continue;
  if(SELAMUS_PLAZAS.some(s=>Math.abs(u-s.u)<(width+s.width)/2+2&&Math.abs(v-s.v)<(depth+s.depth)/2+2))continue;
  if(buildings.some(b=>Math.abs(u-b.u)<(width+b.width)/2+3&&Math.abs(v-b.v)<(depth+b.depth)/2+3))continue;
  if([-145,-81,0,90,140].some(street=>Math.abs(u-street)<width/2+2))continue;
  if(!accessClear(u,v,width,depth))continue;
  buildings.push(spec(`selamus-house-${row}-${col}`,row<7?'Merchant palazzo':'Terrace house',row<3?'warehouse':(row+col)%4===0?'palazzo':'house',u,v,width,depth,height,(col+row*3)%7));
}
export const SELAMUS_BUILDINGS=freeze(buildings);
const bridge=(id,u,v,alongU,width=5,length=32)=>{
  const a=selamusPoint(u-(alongU?length/2:0),v-(alongU?0:length/2));
  const b=selamusPoint(u+(alongU?length/2:0),v+(alongU?0:length/2));
  return freeze({id,a:freeze(a),b:freeze(b),width,rise:2.1});
};
export const SELAMUS_BRIDGES=freeze([
  bridge('selamus-west-bridge',-145,3,false),bridge('selamus-chandlers-bridge',-81,-5,false),
  bridge('selamus-tide-bridge',0,0,false,8,36),bridge('selamus-silk-bridge',90,4,false),bridge('selamus-east-bridge',140,7,false),
  bridge('selamus-exchange-bridge',23,-34,true,5,29),bridge('selamus-head-bridge',-111,-40,true,4,26),bridge('selamus-saffron-bridge',118,-36,true,4,26),
]);
export const SELAMUS_MAP_BRIDGES=freeze(SELAMUS_BRIDGES.map(({id,a,b,width})=>{
  const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);
  return freeze({id,crossing:freeze({x:(a.x+b.x)/2,z:(a.z+b.z)/2}),
    axis:freeze({x:dx/length,z:dz/length}),side:freeze({x:-dz/length,z:dx/length}),halfSpan:length/2,halfWidth:width/2});
}));
export const SELAMUS_ARRIVAL=freeze(selamusPoint(0,22));
export const SELAMUS_LANDMARKS=freeze([
  freeze({id:'selamus',name:'Selemis',region:54,...selamusPoint(0,30),radius:215,description:'Azhora’s great island trading city: canals, merchant palazzi and open harbors, defended by its fleet.'}),
  ...landmarks.map(b=>freeze({id:b.id,name:b.name,region:54,x:b.x,z:b.z,radius:22,description:b.kind==='temple'?'Ancient sea-god colonnades beneath a later palace of copper domes and open loggias.':'A landmark of Selemis’s maritime trade.'})),
]);
export function selamusGround(x,z,incoming){
  if(!inSelamusBox(x,z))return incoming;
  const owner=hexOwnerAt(x,z),d=landDistance(x,z);
  if(owner!=='Selemi'&&owner!=='Open country'&&d>0)return incoming;
  const {u,v}=selamusLocal(x,z),urban=owner==='Selemi'?smooth(3,11,d)*(1-smooth(88,106,v)):0;
  let floor=selamusFloor(x,z);
  for(const b of SELAMUS_BUILDINGS)if(Math.abs(u-b.u)<b.width/2+1.5&&Math.abs(v-b.v)<b.depth/2+1.5){floor=selamusFloor(b.x,b.z);break;}
  let y=incoming+(floor-incoming)*urban;
  const canal=selamusCanalAt(x,z);
  // Continue the cut across the last shoreline metres into the bay. Stopping
  // at the atlas land boundary leaves a shallow sand dam at each canal mouth.
  if(canal.edge<1.3)y+=(Math.min(y,SEA_LEVEL-3.4)-y)*(1-smooth(-.65,1.3,canal.edge));
  return y;
}
export function selamusReserved(x,z,margin=0){return selamusUrban(x,z,margin)||!!(inSelamusBox(x,z)&&selamusCanalAt(x,z)?.edge<4+margin);}
export function selamusTint(x,z){
  if(!selamusUrban(x,z,2))return null;
  if(selamusCanalAt(x,z).edge<1.5)return 0x797c72;
  return 0xc9b796;
}
// A continuous metre grid spans the canal works. Lower the coarse terrain
// beneath it, blending only beyond the island; no dry coarse triangle dams.
export function selamusPatchWeight(x,z){
  if(!inSelamusBox(x,z))return 0;const b=SELAMUS.bounds;
  return smooth(0,14,Math.min(x-b.minX,b.maxX-x,z-b.minZ,b.maxZ-z));
}
export const selamusTerrainSink=(x,z)=>24*selamusPatchWeight(x,z);
const view=(u,v,y,tu,tv,ty)=>freeze({eye:freeze({...selamusPoint(u,v),y}),target:freeze({...selamusPoint(tu,tv),y:ty})});
export const SELAMUS_VIEWS=freeze({
  selamus:view(-260,-230,210,0,5,8),
  'selamus-harbor':view(10,-162,34,0,40,17),
  'selamus-canal':view(-52,-21,7,25,5,7),
  'selamus-temple':view(0,16,7,0,61,20),
  'selamus-rooftops':view(140,90,75,-30,-10,11),
});
