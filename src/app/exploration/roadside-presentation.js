import {commanderFor} from '../../content/scenarios/lizeem-champions.js';

export function roadsideBrief(pending,{elapsed=false}={}){
  const captain=commanderFor(pending,pending.attacker),support=pending.roadside.support;
  return `Strike the vanguard of ${pending.armyName}. Break ${pending.rally.guards} soldiers${captain?' and defeat or rout '+captain.name:''} to delay this march by ${elapsed?'one adventure minute':'one campaign day'}. Defeated soldiers reduce this army’s strength; a retreat is not a kill. ${support?`${support.strength} allied scouts from ${support.name} will fight alongside you.`:'No allied scouts are available nearby.'} This skirmish does not capture a town. Time is held while you decide and fight. You may leave now; once you fight, this is your one attempt against this march.`;
}

export function roadsideDebrief(pending,field,clock){
  const down=field.guards.filter(g=>!g.commanderId&&!g.hp).length;
  const removed=Math.floor(pending.roadside.strength*down/pending.rally.guards);
  const won=field.outcome==='success',survives=pending.attackers>removed;
  const commanders=field.guards.filter(g=>g.commanderId).map(g=>`${g.name}: ${!g.hp?'slain':g.routed?'retreated':'survived'}`);
  return {
    title:won?'March intercepted':'Roadside fight ended',
    detail:won?survives?`${pending.armyName} must regroup before continuing its march.`:`${pending.armyName} has been destroyed.`:`${pending.armyName} continues its march. Your recorded casualties still count.`,
    facts:[['Enemy strength',`${removed} removed`],['Enemy retreat',`${field.squad?.routed??0} routed, not killed`],['Allied scouts',`${field.squad?.alliesLost??0} lost${pending.roadside.support?' from '+pending.roadside.support.name:''}`],...(commanders.length?[['Commander',commanders.join('; ')]]:[]),['Arrival',won&&survives?`Delayed by ${clock?.sharedOpening?'1 adventure minute':'1 campaign day'}`:survives?'Unchanged':'Army destroyed'],['Territory','No town changes hands'],['Time','Held during combat; no time skipped']],
    next:survives?'Continue to return to the campaign. This march cannot be intercepted again; its later battle remains available.':'Continue to return to the campaign. This army will no longer reach its destination.',
    button:'Return to the campaign (Enter)'
  };
}
