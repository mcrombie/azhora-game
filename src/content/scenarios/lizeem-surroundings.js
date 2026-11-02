// Author-established political context for the Lizeemi War chart. This is not
// simulation input: no recruitment, movement, conquest, clock or save mutations.
// Atlas spellings are keys; display names may differ (Selemi is Selemis's island).
const countries=[
  {id:'ambron',short:'Ambron',name:'Kingdom of Ambron',color:'#b88a74',government:'Constitutional monarchy',capital:'Ambron, Elagos',
    regions:['Elagos','Meneth','Vastos','Amod','Pueth','Drent','Luscia','Moros Plain','Peblos'],
    notes:'Claims both Lotharn mountain regions, where republican rebels and outlaw gangs contest its authority. These claims do not establish secure control.'},
  {id:'feradom',short:'Feradom',name:'Duchy of Feradom',color:'#c5a78c',government:'Vassal duchy',regions:['Feradom'],notes:'A distinct government and territory, owing allegiance to the Kingdom of Ambron.'},
  {id:'laketown',short:'Lake Town',name:'Lake Town',color:'#8db5bd',government:'Autonomous town governed by an elected council',capital:'Lake Town, Yunethre',regions:['Yunethre'],notes:'The centaurs of Yunethre are a separate nomadic people; Lake Town’s territorial color does not make them its subjects.'},
  {id:'ibenwood-elves',short:'Ibenwood Elves',name:'Ibenwood Elves',color:'#638663',government:'Elven faction',regions:['East Ibenwood','West Ibenwood','North Ibenwood','South Ibenwood','Central Ibenwood'],notes:'The elves are wary of strangers. This chart does not reveal the passage to Elfland.'},
  {id:'ibenal',short:'Ibenal',name:'Kingdom of Ibenal',color:'#b39e77',government:'Autonomous kingdom',regions:['North Ibenal','South Ibenal']},
  {id:'alezhor',short:'Alezhor',name:'Kingdom of Alezhor',color:'#aa88a0',government:'Autonomous kingdom',regions:['Alezhor']},
  {id:'hama',short:'Hama',name:'Merchant Republic of Hama',color:'#92b7af',government:'Autonomous merchant republic',regions:['Hama','Cape Heth']},
  {id:'marosh',short:'Marosh',name:'Kingdom of Marosh',color:'#d1aa64',government:'Kingdom',capital:'Marosh',regions:['North Meroshe Desert','West Meroshe Desert','Central Meroshe Desert','South Meroshe Desert','Dinelv Highlands','Marosh','Ganesh Desert']},
  {id:'selemis',short:'Selemis',name:'Merchant Republic of Selemis',color:'#779cb8',government:'Merchant republic',capital:'Selemis, Selemi',regions:['Selemi','Aurumlis Archipeligo','Trogo','Azhor Stones'],notes:'Its island city and maritime holdings form a major trading power.'},
  {id:'babon',short:'Babon',name:'Kingdom of Babon',color:'#bf8c9b',government:'Independent kingdom',regions:['Babon']},
  {id:'izol',short:'Izol',name:'Republic of Izol',color:'#a7b879',government:'Farmers’ republic',regions:['East Izol','West Izol','South Suval','West Suval'],notes:'Recently took South Suval and West Suval. West Suval fell after the defeat of one of the Blood Prince’s garrisons.'},
  {id:'telemonia',short:'Telemonia',name:'Telemonia',color:'#c3ab83',government:'Militarized oligarchy (provisional)',regions:['Telemonia','Legemum'],notes:'Neutral and isolationist. It has conquered Legemum and enslaved its people. Its exact governing institutions remain to be defined.'},
  {id:'ascarth',short:'Ascarth',name:'Ascarth',color:'#bd816c',government:'Not yet specified',regions:['Northern Ascarth','Southern Ascarth','Gala'],notes:'Ascarthi forces are besieging Nylon in Eer.'},
  {id:'nylon',short:'Nylon',name:'Republic of Nylon',color:'#89a8c4',government:'Sophisticated republic',capital:'Nylon, Eer',regions:['Eer'],notes:'Under siege by Ascarth. The siege has not transferred control of Eer.'},
  {id:'east-suval',short:'East Suval',name:'East Suval',color:'#c2b7d3',government:'Neutral theocracy',regions:['East Suval']},
  {id:'pyros-monarchists',short:'Pyrosi Monarchists',name:'Pyrosi Monarchists',color:'#b78a62',government:'Monarchist faction',regions:['West Pyros','Navarth','Ganesh Plain'],notes:'Hold the western side of the river. Pyra itself is divided between hostile armed factions; neither side controls the whole city.'},
  {id:'pyros-republicans',short:'Pyrosi Republicans',name:'Pyrosi Republicans',color:'#bd8c81',government:'Republican faction',regions:['East Pyros','Oves Desert','Nether Desert'],notes:'Hold the eastern side of the river. The civil war has split the great city of Pyra between hostile armed factions.'},
  {id:'celder',short:'Celder',name:'Kingdom of Celder',color:'#a0a2c4',government:'Kingdom',regions:['North Celder','South Celder']},
  {id:'mithala',short:'Mithala',name:'Kingdom of Mithala',color:'#9eada0',government:'Kingdom',regions:['North Mithala','South Mithala','East Mithala','West Mithala']},
];
const disputes=[
  {id:'lotharn-disputed',short:'Disputed Lotharn',name:'Disputed Lotharn Mountains',color:'#ada18b',kind:'disputed',regions:['West Lotharn Mountains','East Lotharn Mountains'],claimants:['Kingdom of Ambron','Republican rebels','Outlaw gangs'],notes:'Ambron claims these mountains. Republican rebels and outlaw gangs contest its authority; no secure region-wide controller is established.'},
  {id:'iscare-disputed',short:'Disputed Iscare',name:'Disputed Iscare Archipelago',color:'#9bacae',kind:'disputed',regions:['Iscare Archipeligo'],claimants:[],notes:'Control is disputed. The claimants have not yet been established.'},
];
const presences=[
  {id:'yunethre-centaurs',name:'Centaurs of Yunethre',short:'Centaur encampment',color:'#946443',kind:'nomadic',region:'Yunethre',
    // A reported encampment, not a permanent capital or a fabricated route.
    // A future authored relocation may change region/anchor without ownership.
    anchor:{x:.32,y:.66},government:'Independent nomadic centaur faction',
    notes:'A mobile community in Yunethre, distinct from Lake Town’s council. This marker represents their reported encampment, not a territorial claim.'},
];
const relations=[
  {kind:'vassal',from:'feradom',to:'ambron',label:'Feradom is a vassal of Ambron.'},
  {kind:'war',from:'izol',to:'ambron',label:'Izol and Ambron are at war.'},
  {kind:'war',from:'ascarth',to:'nylon',label:'Ascarth and Nylon are at war; Ascarth is besieging Nylon.'},
  {kind:'civil-war',from:'pyros-monarchists',to:'pyros-republicans',label:'Pyrosi civil war. Pyra is divided between the two armed factions.'},
];
const overrides={
  'West Suval':['Recently taken by Izol from a Blood Prince garrison','conflict'],
  'South Suval':['Recently taken by Izol','conflict'],
  Eer:['Nylon under siege by Ascarth','conflict'],
  Legemum:['Conquered by Telemonia; its people are enslaved','conflict'],
};
const factions=[...countries,...disputes];
const regions=Object.fromEntries(factions.flatMap(f=>f.regions.map(region=>[region,{owner:f.id,reference:true,
  condition:overrides[region]??(f.kind==='disputed'?['Disputed control','conflict']:f.id.startsWith('pyros-')?['Civil war; Pyra divided','conflict']:['Surrounding country; stability unassessed','unknown'])}])));
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
export const LIZEEM_SURROUNDINGS=freeze({factions,regions,presences,relations});
