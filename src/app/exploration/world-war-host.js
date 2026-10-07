import {ovesosRouteGuide} from '../../content/scenarios/ovesos-journey.js';
import {createWorldWar,WORLD_WAR_SCENARIO,worldWarProjection} from './world-war.js';
import {WORLD_WAR_KEY} from './war-checkpoint.js';
import {createEncounterDialog} from '../lizeem/encounter-dialog.js';
import {createBattlefieldBeacons} from './battlefield-beacons.js';
import {TRANSFORM} from '../../world/terrain/region-world.js';
import {worldWarReports} from './war-reports.js';
import {caricasPresence} from './site-presence.js';
import {createSitePresence} from './site-presence-view.js';
import {worldWarArmies} from './war-armies.js';
import {trackedWarTarget} from './war-tracking.js';
import {createWarTrackingView} from './war-tracking-view.js';

export function connectWorldWar({saved,map,regionName,position,scene,world,known,knowledgeStamp,openMap,getMode,setMode,onDirty,localEncounter,canFightOnFoot,cameraYaw=()=>0}){
  const $=id=>document.getElementById(id),beacons=createBattlefieldBeacons(scene,world);
  const site=createSitePresence(scene,world);let presence;
  const faction=id=>WORLD_WAR_SCENARIO.factions.find(f=>f.id===id)?.short??id;
  const region=id=>WORLD_WAR_SCENARIO.regions.find(r=>r.id===id)?.name??id;
  let session=createWorldWar(saved),lastRegion,returnMode='playing',cached,active=[],stamp;
  let report=null,armies=[];const dismissed=new Set();
  let tracked=null,tracking=null;
  const tracker=createWarTrackingView(()=>track(null));
  function refreshTracking(){
    tracking=trackedWarTarget(tracked,cached,WORLD_WAR_SCENARIO,armies,known,(x,y)=>TRANSFORM.atlasToWorld(x,y));
    tracked=tracking?.target??null;map.setTrackedTarget(tracked);
  }
  function track(target){
    if(target&&!(target.kind==='army'?armies.some(a=>a.id===target.id):target.kind==='battle'&&active.some(b=>b.id===target.id&&known(b.location))))return false;
    tracked=tracked?.kind===target?.kind&&tracked?.id===target?.id?null:target;
    refreshKnowledge();updateLocal();return true;
  }
  map.setTrackingHandler(track);
  const dialog=createEncounterDialog({scenario:WORLD_WAR_SCENARIO,getCampaign:()=>session.campaign,localEncounter,
    pause:()=>{session.pause();returnMode=getMode()==='map'?'map':'playing';setMode('encounter');},
    onClose:()=>{onDirty();refresh();setMode(returnMode);updateLocal();}});
  function refreshReports(){
    const reports=[...worldWarReports(cached,WORLD_WAR_SCENARIO,known),...armies.flatMap(a=>a.report?[a.report]:[])].sort((a,b)=>a.id-b.id);
    // Keep the hero's consequence readable even if another battle starts on
    // the same day. Dismissing it allows subsequent dispatches through.
    const unread=reports.filter(r=>r.id>Math.max(0,...dismissed));
    report=unread.findLast(r=>r.hero)??unread.at(-1)??null;
    const footer=cached.winner?`${faction(cached.winner)} wins the East-West War.`:session.clock().running?'Campaign running. Open M to follow the war.':'Campaign paused. Open M to resume or advance a day.';
    const write=(id,value)=>{if($(id).textContent!==value)$(id).textContent=value;};
    write('world-war-report-title',report?.title??'');write('world-war-report-detail',report?.detail??'');write('world-war-report-clock',report?footer:'');
    const lastHero=reports.findLast(r=>r.hero)??report;
    $('world-war-result').hidden=!lastHero;
    write('world-war-result',lastHero?`${lastHero.title}. ${lastHero.detail} ${footer}`:'');
    $('world-war-report').hidden=getMode()!=='playing'||!report||dismissed.has(report.id);
  }
  function sync(){
    const name=regionName();if(name===lastRegion)return false;
    const result=session.syncRegion(name);if(result.ok){lastRegion=name;onDirty();return true;}return false;
  }
  function refreshKnowledge(){
    stamp=knowledgeStamp();
    armies=worldWarArmies(cached,WORLD_WAR_SCENARIO,p=>known(TRANSFORM.atlasToWorld(p.x,p.y)));
    map.setArmyMarkers(armies);
    refreshTracking();
    map.setBattleMarkers(active.map(b=>({id:b.id,name:region(b.region),endsOn:b.endsOn,...TRANSFORM.worldToAtlas(b.location.x,b.location.z)})));
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
    presence=caricasPresence(state,WORLD_WAR_SCENARIO);
    $('world-site-status').textContent=presence.status;
    $('world-war-hud').hidden=false;$('world-war-controls').hidden=false;
    $('world-war-hud').textContent=`War: day ${state.day} / ${state.pending?'battle':state.winner?'ended':clock.running?'running':'paused'}`;
    $('world-war-day').textContent='Day '+state.day;$('world-war-run').textContent=clock.running?'Pause campaign':'Run campaign';
    $('world-war-run').disabled=!!state.pending||!!state.winner;$('world-war-step').disabled=clock.running||!!state.pending||!!state.winner;
    $('world-war-speed').value=String(clock.speed);
    $('world-war-status').textContent=state.winner?`${faction(state.winner)} wins.`:`${state.hero.region?'Teresod in '+regionName():'Outside the five-region war'}. 1 day = ${30/clock.speed} active seconds.`;
    refreshKnowledge();
  }
  function nearby(){return active.find(b=>known(b.location)&&cached.hero.region===b.region&&Math.hypot(position.x-b.location.x,position.z-b.location.z)<=24);}
  function atGround(b){return world.readyAt(b.location.x,b.location.z)&&Math.abs(position.y-Math.max(world.heightAt(position.x,position.z),world.waterAt(position.x,position.z)))<=12;}
  function updateLocal(dt=0){
    const targetBattle=tracked?.kind==='battle'&&cached.engagements.find(b=>b.id===tracked.id);
    const targetArmy=tracked?.kind==='army'&&cached.armies.find(a=>a.id===tracked.id);
    const ovesos=targetBattle?.region==='ovesos'||targetArmy?.to==='ovesos';
    const guide=ovesos&&tracking?.location&&ovesosRouteGuide(position);
    const guided=guide&&known(guide)&&Math.hypot(position.x+1905,position.z-706)>24;
    tracker.update(guided?{...tracking,location:guide,via:guide.name,detail:`Via ${guide.name}. ${tracking.detail}`} :tracking,position,cameraYaw(),getMode()==='playing');
    $('world-war-report').hidden=getMode()!=='playing'||!report||dismissed.has(report.id);
    beacons.update(active,known,position);
    const mode=getMode(),near=site.update(presence,known,position,dt,!['encounter','skirmish','loading'].includes(mode));
    $('world-site-status').hidden=mode!=='playing'||!near;
    const battle=nearby(),button=$('world-war-join');button.hidden=getMode()!=='playing'||!battle;
    if(!battle)return;
    const reason=battle.heroResult?'You already participated':cached.hero.readyOn>cached.day?`Recovering until day ${cached.hero.readyOn}`:localEncounter?.supports(battle)&&!canFightOnFoot()?'Land and dismount to join':!atGround(battle)?'Descend to join':null;
    button.disabled=!!reason;button.textContent=`${reason??'F · Join battle'} · ${region(battle.region)} · ends day ${battle.endsOn}`;
  }
  function offer(){if(cached.pending&&!dialog.state().active&&['playing','map'].includes(getMode()))dialog.open();}
  function join(id=null){
    if(!['playing','map'].includes(getMode()))return {ok:false};
    sync();refresh();const battle=nearby();if(!battle||(id!==null&&battle.id!==id)||!atGround(battle)||localEncounter?.supports(battle)&&!canFightOnFoot())return {ok:false};
    const result=session.campaign.joinBattle(battle.id,{x:position.x,z:position.z});
    if(result.ok){session.pause();onDirty();refresh();offer();updateLocal();}return result;
  }
  function tick(dt,enabled){if(enabled&&session.clock().running)onDirty();const changed=enabled&&sync(),advanced=session.tick(dt,enabled);if(changed||advanced){onDirty();refresh();}else if(stamp!==knowledgeStamp())refreshKnowledge();offer();updateLocal(enabled?dt:0);}
  function advance(days=1){sync();session.advance(days);onDirty();refresh();offer();updateLocal();}
  function restore(data){const restored=createWorldWar(data);dialog.clear();session=restored;dismissed.clear();tracked=null;lastRegion=undefined;sync();refresh();updateLocal();}
  $('world-war-report-map').onclick=()=>{const armyId=report?.armyId;openMap();if(armyId!==undefined)requestAnimationFrame(()=>requestAnimationFrame(()=>{if(getMode()==='map')map.focusArmy(armyId);}));};
  $('world-war-report-dismiss').onclick=()=>{if(report)dismissed.add(report.id);$('world-war-report').hidden=true;};
  $('world-war-run').onclick=()=>{sync();session.toggle();onDirty();refresh();};
  $('world-war-step').onclick=()=>advance();$('world-war-join').onclick=()=>join();
  $('world-war-speed').onchange=()=>{session.setSpeed(Number($('world-war-speed').value));onDirty();refresh();};
  refresh();
  return {tick,advance,restore,sync,refresh,refreshKnowledge,track,join,help:dialog.join,withdraw:dialog.withdraw,
    pause(){session.pause();refresh();},
    run(){if(!session.clock().running)session.toggle();onDirty();refresh();},
    setSpeed(value){session.setSpeed(value);onDirty();refresh();},
    save:exploration=>{sync();return {format:WORLD_WAR_KEY,version:1,exploration,...session.checkpoint()};},
    state:()=>({campaign:session.snapshot(),clock:session.clock(),encounter:dialog.state(),beacons:beacons.state(),presence:site.state(),tracking:tracking?structuredClone(tracking):null}),
    dispose(){dialog.clear();beacons.dispose();site.dispose();tracker.dispose();map.setTrackingHandler(null);map.setTrackedTarget(null);$('world-site-status').hidden=true;}};
}
