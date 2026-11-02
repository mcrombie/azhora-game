import {createRoadsideContact} from './roadside-contact.js';
import {ROADSIDE_REACH,roadsideOrderKey} from '../../simulation/roadside-interception.js';
import {createBattlefieldArea,battlefieldBoundary,stopAtBattleBoundary} from './battlefield-area.js';
import {canStand} from '../../gameplay/movement/locomotion.js';
import {createBattlefieldAreaView} from './battlefield-area-view.js';
import {createSoldierHost} from './soldier-host.js';
import {stopAtSoldier} from './soldier-contact.js';
import {createBattleAftermath} from './battle-aftermath-view.js';
import {deathReport} from './afterlife-state.js';
import {createWarFrontline} from './war-frontline-view.js';
import {availableBattleStage} from '../../simulation/battle-stages.js';
import {openingWarGuidance,openingArmyTarget} from './war-guidance.js';
import {createWarGuidanceView} from './war-guidance-view.js';
import {createMarchingColumns} from './war-columns-view.js';
import {warMinimapEvents} from './war-minimap.js';
import {createWorldWar,WORLD_WAR_SCENARIO,worldWarProjection} from './world-war.js';
import {WORLD_WAR_KEY} from './war-checkpoint.js';
import {createEncounterDialog} from '../lizeem/encounter-dialog.js';
import {isCampaignSide,pendingCampaignCommitment,isUnbriefedTowerCheckpoint} from './campaign-allegiance.js';
import {applyEncounterResult} from '../lizeem/encounter-result.js';
import {campaignGuidance} from './campaign-guidance.js';
import {createBattlefieldBeacons} from './battlefield-beacons.js';
import {TRANSFORM} from '../../world/terrain/region-world.js';
import {worldWarReports,selectWarReport} from './war-reports.js';
import {caricasPresence} from './site-presence.js';
import {createSitePresence} from './site-presence-view.js';
import {worldWarArmies,withColumnPosition} from './war-armies.js';
import {trackedWarTarget} from './war-tracking.js';
import {councilReturnHint} from './battle-consequences.js';
import {renderBattleFacts} from './battle-facts-view.js';
import {createWarTrackingView} from './war-tracking-view.js';
import {savedWarNavigation,savedNavigationMode,followsRecommendation,COUNCIL_DESTINATIONS} from './war-navigation-state.js';
import {writeHud} from './hud-write.js';
import {nextCampaignOpportunity,waitForCampaignDispatch} from './campaign-opportunity.js';
import {talethLetters} from './taleth-correspondence.js';
import {createTalethCourier} from './taleth-courier.js';
import {createCampaignGuidanceView} from './campaign-guidance-view.js';
import {createWarLogView} from './war-log-view.js';
import {createCampaignMapTime} from './campaign-map-time.js';
import {createBattleClockHold} from './battle-clock-hold.js';
import {createFoodWorldReport} from '../food-world/report.js';
import {elapsedTimeLabel,adventureTimeLabel} from '../../experiments/day-night/opening-time-label.js';
import {openingTimelineText,openingReport,openingDeathReport} from '../../experiments/day-night/opening-presentation.js';

