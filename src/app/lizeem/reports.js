export function createReports(scenario){
  const region=id=>scenario.regions.find(r=>r.id===id)?.name??id;
  const faction=id=>scenario.factions.find(f=>f.id===id)?.short??id;
  const route=r=>`${r.days} days: distance ${r.distanceDays} + terrain ${r.terrainDays} + crossing ${r.crossingDays}. ${r.name}.`;
  function event(e){
    if(e.type==='opening')return scenario.food?'Food test begins. Both leagues trade with neutral Minora; local rations and reserves take priority.':'The leagues are at war. Minora holds Isareos and remains neutral.';
    if(e.type==='food-shortage')return `${region(e.region)} cannot provide full civilian rations. Stability is falling.`;
    if(e.type==='food-restored')return `${region(e.region)} has full civilian rations again. Stability recovers gradually.`;
    if(e.type==='army-hold')return `${e.name} holds in ${region(e.region)}. ${e.reason}`;
    if(e.type==='food-attrition')return `${e.region?region(e.region):`Army ${e.armyId}`} loses ${e.strength} military strength after sustained food shortages.`;
    if(e.type==='food-action'){
      const a=e.action;
      if(a.type==='route')return `Food route ${region(a.from)} — ${region(a.to)} ${a.blocked?'closed':'reopened'}. Deliveries change next day.`;
      if(a.type==='production')return `${region(a.region)} production condition set to ${Math.round(a.condition*100)}%. Applies next day.`;
      return `${faction(a.faction)} rationing policy: ${a.policy.replaceAll('-',' ')}.`;
    }
    if(e.type==='march')return `${e.army.name} marches with ${e.army.strength} from ${region(e.army.from)} to ${region(e.army.to)}. ${e.reason} Arrival day ${e.army.arrives}.`;
    if(e.type==='battle-start'){const b=e.engagement;return `${faction(b.attacker)} attacks ${faction(b.defender)} in ${region(b.region)}. Battle ends on day ${b.endsOn}.${scenario.food?' Food routes through this region close and battle-day production is halved.':''}`;}
    if(e.type==='battle-reinforced')return `Army ${e.armyId} brings ${e.strength} strength to the battle in ${region(e.region)}.`;
    if(e.type==='retreat')return `${e.army.name}: ${e.army.strength} survivors retreat from ${region(e.army.from)} to ${region(e.army.to)}, arriving day ${e.army.arrives}.`;
    if(e.type==='surrender')return `${e.name}: ${e.strength} survivors surrender in ${region(e.region)}. ${e.reason}`;
    if(e.type==='recovered')return `${e.name} has regrouped in ${region(e.region)} and can receive new orders.`;
    if(e.type==='arrive')return `${e.army.name} arrives in ${region(e.region)} with ${e.army.strength} strength. ${e.army.status==='recovering'?`Regrouping until day ${e.army.readyOn}.`:e.army.status==='engaged'?'Defending the ongoing battle.':'Ready for orders.'}`;
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
      const supply=Number.isFinite(e.attackPower)?` Food-adjusted forces: ${e.attackPower.toFixed(1)} attacking against ${e.defensePower.toFixed(1)} defending.`:'';
      return `${hero}${e.armyName} ${e.captured?'captures':'fails to take'} ${region(e.region)}: ${e.attackers} attacking against ${e.defenders} defending (garrison and stationed armies).${supply} Defender advantage ${Math.round((e.defenseBonus-1)*100)}%. Attack chance ${(e.chance*100).toFixed(1)}%; roll ${(e.roll*100).toFixed(1)}%. Battle losses: ${e.attackLoss} attackers, ${e.defenseLoss} defenders. ${e.survivors} hold the region.${retreats?' Retreats: '+retreats+'.':''}${surrendered?' Another '+surrendered+' surrender because no friendly exit remains.':''}`;
    }
    return e.type;
  }
  return {region,faction,route,event};
}
