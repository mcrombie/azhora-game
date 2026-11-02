import {yunethrePolitics,LEAGUE_REGIONS} from './chapter.js';
export function yunethreMap(s){
  const p=yunethrePolitics(s),townOwner=p.laketownOwner;
  const factions=[
    {id:'laketown',name:'Laketown',short:'Laketown',color:'#8db5bd',government:'Autonomous elected council',capital:'Laketown',notes:'The centaurs are a separate people, not subjects of Laketown.'},
    {id:'lizeemi-league',name:'Lizeemi League',short:'Lizeemi League',color:s.premise.winner==='west'?'#88ab93':'#c09676',government:'League of river towns',notes:'The Chapter 1 settlement is historical; new alliances do not grant ownership of foreign kingdoms.'},
    {id:'wizards-league',name:'Wizards\' League',short:'Wizards\' League',color:'#a697ca',government:'Guild-led refuge',notes:'Its relocated tower is an enclave in occupied South Oremindi, not regional control.'},
    {id:'celder',name:'Kingdom of Celder',short:'Celder',color:'#a0a2c4',government:'Kingdom',capital:'Canerd',notes:p.celderAlliance?'Military ally. Its territory belongs to Celder.':p.celderHostile?'Hostile following your protection of the centaurs.':s.battle.status==='averted'?'Bound by the peace compact. No automatic military alliance.':s.battle.status==='resolved'?(s.battle.winner==='celder'?'Defeated the centaur camp. That victory alone does not grant ownership of Laketown.':'Its attack was repelled. You have not entered a military alliance.'):s.battle.status==='active'?'Fighting the centaurs in Yunethre.':'Preparing to attack the Yunethre centaurs.'},
    {id:'blood-prince',name:'Prince Wilhelm',short:'Blood Prince',color:'#7a4859',government:'Military occupation',notes:'The five League provinces fell during your absence.'},
    {id:'oremindi-south-orcs',name:'South Oremindi chieftain',short:'South Oremindi orcs',color:'#8f617d',government:'Independent orc chieftain',notes:'Still controls the mountain surface; the Guild tower is only a refuge.'},
  ];
  const condition=s.battle.status==='active'?['Battle underway between Celder and the centaurs','conflict']:s.battle.status==='pending'?['Centaurs face an impending attack','unstable']:['Aftermath: '+(s.battle.status==='averted'?'peace compact':'victory for '+s.battle.winner),'stable'];
  const regions={Yunethre:{owner:townOwner,condition},'North Celder':{owner:'celder',condition:['Celder heartland','stable']},'South Celder':{owner:'celder',condition:['Celder heartland','stable']}};
  for(const name of LEAGUE_REGIONS)regions[name]={owner:p.originalLeagueOwner,condition:[s.returned?'Occupied by Prince Wilhelm':'United after the Lizeemi War',s.returned?'conflict':'stable']};
  if(s.returned)regions['South Oremindi Mountains']={owner:p.southOremindiOwner,condition:['Orc occupation; Wizards\' Tower refuge','conflict']};
  for(const f of factions)f.regions=Object.keys(regions).filter(n=>regions[n].owner===f.id);
  const presences=p.centaursAlive?[{id:'yunethre-centaurs',name:'Centaurs of Yunethre',short:'Centaur camp',color:'#946443',kind:'nomadic',region:'Yunethre',anchor:{x:.75,y:.5},government:'Independent centaur community',notes:p.centaurProtection?'Protected ally; no transfer of centaur sovereignty.':'Independent community facing the Knights of Celder.'}]:[];
  // The reference formatter describes governments without assuming Lizeemi armies.
  return {id:'yunethre-chapter',factions:[],regions:{},reference:{description:'Chapter 2 political record. Allegiance, military alliance and local encampments remain distinct.',relations:[],factions,regions,presences}};
}
