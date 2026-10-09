// New assaults use a squad. Preserve saved solo attempts, including saves from
// before an explicit style command existed, without conjuring replacements.
export function campaignAssaultStyle(pending){
  return pending.rally?.style??(pending.rally?.stopped>0?'solo':'allied');
}

export function campaignAssaultBriefing(pending){
  if(campaignAssaultStyle(pending)==='solo')return 'Resuming your saved solo assault. Its existing casualties are preserved; no replacement allies will be added.';
  const squad=pending.rally?.allied,alive=squad?squad.totalAllies-squad.lost:pending.rally?.supportAllies??3;
  if(alive===0)return 'Your detachment has no soldiers left to join this push. Its losses are preserved. You can withdraw and let the armies resolve the battle.';
  return `You join ${alive} allied ${alive===1?'soldier':'soldiers'} in the final push. Break the enemy line together; an isolated opponent may retreat. This is your part of the army\u2019s battle, not the whole army. Fallen allies stay lost if you withdraw and return.`;
}
