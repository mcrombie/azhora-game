// Influence is a read-only consequence of actual intervention, never territory
// ownership or a hidden diplomacy simulation. A declared war winner takes priority.
export function councilInfluence(campaign){
  const final=['west','east'].includes(campaign?.winner)?campaign.winner:null;
  const choice=campaign?.commands?.findLast(c=>c.type==='hero-result'&&['west','east'].includes(c.faction)&&c.reason!=='declined');
  const faction=final??choice?.faction??null;
  return {leader:faction==='west'?'mayor':faction==='east'?'temple':'taleth',faction,settled:!!final,
    reason:final?'war-result':faction?'intervention':'neutral'};
}
export function validCouncilSave(s){return s===undefined||!!s&&s.version===1&&Array.isArray(s.met)&&s.met.length<=2&&new Set(s.met).size===s.met.length&&s.met.every(id=>['mayor','temple'].includes(id));}
export function createCouncilState(saved){
  if(!validCouncilSave(saved))throw Error('Invalid council checkpoint.');
  let met=new Set(saved?.met??[]);
  return {meet(id){if(!['mayor','temple'].includes(id))return false;const fresh=!met.has(id);met.add(id);return fresh;},
    get bothMet(){return met.size===2;},snapshot:()=>({version:1,met:[...met]}),restore(s){if(!validCouncilSave(s))throw Error('Invalid council checkpoint.');met=new Set(s?.met??[]);}};
}
