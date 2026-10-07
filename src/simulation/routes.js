// Pure region-to-region travel. Positions use one consistent scenario coordinate
// frame; the engine never imports an atlas or constructs a physical road.
export const routeKey=(a,b)=>[a,b].sort().join('|');
export function createRoutes(scenario){
  const regions=new Map(scenario.regions.map(r=>[r.id,r])),routes=new Map();
  if(!Number.isFinite(scenario.rules.marchDistancePerDay)||scenario.rules.marchDistancePerDay<=0)throw Error('Invalid march distance per day.');
  for(const r of regions.values())if(!Number.isFinite(r.position?.x)||!Number.isFinite(r.position?.y))throw Error('Region needs a finite travel position: '+r.id);
  for(const link of scenario.routes){
    const [from,to]=link.regions,key=routeKey(from,to),a=regions.get(from),b=regions.get(to);
    if(link.regions.length!==2||!a?.neighbors.includes(to)||!b?.neighbors.includes(from)||routes.has(key))throw Error('Invalid or duplicate route: '+key);
    if(!Number.isFinite(link.terrainMultiplier)||link.terrainMultiplier<1||!Number.isInteger(link.crossingDays)||link.crossingDays<0)throw Error('Invalid route cost: '+key);
    const distance=Math.hypot(a.position.x-b.position.x,a.position.y-b.position.y);
    const distanceDays=Math.max(1,Math.ceil(distance/scenario.rules.marchDistancePerDay));
    const terrainDays=Math.ceil(distanceDays*(link.terrainMultiplier-1)),days=distanceDays+terrainDays+link.crossingDays;
    routes.set(key,{name:link.name,distance:Math.round(distance),distanceDays,terrainDays,crossingDays:link.crossingDays,days});
  }
  for(const r of regions.values())for(const n of r.neighbors)if(!routes.has(routeKey(r.id,n)))throw Error('Missing route: '+r.id+' / '+n);
  return (a,b)=>{const route=routes.get(routeKey(a,b));if(!route)throw Error('Regions are not connected: '+a+' / '+b);return {...route};};
}
