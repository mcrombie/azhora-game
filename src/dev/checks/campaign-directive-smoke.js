import {prepare as prepareAdventure} from './adventure-war-smoke.js';
import {validateWorldWarSave} from '../../app/exploration/war-checkpoint.js';
import {driveWorldEncounter,clearCombatKeys} from './encounter-controls.js';

// Isolated desktop profile. Checkpoint variants select a branch before battle;
// they do not change armies, damage, outcomes or the ordinary combat AI.
const checks=[];
const assert=(value,label)=>{if(!value)throw Error(label);checks.push(label);console.log('EXPLORATION_CHECK '+label);};
const state=a=>a.war.state();
const campaign=a=>state(a).campaign;
const combat=a=>state(a).encounter.encounter;
const $=id=>document.getElementById(id);
const frame=()=>new Promise(requestAnimationFrame);
const refresh=a=>{a.step(0);a.openingTime.update(true);};
const click=id=>{assert($(id)&&!$(id).hidden&&!$(id).disabled,'Available directive control: '+id);$(id).click();};
const opposite=side=>side==='west'?'east':'west';
const factionName=side=>side==='west'?'West Lizeem':'East Lizeem';
let opening,stable,firstBattle;

export function menu(){
  assert(!$('start-screen').hidden,'The main menu is shown before campaign launch');
  const begin=document.querySelector('[data-start-mode="war"]');assert(begin,'The normal campaign launch control exists');begin.click();
  assert($('campaign-allegiance-menu').hidden,'New campaign launches directly without a pregame side choice');
  return {checks:[...checks],selected:null};
}

export function menuLaunch(a){
  assert(a.war.clock().fullCampaign,'The ordinary menu starts the full adventure campaign');
  assert(!state(a).campaignSide,'A new campaign waits for an in-world allegiance choice');
  assert(a.tower.state().inside&&!a.tower.state().briefed,'The campaign begins in Taleth\'s unbriefed tower');
  const saved=checkpoint(a);assert(!saved.campaignSide,'The undecided tower saves without a side');
  assert(!a.state().frameErrors.length,'Menu launch produces no frame errors');
  return {checks:[...checks],side:state(a).campaignSide};
}

async function until(predicate,label,timeout=30000){
  const end=performance.now()+timeout;
  while(!predicate()&&performance.now()<end)await new Promise(resolve=>setTimeout(resolve,50));
  assert(predicate(),label);
}
function checkpoint(a){
  assert(a.save().ok,'Committed campaign saves through the ordinary save control');
  const saved=a.store.read().data;
  assert(validateWorldWarSave(saved),'Committed checkpoint passes the public save validator');
  return structuredClone(saved);
}
async function restore(a,saved){
  assert(a.store.save(structuredClone(saved)).ok,'Isolated branch checkpoint accepted');
  await a.loadSaved();a.resume();window.dispatchEvent(new Event('focus'));refresh(a);
}
function commitment(a,side){
  assert(state(a).campaignSide===side,'Campaign remains committed to '+factionName(side));
  assert(!/choose (?:a|your) side/i.test($('world-war-objective-detail').textContent),'Current objective does not ask the committed player to choose a side');
}
function currentDirective(a,previousBattle=null){
  const next=state(a).opportunity;
  assert(next&&next.kind!=='briefing','Taleth has a current campaign directive');
  assert($('world-war-objective-title').textContent.trim().length>0,'One primary objective has a visible title');
  assert($('world-war-objective-detail').textContent.trim().length>0,'The primary objective explains the next task');
  if(next.kind==='battle'){
    const active=campaign(a).engagements.find(b=>b.id===next.target?.id);
    assert(active?.status==='active','A battle directive points to a currently active battle');
  }
  if(previousBattle)assert(next.target?.kind!=='battle'||next.target.id!==previousBattle,'Resolved battle is removed from the current directive');
  return next;
}
function wait(a){
  const next=a.war.waitForecast(),before=a.war.clock().elapsedSeconds;
  assert(next?.ok&&next.key,'Quiet ground provides a real campaign event to wait for');
  assert(a.war.waitOpening(next.key).ok,'Waiting advances the actual campaign');refresh(a);a.war.pause();
  assert(a.war.clock().elapsedSeconds>before,'Waiting does not stall at an expired directive');
}

