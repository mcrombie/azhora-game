// Local road reports, evaluated only when someone asks. Civilians do not reveal
// the rest of the map, issue orders, or create new campaign events.
export function residentNews(person,state){
  const minora=person.region==='isareos',near=minora?'caricas':person.region;
  if(state?.winner)return minora
    ?'The war is over. Minora is the seat of the united Lizeemi League. Taleth is receiving visitors at the Wizard Guild.'
    :'The fighting is over. We belong to the Lizeemi League now. I want to see people on this road again without an army at their heels.';
  const battles=state?.engagements??[],armies=state?.armies??[];
  if(battles.some(b=>b.region===near&&b.status==='active'))return minora
    ?'There is fighting around Caricas, beyond the White Bridge. Keep outside the marked battlefield unless you intend to join it.'
    :person.shelter?'The battle has reached Caricas. We are taking shelter. If you mean to help, approach the marked boundary; otherwise keep clear.'
    :'The fighting near Caricas has stopped our work. Stay outside the marked boundary if you are passing through.';
  const march=armies.filter(a=>a.status==='marching'&&a.kind==='attack'&&a.to===near&&a.strength>0).sort((a,b)=>a.arrives-b.arrives)[0];
  if(march)return `An army is coming toward Caricas. ${minora?'The road beyond the White Bridge may lead you into the fighting.':'I would not take a loaded cart that way now.'} Watch for its banners; you need not join it.`;
  const battle=battles.findLast(b=>b.region===near&&b.status==='resolved');
  if(battle){const owner=state.regions?.[near]?.owner,side=owner==='west'?'West Lizeem':owner==='east'?'East Lizeem':null;
    return `The latest fighting at Caricas has ended.${side?' '+side+' holds the town.':''} ${minora?'Travellers are bringing news across the White Bridge again.':'We are returning to our work, but the wider war is not over.'}`;
  }
  if(minora)return person.occupation.toLowerCase().includes('bridge')?'This is the White Bridge road to Caricas. Minora remains neutral; crossing the bridge does not enlist you with either army.'
    :'Bear keeps the horses by the Wizard Guild. The White Bridge leads out toward Caricas; that is where travellers bring us news of the war.';
  return person.place?.includes('orchard')?'These are the orchards east of Caricas. The town is back to the west. We are keeping an ear out for soldiers on the road.'
    :person.place?.includes('fields')?'These fields are north of Caricas. The town lies farther south. For now we are getting what work we can done.'
    :'This road connects Caricas with Minora and its White Bridge. We are watching for army banners before sending carts out.';
}
