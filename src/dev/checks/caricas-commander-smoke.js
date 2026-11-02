import {setup,finish} from './champion-duel-smoke.js';
import {driveWorldEncounter,clearCombatKeys} from './encounter-controls.js';
import {validateWorldWarSave} from '../../app/exploration/war-checkpoint.js';
const assert=(ok,message)=>{if(!ok)throw Error(message);};
const frames=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
const fight=a=>a.war.state().encounter.encounter;
const key=code=>document.dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true,cancelable:true}));
async function begin(a,side){
  await setup(a);await a.war.help(side,'intercept');await finish(a);
  assert(document.getElementById('world-skirmish-facts').textContent.includes(side==='west'?'Serevan Dain':'Meret Voss'),'Interception receipt names the next enemy captain');
  document.getElementById('world-skirmish-continue').click();await a.war.help(side);
}
export async function commanders(a){
  await begin(a,'west');let s=fight(a),captain=s.guards.find(g=>g.commanderId);
  const yaw=Math.atan2(s.hero.x-captain.x,s.hero.z-captain.z);
  a.look({yaw:yaw+Math.PI,pitch:.4,distance:10});for(let i=0;i<8;i++)a.step(.04);
  const button=document.getElementById('combat-focus-commander');assert(!button.hidden&&button.disabled,'Captain cannot be locked from behind the camera');
  a.look({yaw,pitch:.4,distance:10});for(let i=0;i<8;i++)a.step(.04);
  assert(!button.disabled,'Captain target control is available in clear view');button.click();a.step(.04);
  assert(fight(a).presentation.focus.id===captain.id,'Target captain selects the named enemy, not a nearby soldier');
  const hud=document.getElementById('commander-hud');assert(hud.textContent.includes('Serevan Dain')&&hud.textContent.includes('Meret Voss'),'Both commanders are identified');
  assert(hud.querySelectorAll('meter').length===2,'Both sides have morale meters');
  const before=fight(a).time;document.getElementById('world-skirmish-help').click();for(let i=0;i<40;i++)a.step(.04);
  assert(fight(a).time===before&&button.disabled,'Help pauses combat and disables captain selection');
  document.getElementById('world-skirmish-help').click();a.step(.04);
  window.dispatchEvent(new Event('blur'));await frames();
  return {checks:['Named captain targeting respects view and pauses','Both captains and morale are readable without extra actors'],actors:s.guards.length+s.allies.length};
}
export async function morale(a){
  window.dispatchEvent(new Event('focus'));a.step(1/60);document.getElementById('combat-focus-toggle').click();
  assert(fight(a).presentation.focus.id===null,'Ordinary combat driver resumes with free targeting');
  for(let i=0;i<7400&&!fight(a).outcome;i++){
    driveWorldEncounter(a,fight(a));a.step(1/60);
    if(fight(a).guards.some(g=>g.commanderId&&(!g.hp||g.routed)))break;
  }
  clearCombatKeys(a);const s=fight(a),notice=document.getElementById('commander-notice');
  assert(!s.outcome&&!notice.hidden&&notice.textContent.includes('Serevan Dain'),'Commander retreat is announced while the field is still visible: '+JSON.stringify({outcome:s.outcome,notice:notice.textContent,hidden:notice.hidden,captain:s.guards.find(g=>g.commanderId)}));
  assert(notice.textContent.includes('Your morale rises')&&s.morale.allies>s.morale.enemies,'Announcement agrees with actual morale');
  const captain=document.getElementById('combat-focus-commander');assert(captain.hidden,'Routed captain cannot remain a target');
  window.dispatchEvent(new Event('blur'));await frames();return {checks:['Commander morale event appears during the line break','Routed captain drops out of targeting'],morale:s.morale};
}
export async function compact(){
  const root=document.getElementById('world-skirmish');
  assert(root.scrollWidth<=root.clientWidth+2,'Combat HUD fits the compact viewport');
  for(const id of ['combat-focus-commander','world-skirmish-help','world-skirmish-withdraw']){
    const b=document.getElementById(id);b.scrollIntoView({block:'nearest'});await frames();
    const r=b.getBoundingClientRect(),panel=root.getBoundingClientRect();
    assert(r.left>=0&&r.right<=innerWidth&&r.top>=panel.top&&r.bottom<=panel.bottom,id+' is reachable within the scrolling HUD');
    assert(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===b,id+' is not covered');
  }
  root.scrollTop=0;return {checks:['Captain, Help and Withdraw remain reachable on compact screens'],width:innerWidth,height:innerHeight};
}
export async function aftermath(a){
  await finish(a);assert(document.getElementById('commander-notice').hidden,'Result replaces the temporary announcement');
  document.getElementById('world-skirmish-continue').click();a.war.pause();a.step(.04);
  assert(!document.getElementById('commander-hud')&&!document.getElementById('commander-notice'),'Combat UI is disposed on Continue');
  const p=a.war.state().soldiers.people.find(p=>p.kind==='survivor');assert(p,'Surviving field soldiers remain interactable');
  await a.visit({x:p.x,z:p.z+2.4});a.look({yaw:0,pitch:.3,distance:7});a.step(.16);key('KeyF');
  assert(document.getElementById('soldier-dialog').open,'F speaks to a survivor');
  const before=JSON.stringify(a.war.state().campaign);document.querySelector('#soldier-dialog [data-topic="battle"]').click();
  const words=document.getElementById('soldier-words').textContent;
  assert(words.includes('Serevan Dain retreated')&&words.includes('Meret Voss survived'),'Survivor recalls the actual commander outcomes');
  key('Escape');assert(JSON.stringify(a.war.state().campaign)===before,'Conversation cannot change the battle');
  for(let i=0;i<100;i++)a.step(.05);
  const courier=a.war.state().courier;
  assert(courier.delivery&&courier.telepathic&&!courier.visible&&!courier.landed&&courier.destination===null&&!courier.people.length,'Taleth offers the first battle report without a messenger actor');
  assert(!document.getElementById('corris-arrival').hidden&&document.getElementById('corris-call').textContent.includes('Listen to Taleth'),'Taleth notification offers a clear listening action');
  key('KeyV');
  assert(a.war.state().courier.conversation,'V opens Taleth\'s first battle message from the current position');
  assert(document.getElementById('corris-summary').textContent.includes('Caricas')&&document.getElementById('taleth-campaign-now').textContent.length>20,'Taleth names the result and gives a next step');
  document.getElementById('corris-understood').click();await frames();return {checks:['Central result returns to exploration cleanly','Survivor remembers both commanders','Taleth supplies the result and next strategic step through telepathy']};
}
export async function eastDuel(a){
  await setup(a);await a.war.help('east','duel');const won=await finish(a);
  assert(won.guards[0].name==='Captain Meret Voss'&&won.guards[0].yielded,'East player wins against the western captain');
  document.getElementById('world-skirmish-continue').click();await a.war.help('east');let s=fight(a);
  assert(!s.guards.some(g=>g.commanderId)&&s.allies.some(g=>g.name==='Captain Serevan Dain'),'Won duel removes only the opposing captain from the assault');
  assert(s.morale.allies===85&&s.morale.enemies===45,'Duel advantage is visible immediately');
  await finish(a);document.getElementById('world-skirmish-continue').click();
  assert(a.war.state().campaign.regions.caricas.owner==='east','East duel route captures Caricas');
  assert(a.save().ok&&validateWorldWarSave(a.store.read().data),'East duel plus assault saves correctly');
  await a.loadSaved();a.war.pause();await frames();return {checks:['East duel and allied assault complete with real controls','Duel morale is shown before combat starts','East campaign checkpoint validates']};
}
export async function withdrawal(a){
  await begin(a,'east');
  // The tougher militia can outlive an idle hero. Wound the enemy captain with
  // the actual spell control instead of assuming a soldier dies first.
  const opening=fight(a),captain=opening.guards.find(g=>g.commanderId);
  a.look({yaw:Math.atan2(opening.hero.x-captain.x,opening.hero.z-captain.z),pitch:.4,distance:10});
  for(let i=0;i<8;i++)a.step(.04);
  const lock=document.getElementById('combat-focus-commander');assert(!lock.disabled,'Captain can be targeted for the wound/re-entry check');lock.click();a.step(.04);
  document.getElementById('teresod-fireball').click();
  for(let i=0;i<180&&fight(a).guards.find(g=>g.commanderId).hp===captain.hp;i++)a.step(1/60);
  assert(a.state().mode==='skirmish'&&fight(a).guards.find(g=>g.commanderId).hp<captain.hp,'Real Fireball wounds the captain before retreat');
  const s=fight(a),morale={allies:s.morale.allies,enemies:s.morale.enemies},captains=[...s.guards,...s.allies].filter(g=>g.commanderId).map(g=>[g.commanderId,g.hp]);
  document.getElementById('world-skirmish-withdraw').click();assert(a.save().ok&&validateWorldWarSave(a.store.read().data),'Partial commander fight saves');
  await a.loadSaved();a.war.pause();assert(a.war.join().ok,'Saved battlefield can be re-entered');await a.war.help('east');
  const next=fight(a);assert(next.morale.allies===morale.allies&&next.morale.enemies===morale.enemies,'Save and re-entry preserve both morale values');
  assert(JSON.stringify([...next.guards,...next.allies].filter(g=>g.commanderId).map(g=>[g.commanderId,g.hp]))===JSON.stringify(captains),'Captain wounds remain exact');
  await finish(a);document.getElementById('world-skirmish-continue').click();assert(a.war.state().campaign.regions.caricas.owner==='east','Depleted combined battle remains winnable');
  assert(!a.state().frameErrors.length,'No rendering errors');await frames();return {checks:['Combined retreat preserves real Fireball wounds and both morale values through Save/Continue','Wounded re-entry still leads to a valid victory'],morale,captains};
}
