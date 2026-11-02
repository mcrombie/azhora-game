import {yunethreMap} from '../yunethre/map.js';
export function oremindiMap(state,previous){
  const view=yunethreMap(previous),r=view.reference;
  view.id='oremindi-chapter';
  r.description='Chapter 3 / Minora is occupied. The Wizards\' League holds a tower refuge, not South Oremindi.';
  r.factions.push({id:'ibenwood-north-rangers',name:'North Ibenwood Rangers',short:'North rangers',color:'#91aa81',government:'Ranger faction, vassal of Elfland',regions:['North Ibenwood'],notes:state.rangerAlliance?'Allied to the Wizards\' League. The other ranger factions remain separate.':'An independent ranger command within Elfland\'s allegiance.'});
  r.regions['North Ibenwood']={owner:'ibenwood-north-rangers',condition:['Elven border forest','stable']};
  r.presences.push({id:'wizards-refuge',name:'Relocated Wizards\' Tower',short:'Guild refuge',color:'#a697ca',kind:'enclave',region:'South Oremindi Mountains',anchor:{x:.5,y:.75},government:'Wizards\' League',notes:'The tower and its immediate refuge. No regional annexation.'});
  if(state.battle.status==='victory')r.regions['South Oremindi Mountains'].condition=['The southern chief was defeated; the mountains remain occupied','unstable'];
  return view;
}
