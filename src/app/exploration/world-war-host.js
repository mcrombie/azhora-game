import {createBattlefieldArea,battlefieldBoundary,stopAtBattleBoundary} from './battlefield-area.js';
import {canStand} from '../../gameplay/movement/locomotion.js';
import {createBattlefieldAreaView} from './battlefield-area-view.js';
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
import {savedWarNavigation,COUNCIL_DESTINATIONS} from './war-navigation-state.js';
import {writeHud} from './hud-write.js';

export function connectWorldWar({saved,map,regionName,position,scene,world,known,knowledgeStamp,openMap,getMode,setMode,onDirty,localEncounter,canFightOnFoot,cameraYaw=()=>0,canBegin=()=>true,horseOwned=()=>false,horseState=()=>null,onBeforeFight=()=>{},onDeath=()=>{},isGhost=()=>false,canEnterBattle=canFightOnFoot,prepareBattle=()=>{},autoEntry=()=>true,onCampaignChange=()=>{}}){
  const $=id=>document.getElementById(id),beacons=createBattlefieldBeacons(scene,world);
  const site=createSitePresence(scene,world),aftermath=createBattleAftermath(scene,world);let presence;
  const faction=id=>WORLD_WAR_SCENARIO.factions.find(f=>f.id===id)?.short??id;
  const region=id=>WORLD_WAR_SCENARIO.regions.find(r=>r.id===id)?.name??id;
  let session=createWorldWar(saved),lastRegion,returnMode='playing',cached,active=[],stamp,resumeAfterChoice=false;
  const area=createBattlefieldArea(),areaView=createBattlefieldAreaView(scene,world);
  let report=null,armies=[];const dismissed=new Set([saved?.reportReadThrough??0]);
  const initialNavigation=savedWarNavigation(saved);
  let tracked=initialNavigation?.kind==='opening'?null:initialNavigation,tracking=null,opening=initialNavigation?.kind==='opening'?initialNavigation.id:null,guidance=null,mapClock=0;
  const light=createWarGuidanceView(scene,world),columns=createMarchingColumns(scene,world),frontline=createWarFrontline(scene,world);
  const tracker=createWarTrackingView(()=>track(null),()=>trackRoute(),trackCouncil);
  function presentedArmies(){const column=armies.map(a=>columns.target(a.id)).find(Boolean);return withColumnPosition(armies,column,known,(x,z)=>TRANSFORM.worldToAtlas(x,z));}
  function refreshTracking(){
    const previous=tracked;
    tracking=trackedWarTarget(tracked,cached,WORLD_WAR_SCENARIO,presentedArmies(),known,(x,y)=>TRANSFORM.atlasToWorld(x,y));
    tracked=tracking?.target??null;
    if(previous?.kind!==tracked?.kind||previous?.id!==tracked?.id)map.setTrackedTarget(tracked);
  }
  function track(target){
    if(target&&!(target.kind==='army'?armies.some(a=>a.id===target.id):target.kind==='battle'&&active.some(b=>b.id===target.id&&known(b.location))))return false;
    opening=null;
    tracked=tracked?.kind===target?.kind&&tracked?.id===target?.id?null:target;
    map.setTrackedTarget(tracked);onDirty();refreshKnowledge();updateLocal();return true;
  }
  function trackCouncil(id='council'){
    if(!COUNCIL_DESTINATIONS.includes(id))return false;
    opening=id;tracked=null;map.setTrackedTarget(null);onDirty();refreshTracking();updateLocal();return true;
  }
  function trackRoute(){
    const target=openingArmyTarget(cached,presentedArmies(),known);if(!target)return false;
    if(tracked?.kind===target.kind&&tracked?.id===target.id)return true;
    return track(target);
  }
  map.setTrackingHandler(track);
  map.setTrackedTarget(tracked);
  const dialog=createEncounterDialog({scenario:WORLD_WAR_SCENARIO,getCampaign:()=>session.campaign,localEncounter,position:()=>({x:position.x,z:position.z}),
    onBeforeFight,prepareBattle,onDeath(context){
      const battle=session.snapshot().engagements.find(b=>b.id===context.pending.battleId);
      if(battle?.status==='active')session.advance(Math.max(0,battle.endsOn-session.snapshot().day));
      session.pause();onDirty();refresh();
      onDeath({...context,report:deathReport(session.snapshot(),battle.id,WORLD_WAR_SCENARIO)});
    },
    pause:()=>{resumeAfterChoice=session.clock().running;session.pause();returnMode=getMode()==='map'?'map':'playing';setMode('encounter');},
    onClose:()=>{onDirty();if(resumeAfterChoice&&!session.clock().running)session.toggle();resumeAfterChoice=false;refresh();setMode(returnMode);updateLocal();}});
  function reportTarget(){
    if(report?.armyId!==undefined&&armies.some(a=>a.id===report.armyId))return {kind:'army',id:report.armyId};
    if(report?.battleId!==undefined&&active.some(b=>b.id===report.battleId&&availableBattleStage(b)))return {kind:'battle',id:report.battleId};
    return null;
  }
  function refreshReports(){
    const reports=[...worldWarReports(cached,WORLD_WAR_SCENARIO,known),...armies.flatMap(a=>a.report?[a.report]:[])].sort((a,b)=>a.id-b.id);
    // Keep the hero's consequence readable even if another battle starts on
    // the same day. Dismissing it allows subsequent dispatches through.
    const unread=reports.filter(r=>r.id>Math.max(0,...dismissed));
    report=selectWarReport(unread,armies);
    const footer=cached.winner?`${faction(cached.winner)} wins the East-West War.`:session.clock().running?'Campaign running. Open M to follow the war.':'Campaign paused. Open M to resume or advance a day.';
    const write=(id,value)=>{if($(id).textContent!==value)$(id).textContent=value;};
    const summary=report?.summary;
    write('world-war-report-title',summary?.title??report?.title??'');write('world-war-report-detail',summary?.explanation??report?.detail??'');write('world-war-report-clock',report?footer:'');
    renderBattleFacts($('world-war-report-facts'),summary?.facts);
    const returnVisit=!!summary?.side;
    $('world-war-report-followup').hidden=!summary;
    write('world-war-report-followup',summary?summary.note+(returnVisit?' '+councilReturnHint(cached):''):'');
    $('world-war-report-minora').hidden=!returnVisit;
    const lastHero=reports.findLast(r=>r.hero)??report;
    $('world-war-result').hidden=!lastHero;
    write('world-war-result',lastHero?`${lastHero.title}. ${lastHero.detail} ${footer}`:'');
    writeHud($('world-war-report'),'hidden',getMode()!=='playing'||!report||dismissed.has(report.id));
    $('world-war-report-track').hidden=!reportTarget();
  }
  function sync(){
    if(['limbo','reaper','crossing'].includes(getMode()))return false;
    const name=regionName();if(name===lastRegion)return false;
    const result=session.syncRegion(name);if(result.ok){lastRegion=name;onDirty();return true;}return false;
  }
  function refreshKnowledge(){
    stamp=knowledgeStamp();
    armies=worldWarArmies(cached,WORLD_WAR_SCENARIO,p=>known(TRANSFORM.atlasToWorld(p.x,p.y)),session.clock());
    map.setArmyMarkers(presentedArmies());
    refreshTracking();
    map.setBattleMarkers(active.map(b=>({id:b.id,name:region(b.region),endsOn:b.endsOn,boundary:b.entryRadius?battlefieldBoundary(b).map(p=>TRANSFORM.worldToAtlas(p.x,p.z)):null,...TRANSFORM.worldToAtlas(b.location.x,b.location.z)})));
    const list=$('world-war-battles');list.replaceChildren();
    for(const battle of active.filter(b=>known(b.location))){
      const button=document.createElement('button');button.textContent=`${region(battle.region)}: battle until day ${battle.endsOn}`;
      button.textContent=`${tracked?.kind==='battle'&&tracked.id===battle.id?'Stop tracking':'Track battle'}: ${region(battle.region)} / until day ${battle.endsOn}`;
      button.onclick=()=>{map.focusBattle(battle.id);track({kind:'battle',id:battle.id});};list.append(button);
    }
    list.hidden=!list.childElementCount;
    refreshReports();
  }
  function refresh(){
    const state=cached=session.snapshot(),clock=session.clock();active=state.engagements.filter(b=>b.status==='active');map.setSimulation(worldWarProjection(state));
    presence=caricasPresence(state,WORLD_WAR_SCENARIO);onCampaignChange(state);
    $('world-site-status').textContent=presence.status;
    $('world-war-hud').hidden=false;$('world-war-controls').hidden=false;
    $('world-war-hud').textContent=`War: day ${state.day} / ${state.pending?'battle':state.winner?'ended':clock.running?'running':'paused'}`;
    $('world-war-day').textContent='Day '+state.day;$('world-war-run').textContent=clock.running?'Pause campaign':'Run campaign';
    $('world-war-run').disabled=!canBegin()||!!state.pending||!!state.winner;$('world-war-step').disabled=!canBegin()||clock.running||!!state.pending||!!state.winner;
    $('world-war-speed').value=String(clock.speed);
    $('world-war-status').textContent=!canBegin()?'Speak with Taleth in the tower before beginning.':state.winner?`${faction(state.winner)} wins.`:`${state.hero.region?'Teresod in '+regionName():'Outside the five-region war'}. 1 day = ${30/clock.speed} active seconds.`;
    refreshKnowledge();
  }
  function nearby(){return active.find(b=>known(b.location)&&cached.hero.region===b.region&&Math.hypot(position.x-b.location.x,position.z-b.location.z)<=(b.entryRadius??24));}
  function atGround(b){return world.readyAt(b.location.x,b.location.z)&&Math.abs(position.y-Math.max(world.heightAt(position.x,position.z),world.waterAt(position.x,position.z)))<=12;}
  function updateLocal(dt=0){
    columns.update(cached,session.clock(),position,known,dt,getMode()==='playing');
    frontline.update(cached,WORLD_WAR_SCENARIO,known,position,getMode()==='playing',dt,session.clock().running);
    mapClock+=dt;if(mapClock>.25){
      mapClock=0;
      armies=worldWarArmies(cached,WORLD_WAR_SCENARIO,p=>known(TRANSFORM.atlasToWorld(p.x,p.y)),session.clock());
      if(getMode()==='map')map.setArmyMarkers(presentedArmies());
    }
    refreshTracking();
    const horse=horseState();
    guidance=openingWarGuidance(opening,{owned:horseOwned(),horse:horse?.horse,mounted:horse?.mounted})??tracking;
    tracker.update(guidance,position,cameraYaw(),getMode()==='playing');
    light.update(guidance,getMode()==='playing');
    writeHud($('world-war-report'),'hidden',getMode()!=='playing'||!report||dismissed.has(report.id));
    beacons.update(cached.engagements,known,position,cached,WORLD_WAR_SCENARIO);
    aftermath.update(cached,WORLD_WAR_SCENARIO,known,position,getMode()==='playing',dt);
    const mode=getMode(),near=site.update(presence,known,position,dt,!['encounter','skirmish','loading'].includes(mode));
    writeHud($('world-site-status'),'hidden',mode!=='playing'||!near);
    areaView.update(active.filter(b=>b.entryRadius),known,position,{enabled:getMode()==='playing',dt});
    const entered=area.update({battles:active.filter(b=>b.entryRadius),position,enabled:getMode()==='playing'&&autoEntry()&&canBegin(),eligible:b=>cached.hero.readyOn<=cached.day&&known(b.location)&&cached.hero.region===b.region&&world.readyAt(position.x,position.z)&&atGround(b)&&canEnterBattle()&&!isGhost()&&!!availableBattleStage(b)});
    if(entered){join(entered.id);return;}
    const battle=nearby(),captain=frontline.nearby(position),button=$('world-war-join');writeHud(button,'hidden',getMode()!=='playing'||!battle||isGhost()||!battle.entryRadius&&battle.region==='ovesos'&&!captain);
    if(!battle)return;
    const reason=!availableBattleStage(battle)?'You already participated':cached.hero.readyOn>cached.day?`Recovering until day ${cached.hero.readyOn}`:(battle.entryRadius?!canEnterBattle():localEncounter?.supports(battle)&&!canFightOnFoot())?'Reach dry ground to join':!atGround(battle)?'Descend to join':null;
    writeHud(button,'disabled',!!reason);writeHud(button,'textContent',`${reason??(battle.entryRadius?'F / Enter battle'+(availableBattleStage(battle)==='rally'?' / Final assault':''):captain?`F / Speak with ${captain.name} captain${availableBattleStage(battle)==='rally'?' / Rally assault':''}`:availableBattleStage(battle)==='rally'?'F / Rally assault':'F / Join battle')} / ${region(battle.region)} / ends day ${battle.endsOn}`);
  }
  function offer(){if(cached.pending&&!dialog.state().active&&['playing','map'].includes(getMode()))dialog.open();}
  function join(id=null){
    if(isGhost())return {ok:false,reason:'Ghosts cannot fight.'};
    if(!['playing','map'].includes(getMode()))return {ok:false};
    sync();refresh();const battle=nearby();if(!battle||(id!==null&&battle.id!==id)||!atGround(battle)||(battle.entryRadius?!canEnterBattle():localEncounter?.supports(battle)&&!canFightOnFoot()))return {ok:false};
    if(!battle.entryRadius&&id===null&&battle.region==='ovesos'&&!frontline.nearby(position))return {ok:false};
    const result=session.campaign.joinBattle(battle.id,{x:position.x,z:position.z});
    if(result.ok){area.suppress(battle.id);onDirty();refresh();offer();updateLocal();}return result;
  }
  function tick(dt,enabled){enabled=enabled&&canBegin();if(enabled&&session.clock().running)onDirty();const changed=enabled&&sync(),advanced=session.tick(dt,enabled);if(changed||advanced){onDirty();refresh();}else if(stamp!==knowledgeStamp())refreshKnowledge();offer();updateLocal(enabled?dt:0);}
  function advance(days=1){if(!canBegin())return false;sync();session.advance(days);onDirty();refresh();offer();updateLocal();}
  function restore(data){const restored=createWorldWar(data);dialog.clear();area.reset();resumeAfterChoice=false;session=restored;dismissed.clear();dismissed.add(data?.reportReadThrough??0);const nav=savedWarNavigation(data);tracked=nav?.kind==='opening'?null:nav;map.setTrackedTarget(tracked);opening=nav?.kind==='opening'?nav.id:null;lastRegion=undefined;sync();refresh();updateLocal();}
  $('world-war-report-track').onclick=()=>{const target=reportTarget();if(target)track(target);};
  $('world-war-report-minora').onclick=()=>trackCouncil();
  $('world-war-report-map').onclick=()=>{const armyId=report?.armyId;openMap();if(armyId!==undefined)requestAnimationFrame(()=>requestAnimationFrame(()=>{if(getMode()==='map')map.focusArmy(armyId);}));};
  $('world-war-report-dismiss').onclick=()=>{if(report){dismissed.add(report.id);onDirty();}$('world-war-report').hidden=true;};
  $('world-war-run').onclick=()=>{if(!canBegin())return;sync();session.toggle();onDirty();refresh();};
  $('world-war-step').onclick=()=>advance();$('world-war-join').onclick=()=>join();
  $('world-war-speed').onchange=()=>{session.setSpeed(Number($('world-war-speed').value));onDirty();refresh();};
  refresh();
  return {minimapEvents:()=>warMinimapEvents({armies:presentedArmies(),battles:active,selected:tracked,known,regionName:region}),
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
      }return null;
    },
    tick,advance,restore,sync,refresh,refreshKnowledge,track,trackRoute,trackCouncil,join,help:dialog.join,withdraw:dialog.withdraw,continue:dialog.continue,
    drawGuidance(camera){light.draw(camera,position);},
    begin(){if(!canBegin())return false;session.begin();onDirty();refresh();updateLocal();return true;},
    pause(){session.pause();refresh();},
    run(){if(!canBegin())return false;if(!session.clock().running)session.toggle();onDirty();refresh();},
    setSpeed(value){session.setSpeed(value);onDirty();refresh();},
    save:exploration=>{sync();return {format:WORLD_WAR_KEY,version:1,exploration,...session.checkpoint(),navigation:opening?{kind:'opening',id:opening}:tracked?{...tracked}:null,reportReadThrough:Math.max(0,...dismissed)};},
    state:()=>({campaign:session.snapshot(),clock:session.clock(),encounter:dialog.state(),beacons:beacons.state(),presence:site.state(),aftermath:aftermath.state(),frontline:frontline.state(),battlefield:{entry:area.state(),footprints:areaView.state()},tracking:tracking?structuredClone(tracking):null,guidance:guidance?structuredClone(guidance):null,light:light.state(),columns:columns.state()}),
    dispose(){dialog.clear();areaView.dispose();beacons.dispose();site.dispose();aftermath.dispose();frontline.dispose();tracker.dispose();light.dispose();columns.dispose();map.setTrackingHandler(null);map.setTrackedTarget(null);$('world-site-status').hidden=true;}};
}
