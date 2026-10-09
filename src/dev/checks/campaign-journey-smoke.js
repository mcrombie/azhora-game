import {travel,fight} from './first-session-smoke.js';
import {createWorldWar} from '../../app/exploration/world-war.js';
import {availableBattleStage} from '../../simulation/battle-stages.js';
import {TALETH_SPOT} from '../../app/exploration/tower-state.js';
const assert=(v,m)=>{if(!v)throw Error(m);};
const frames=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
const key=code=>document.dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true}));
async function elapse(a,seconds){for(let i=0;i<seconds*25;i++){if(i%100===0)window.dispatchEvent(new Event('focus'));a.step(.04);if(i%100===99)await frames();}}
export async function firstLetter(a){
  window.dispatchEvent(new Event('focus'));document.getElementById('taleth-read-letter').click();
  const day=a.war.state().campaign.day;await elapse(a,30);
  assert(a.war.state().campaign.day===day,'Reading does not consume the next battle window');
  assert(document.getElementById('taleth-letter-words').textContent.includes('day 9'),'Taleth reports the fresh counterattack recovery window');
  assert(document.getElementById('taleth-campaign-now').textContent.includes('Ovesos'),'The live letter identifies the actual next field');
  return {checks:['Result explains the recovery opening','Reading preserves the next opportunity','Next field is Ovesos'],day};
}
export async function secondRide(a){
  window.dispatchEvent(new Event('focus'));document.getElementById('taleth-letter-follow').click();
  assert(a.war.state().clock.running,'Letter follow resumes ordinary campaign time');
  assert(a.war.state().tracking?.region==='ovesos'||a.war.state().opportunity.region==='ovesos','One marker tracks the next battle');
  const started=a.war.state().campaign.day;key('KeyH');await elapse(a,10);key('KeyG');
  assert(a.stable.mounted,'Whistle and G recover the ordinary horse after combat');
  let seconds=10;
  // A surveyed test route, never added as player-facing mini-step markers.
  for(const [x,z] of [[-2110,270],[-2050,330],[-2050,500],[-2010,570],[-1940,640],[-1905,706]]){
    console.log('EXPLORATION_JOURNEY ride '+JSON.stringify({target:[x,z],position:a.state().position,day:a.war.state().campaign.day}));
    seconds+=await travel(a,{x,z},{entry:true,reach:2});
    if(a.state().mode==='encounter')break;
  }
  const s=a.war.state().campaign;
  assert(s.pending?.region==='ovesos','Actual riding enters the second battlefield before its deadline');
  assert(s.day<8&&a.stable.mounted,'Mounted arrival leaves time to accept battle');
  assert(!s.commands.some(c=>['reinforce','hero-travel'].includes(c.type)),'No test reinforcement or campaign travel commands');
  return {checks:['Whistle recovers horse after the first battle','Ride from Caricas to Ovesos at normal speed','Area entry opens the second battle in time'],started,arrival:s.day,seconds};
}
export async function secondBattle(a,side){
  window.dispatchEvent(new Event('focus'));await a.war.help(side);const first=await fight(a);assert(first.outcome==='success','Second interception remains winnable');a.war.continue();
  assert(a.war.state().campaign.pending?.rally,'Second battle offers its assault');document.getElementById('assault-with-allies').checked=true;await a.war.help(side);const final=await fight(a);
  assert(final.outcome==='success'&&final.squad.damageByAllies>0&&final.squad.damageByHero>0,'Teresod and allies complete the second assault');
  const button=document.getElementById('world-skirmish-continue'),r=button.getBoundingClientRect();assert(r.top>=0&&r.bottom<=innerHeight&&r.width>0,'Result Continue stays visible on a compact screen');
  await frames();return {checks:['Four phases fought through ordinary inputs','Visible result Continue without scrolling'],side,first:{hp:first.hero.hp},final:{hp:final.hero.hp,squad:final.squad}};
}
export async function secondResult(a,side){
  document.getElementById('world-skirmish-continue').click();a.war.pause();
  const s=a.war.state().campaign;assert(s.day===8&&s.regions.ovesos.owner===side,'Second result and control agree immediately');
  assert(a.save().ok,'Two-battle journey saves');await a.loadSaved();assert(JSON.stringify(a.war.state().campaign)===JSON.stringify(s),'Continue preserves the whole journey');
  assert(!a.state().frameErrors.length,'No renderer errors across the two-battle journey');
  return {checks:['Second result matches control on day eight','Save/Continue preserves both battles'],side,day:s.day};
}
export async function quietWait(a){
  assert(a.war.state().opportunity.kind==='regroup','A quiet interval follows the second battle');
  const before=a.war.state().campaign.day,point=a.state().position;
  a.openMap();assert(document.getElementById('world-war-map-next').textContent==='Wait for next dispatch','Wait is an explicit player action');document.getElementById('world-war-map-next').click();
  const s=a.war.state();assert(s.campaign.day>before&&s.campaign.day<=before+7,'Wait is bounded');assert(!s.clock.running,'Wait pauses for the new dispatch');
  assert(s.opportunity.kind!=='regroup','Wait stops at a known front');assert(JSON.stringify(a.state().position)===JSON.stringify(point),'Wait never relocates the player');
  return {checks:['Explicit wait skips the quiet interval','Pauses at a known front without moving the player'],from:before,to:s.campaign.day,opportunity:s.opportunity};
}
export async function choices(a){
  window.dispatchEvent(new Event('focus'));a.war.run();
  for(let i=0;i<6000&&!a.war.state().opportunity.alternative;i++){if(i%100===0)window.dispatchEvent(new Event('focus'));a.step(.04);if(i%100===99)await frames();}
  const opportunity=a.war.state().opportunity;assert(opportunity.alternative,'Both known defensive and offensive opportunities become available');a.openMap();document.getElementById('taleth-letters').click();
  for(const id of ['taleth-letter-title','taleth-letter-follow','taleth-letter-alternative','taleth-letter-close']){const r=document.getElementById(id).getBoundingClientRect();assert(r.width>0&&r.top>=0&&r.bottom<=innerHeight,'Decision control fits: '+id);}
  assert(document.getElementById('taleth-campaign-now').textContent.includes(opportunity.tradeoff),'Letter explains both strategic consequences');
  await frames();return {checks:['Known attack and defense are both offered','Compact letter keeps both choices visible'],opportunity};
}
export async function alternate(a){
  window.dispatchEvent(new Event('focus'));const before=a.war.state().opportunity.alternative;document.getElementById('taleth-letter-alternative').click();
  const tracked=a.war.state().tracking?.target;assert(tracked?.kind===before.target.kind&&tracked?.id===before.target.id,'Alternative selects its own single marker');
  assert(a.war.state().clock.running&&a.state().mode==='playing','Choosing the other front resumes play');
  assert(!a.war.state().campaign.pending,'Tracking never starts a battle or chooses allegiance');
  a.war.pause();return {checks:['Alternative tracks one target and resumes time','No forced enlistment or battle entry'],target:tracked};
}