export async function prepare(a){
  await prepareAdventure(a,900000);
  assert(state(a).campaignSide==='west','The prelaunch West choice reaches the live campaign');
  opening=checkpoint(a);assert(opening.campaignSide==='west','Allegiance is part of the saved campaign');
  const p=a.state().position;stable={x:p[0],z:p[2]};
  commitment(a,'west');currentDirective(a);
  return {checks:[...checks],side:state(a).campaignSide,opportunity:state(a).opportunity};
}

async function invitation(a,side){
  // Separate West and East campaign starts share already loaded scenery only.
  await restore(a,{...structuredClone(opening),campaignSide:side});
  commitment(a,side);await a.visit(stable);refresh(a);
  for(let i=0;i<8&&!campaign(a).engagements.some(b=>b.status==='active'&&b.region==='caricas');i++)wait(a);
  firstBattle=campaign(a).engagements.find(b=>b.status==='active'&&b.region==='caricas');
  assert(firstBattle,'The real first Caricas battle begins');a.war.pause();
  await a.visit(firstBattle.location);refresh(a);
  if(a.state().mode!=='encounter')assert(a.war.join(firstBattle.id).ok,'Enter the first battlefield normally');
  assert($('encounter-dialog').matches(':modal'),'Battle entry shows its confirmation modal');
  const pending=campaign(a).pending,chosen=pending.attacker===side?'fight-attacker':'fight-defender',other=pending.attacker===side?'fight-defender':'fight-attacker';
  assert(!$(chosen).hidden&&$(other).hidden,'Only the committed side has a battle entry button');
  assert(!/choose (?:a|your) side|choose the league/i.test($('encounter-brief').textContent),'Battle conditions never ask for allegiance again');
  const before=JSON.stringify(campaign(a).pending);
  await a.war.help(opposite(side),'intercept');
  assert(a.state().mode==='encounter'&&!combat(a)&&JSON.stringify(campaign(a).pending)===before,'A direct opposite-side join cannot change allegiance or start combat');
  assert($('encounter-return')&&!$('encounter-return').disabled,'The player may stay out of the recommended battle');
  const tactical=$('encounter-opening');
  assert(tactical&&!tactical.closest('[hidden]'),'The army commander duel remains a tactical opening');
  tactical.value='duel';tactical.dispatchEvent(new Event('change'));
  assert(!$(chosen).hidden&&$(other).hidden,'Changing tactics preserves the single committed-side entry');
  assert(!/choose (?:a|your) side|choose the league/i.test($('encounter-brief').textContent),'Duel instructions also respect campaign allegiance');
  tactical.value='intercept';tactical.dispatchEvent(new Event('change'));
  return {checks:[...checks],side,battle:firstBattle.id,brief:$('encounter-brief').textContent};
}
export const westInvitation=a=>invitation(a,'west');
export const eastInvitation=a=>invitation(a,'east');

async function played(a,side){
  const battleId=firstBattle.id,at=a.war.clock().elapsedSeconds,phases=[];
  for(let phase=0;phase<3&&campaign(a).pending;phase++){
    const pending=campaign(a).pending,button=pending.attacker===side?'fight-attacker':'fight-defender';
    if(phase===0&&side==='west'){
      const choice=$('encounter-opening');choice.value='duel';choice.dispatchEvent(new Event('change'));
      click(button);assert(/Serevan Dain/.test($('encounter-title').textContent),'West challenges East\'s named army commander');
      click(button);
    }else click(button);
    await until(()=>a.state().mode==='skirmish',side+' confirmation begins the ordinary encounter');
    let steps=0;
    for(;steps<9000&&!combat(a)?.outcome&&a.state().mode==='skirmish';steps++){
      driveWorldEncounter(a,combat(a));a.step(1/60);if(steps%120===119)await frame();
    }
    clearCombatKeys(a);const result=combat(a);
    assert(result?.outcome==='success','Ordinary combat inputs win '+side+' phase '+phase);
    assert($('battle-result-dialog').matches(':modal'),'Battle results remain in a centered modal');
    if(pending.stage==='rally'){
      const next=$('world-skirmish-next').textContent;
      assert(/^Taleth.s next directive: /u.test(next)&&!/choose (?:a|your) side/i.test(next),'Final battle result previews Taleth\'s actual next directive');
    }
    phases.push({stage:result.stage,health:result.hero.hp,seconds:result.time,steps,next:$('world-skirmish-next').textContent,continue:$('world-skirmish-continue').textContent});
    click('world-skirmish-continue');refresh(a);commitment(a,side);
  }
  assert(campaign(a).engagements.find(b=>b.id===battleId)?.status==='resolved','The first played battle is resolved');
  assert(a.war.clock().elapsedSeconds===at,'The battle and result review do not spend campaign time');
  const next=currentDirective(a,battleId),saved=checkpoint(a);
  assert(saved.campaignSide===side,'Saving after combat preserves '+side+' allegiance');
  await restore(a,saved);commitment(a,side);
  assert(JSON.stringify(state(a).opportunity)===JSON.stringify(next),'Reload restores the same current campaign directive');
  assert(!a.state().frameErrors.length,'Played '+side+' branch has no frame errors');
  return {checks:[...checks],side,phases,next:state(a).opportunity,clock:a.war.clock()};
}
export const westResult=a=>played(a,'west');
export const eastResult=a=>played(a,'east');

