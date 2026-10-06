// Read-only map projections. These do not resolve battles or write campaign state.
export const SNAPSHOTS={
  opening:{label:'Opening territories',region:'Moros Plain'},
  'chapter-monarchy':{label:'Chapter 1 · Monarchist victory',region:'West Suval',owner:'ambroni-empire',path:'empire'},
  'chapter-coalition':{label:'Chapter 1 · Coalition victory',region:'Moros Plain',owner:'izol',path:'coalition'},
  'north-riesov':{label:'Undeadland takes North Riesov',region:'North Riesov',owner:'eshtor-undead'},
  'east-lond':{label:'Lond loses East Lond to Undeadland',region:'East Lond',owner:'eshtor-undead'},
};
export const CHAPTER_PATHS={
  empire:{name:'Monarchist path',faction:'ambroni-empire',snapshot:'chapter-monarchy',target:'West Suval',
    aim:'Fight for the Ambroni Empire and take Solis with its army.',
    consequence:'Solis falls to the Ambroni army. West Suval becomes part of the Ambroni Empire.',
    steps:[['Assemble in Moros','Report to Marshal Hadric Venmor at the Ambroni camp.','Moros Plain'],['The envoy’s choice','Carry the Marshal’s terms to Envoy Telis Orren in Solis and stay with the Empire.','West Suval'],['Battle for the border','Return to Venmor, join the march and help the army win the field.','Moros Plain'],['Solis, taken','Your successful campaign takes Solis and West Suval for Ambron.','West Suval'],['Report to Ambron','Report the victory to your commander, then to the Lord Marshal’s representative in Ambron.','Elagos']]},
  coalition:{name:'Coalition path',faction:'izol',snapshot:'chapter-coalition',target:'Moros Plain',
    aim:'Join the republicans at Solis and help the Coalition break Ambron’s hold on Moros.',
    consequence:'Izol takes Moros Plain on behalf of the Coalition. West Suval remains in coalition hands.',
    steps:[['Assemble in Moros','Begin at the Ambroni camp with the envoy assignment.','Moros Plain'],['The envoy’s choice','Meet Telis Orren in Solis and accept the Coalition’s offer.','West Suval'],['Battle for the border','Report to Captain Arlen Voss, join his column and help win the field.','Moros Plain'],['Moros changes hands','Your successful campaign takes Moros Plain from Ambron for Izol.','Moros Plain'],['Report in West Izol','Report to Voss, then take passage to Izolveth and report to Tulle Barr.','West Izol']]},
};
export const CHAPTER_REGIONS=['Moros Plain','West Suval','West Izol','Elagos'];
export const CHAPTER_FACTIONS=['ambroni-empire','izol','west-suval'];
export const imperial=new Set(['Elagos','Drent','Amod','Pueth','Luscia','Moros Plain','Vastos','Meneth','Peblos','East Lotharn Mountains','West Lotharn Mountains']);
export const disputed=new Set(['Acor Wetlands','East Lotharn Mountains','West Lotharn Mountains','Caricas','Nethereum','Ovesos','Nesdor']);
export const shortNames={'stonefist-lond':'Lond','ambroni-empire':'Ambron','pyrosi-empire':'Pyros','minoran-league':'Minoran League','eshtor-undead':'Undeadland','acorwood-satyrs':'Acreland','north-gorgi-goblins':'North Gorgi','south-gorgi-goblins':'South Gorgi','orgmala-goblins':'Orgmala','gorgiwood-goblins':'Gorgiwood','wilhelm-undead':'Blood Prince','west-baldro-dwarves':'West Dwarfland','east-baldro-dwarves':'East Dwarfland','nylon':'Nylon','henborth-centaurs':'Henborth','yunethre-shared':'Yunethre','disputed':'Disputed','unassigned':'Unassigned'};
const fixedColors={'stonefist-lond':'#86a9c8','ambroni-empire':'#d3a28c','izol':'#7eabc4','west-suval':'#a5b88a','eshtor-undead':'#ad8ab8','riesov':'#d3bd80','ganun':'#b6c28b','endevor':'#daa984','witherst':'#9abcab','wilhelm-undead':'#bd859e','west-baldro-dwarves':'#a9b7b5','east-baldro-dwarves':'#c2a7a2','disputed':'#c8c1ab','unassigned':'#c4c8b8','yunethre-shared':'#8bb99e'};
const palette=['#a7b9d2','#ccb88e','#aabd87','#bb9fba','#94bdbb','#d2ac81','#b6aecc','#bfcd9e','#d0a6a2','#9ab2c0','#c6b895','#a3c2a8'];
export const factionRegions=f=>[...(f?.regions||[]),...(f?.proposedRegions||[])];
export const factionName=(id,factions)=>shortNames[id]||factions.find(f=>f.id===id)?.name.replace(/ \(.*\)$/,'')||id;
export const factionColor=(id,factions)=>fixedColors[id]||palette[Math.max(0,factions.findIndex(f=>f.id===id))%palette.length];
export function ownerOf(name,factions,snapshot='opening'){
  const change=SNAPSHOTS[snapshot];
  if(change?.owner&&change.region===name)return change.owner;
  if(disputed.has(name))return 'disputed';
  if(name==='Yunethre')return 'yunethre-shared';
  return factions.find(f=>factionRegions(f).includes(name))?.id||'unassigned';
}
export function stability(name,snapshot='opening'){
  if(SNAPSHOTS[snapshot]?.owner&&SNAPSHOTS[snapshot].region===name)return ['Recently conquered','conflict'];
  if(name.includes('Ithzel'))return ['Restoration war','conflict'];
  if(name==='West Suval')return ['Border war','conflict'];
  if(disputed.has(name))return [name==='Acor Wetlands'?'Disputed':'Open rebellion','conflict'];
  if(['Elagos','Drent'].includes(name))return ['Stable','stable'];
  if(imperial.has(name)||name==='Isareos')return ['Unstable','unstable'];
  return ['Unassessed','unknown'];
}
export const stabilityColors={stable:'#769b80',unstable:'#d0b273',conflict:'#be7970',unknown:'#c4c7bb'};
// Ownership follows the actual capture, not a victory or report elsewhere.
export function chapterSnapshot(chapter,aftermath){
  const required=chapter?.winner==='empire'?'solis-sweep':chapter?.winner==='coalition'?'moros-outpost':null;
  return chapter?.reported&&required&&aftermath?.variant===required&&aftermath.cleared===true?CHAPTER_PATHS[chapter.winner].snapshot:'opening';
}
export const publicProfiles={
  'ambroni-empire':{ruler:'Willard, constitutional monarch',seat:'Ambron, Elagos',war:'At war with the Coalition in Moros Plain and West Suval.',ties:'Nominal vassal of the Stone Fist; effectively autonomous. Feradom is an independent ally.'},
  izol:{ruler:'Ruler not yet specified',seat:'Izolveth, West Izol',war:'Represents the Coalition fighting Ambron. A Chapter 1 victory brings Moros Plain under Izol.',ties:'Coalition partner of the republican forces holding West Suval. These remain separate territories and governments.'},
  'west-suval':{ruler:'Republican council at Solis',seat:'Solis, West Suval',war:'Coalition-held at the opening; threatened by the Ambroni army.',ties:'Fights alongside Izol against Ambron. Coalition membership does not make West Suval an Izoli province.'},
  'stonefist-lond':{ruler:'High King of the Stone Fist',seat:'Stone Fist, Lond',war:'Periodic raids from the independent goblin factions.',ties:'Overlord of the eight northern lower kingdoms. Ambron, Mithala and Celder retain nominal oaths but govern with little northern oversight.'},
};
