export function commanderReport(battle){
  return Object.values(battle.commanders??{}).map(c=>`${c.name} ${c.status==='slain'?'was slain':c.status==='routed'?'retreated from the field':c.status==='captured'?'was captured when the army was lost':'survived with the army'}.`).join(' ');
}

// Keep the turning point in the spoken summary; full surviving/wounded captain
// records remain available in the dated report and Chronoscope.
export function commanderTurningPoint(battle){
  return Object.values(battle?.commanders??{}).filter(c=>['slain','routed','captured'].includes(c.status))
    .map(c=>`${c.name} ${c.status==='slain'?'fell':c.status==='captured'?'was captured':'retreated'}.`).join(' ');
}
