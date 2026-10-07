export function createReports(scenario){
  const region=id=>scenario.regions.find(r=>r.id===id)?.name??id;
  const faction=id=>scenario.factions.find(f=>f.id===id)?.short??id;
  const route=r=>`${r.days} days: distance ${r.distanceDays} + terrain ${r.terrainDays} + crossing ${r.crossingDays}. ${r.name}.`;
  function event(e){
    if(e.type==='opening')return 'The leagues are at war. Minora holds Isareos and remains neutral.';
    if(e.type==='march')return `${e.army.name} marches with ${e.army.strength} from ${region(e.army.from)} to ${region(e.army.to)}. ${e.reason} Arrival day ${e.army.arrives}.`;
    if(e.type==='retreat')return `${e.army.name}: ${e.army.strength} survivors retreat from ${region(e.army.from)} to ${region(e.army.to)}, arriving day ${e.army.arrives}.`;
    if(e.type==='surrender')return `${e.name}: ${e.strength} survivors surrender in ${region(e.region)}. ${e.reason}`;
    if(e.type==='recovered')return `${e.name} has regrouped in ${region(e.region)} and can receive new orders.`;
    if(e.type==='arrive')return `${e.army.name} arrives in ${region(e.region)} with ${e.army.strength} strength. ${e.army.status==='recovering'?`Regrouping until day ${e.army.readyOn}.`:'Ready for orders.'}`;
    if(e.type==='intervention')return `Developer intervention: ${faction(e.faction)} receives ${e.amount} strength in ${region(e.region)}.`;
    if(e.type==='hero-travel')return `Teresod travels to ${region(e.to)}, arriving day ${e.arrives}.`;
    if(e.type==='hero-arrive')return `Teresod arrives in ${region(e.region)}.`;
    if(e.type==='encounter')return `A battle in ${region(e.region)} awaits Teresod's decision.`;
    if(e.type==='hero-result')return e.outcome==='withdraw'?'Teresod stays out; the armies resolve the battle automatically.':`Teresod helps ${faction(e.faction)} in ${region(e.region)}: ${e.outcome}.`;
    if(e.type==='victory')return `${faction(e.faction)} wins. Its opponent has no territory or surviving field armies. Minora remains neutral.`;
    if(e.type==='battle'){
      const retreats=e.retreats.map(r=>`${r.name}: ${r.strength} retreat to ${region(r.to)} (day ${r.arrives})`).join('; ');
      const hero=e.hero?`Teresod: ${e.hero.outcome} for ${faction(e.hero.faction)}; attack chance before intervention ${(e.baseChance*100).toFixed(1)}%. `:'';
      const surrendered=e.surrendered.reduce((n,r)=>n+r.strength,0);
      return `${hero}${e.armyName} ${e.captured?'captures':'fails to take'} ${region(e.region)}: ${e.attackers} attacking against ${e.defenders} defending (garrison and stationed armies). Defender advantage ${Math.round((e.defenseBonus-1)*100)}%. Attack chance ${(e.chance*100).toFixed(1)}%; roll ${(e.roll*100).toFixed(1)}%. Battle losses: ${e.attackLoss} attackers, ${e.defenseLoss} defenders. ${e.survivors} hold the region.${retreats?' Retreats: '+retreats+'.':''}${surrendered?' Another '+surrendered+' surrender because no friendly exit remains.':''}`;
    }
    return e.type;
  }
  return {region,faction,route,event};
}