async function ignored(a,side){
  await invitation(a,side);const id=firstBattle.id;
  click('encounter-return');refresh(a);
  assert(a.state().mode==='playing'&&!campaign(a).pending,'Staying out returns to free exploration');
  await a.visit(stable);refresh(a);
  for(let i=0;i<12&&campaign(a).engagements.find(b=>b.id===id)?.status==='active';i++)wait(a);
  const ended=campaign(a).engagements.find(b=>b.id===id);
  assert(ended?.status==='resolved'&&!ended.heroResult,'The ignored first battle resolves without inventing player participation');
  commitment(a,side);const next=currentDirective(a,id);
  assert(!/support.*(West Lizeem|East Lizeem)/i.test(next.detail)||!next.detail.includes('choose a side'),'Taleth keeps a directive after a missed battle');
  const saved=checkpoint(a);await restore(a,saved);commitment(a,side);currentDirective(a,id);
  return {checks:[...checks],side,result:{id:ended.id,captured:ended.captured},next:state(a).opportunity};
}
export const ignoredWest=a=>ignored(a,'west');
export const ignoredEast=a=>ignored(a,'east');

export async function finale(a){
  await a.visit(stable);refresh(a);
  for(let i=0;i<120&&!campaign(a).winner;i++){wait(a);currentDirective(a,firstBattle.id);commitment(a,'east');}
  assert(!!campaign(a).winner,'Ignoring Taleth still allows the war to reach its natural conclusion');
  assert(/Taleth|tower/i.test($('world-war-objective-title').textContent),'The natural war result directs the player back to Taleth');
  assert(state(a).opportunity.kind==='finale','The final directive replaces all battle objectives');
  const saved=checkpoint(a);await restore(a,saved);commitment(a,'east');
  assert(state(a).opportunity.kind==='finale','Reload keeps the postwar main quest');
  return {checks:[...checks],side:state(a).campaignSide,winner:campaign(a).winner,next:state(a).opportunity};
}

export async function legacy(a){
  const saved=structuredClone(opening);delete saved.campaignSide;
  assert(validateWorldWarSave(saved),'Existing uncommitted saves remain valid');
  await restore(a,saved);await a.visit(stable);refresh(a);
  for(let i=0;i<8&&!campaign(a).engagements.some(b=>b.status==='active'&&b.region==='caricas');i++)wait(a);
  const battle=campaign(a).engagements.find(b=>b.status==='active'&&b.region==='caricas');
  await a.visit(battle.location);refresh(a);
  if(a.state().mode!=='encounter')assert(a.war.join(battle.id).ok,'Legacy campaign still enters its first battle');
  assert(state(a).campaignSide==='east','Reloading a side-less old checkpoint preserves this session\'s chosen allegiance');
  assert($('fight-attacker').hidden&&!$('fight-defender').hidden,'An old checkpoint cannot reopen the opponent\'s battle entry button');
  click('encounter-return');
  assert(!a.state().frameErrors.length,'Committed and legacy directive checks have no frame errors');
  return {checks:[...checks],legacySide:state(a).campaignSide??null,automation:'Isolated save variants select West/East before combat. Ordinary battle controls, movement/strike/dodge AI driver, natural wait outcomes, save/load and live directive UI; no battle outcomes or armies patched.'};
}
