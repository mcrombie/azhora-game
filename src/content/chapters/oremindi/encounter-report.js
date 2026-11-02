const reasons={
  'two-raiders-fallen-survivor-fled':'Two raiders have fallen. Their surviving companion has fled along the mountain trail.',
  'chief-fallen-formation-broken':'The chief has fallen and the attacking formation has broken.',
  'hero-defeated':'Teresod was overcome. The assignment is unfinished; you may regroup and try again.',
  'field-time-expired':'The field was not secured before the encounter limit. Regroup and try another approach.',
  'hero-withdrew':'You withdrew from the encounter. No proof or victory has been awarded.',
  'retreat-route-blocked':'The surviving raider could not leave the fighting area. The encounter has not awarded proof; regroup and retry.',
  'chief-still-standing':'The chief still stands. The mountain battle has not been won.',
};

/** The local field knows casualties; chapter progress only records the victory.
 * Describe this actual party without inventing survivors or regional conquest. */
export function oremindiEncounterReport(state,{rehearsal=false}={}){
  const won=state.outcome?.result==='victory',mountain=state.kind==='highground',allies=state.allies??[],survivors=allies.filter(a=>a.hp>0).length;
  let title=won?mountain?'The terrace is held':'The ambush is over':state.outcome?.result==='withdrawal'?'You withdrew':'Regroup for another attempt';
  let text=reasons[state.outcome?.reason]??'The encounter has ended.';
  if(won&&mountain){
    if(!survivors){title='Victory at a heavy cost';text+=` None of the ${allies.length} rangers survived. Teresod alone holds the field.`;}
    else text+=` ${survivors} of ${allies.length} rangers survived the battle.`;
  }
  text+=rehearsal?' This rehearsal changed no chapter progress.':won?mountain?' Return to Taleth and report the victory. This field result does not annex the whole mountain region.':' Back in exploration, inspect the fallen raider and explicitly collect the proof for the rangers.':'';
  return {title,text};
}
