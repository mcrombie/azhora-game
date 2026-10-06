/** Campaign builds exclude unfinished/off-route country from construction. */
export const WAR_ROUTE_REGIONS = Object.freeze(['Drent','Luscia','Moros Plain','West Suval','Elagos','West Izol']);
// Minora hosts the title panorama; it remains available without loading the continent.
export const CAMPAIGN_BUILD_REGIONS = Object.freeze([...WAR_ROUTE_REGIONS,'Isareos']);
export function worldScope(search='') {
  const q=new URLSearchParams(search);return q.get('world')==='developer'||q.has('test')&&!q.has('world')?'developer':'campaign';
}
export function regionEnabled(name,scope='campaign') {
  return scope==='developer'||CAMPAIGN_BUILD_REGIONS.includes(name);
}
