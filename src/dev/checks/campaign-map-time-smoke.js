import {prepareWarExterior} from './tower-smoke.js';
import {createAdventureWar} from '../../experiments/day-night/opening-war.js';
import {validateWorldWarSave} from '../../app/exploration/war-checkpoint.js';

const assert=(value,label)=>{if(!value)throw Error(label);};
const button=speed=>document.querySelector(`#world-war-map-time [data-speed="${speed}"]`);
const seconds=a=>a.war.clock().elapsedSeconds;
const step=(a,count=4)=>{for(let i=0;i<count;i++)a.step(.04,.25);};
const near=(value,expected)=>assert(Math.abs(value-expected)<1e-6,`${value} != ${expected}`);
const focus=()=>window.dispatchEvent(new Event('focus'));
async function capture(a){
  window.dispatchEvent(new Event('blur'));await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const time=seconds(a),label=`Adventure ${String(Math.floor(time/60)).padStart(2,'0')}:${String(Math.floor(time%60)).padStart(2,'0')}`;
  assert(document.getElementById('world-war-day').textContent===label,'Displayed clock matches the simulation');
  return {seconds:time,status:document.getElementById('world-war-status').textContent};
}

export async function tower(a){
  focus();a.openMap();const before=seconds(a);
  for(const speed of [1,4,20]){assert(button(speed).disabled,'Tower locks '+speed+'×');button(speed).click();}
  step(a);near(seconds(a),before);
  assert(!document.getElementById('world-war-map-time').hidden,'Speed controls appear on the campaign map');
  const result=await capture(a);a.resume();return result;
}
export async function playback(a){
  focus();await prepareWarExterior(a);await a.visit({x:-2092,z:135});a.reveal(true);a.war.begin();a.openMap();
  let before=seconds(a);step(a);near(seconds(a),before);
  assert(button(0).getAttribute('aria-pressed')==='true','Map starts paused');
  for(const speed of [1,4,20]){
    assert(!button(speed).disabled,'Outdoor speed control available');button(speed).click();before=seconds(a);step(a);near(seconds(a)-before,speed);
    assert(button(speed).getAttribute('aria-pressed')==='true','Selected speed is highlighted');
  }
  button(0).click();before=seconds(a);step(a);near(seconds(a),before);
  assert(a.save().ok&&validateWorldWarSave(a.store.read().data),'Accelerated progress saves in the ordinary format');
  assert(a.store.read().data.speed===1,'Saved outdoor speed stays normal');
  return capture(a);
}
export async function reading(a){
  focus();button(20).click();const report=document.getElementById('food-world-report');assert(report,'Food report exists');report.open=true;
  let before=seconds(a);step(a);near(seconds(a),before);assert(/Reading/.test(a.war.clock().heldReason),'Food report visibly holds time');
  report.open=false;step(a);near(seconds(a)-before,20);
  window.dispatchEvent(new Event('blur'));before=seconds(a);step(a);near(seconds(a),before);
  focus();step(a);near(seconds(a)-before,20);
  document.getElementById('taleth-letters').click();assert(a.state().mode==='briefing','Taleth messages open');
  before=seconds(a);step(a);near(seconds(a),before);
  document.getElementById('taleth-letter-close').click();
  assert(a.state().mode==='map'&&!a.war.mapTimeRunning(),'Closing messages returns to a paused map');
  return capture(a);
}
export async function returning(a){
  focus();button(20).click();a.resume();const before=seconds(a);step(a);near(seconds(a)-before,1);
  assert(!a.war.mapTimeRunning(),'Closing map clears acceleration');
  a.openMap();const reopened=seconds(a);step(a);near(seconds(a),reopened);
  assert(button(0).getAttribute('aria-pressed')==='true','Reopening is paused again');
  return capture(a);
}
export async function battle(a){
  focus();const w=createAdventureWar();w.advance(2);w.begin();for(let i=0;i<59;i++)w.tick(1,true);
  a.war.restore({...w.checkpoint(),campaignSide:'west'});button(20).click();step(a);button(0).click();
  const battle=a.war.state().campaign.engagements.find(b=>b.region==='caricas');
  assert(battle?.status==='resolved'&&battle.startedAt===0,'Fast-forward resolves the unattended opening battle at 03:00');
  assert(a.state().mode==='map'&&!a.war.state().campaign.pending,'Fast-forward does not enlist the hero');
  assert(!a.state().frameErrors.length,'No frame errors');return {...await capture(a),battleStartedAt:battle.startedAt};
}

export async function waiting(a){
  focus();a.resume();await a.visit({x:-2092,z:135});a.reveal(true);
  const war=createAdventureWar();war.advance(4);a.war.restore({...war.checkpoint(),campaignSide:'west'});a.war.run();
  assert(a.war.state().opportunity.kind==='regroup','Fixture is between fronts');
  const next=document.getElementById('world-war-next');
  assert(next&&!next.hidden&&next.textContent==='Wait for next front','A visible main-quest button offers the wait');
  next.click();assert(a.state().mode==='map'&&a.war.mapTimeRunning(),'Wait opens map at accelerated speed');
  step(a);a.resume();const canceled=seconds(a);step(a);near(seconds(a)-canceled,1);
  assert(!a.war.mapTimeRunning(),'Closing map cancels the wait');
  a.war.followNext();
  for(let i=0;i<300&&a.war.mapTimeRunning();i++){step(a);await new Promise(r=>requestAnimationFrame(r));}
  const state=a.war.state();assert(!a.war.mapTimeRunning()&&state.opportunity.target,'Wait stops at a real new destination / '+JSON.stringify({mode:a.state().mode,running:a.war.mapTimeRunning(),clock:state.clock,next:state.opportunity,columns:state.columns,status:document.getElementById('world-war-status').textContent}));
  assert(/New front:/.test(document.getElementById('world-war-status').textContent),'Map explains the stop');
  const stopped=seconds(a);step(a);near(seconds(a),stopped);
  assert(!state.campaign.pending&&a.state().mode==='map','No forced engagement');
  const result={...await capture(a),directive:state.opportunity,checks:['Main-quest wait opens map at 20×','Closing map cancels and returns to normal time','Stops at a new destination without entering combat']};
  focus();a.resume();const before=seconds(a);step(a);near(seconds(a)-before,1);await capture(a);
  return result;
}
