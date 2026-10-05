/** Campaign builds exclude unfinished/off-route country from construction. */
export const WAR_ROUTE_REGIONS = Object.freeze(['Drent','Luscia','Moros Plain','West Suval','Elagos','West Izol']);
// Minora hosts the title panorama; it remains available without loading the continent.
export const CAMPAIGN_BUILD_REGIONS = Object.freeze([...WAR_ROUTE_REGIONS,'Isareos']);
export function worldScope(search='') {
  return new URLSearchParams(search).get('world')==='developer'?'developer':'campaign';
}
export function regionEnabled(name,scope='campaign') {
  return scope==='developer'||CAMPAIGN_BUILD_REGIONS.includes(name);
}
