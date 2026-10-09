import {availableBattleStage} from '../../simulation/battle-stages.js';
import {driveWorldEncounter,clearCombatKeys} from './encounter-controls.js';
const assert=(ok,message)=>{if(!ok)throw Error(message);};
const frames=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
const click=id=>document.getElementById(id).click();
let phases=0;
function unclipped(id){const e=document.getElementById(id),r=e.getBoundingClientRect();assert(r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth&&r.width>0,'Control fits viewport: '+id);}
export async function letter(a){
  window.dispatchEvent(new Event('focus'));a.war.pause();click('taleth-read-letter');
  const day=a.war.state().campaign.day;for(let i=0;i<50;i++)a.step(.04);
  assert(a.war.state().campaign.day===day,'Letter holds campaign time');
  assert(document.getElementById('taleth-campaign-now').textContent.includes('Campaign now:'),'Historical letter has separate live advice');
  unclipped('taleth-letter-title');unclipped('taleth-letter-close');unclipped('taleth-letter-follow');await frames();
  return {checks:['Letter retains battle account and displays current opportunity separately','Reading pauses time; follow/close fit compact viewport']};
}
async function fight(a,side){
  console.log('EXPLORATION_CONTINUITY fight '+JSON.stringify({side,pending:a.war.state().campaign.pending?.region,stage:a.war.state().campaign.pending?.stage}));
  await a.war.help(side);assert(a.state().mode==='skirmish','New field stages a real landscape encounter');
  let s;try{for(let i=0;i<6600;i++){
    if(i%180===0)window.dispatchEvent(new Event('focus'));
    s=a.war.state().encounter.encounter;if(s?.outcome)break;
    assert(s&&a.state().mode==='skirmish','Combat keeps running');driveWorldEncounter(a,s);a.step(1/60);if(i%180===179)await frames();
  }}finally{clearCombatKeys(a);}
  assert(s?.hero.hp>0&&s?.outcome==='success','Combat driver wins on this field: '+JSON.stringify(s));phases++;return {hp:s.hero.hp,squad:s.squad};
}
export async function next(a,side){
  window.dispatchEvent(new Event('focus'));
  if(a.state().mode==='briefing')click('taleth-letter-follow');
  else a.war.followNext();
  assert(a.war.state().clock.running||a.war.state().campaign.winner||a.war.state().opportunity.kind!=='regroup','Following resumes time or an explicit wait finds the next front');
  const target=a.war.state().tracking?.target;a.war.followNext();
  assert(JSON.stringify(a.war.state().tracking?.target)===JSON.stringify(target),'Repeated follow does not toggle tracking off');
  a.war.pause();
  // Later travel is test placement, not a claim about full human travel pacing.
  for(let day=0;day<70&&!a.war.state().campaign.winner&&!a.war.state().campaign.engagements.some(availableBattleStage);day++)a.war.advance();
  if(a.war.state().campaign.winner)return {winner:a.war.state().campaign.winner};
  const b=a.war.state().campaign.engagements.find(availableBattleStage);assert(b,'A further opportunity opens');
  console.log('EXPLORATION_CONTINUITY field '+JSON.stringify({region:b.region,day:a.war.state().campaign.day}));
  await a.visit(b.location);a.war.sync();a.step(.001);
  if(!a.war.state().campaign.pending)a.war.join(b.id);
  assert(a.war.state().campaign.pending?.id===b.id,'Actual site allows entry');
  const first=await fight(a,side);a.war.continue();
  assert(a.war.state().campaign.pending?.rally,'The final-province encounter also offers a final assault');
  document.getElementById('assault-with-allies').checked=true;const final=await fight(a,side);a.war.continue();a.war.pause();
  const s=a.war.state().campaign;assert(s.regions[b.region].owner===side&&s.day>=b.endsOn,'Victory agrees with regional ownership and deadline');
  assert(!a.state().frameErrors.length,'Repeated battles have no frame errors');
  assert(a.save().ok,'Campaign saves between battles');await a.loadSaved();a.war.pause();
  assert(JSON.stringify(a.war.state().campaign)===JSON.stringify(s),'Continue keeps exact campaign between battles');
  a.look({yaw:0,pitch:.25,distance:9});for(let i=0;i<10;i++)a.step(.04);window.dispatchEvent(new Event('blur'));await frames();
  return {checks:['Real landscape combat through both phases','Immediate result agrees with ownership','Exact midwar Continue'],region:b.region,day:s.day,winner:s.winner,first,final};
}
export async function verify(a,side){
  const s=a.war.state().campaign;assert(s.winner===side,'Player-supported side wins the completed campaign');
  assert(a.war.state().opportunity.kind==='finale','Next opportunity changes to Taleth’s lookout');
  assert(a.council.state().influence.leader===(side==='west'?'mayor':'temple'),'Final council flags agree with victor');
  a.openMap();unclipped('world-war-map-next');click('world-war-map-next');
  assert(a.war.save(a.snapshot()).navigation?.id==='council','Final follow button tracks Minora');
  assert(!a.war.state().clock.running,'Finished war does not restart');await frames();
  return {checks:['Victor, council, invitation and live target agree','Map follow returns to play without restarting a finished war'],winner:s.winner,day:s.day,phases:phases+2,battles:s.engagements.filter(b=>b.participation).length};
}
