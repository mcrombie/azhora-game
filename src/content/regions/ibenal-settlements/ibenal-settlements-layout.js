import { REGION_IDS } from '../../../world/terrain/region-world.js';

// Local U follows the coast; V points inland. All settlements stand beside
// existing mouths; neither the coastline nor the streams are relocated.
const n=Math.hypot(.57,.82);
export const IBENAL_TURN=Math.atan2(.82,.57);
const c=.57/n,s=.82/n;
export const ibenPoint=(site,u,v)=>({x:site.x+c*u+s*v,z:site.z-s*u+c*v});
export const ibenLocal=(site,x,z)=>({u:(x-site.x)*c-(z-site.z)*s,v:(x-site.x)*s+(z-site.z)*c});
export const IBEN_TOWN=Object.freeze({id:'iben-town',name:'Iben Town',region:REGION_IDS['North Ibenal'],
  x:-4113,z:-334,radius:78,description:'An open elvish port at the northernmost river mouth: pale arcades, leaf-shaped roofs and slender sea towers around a sheltered green.'});
export const IBENAL_HAMLETS=Object.freeze([
  {id:'ibenal-north-mouth-hamlet',name:'North Mouth Hamlet',x:-4455,z:108,dockU:30,
    description:'A small fishing and farming hamlet beside South Ibenal’s north stream, with timber cottages, grain plots and a boat landing.'},
  {id:'ibenal-middle-mouth-hamlet',name:'Middle Mouth Hamlet',x:-4556,z:278,dockU:30,
    description:'Cottages and a communal barn above the middle stream’s mouth, with kitchen gardens, grain fields and fishing skiffs.'},
  {id:'ibenal-south-mouth-hamlet',name:'South Mouth Hamlet',x:-4612,z:377,dockU:-30,
    description:'A small southern shore hamlet: fish-drying racks by the landing and narrow fields on the better-drained ground inland.'},
].map(h=>Object.freeze({...h,region:REGION_IDS['South Ibenal'],radius:55})));
export const IBENAL_SETTLEMENTS=Object.freeze([IBEN_TOWN,...IBENAL_HAMLETS]);

