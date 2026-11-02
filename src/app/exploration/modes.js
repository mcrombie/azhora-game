// Launch modes share presentation, not simulation state or save slots.
export const MODES = Object.freeze({
  oremindi: Object.freeze({id:'oremindi',name:'Chapter 3 / The Mountain Alliance',reveal:true,regions:Object.freeze([16,17,25,13,14,38,61,62,37,33]),mapRegions:Object.freeze(['Isareos','Nethereum','Ovesos','Caricas','Nesdor','Yunethre','North Celder','South Celder','South Oremindi Mountains','North Ibenwood'])}),
  yunethre: Object.freeze({id:'yunethre',name:'Chapter 2 / Yunethre',reveal:true,regions:Object.freeze([16,17,25,13,14,38,61,62]),mapRegions:Object.freeze(['Isareos','Nethereum','Ovesos','Caricas','Nesdor','Yunethre','North Celder','South Celder'])}),
  explore: Object.freeze({id:'explore',name:'Explore the World',reveal:true,regions:null}),
  war: Object.freeze({id:'war',name:'Lizeemi War Scenario',reveal:true,regions:Object.freeze([16,17,25,13,14]),mapRegions:Object.freeze(['Isareos','Nethereum','Ovesos','Caricas','Nesdor'])}),
  'food-world': Object.freeze({id:'food-world',name:'Lizeemi War / Food world test',reveal:true,regions:Object.freeze([16,17,25,13,14]),mapRegions:Object.freeze(['Isareos','Nethereum','Ovesos','Caricas','Nesdor'])}),
  combat: Object.freeze({id:'combat',name:'Combat Testing',reveal:false,regions:Object.freeze([16])}),
  hearthfall: Object.freeze({id:'hearthfall',name:'Hearthfall Integration',reveal:false,regions:Object.freeze([21]),start:Object.freeze({x:-350,z:-720})}),
});
export function launchMode(search='') {
  const params=new URLSearchParams(search);
  return MODES[params.get('mode')] ?? (params.has('war')?MODES.war:MODES.explore);
}
export function allowsRegion(mode,id){return !mode.regions||mode.regions.includes(id);}