export function connectWorldWar({scenario=WORLD_WAR_SCENARIO,saveKey=WORLD_WAR_KEY,saved,campaignSide=null,map,regionName,position,scene,world,known,knowledgeStamp,openMap,getMode,setMode,onDirty,localEncounter,canFightOnFoot,cameraYaw=()=>0,canBegin=()=>true,isConcluded=()=>false,horseOwned=()=>false,horseState=()=>null,onBeforeFight=()=>{},onDeath=()=>{},isGhost=()=>false,canEnterBattle=canFightOnFoot,prepareBattle=()=>{},autoEntry=()=>true,onCampaignChange=()=>{},courierRoom=()=>null,courierAvailable=()=>true,onCourierTalk=()=>{},createSession=createWorldWar,openingWaitAllowed=()=>false,clockActive=()=>true,clockHoldReason=()=>null,encounterTimeNotice=()=>''}){
  const explored=known;known=point=>explored(point)||!!scenario.openingBattles?.some(o=>{const at=scenario.regions.find(r=>r.id===o.to)?.battlefield;return at&&Math.hypot(at.x-point.x,at.z-point.z)<1;});
  const $=id=>document.getElementById(id),beacons=createBattlefieldBeacons(scene,world);
  const site=createSitePresence(scene,world),aftermath=createBattleAftermath(scene,world);let presence;
  const faction=id=>scenario.factions.find(f=>f.id===id)?.short??id;
  const region=id=>scenario.regions.find(r=>r.id===id)?.name??id;
  const timelessTower=()=>['tower','lookout'].includes(courierRoom());
  let session=createSession(saved),lastRegion,returnMode='playing',cached,active=[],stamp;
  const battleClock=createBattleClockHold(()=>session);battleClock.restore(saved);
  const mapTime=createCampaignMapTime();let mapOpen=false,mapWaitNotice='';
  campaignSide=saved?.campaignSide??campaignSide;
  if(campaignSide!==null&&!isCampaignSide(campaignSide))throw Error('Choose West or East Lizeem before beginning.');
  const maySupport=battle=>!campaignSide||[battle.attacker,battle.defender].includes(campaignSide)&&(!pendingCampaignCommitment(battle)||pendingCampaignCommitment(battle)===campaignSide);
  const openingOnly=()=>!!session.clock().sharedOpening&&!session.clock().fullCampaign;
  const foodReport=scenario.food?createFoodWorldReport({scenario,clock:()=>session.clock(),known:r=>known(TRANSFORM.atlasToWorld(r.position.x,r.position.y))}):null;
  const area=createBattlefieldArea(),areaView=createBattlefieldAreaView(scene,world);
  let report=null,armies=[],displayedDay=null;const dismissed=new Set([saved?.reportReadThrough??0]);
  let letters=[],opportunity=null;
  const courier=createTalethCourier({scene,world,position,getMode,setMode,letters:()=>letters,opportunity:()=>opportunity,clock:()=>session.clock(),onFollow:followNext,saved:saved?.corris,onDirty,onTalk:onCourierTalk,room:courierRoom,available:courierAvailable,
    safeLanding:(x,z)=>!active.some(b=>Math.hypot(x-b.location.x,z-b.location.z)<(b.entryRadius??24)+2)});
  const objective=createCampaignGuidanceView();
  const warLog=createWarLogView({state:()=>cached,scenario,known,getMode,setMode});
  const soldierPeople=()=>[...aftermath.people(),...site.people()];
  const soldiers=createSoldierHost({world,position,getMode,setMode,people:soldierPeople,campaign:()=>cached,clock:()=>session.clock(),opportunity:()=>opportunity,faction,region,available:()=>!isGhost()&&canEnterBattle()});
  const initialNavigation=savedWarNavigation(saved);
  let navigationMode=savedNavigationMode(saved);
  let tracked=initialNavigation?.kind==='opening'?null:initialNavigation,tracking=null,opening=initialNavigation?.kind==='opening'?initialNavigation.id:null,guidance=null,mapClock=0;
  const light=createWarGuidanceView(scene,world),columns=createMarchingColumns(scene,world),frontline=createWarFrontline(scene,world);
  const roadContact=createRoadsideContact();
  const tracker=createWarTrackingView(()=>track(null),()=>trackRoute(),trackCouncil);
  function currentArmies(state=cached){return worldWarArmies(state,scenario,p=>known(TRANSFORM.atlasToWorld(p.x,p.y)),session.clock(),columns.targets().map(c=>({...c,atlas:TRANSFORM.worldToAtlas(c.location.x,c.location.z)})));}
  function presentedArmies(){const marks=withColumnPosition(armies,columns.targets(),known,(x,z)=>TRANSFORM.worldToAtlas(x,z));return session.clock().sharedOpening?marks.map(a=>({...a,detail:openingTimelineText(a.detail,session.clock())})):marks;}

  function refreshTracking(){
    const previous=tracked;
    // The opening destination exists before the army's first orders. As soon
    // as that real force is known, follow it rather than leaving a town pin.
    if(['caricas','ovesos'].includes(opening)){
      const target=openingArmyTarget(cached,presentedArmies(),known,opening);
      if(target){opening=null;tracked=target;onDirty();}
    }
    tracking=openingReport(trackedWarTarget(tracked,cached,scenario,presentedArmies(),known,(x,y)=>TRANSFORM.atlasToWorld(x,y)),session.clock());
    // The result and live objective now own the next step. Do not leave a
    // second card pointing at an ended battle or choose another front for them.
    if(tracking?.finished)tracking=null;
    tracked=tracking?.target??null;
    if(previous?.kind!==tracked?.kind||previous?.id!==tracked?.id)map.setTrackedTarget(tracked);
  }
  const isTracking=target=>target&&(target.kind==='opening'?opening===target.id:tracked?.kind===target.kind&&tracked?.id===target.id);
  function track(target,automatic=false){
    if(target&&!(target.kind==='opening'?['caricas','ovesos'].includes(target.id)&&session.clock().sharedOpening:target.kind==='army'?armies.some(a=>a.id===target.id):target.kind==='battle'&&active.some(b=>b.id===target.id&&known(b.location))))return false;
    const stop=isTracking(target);
    navigationMode=automatic?'taleth':'manual';
    opening=!stop&&target?.kind==='opening'?target.id:null;
    tracked=stop||target?.kind==='opening'?null:target;
    map.setTrackedTarget(tracked);onDirty();refreshKnowledge();updateLocal();return true;
  }
  function trackCouncil(id='council',automatic=false){
    if(!COUNCIL_DESTINATIONS.includes(id))return false;
    navigationMode=automatic?'taleth':'manual';opening=id;tracked=null;map.setTrackedTarget(null);onDirty();refreshTracking();updateLocal();return true;
  }
  function trackRoute(){
    if((campaignSide||opportunity?.target?.kind==='opening')&&opportunity?.target){if(isTracking(opportunity.target))return true;return track(opportunity.target);}
    const target=openingArmyTarget(cached,presentedArmies(),known);if(!target)return false;
    if(tracked?.kind===target.kind&&tracked?.id===target.id)return true;
    return track(target);
  }
  map.setTrackingHandler(track);
  map.setTrackedTarget(tracked);
  const dialog=createEncounterDialog({scenario:scenario,getCampaign:()=>session.campaign,localEncounter,campaignSide:()=>campaignSide,onResult:previewNextDirective,timeNotice:encounterTimeNotice,elapsedClock:()=>session.clock(),position:()=>({x:position.x,z:position.z}),
    onBeforeFight,prepareBattle,onDeath(context){
      const battle=session.snapshot().engagements.find(b=>b.id===context.pending.battleId);
      if(battle?.status==='active'&&!session.clock().sharedOpening)session.advance(Math.max(0,battle.endsOn-session.snapshot().day));
      session.pause();onDirty();refresh();
      if(context.pending.kind==='roadside'){const event=session.snapshot().events.findLast(e=>e.type==='roadside-result'&&e.encounterId===context.pending.id);onDeath({...context,report:`You fell intercepting ${context.pending.armyName}. ${event?.removed??0} enemy strength was removed. ${event?.strength===0?'The enemy column was destroyed.':'The army continues its march.'} No town changed hands and other armies did not advance. Retry rewinds this roadside fight; returning keeps its consequences.`});return;}
      onDeath({...context,report:session.clock().sharedOpening?openingDeathReport(session.snapshot(),battle,session.clock()):deathReport(session.snapshot(),battle.id,scenario)});
    },
    pause:()=>{battleClock.hold();returnMode=getMode()==='map'?'map':'playing';setMode('encounter');},
    onClose:(_region,{battleId,completed,dead})=>{
      // A restored invitation can bypass boundary entry. Suppress its next
      // automatic prompt before returning control or resolving a death.
      if(battleId)area.suppress(battleId);
      onDirty();battleClock.release();refresh();setMode(returnMode);
      if(campaignSide&&completed&&!dead&&navigationMode==='taleth'&&opportunity?.kind==='finale')trackCouncil('council',true);
      updateLocal();}});
  function previewNextDirective(context){
    if(!campaignSide||context.pending.stage==='intercept'&&!context.pending.rally)return null;
    // Resolve a replay in memory to show the actual successor before Continue.
    // The live campaign and save remain untouched until the player accepts.
    const preview=createSession(session.checkpoint());
    if(!applyEncounterResult(preview.campaign,context).ok)return null;
    const state=preview.snapshot(),clock=preview.clock();
    const next=nextCampaignOpportunity(state,scenario,worldWarArmies(state,scenario,p=>known(TRANSFORM.atlasToWorld(p.x,p.y)),clock),known,{side:campaignSide,concluded:isConcluded(),position});
    const card=openingReport(campaignGuidance(next,{fullCampaign:!!clock.fullCampaign,owned:horseOwned(),region,winnerName:state.winner?faction(state.winner):null,recoveringUntil:state.hero.readyOn>state.day?state.hero.readyOn:null}),clock);
    return {next:`Taleth’s next directive: ${card.title}. ${card.detail}`,button:'Continue / '+card.title+' (Enter)'};
  }
  function followNext(alternative=false){
    if(!canBegin()||session.clock().complete&&!cached.winner||!['playing','map','tower'].includes(getMode()))return false;
    refreshReports();const next=alternative?opportunity?.alternative:opportunity;if(!next||next.kind==='briefing')return false;
    if(next.kind==='regroup'){
      if(session.clock().fullCampaign&&!courierRoom()){
        openMap();
        return selectMapSpeed(20,{until:state=>{
          // Use the same prepared physical columns as the live quest panel.
          // An estimated march is not yet a usable marker while its road loads.
          columns.update(state,session.clock(),position,known,0,false);
          const marks=withColumnPosition(currentArmies(state),columns.targets(),known,(x,z)=>TRANSFORM.worldToAtlas(x,z));
          const directive=nextCampaignOpportunity(state,scenario,marks,known,{side:campaignSide});
          if(!state.winner&&!directive.target)return false;
          mapWaitNotice=state.winner?'The war has ended. Return to Taleth.':`New front: ${region(directive.region)}. Time is paused. Track the new objective, or close the map to resume.`;
          return true;
        }});
      }
      if(session.clock().sharedOpening||timelessTower())return false;
      waitForCampaignDispatch(session,state=>nextCampaignOpportunity(state,scenario,worldWarArmies(state,scenario,p=>known(TRANSFORM.atlasToWorld(p.x,p.y))),known,{side:campaignSide}));
      onDirty();refresh();setMode('playing');offer();updateLocal();return true;
    }
    navigationMode=alternative?'manual':'taleth';
    if(next.kind==='finale'||next.kind==='complete')trackCouncil('council',!alternative);
    else if(next.target){if(!isTracking(next.target))track(next.target,!alternative);}
    else track(null,!alternative);
    if(!cached.winner&&!session.clock().running)session.toggle();
    onDirty();setMode('playing');refresh();updateLocal();return true;
  }
  function reportTarget(){
    if(report?.armyId!==undefined&&armies.some(a=>a.id===report.armyId))return {kind:'army',id:report.armyId};
    if(report?.battleId!==undefined&&active.some(b=>b.id===report.battleId&&availableBattleStage(b)))return {kind:'battle',id:report.battleId};
    return null;
  }
  function refreshReports(){
    letters=talethLetters(cached,{side:campaignSide}).map(report=>openingReport(report,session.clock()));
    opportunity=openingReport(nextCampaignOpportunity(cached,scenario,presentedArmies(),known,{concluded:isConcluded(),side:campaignSide,position}),session.clock());
    if(session.clock().sharedOpening&&!cached.day&&!cached.engagements.length&&canBegin())opportunity={kind:'army',region:'caricas',departed:1,deadline:3,target:{kind:'opening',id:'caricas'},side:campaignSide,campaignSide,purpose:campaignSide==='east'?'defend':'advance',label:'Track Caricas',detail:'Head toward Caricas. The western army sets out at 01:00 and arrives at 03:00. Your guide will follow it once it is sighted.'};
    if(followsRecommendation(navigationMode,opening,canBegin())&&!isTracking(opportunity?.target)){
      opening=opportunity?.target?.kind==='opening'?opportunity.target.id:null;
      tracked=opening?null:opportunity?.target??null;map.setTrackedTarget(tracked);refreshTracking();
    }
    const reports=[...new Map([...worldWarReports(cached,scenario,known),...armies.flatMap(a=>a.report?[a.report]:[]),...letters].map(r=>[r.id,r])).values()].sort((a,b)=>a.id-b.id);
    // Keep the hero's consequence readable even if another battle starts on
    // the same day. Dismissing it allows subsequent dispatches through.
    const unread=reports.filter(r=>r.id>Math.max(0,...dismissed));
    report=openingReport(selectWarReport(unread,armies),session.clock());
    courier.present(report);
    const concluded=!!cached.winner&&isConcluded(),completedFinale=concluded&&report?.finale;
    $('world-war-report-source').textContent=completedFinale?'CAMPAIGN / COMPLETE':report?.taleth?'TALETH / TELEPATHIC MESSAGE':'WAR REPORT';
    const footer=cached.winner?`${concluded?'Campaign complete. ':''}${faction(cached.winner)} has prevailed. The united country is the Lizeemi League.`:session.clock().sharedOpening?(session.clock().complete?'Opening experiment complete. Time is held.':'Adventure time advances outside the tower, even while standing still. Close reading panels to resume time. Rest at a safe place to await an event.') :session.clock().running?'Campaign running. Open M to follow the war.':'Campaign paused. Open M to resume or advance a day.';
    const write=(id,value)=>{if($(id).textContent!==value)$(id).textContent=value;};
    const summary=report?.summary;
    // The archived summons stays historical; the live card reflects its fulfilment.
    write('world-war-report-title',completedFinale?'Lizeemi War complete':summary?.title??report?.title??'');
    write('world-war-report-detail',completedFinale?opportunity.detail:summary?.explanation??report?.detail??'');write('world-war-report-clock',report?footer:'');
    $('world-war-next-detail').hidden=!!completedFinale;
    renderBattleFacts($('world-war-report-facts'),summary?.facts??report?.facts);
    const returnVisit=!!summary?.side||!!report?.finale||!!report?.hero;
    $('world-war-report-followup').hidden=completedFinale||!summary&&!report?.note;
    write('world-war-report-followup',report?.note??(summary?summary.note+(returnVisit?' '+councilReturnHint(cached):''):''));
    write('world-war-report-minora','Visit council / optional');
    $('world-war-report-minora').hidden=!returnVisit||!!cached.winner;
    const lastHero=reports.findLast(r=>r.hero)??report;
    $('world-war-result').hidden=!lastHero;
    write('world-war-result',concluded&&lastHero?.finale?`${opportunity.detail} ${footer}`:lastHero?`${lastHero.title}. ${lastHero.detail} ${footer}`:'');
    paintObjective();
    $('world-war-report-track').hidden=!reportTarget();
  }
  function paintObjective(){const clock=displayClock();objective.update(opportunity,{navigationMode,clockModel:clock,fullCampaign:!!clock.fullCampaign,trackedTarget:opening?{kind:'opening',id:opening}:tracked,openingComplete:!!clock.complete&&!clock.fullCampaign,opening,owned:horseOwned(),mounted:horseState()?.mounted,running:clock.running&&!clock.heldReason,region,winnerName:cached.winner?faction(cached.winner):null,recoveringUntil:cached.hero.readyOn>cached.day?cached.hero.readyOn:null},report,getMode()==='playing');}
  function sync(){
    if(['limbo','reaper','crossing'].includes(getMode()))return false;
    const name=regionName();if(name===lastRegion)return false;
    const result=session.syncRegion(name);if(result.ok){lastRegion=name;onDirty();return true;}return false;
  }
  function refreshKnowledge(){
    stamp=knowledgeStamp();
    columns.update(cached,session.clock(),position,known,0,getMode()==='playing');
    foodReport?.render(cached);
    armies=currentArmies();
    map.setArmyMarkers(presentedArmies());
    refreshTracking();
    map.setBattleMarkers(active.map(b=>({id:b.id,name:region(b.region),endsOn:b.endsOn,deadlineLabel:session.clock().sharedOpening?elapsedTimeLabel(b.endsOn*60):null,boundary:b.entryRadius?battlefieldBoundary(b).map(p=>TRANSFORM.worldToAtlas(p.x,p.z)):null,...TRANSFORM.worldToAtlas(b.location.x,b.location.z)})));
    const list=$('world-war-battles');list.replaceChildren();
    for(const battle of active.filter(b=>known(b.location))){
      const button=document.createElement('button');button.textContent=`${region(battle.region)}: battle until day ${battle.endsOn}`;
      button.textContent=openingTimelineText(`${tracked?.kind==='battle'&&tracked.id===battle.id?'Stop tracking':'Track battle'}: ${region(battle.region)} / until day ${battle.endsOn}`,session.clock());
      button.onclick=()=>{map.focusBattle(battle.id);track({kind:'battle',id:battle.id});};list.append(button);
    }
    list.hidden=!list.childElementCount;
    refreshReports();
  }
  function refresh(){
    const state=cached=session.snapshot(),clock=session.clock();active=state.engagements.filter(b=>b.status==='active');map.setSimulation({...worldWarProjection(state),timeLabel:clock.sharedOpening?adventureTimeLabel(clock.elapsedSeconds):null});
    if(clock.complete&&['bear','caricas'].includes(opening))opening=null;
    presence=caricasPresence(state,scenario);onCampaignChange(state);
    $('world-site-status').textContent=presence.status;
    $('world-war-hud').hidden=false;$('world-war-controls').hidden=false;
    paintClock();$('world-war-run').textContent=clock.running?'Pause campaign':'Run campaign';$('world-war-run').hidden=!!clock.sharedOpening;
    $('world-war-run').disabled=!canBegin()||!!state.pending||!!state.winner||!!clock.complete;$('world-war-step').disabled=!canBegin()||timelessTower()||clock.running||!!state.pending||!!state.winner;
    $('world-war-step').hidden=!!clock.sharedOpening;$('world-war-speed').closest('label').hidden=!!clock.sharedOpening;
    $('world-war-speed').value=String(clock.speed);
    if(!clock.sharedOpening)$('world-war-status').textContent=!canBegin()?'Speak with Taleth in the tower before beginning.':state.winner?`Lizeemi League / ${faction(state.winner)} prevailed.`:`${state.hero.region?'Teresod in '+regionName():'Outside the five-region war'}. 1 day = ${30/clock.speed} active seconds.`;
    refreshKnowledge();
  }
  function displayClock(){const clock=session.clock(),reason=clockHoldReason();return {...clock,heldReason:clock.complete?(clock.fullCampaign?'War settled / Time held':'Opening complete / Time held'):reason?.includes('tower')?reason:!clock.running&&['playing','map'].includes(getMode())?'Campaign paused / Resume from map':reason??(!clock.running||!clockActive()?'Time held':null)};}
  function paintClock(){
    const clock=displayClock(),time=clock.sharedOpening?adventureTimeLabel(clock.elapsedSeconds):`War: day ${cached.day}`;
    if(clock.sharedOpening&&getMode()==='map'&&time!==displayedDay){displayedDay=time;map.setSimulation({...worldWarProjection(cached),timeLabel:time});}
    writeHud($('world-war-hud'),'textContent',`${time} / ${cached.pending?'battle':cached.winner?'ended':clock.complete||clock.heldReason?'held':clock.running?'running':'paused'}`);
    writeHud($('world-war-day'),'textContent',clock.sharedOpening?time:'Day '+cached.day);
    paintMapTime(clock);
  }
  function paintMapTime(clock){
    $('world-war-map-time').hidden=!clock.sharedOpening;
    if(!clock.sharedOpening)return;
    const blocked=!canBegin()||timelessTower()||!!courierRoom()||!!cached.pending||!!clock.complete||!!cached.winner;
    for(const button of $('world-war-map-time').querySelectorAll('button')){
      const speed=Number(button.dataset.speed);
      writeHud(button,'disabled',speed>0&&blocked);
      const selected=mapTime.speed===speed;
      if(button.getAttribute('aria-pressed')!==String(selected))button.setAttribute('aria-pressed',String(selected));
    }
    const status=!canBegin()?'Speak with Taleth before beginning the campaign.':clock.complete||cached.winner?'The war is settled. Time is held.':
      timelessTower()?"Time stands still throughout the Wizard’s Tower.":courierRoom()?'Leave the building to advance the campaign.':cached.pending?'Finish or leave the encounter before advancing time.':
      mapTime.waiting&&clock.running?(clock.heldReason??'Waiting for the next front · 20×. Stops when Taleth has a new destination. Close the map to cancel.'):
      mapWaitNotice|| (mapTime.speed&&clock.running?(clock.heldReason??`Running at ${mapTime.speed}× · Armies and battles advance. Closing the map returns to normal speed.`):
      'Paused · Choose a speed to advance armies and battles. Closing the map returns to normal speed.');
    writeHud($('world-war-status'),'textContent',status);
  }
  function selectMapSpeed(value,options={}){
    const clock=session.clock();
    if(getMode()!=='map'||!clock.sharedOpening)return false;
    if(value&&(!canBegin()||courierRoom()||cached.pending||clock.complete||cached.winner))return false;
    mapWaitNotice='';mapTime.select(value,options);if(value)session.begin();onDirty();paintClock();return true;
  }
  function nearby(){return active.find(b=>known(b.location)&&cached.hero.region===b.region&&Math.hypot(position.x-b.location.x,position.z-b.location.z)<=(b.entryRadius??24));}
  function atGround(b){return world.readyAt(b.location.x,b.location.z)&&Math.abs(position.y-Math.max(world.heightAt(position.x,position.z),world.waterAt(position.x,position.z)))<=12;}
  function updateLocal(dt=0){
    columns.update(cached,session.clock(),position,known,dt,getMode()==='playing');
    frontline.update(cached,scenario,known,position,getMode()==='playing',dt,session.clock().running);
    mapClock+=dt;if(mapClock>.25){
      mapClock=0;
      armies=currentArmies();
      if(getMode()==='map')map.setArmyMarkers(presentedArmies());
    }
    const horse=horseState();
    // Riding and walking away both finish the optional handoff. Respect Stop
    // and other destinations; dismounting must not restart the introduction.
    const leavingHorse=horse?.horse&&Math.hypot(position.x-horse.horse.x,position.z-horse.horse.z)>6;
    if(opening==='bear'&&horseOwned()&&(horse?.mounted||leavingHorse)&&canBegin()){
      const next=opportunity?.target??openingArmyTarget(cached,presentedArmies(),known);
      opening=next?.kind==='opening'?next.id:null;tracked=next?.kind==='opening'?null:next;
      map.setTrackedTarget(tracked);onDirty();
    }
    refreshTracking();
    guidance=openingWarGuidance(opening,{owned:horseOwned(),horse:horse?.horse,mounted:horse?.mounted,bear:horse?.bear})??tracking;
    if(guidance&&opportunity?.target?.kind==='opening'&&opportunity.target.id===opening)guidance={...guidance,detail:opportunity.detail};
    tracker.update(guidance,position,cameraYaw(),getMode()==='playing');
    light.update(guidance,getMode()==='playing');
    paintObjective();
    beacons.update(cached.engagements,known,position,cached,scenario);
    aftermath.update(cached,scenario,known,position,getMode()==='playing'||soldiers.open(),dt);
    soldiers.update(dt);
    const mode=getMode(),near=site.update(presence,known,position,dt,!['encounter','skirmish','loading'].includes(mode));
    writeHud($('world-site-status'),'hidden',mode!=='playing'||!near);
    areaView.update(active.filter(b=>b.entryRadius),known,position,{enabled:getMode()==='playing',dt});
    const entered=area.update({battles:active.filter(b=>b.entryRadius),position,enabled:getMode()==='playing'&&autoEntry()&&canBegin()&&!session.clock().complete,eligible:b=>maySupport(b)&&(!openingOnly()||b.region==='caricas')&&cached.hero.readyOn<=cached.day&&known(b.location)&&cached.hero.region===b.region&&world.readyAt(position.x,position.z)&&atGround(b)&&canEnterBattle()&&!isGhost()&&!!availableBattleStage(b)});
    if(entered){join(entered.id);return;}
    const contact=roadContact.update(columns.targets(),position,roadEligible,getMode()==='playing'&&autoEntry()&&canBegin()&&!session.clock().complete&&!nearby()&&!cached.pending&&!isGhost()&&canEnterBattle());
    if(contact){intercept(contact.id);return;}
    const battle=nearby(),captain=frontline.nearby(position),button=$('world-war-join');writeHud(button,'hidden',getMode()!=='playing'||session.clock().complete||!battle||openingOnly()&&battle.region!=='caricas'||isGhost()||!battle.entryRadius&&battle.region==='ovesos'&&!captain);
    if(!battle){
      const column=nearRoad();
      writeHud(button,'hidden',!column||getMode()!=='playing'||session.clock().complete||isGhost());
      if(column){writeHud(button,'disabled',!canEnterBattle());writeHud(button,'textContent','F / Intercept '+column.name);}
      return;
    }
    const reason=!maySupport(battle)?'This detachment already supports the other league':!availableBattleStage(battle)?'You already participated':cached.hero.readyOn>cached.day?`Recovering until day ${cached.hero.readyOn}`:(battle.entryRadius?!canEnterBattle():localEncounter?.supports(battle)&&!canFightOnFoot())?'Reach dry ground to join':!atGround(battle)?'Descend to join':null;
    writeHud(button,'disabled',!!reason);writeHud(button,'textContent',openingTimelineText(`${reason??(battle.entryRadius?'F / Enter battle'+(availableBattleStage(battle)==='rally'?' / Final assault':''):captain?`F / Speak with ${captain.name} captain${availableBattleStage(battle)==='rally'?' / Rally assault':''}`:availableBattleStage(battle)==='rally'?'F / Rally assault':'F / Join battle')} / ${region(battle.region)} / ends day ${battle.endsOn}`,session.clock()));
  }
  function roadEligible(column){
    const army=cached.armies.find(a=>a.id===column.id);
    return !!army&&column.contactEligible&&known(column.location)&&army.status==='marching'&&army.strength>0&&army.arrives>cached.day&&
      (!campaignSide||army.owner!==campaignSide)&&['east','west'].includes(army.owner)&&army.roadside?.order!==roadsideOrderKey(army)&&cached.hero.readyOn<=cached.day;
  }
  function nearRoad(){return columns.targets().filter(roadEligible).filter(c=>Math.hypot(c.location.x-position.x,c.location.z-position.z)<=ROADSIDE_REACH).sort((a,b)=>Math.hypot(a.location.x-position.x,a.location.z-position.z)-Math.hypot(b.location.x-position.x,b.location.z-position.z))[0]??null;}
  function intercept(id=null){
    if(getMode()!=='playing'||!canBegin()||session.clock().complete||cached.pending||cached.winner||isGhost()||!canEnterBattle()||!world.readyAt(position.x,position.z)||nearby())return {ok:false,reason:'Approach the column on clear ground outside an active battlefield.'};
    sync();refresh();
    const column=id===null?nearRoad():columns.target(id);
    if(!column||!roadEligible(column)||Math.hypot(column.location.x-position.x,column.location.z-position.z)>ROADSIDE_REACH)return {ok:false,reason:'Approach an enemy marching column to intercept it.'};
    const side=campaignSide??(column.owner==='east'?'west':'east'),clock=session.clock();
    const result=session.campaign.interceptArmy(column.id,side,{region:cached.hero.region,location:column.location,position:{x:position.x,z:position.z},fraction:clock.fraction/clock.secondsPerDay});
    if(result.ok){roadContact.suppress(column);onDirty();refresh();offer();updateLocal();}return result;
  }
  function offer(){if(cached.pending&&!dialog.state().active&&['playing','map'].includes(getMode())){if(cached.pending.kind==='roadside')roadContact.suppressOrder(cached.pending.roadside.order);dialog.open();}}
  function join(id=null){
    if(session.clock().complete)return {ok:false,reason:session.clock().fullCampaign?'The war is over. Return to Taleth to review your campaign.':'The opening rehearsal is complete. Explore its aftermath or start a new rehearsal.'};
    if(isGhost())return {ok:false,reason:'Ghosts cannot fight.'};
    if(!['playing','map'].includes(getMode()))return {ok:false};
    sync();refresh();const battle=nearby();if(!battle&&id===null)return intercept();if(openingOnly()&&battle?.region!=='caricas')return {ok:false,reason:'This opening rehearsal includes the Caricas battle only.'};if(!battle||(id!==null&&battle.id!==id)||!atGround(battle)||(battle.entryRadius?!canEnterBattle():localEncounter?.supports(battle)&&!canFightOnFoot()))return {ok:false};
    if(!maySupport(battle))return {ok:false,reason:'Your campaign supports '+faction(campaignSide)+'. This detachment is already committed to the other league.'};
    if(!battle.entryRadius&&id===null&&battle.region==='ovesos'&&!frontline.nearby(position))return {ok:false};
    const result=session.campaign.joinBattle(battle.id,{x:position.x,z:position.z});
    if(result.ok){area.suppress(battle.id);onDirty();refresh();offer();updateLocal();}return result;
  }
  function tick(dt,enabled){enabled=enabled&&canBegin();if(enabled&&session.clock().running)onDirty();const changed=enabled&&sync(),advanced=getMode()==='map'&&session.clock().sharedOpening?mapTime.tick(session,dt,enabled):session.tick(dt,enabled);if(changed||advanced){onDirty();refresh();}else if(stamp!==knowledgeStamp())refreshKnowledge();paintClock();offer();courier.update(dt);updateLocal(enabled?dt:0);}
  function advance(days=1){if(!canBegin()||timelessTower()||session.clock().sharedOpening)return false;sync();session.advance(days);onDirty();refresh();offer();updateLocal();}
  function restore(data){const restored=createSession(data);mapTime.reset();mapWaitNotice='';warLog.reset();dialog.clear();courier.reset(data?.corris);area.reset();roadContact.reset();session=restored;battleClock.restore(data);campaignSide=data?.campaignSide??(!data||isUnbriefedTowerCheckpoint(data)?null:campaignSide);dismissed.clear();dismissed.add(data?.reportReadThrough??0);const nav=savedWarNavigation(data);navigationMode=savedNavigationMode(data);tracked=nav?.kind==='opening'?null:nav;map.setTrackedTarget(tracked);opening=nav?.kind==='opening'?nav.id:null;lastRegion=undefined;sync();refresh();updateLocal();}
  function chooseCampaignSide(side){
    if(!isCampaignSide(side))return {ok:false,reason:'Choose West Lizeem or East Lizeem.'};
    if(campaignSide)return {ok:false,reason:'Your allegiance is already chosen for this campaign.'};
    if(canBegin()||courierRoom()!=='tower'||getMode()!=='briefing'||cached.day!==0||cached.pending)return {ok:false,reason:'Speak with Taleth in the tower before setting out to choose your allegiance.'};
    campaignSide=side;onDirty();refresh();updateLocal();return {ok:true};
  }
  function waitOpening(key){
    if(!session.forecast||!canBegin()||!['playing','time-wait'].includes(getMode())||!openingWaitAllowed())return {ok:false,reason:session.clock().fullCampaign?'Rest on foot on clear, dry ground away from active battlefields.':'Rest on foot at the stable or the Caricas north road, outside battle.'};
    const next=session.forecast();if(!next.ok)return next;
    const result=next.kind==='battle-aftermath'?session.advanceToAftermath(key):session.advanceToNextEvent(key);
    if(result.ok){if(!session.clock().complete)session.begin();onDirty();refresh();updateLocal();}return result;
  }
  $('world-war-report-track').onclick=()=>{const target=reportTarget();if(target)track(target);};
  $('world-war-report-minora').onclick=()=>trackCouncil();
  $('world-war-report-map').onclick=()=>{const armyId=report?.armyId;openMap();if(armyId!==undefined)requestAnimationFrame(()=>requestAnimationFrame(()=>{if(getMode()==='map')map.focusArmy(armyId);}));};
  $('world-war-report-dismiss').onclick=()=>{if(report){dismissed.add(report.id);onDirty();}refreshReports();$('world-war-report-more').open=false;$('world-war-report-more').querySelector('summary').focus();};
  $('world-war-run').onclick=()=>{if(!canBegin())return;sync();session.toggle();onDirty();refresh();};
  $('world-war-step').onclick=()=>advance();$('world-war-join').onclick=()=>join();
  $('world-war-speed').onchange=()=>{session.setSpeed(Number($('world-war-speed').value));onDirty();refresh();};
  for(const button of $('world-war-map-time').querySelectorAll('button'))button.onclick=()=>selectMapSpeed(Number(button.dataset.speed));
  refresh();
  return {minimapEvents:()=>openingReport(warMinimapEvents({armies:presentedArmies(),battles:active,selected:tracked,known,regionName:region}),session.clock()),
    minimapDestination:()=>opening&&guidance?.location?{...guidance.location,id:opening==='bear'&&horseOwned()?'horse':opening,label:guidance.label}:null,
    constrainTravel(previous){
      if(getMode()!=='playing')return null;
      for(const b of active.filter(b=>b.entryRadius)){
        const edge=stopAtBattleBoundary(previous,position,b);if(!edge)continue;
        // A loaded save or a withdrawal can begin inside: find clear footing at
        // the nearest edge, never put the rider into a house or bridge rail.
        const clear=p=>world.readyAt(p.x,p.z)&&canStand(p.x,p.z,world,.8);
        if(clear(edge))return edge;
        if(Math.hypot(previous.x-b.location.x,previous.z-b.location.z)>=b.entryRadius-.1)return previous;
        const candidates=[],angle=Math.atan2(edge.x-b.location.x,edge.z-b.location.z);
        for(let i=1;i<=32;i++)for(const side of [-1,1]){const t=angle+side*i*Math.PI/32;candidates.push({x:b.location.x+Math.sin(t)*(b.entryRadius-.0001),z:b.location.z+Math.cos(t)*(b.entryRadius-.0001)});}
        return candidates.find(clear)??previous;
      }
      if(isGhost()||!canEnterBattle())return null;
      return stopAtSoldier(previous,position,[...soldierPeople(),...(world.residentPeople?.()??[])],horseState()?.mounted?1.45:1);
    },
    constrainCourierTravel:previous=>!isGhost()&&courierAvailable()?stopAtSoldier(previous,position,courier.people(),horseState()?.mounted?.95:.55):null,
    tick,advance,restore,chooseCampaignSide,sync,refresh,refreshKnowledge,track,trackRoute,trackCouncil,join,intercept,help:dialog.join,withdraw:dialog.withdraw,continue:dialog.continue,followNext,interactCourier:courier.interact,interactSoldier:soldiers.interact,keydown:e=>warLog.keydown(e)||soldiers.keydown(e)||courier.keydown(e),
    foodAction(action){const result=session.campaign.foodAction(action);if(result.ok){onDirty();refresh();}return result;},
    canSail:()=>!!session.advancePassage&&canBegin()&&!timelessTower()&&!cached.pending,
    advancePassage(seconds){
      if(getMode()!=='sailing'||!session.advancePassage||!canBegin()||timelessTower()||cached.pending)return false;
      const day=cached.day,result=session.advancePassage(seconds);onDirty();
      if(!session.clock().sharedOpening||Math.floor(session.clock().elapsedSeconds/60)!==day)refresh();else paintClock();
      return result;
    },
    openFoodReport:id=>foodReport?.open(id),
    // Resting reads the cached active footprints, not a full history snapshot.
    nearActiveBattle:()=>active.some(b=>Math.hypot(position.x-b.location.x,position.z-b.location.z)<(b.entryRadius??70)+8),
    clock:displayClock,
    mapMode(open){if(open!==mapOpen){mapOpen=open;mapTime.reset();mapWaitNotice='';}if(cached)paintClock();},
    mapTimeRunning:()=>!!session.clock().sharedOpening&&mapTime.speed>0,
    waitForecast:()=>{const forecast=session.forecast?.()??null;return campaignSide&&forecast?.ok?{...forecast,consequences:forecast.consequences.map(text=>text.replace('choose your side or enter','enter'))}:forecast;},waitOpening,
    completeReview(){
      if(!cached.winner||!isConcluded())return false;
      if(opening==='council')opening=null;
      if(tracked){tracked=null;map.setTrackedTarget(null);}
      onDirty();refresh();updateLocal();return true;
    },
    drawGuidance(camera){light.draw(camera,position);},
    begin(){if(!canBegin())return false;session.begin();onDirty();refresh();updateLocal();return true;},
    runningPreference:battleClock.running,
    pause(){battleClock.pause();refresh();},
    run(){if(!canBegin())return false;battleClock.run();onDirty();refresh();},
    setSpeed(value){session.setSpeed(value);onDirty();refresh();},
    save:exploration=>{sync();return {format:saveKey,version:1,exploration,...session.checkpoint(),...(campaignSide?{campaignSide}:{}),navigationMode,navigation:opening?{kind:'opening',id:opening}:tracked?{...tracked}:null,reportReadThrough:Math.max(0,...dismissed),corris:courier.snapshot()};},
    fighting:()=>dialog.fighting(),
    state:()=>({campaignSide,navigationMode,campaign:session.snapshot(),clock:displayClock(),encounter:dialog.state(),beacons:beacons.state(),presence:site.state(),aftermath:aftermath.state(),soldiers:{...soldiers.state(),people:soldierPeople()},frontline:frontline.state(),battlefield:{entry:area.state(),footprints:areaView.state()},tracking:tracking?structuredClone(tracking):null,guidance:guidance?structuredClone(guidance):null,light:light.state(),columns:columns.state(),roadside:roadContact.state(),courier:courier.state(),letters:structuredClone(letters),opportunity:structuredClone(opportunity)}),
    dispose(){warLog.dispose();foodReport?.dispose();dialog.clear();soldiers.dispose();courier.dispose();objective.dispose();areaView.dispose();beacons.dispose();site.dispose();aftermath.dispose();frontline.dispose();tracker.dispose();light.dispose();columns.dispose();map.setTrackingHandler(null);map.setTrackedTarget(null);$('world-site-status').hidden=true;}};
}
