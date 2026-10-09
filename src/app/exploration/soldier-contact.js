// Swept circles stop a fast rider crossing a stationary representative in one
// frame. Already overlapping saves can move out; ghosts/flight bypass in host.
export function stopAtSoldier(previous,next,soldiers,radius=1){
  const dx=next.x-previous.x,dz=next.z-previous.z,length=dx*dx+dz*dz;
  if(length<1e-12)return null;
  let fraction=1;
  for(const s of soldiers){
    if(Math.abs(next.y-s.y)>2.6)continue;
    const x=previous.x-s.x,z=previous.z-s.z,c=x*x+z*z-radius*radius,b=x*dx+z*dz;
    if(c<0){if(b<0)fraction=0;continue;}
    const discriminant=b*b-length*c;if(discriminant<0||b>=0)continue;
    const t=(-b-Math.sqrt(discriminant))/length;
    if(t>=0&&t<1)fraction=Math.min(fraction,Math.max(0,t-.001/Math.sqrt(length)));
  }
  return fraction<1?{x:previous.x+dx*fraction,z:previous.z+dz*fraction}:null;
}

export function soldierWords(person,campaign,opportunity,faction,region){
  const place=region(person.region),owner=campaign.winner?'Lizeemi League':faction(person.owner),battle=campaign.engagements.find(b=>b.id===person.battleId);
  const stillHolds=campaign.regions[person.region]?.owner===person.owner;
  return {
    name:`${owner} ${person.kind==='survivor'?'soldier':'sentry'}`,
    office:person.kind==='survivor'?`Regrouping in ${place}`:`On watch in ${place}`,
    hello:campaign.winner?`The Lizeemi League is united. ${person.owner===campaign.winner?"Our side prevailed, but there are friends missing from the roll. I'm glad the fighting is over.":"Our side lost. We still have to live together; give us time."}`:person.kind==='survivor'?`The fighting here is over. We're gathering the survivors and seeing to the wounded. Give us a little room.`:`I'm on watch. ${owner} holds ${place}; we're keeping the approaches clear.`,
    battle:battle?`${faction(battle.captured?battle.attacker:battle.defender)} won the battle here on day ${battle.resolvedOn??battle.endsOn}. ${stillHolds?owner+' holds '+place+'.':'Control has changed since then.'} ${battle.heroResult?.faction?'You fought for '+faction(battle.heroResult.faction)+'.':''}`:`${owner} holds ${place}. I can tell you about this post, but Taleth's dispatches will give you the wider picture.`,
    next:opportunity?.title?`For the wider situation, read Taleth's latest dispatch: ${opportunity.title}. We're holding this post for now.`:'Our orders are to hold this post. Watch for a dispatch from Taleth about what comes next.'
  };
}
