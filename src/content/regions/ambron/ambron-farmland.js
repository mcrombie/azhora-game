/** The capital's food belt: scenery plots, not a crop/economy simulation. */
const freeze=Object.freeze;
const crops={
  wheat:{soil:'#9f8955',row:'#c6ad62',leaf:'#c6b568'},
  barley:{soil:'#8e8750',row:'#b1ae62',leaf:'#acb969'},
  vegetables:{soil:'#746148',row:'#68794b',leaf:'#537844'},
  orchard:{soil:'#809059',row:'#87965c',leaf:'#617e43'},
  fallow:{soil:'#87704e',row:'#746044',leaf:'#8b8b53'},
};
export const AMBRON_CROPS=freeze(Object.fromEntries(Object.entries(crops).map(([id,p])=>[id,freeze(p)])));
export const AMBRON_FIELDS=freeze([
  ['south',-1172,288,44,36,'barley',-.08],[-1116,280,46,40,'vegetables',.08],[-1057,274,46,38,'wheat',.1],[-1000,274,42,34,'orchard',.1],
  [-1190,346,40,42,'fallow',-.08],[-1130,340,46,44,'wheat',0],[-1070,334,44,40,'barley',.12],[-1018,337,36,40,'vegetables',.1],
  [-1160,402,44,42,'wheat',0],[-1100,396,46,40,'orchard',.15],[-1045,390,40,44,'barley',.12],
  ['west',-1450,-247,48,32,'barley',-.1],[-1510,-242,48,40,'wheat',-.1],[-1460,-190,44,40,'vegetables',.07],
  [-1518,-180,44,52,'barley',-.08],[-1492,-105,44,54,'orchard',.1],[-1504,-26,42,40,'wheat',-.12],[-1458,-41,36,36,'vegetables',.1],
  [-1514,175,52,36,'barley',.1],[-1516,231,50,40,'wheat',.05],[-1460,230,42,36,'vegetables',-.1],
  ['north',-1360,-340,46,38,'orchard',-.1],[-1300,-369,46,36,'barley',.1],[-1238,-370,48,38,'wheat',.08],
  [-1175,-350,44,38,'barley',.04],[-1118,-344,44,38,'vegetables',-.1],[-1060,-323,44,38,'orchard',.1],[-1020,-259,38,44,'wheat',-.1],
  ['east',-901,-65,38,30,'vegetables',.1],[-878,0,34,40,'orchard',-.1],[-881,68,36,36,'barley',.08],
].map((row,index)=>{
  // District labels only annotate the first plot of each consecutive group.
  const offset=typeof row[0]==='string'?1:0,[x,z,w,d,crop,yaw]=row.slice(offset);
  return freeze({id:`ambron-field-${index+1}`,x,z,w,d,crop,yaw,cos:Math.cos(yaw),sin:Math.sin(yaw)});
}));
export const AMBRON_FARMSTEADS=freeze([
  {id:'south-farmstead',x:-1143,z:305},
  {id:'north-farmstead',x:-1218,z:-329},
  {id:'west-farmstead',x:-1487,z:-135},
  {id:'ela-farmstead',x:-1490,z:203},
  {id:'ossen-farmstead',x:-878,z:37},
].map(freeze));
export const AMBRON_FARM_TRACKS=freeze([
  [[-1143,305],[-1193,309],[-1235,330]],
  [[-1218,-329],[-1271,-327],[-1295,-255]],
  [[-1487,-135],[-1430,-160],[-1375,-165],[-1320,-145]],
  [[-1490,203],[-1540,176],[-1560,65],[-1530,-35],[-1487,-135]],
  [[-878,37],[-853,82],[-859,142],[-866,196]],
].map(points=>freeze(points.map(([x,z])=>freeze({x,z})))));
export function farmLocal(field,x,z){
  const dx=x-field.x,dz=z-field.z;return {u:dx*field.cos-dz*field.sin,v:dx*field.sin+dz*field.cos};
}
export function farmPoint(field,u,v){return {x:field.x+u*field.cos+v*field.sin,z:field.z-u*field.sin+v*field.cos};}
export function ambronFieldAt(x,z){
  if(x< -1555||x> -850||z< -405||z>435)return null;
  for(const field of AMBRON_FIELDS){const p=farmLocal(field,x,z);if(Math.abs(p.u)<field.w/2&&Math.abs(p.v)<field.d/2)return field;}
  return null;
}
export function farmRoadDistance(x,z,roads){
  let nearest=Infinity;
  for(const road of roads)for(let i=1;i<road.length;i++){
    const a=road[i-1],b=road[i],dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));
    nearest=Math.min(nearest,Math.hypot(x-a.x-dx*t,z-a.z-dz*t));
  }
  return nearest;
}
export const AMBRON_FARM_CLEARINGS=freeze([
  ...AMBRON_FIELDS.map(f=>freeze({x:f.x,z:f.z,r:Math.hypot(f.w,f.d)/2+3})),
  ...AMBRON_FARMSTEADS.map(f=>freeze({x:f.x,z:f.z,r:18})),
]);