export function ibenBuildings(site){
  const rows=site===IBEN_TOWN?[
    [-40,-7,8,7,5],[-26,-9,9,8,5.8],[-11,-9,8,7,4.8],[5,-8,8,7,5.8],[20,-5,7,6,4.8],
    [-42,19,9,8,5.5],[-29,19,8,8,6.4],[11,29,8,7,6],[24,30,7,7,5],
    [-42,34,8,7,5.2],[-31,44,9,8,6],[-2,47,9,8,5.7],[-42,49,8,7,5],
    [-15,32,18,13,8.2,'hall'],[20,14,5.4,5.4,16,'tower'],[-39,-23,5,5,12,'tower'],
    [-17,-22,11,7,4.5,'boathouse'],[5,-22,10,6,4.6,'warehouse'],
    [-49,5,5,5,3.3,'workshop'],[31,19,5,4,3.4,'workshop'],[-5,22,5,4,3.2,'workshop'],
  ]:[
    [-14,-3,7,6,4.1],[0,-9,7.5,6.5,4.3],[14,-2,7,6,4],[-16,14,7.5,6.5,4.2],[13,15,7.5,7,4.5],
    [-4,25,11,8,4.8,'barn'],[site.dockU>0?17:-22,-15,8,5,3.3,'boathouse'],
  ];
  return rows.map(([u,v,w,d,h,kind='house'],i)=>({id:site.id+'-building-'+i,...ibenPoint(site,u,v),u,v,w,d,h,kind,
    yaw:IBENAL_TURN+(v>8?Math.PI:0),variant:i}));
}
export function ibenFields(site){
  if(site===IBEN_TOWN)return [];
  const east=site===IBENAL_HAMLETS[2]?{u:10,v:48,w:22,d:22}:{u:5,v:43,w:16,d:14};
  return [{u:-23,v:45,w:23,d:25,crop:'grain'},{...east,crop:'grain'},{u:25,v:25,w:10,d:12,crop:'garden'}]
    .map((p,i)=>({...p,...ibenPoint(site,p.u,p.v),id:site.id+'-field-'+i,yaw:IBENAL_TURN}));
}
export function ibenLanes(site){
  const rows=site===IBEN_TOWN?[
    [[-64,-7],[-40,0],[-20,3],[0,6],[19,10],[39,14],[58,17]],
    [[-20,3],[-12,14],[-15,23]],[[0,6],[0,17],[10,21],[22,22]],
    [[-29,3],[-35,10],[-35,29],[-26,28]],
    [[0,6],[16,2],[27,1],[27,-13],[20,-13],[20,-24]],
  ]:[[[-7,-14],[-7,0],[0,4],[-3,16]],[[0,4],[site.dockU,0],[site.dockU,-12]],
    [[0,4],[-3,16],[-10,20],[-23,25],[-23,32]],[[0,4],[8,2],[24,9],[30,39]]];
  return rows.map(line=>line.map(([u,v])=>ibenPoint(site,u,v)));
}
export function ibenDecks(site){
  const town=site===IBEN_TOWN,u=town?20:site.dockU,north=site===IBENAL_HAMLETS[0],y=town?3.7:north?3.5:3.3;
  const start=north?0:site===IBENAL_HAMLETS[1]?8:15;
  const rows=town?[[20,-9,20,-26,5,y,y],[5,-26,32,-26,5,y,y],[12,-26,12,-61,3.2,y,y],[29,-26,29,-56,3.2,y,y]]:
    [[u,start,u,-48,3.1,y,y],[u-6,-42,u+6,-42,3.2,y,y]];
  return rows.map(([u0,v0,u1,v1,width,y0,y1],i)=>({id:site.id+'-deck-'+i,a:{...ibenPoint(site,u0,v0),y:y0},b:{...ibenPoint(site,u1,v1),y:y1},width,kind:'deck'}));
}
export function ibenBoats(site){
  const town=site===IBEN_TOWN,u=town?20:site.dockU;
  return (town?[[20,-49,13,3.6,'merchant'],[5,-54,6,1.7,'fishing'],[36,-49,6.5,1.8,'fishing']]:[[u-5,-47,5.8,1.6,'fishing'],[u+5,-49,5.2,1.5,'fishing']])
    .map(([u,v,length,beam,kind])=>({...ibenPoint(site,u,v),length,beam,kind,yaw:IBENAL_TURN}));
}
export function ibenalSettlementReserved(x,z,margin=0){
  for(const site of IBENAL_SETTLEMENTS){
    if(Math.abs(x-site.x)>140+margin||Math.abs(z-site.z)>140+margin)continue;
    const {u,v}=ibenLocal(site,x,z);
    if(site===IBEN_TOWN){if(u>-57-margin&&u<36+margin&&v>-31-margin&&v<57+margin)return true;}
    else if(u>-34-margin&&u<34+margin&&v>-23-margin&&v<64+margin)return true;
    for(const d of DECKS)if(d.id.startsWith(site.id)&&deckSample(d,x,z,margin+2)!==null)return true;
  }
  return false;
}
function deckSample(d,x,z,margin=0){
  const dx=d.b.x-d.a.x,dz=d.b.z-d.a.z,len=Math.hypot(dx,dz),u=((x-d.a.x)*dx+(z-d.a.z)*dz)/len;
  if(u< -margin||u>len+margin||Math.abs((x-d.a.x)*dz-(z-d.a.z)*dx)/len>d.width/2+margin)return null;
  return d.a.y+(d.b.y-d.a.y)*u/len;
}
const DECKS=IBENAL_SETTLEMENTS.flatMap(ibenDecks);
export function ibenalSettlementDeckHeight(x,z){
  for(const site of IBENAL_SETTLEMENTS){if(Math.abs(x-site.x)>140||Math.abs(z-site.z)>140)continue;
    for(const d of DECKS)if(d.id.startsWith(site.id)){const y=deckSample(d,x,z);if(y!==null)return y;}
  }
  return null;
}
