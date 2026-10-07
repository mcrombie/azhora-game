// Launch modes share presentation, not simulation state or save slots.
export const MODES = Object.freeze({
  explore: Object.freeze({id:'explore',name:'Explore the World',reveal:true,regions:null}),
  war: Object.freeze({id:'war',name:'Lizeemi War Scenario',reveal:true,regions:null}),
  combat: Object.freeze({id:'combat',name:'Combat Testing',reveal:false,regions:Object.freeze([16])}),
  hearthfall: Object.freeze({id:'hearthfall',name:'Hearthfall Integration',reveal:false,regions:Object.freeze([21]),start:Object.freeze({x:-350,z:-720})}),
});
export function launchMode(search='') {
  const params=new URLSearchParams(search);
  return MODES[params.get('mode')] ?? (params.has('war')?MODES.war:MODES.explore);
}
export function allowsRegion(mode,id){return !mode.regions||mode.regions.includes(id);}