// Separate UI fixture for the new wait button; this does not claim real travel
// or combat. The ordinary-input two-battle journey above tests those separately.
export async function waitFixture(a){
  window.dispatchEvent(new Event('focus'));await travel(a,{x:TALETH_SPOT.x,z:TALETH_SPOT.z+2},{reach:1.5});key('KeyF');document.getElementById('tower-next').click();
  const w=createWorldWar();w.advance(3);for(let i=0;i<4;i++){const b=w.snapshot().engagements.find(availableBattleStage);w.campaign.locateHero(b.region);w.campaign.joinBattle(b.id,b.location);const p=w.snapshot().pending;assert(w.campaign.resolveEncounter(p.id,'west','success',p.rally?'rally-secured':'vanguard-broken',p.rally?p.rally.guards:3).ok,'Fixture result is valid');}
  a.war.restore(w.checkpoint());const result=await quietWait(a);const campaign=a.war.state().campaign;assert(a.save().ok,'Waited campaign can save');await a.loadSaved();assert(JSON.stringify(a.war.state().campaign)===JSON.stringify(campaign),'Waited campaign replays exactly');assert(!a.state().frameErrors.length,'Wait has no renderer errors');await frames();
  return {...result,checks:[...result.checks,'Wait/save/Continue retains exact campaign']};
}
