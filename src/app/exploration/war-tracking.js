import {availableBattleStage} from '../../simulation/battle-stages.js';
// Tracking is presentation state, with its chosen destination saved. It never moves the hero or
// changes the simulation, and only receives already filtered army intelligence.
export function trackedWarTarget(target,state,scenario,armies,known,atlasToWorld){
  if(!target)return null;
  const region=id=>scenario.regions.find(r=>r.id===id)?.name??id;
  const unavailable={target,label:'Tracked target unavailable',detail:'No current sighting. Explore or open M.',location:null};
  if(target.kind==='army'){
    const army=state.armies.find(a=>a.id===target.id);
    if(!army)return unavailable;
    const battle=state.engagements.find(b=>b.status==='active'&&(b.attackingIds.includes(army.id)||(army.status==='engaged'&&army.region===b.region&&army.owner===b.defender)));
    if(battle&&known(battle.location))return trackedWarTarget({kind:'battle',id:battle.id},state,scenario,armies,known,atlasToWorld);
    const mark=armies.find(a=>a.id===target.id);
    if(!mark)return unavailable;
    return {target,label:mark.name,detail:mark.physical?mark.detail:`${mark.arrives!==null?`Expected day ${mark.arrives} (${mark.arrives-state.day} days). `:''}Estimated army position. Choose your own route.`,location:atlasToWorld(mark.x,mark.y)};
  }
  const battle=state.engagements.find(b=>b.id===target.id);
  if(!battle||!known(battle.location))return unavailable;
  const label=`Battle at ${region(battle.region)}`;
  if(battle.status!=='active')return {target,label,detail:'Battle ended. Open M for the outcome.',location:null};
  if(battle.participation)return {target,label,detail:`${availableBattleStage(battle)==='rally'?'Final assault available. ':battle.participation.faction?'Rejoin your side. ':''}Enter the marked battlefield on foot or horseback before day ${battle.endsOn}. You can decline and return.`,location:{...battle.location}};
  if(battle.rally?.status==='available')return {target,label:'Ovesos / rally assault',detail:`Your interception counts. Fight for a decisive victory before day ${battle.endsOn}.`,location:{...battle.location}};
  if(battle.heroResult)return {target,label,detail:`Your part is finished. Regional battle ends day ${battle.endsOn}.`,location:null};
  return {target,label,detail:`Join before day ${battle.endsOn} (${battle.endsOn-state.day} days). ${battle.region==='ovesos'?'Find a captain at the battlefield':'Reach the gold flag'} on foot.`,location:{...battle.location}};
}

export function trackingBearing(position,location,yaw){
  if(!location)return null;
  const dx=location.x-position.x,dz=location.z-position.z,distance=Math.hypot(dx,dz);
  // Camera sits behind the hero along (+sin(yaw), +cos(yaw)).
  return {distance,angle:Math.atan2(dx,-dz)+yaw};
}
