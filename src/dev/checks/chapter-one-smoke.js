import {COMPANY_PLAYABLE} from '../../content/characters/player-characters.js';
import {BORDER_ARENA} from '../../content/chapters/chapter-one/border-chapter.js';
import {chapterOneEncounter,CHAPTER_ONE_REPORTS} from '../../content/chapters/chapter-one/chapter-one.js';
import {aftermathSite,aftermathArena} from '../../content/chapters/chapter-one/aftermath-sites.js';

/** Isolated native renderer checks, including real terrain and collision. */
export async function runChapterOneChecks(h){
  const checks=[];
  const check=(ok,name)=>{if(!ok)throw new Error(name);checks.push(name);console.log('CHAPTER_CHECK '+name);};
  console.log('CHAPTER_READY '+JSON.stringify(h.world.loading?.state()));
  const loadingProgress=setInterval(()=>console.log('CHAPTER_LOADING '+JSON.stringify(h.world.loading?.state())),20000);
  try{await h.ready();}finally{clearInterval(loadingProgress);}h.freeze(true);
  document.getElementById('begin-chapter-one').click();
  check(!document.getElementById('opening-characters').classList.contains('hidden'),'Chapter 1 opens character selection');
  check(document.querySelectorAll('#opening-characters [data-character]').length===COMPANY_PLAYABLE.length,'All eleven mercenaries are offered');
  check(document.getElementById('chapter-one-enter').disabled,'No mercenary is preselected');
  h.select(COMPANY_PLAYABLE[4].id);h.begin();h.freeze(true);
  check(h.state().chapterOne?.player===COMPANY_PLAYABLE[4].id,'Selected mercenary starts Chapter 1');
  check(h.column.positions().length===20,'Twenty allied soldiers are assembled');
  check(h.border.view().stage==='take-orders','The Solis envoy quest precedes battle');
  h.pressMap();await h.map.ready;await h.frames();await h.frames();
  const atlas=await fetch('./assets/azhora-dev-regions.json').then(r=>r.json());
  const moros=atlas.regions.find(r=>r.name==='Moros Plain').cells[0],cape=atlas.regions.find(r=>r.name==='Cape Thalmagar').cells[0];
  h.map.setChart({cells:[`${moros.q},${moros.r}`],glimpsed:[`${cape.q},${cape.r}`],labels:[{name:'Cape Thalmagar'}],reveal:false});
  document.querySelector('[data-atlas-view="geopolitical"]').click();
  check(h.map.state().campaign.knownRegions.join(',')==='Moros Plain','Political geography uses visited hexes, not distant names or glimpses');
  check(h.map.state().campaign.owner('Cape Thalmagar')===null,'Undiscovered territory has no inspectable controller');
  check(document.querySelectorAll('#atlas-campaign-discovered polygon').length===1&&document.getElementById('atlas-discovered-content').getAttribute('clip-path').includes('atlas-campaign-discovered'),'Political terrain and hit targets are clipped to visited hexes');
  check(!document.querySelector('.atlas-campaign-content [data-region="Elagos"]')&&!document.querySelector('#atlas-country-labels [data-faction="thalmagars-empire"]'),'Profiles and labels do not disclose unexplored holdings');
  h.revealMap(true);check(h.map.state().campaign.knownRegions.length===132&&document.getElementById('atlas-discovered-content').getAttribute('clip-path')==='none','Developer reveal all explicitly removes the discovery limit');
  h.revealMap(false);check(h.map.state().campaign.knownRegions.length<132&&document.getElementById('atlas-discovered-content').getAttribute('clip-path')!=='none','Turning developer reveal off restores discovery limits');
  document.querySelector('[data-atlas-view="stability"]').click();
  check(document.getElementById('atlas-discovered-content').getAttribute('clip-path')!=='none','Stability cannot bypass fog either');
  h.pressMap();
  for(const side of ['empire','coalition']){
    h.reset(side);h.freeze(true);
    check(h.border.view().stage==='report',side+' chooses allegiance before readiness');
    h.act('march-out');
    const start=h.column.positions();
    for(let t=0;t<1200&&!h.column.arrived;t++){
      h.column.frame(.2,{playing:true,visible:true});
      if(t%50===0){console.log('COLUMN_PROGRESS '+side+' '+t+' '+JSON.stringify(h.column.positions().slice(0,2)));await h.frames();}
    }
    check(h.column.arrived,side+' column reaches the battlefield through real collision geometry: '+JSON.stringify(h.column.positions().filter(p=>p.leg<5)));
    check(start.some((p,i)=>Math.hypot(p.x-h.column.positions()[i].x,p.z-h.column.positions()[i].z)>10),'The army marches without waiting for the player');
    h.act('reach-line');
    check(h.combat.state.allies.length===20&&h.combat.state.enemies.length===20,side+' fields twenty against twenty NPCs');
    h.place({x:BORDER_ARENA.center.x+65,z:BORDER_ARENA.center.z});
    for(let i=0;i<120*30&&!h.state().chapterOne.winner;i++){
      h.combat.update(1/30);h.events();if(i%300===0)await h.frames();
    }
    const live=[...h.combat.state.allies,...h.combat.state.enemies].filter(a=>a.hp>0).map(a=>({id:a.id,hp:a.hp,x:a.x,z:a.z,action:a.action,near:h.world.nearColliders(a.x,a.z,3,[])}));
    check(!!h.state().chapterOne.winner,side+' spectator battle resolves on the authored battlefield '+JSON.stringify(live));
    check([...h.combat.state.allies,...h.combat.state.enemies].filter(a=>a.hp>0).length<=2,'Only one or two soldiers survive without player intervention');
    // Exercise the report UI separately from the random spectator winner.
    h.win(side);h.talk(side==='empire'?'post-camp-legate':'solis-captain');h.reply('chapter-report');
    check(h.state().chapterOne.reported&&!h.state().chapterOne.complete,'Commander report leaves the conquest pending');
    const spec=h.aftermath.spec;
    check(spec?.id===(side==='empire'?'solis-sweep':'moros-outpost'),'Field victory starts the authored '+side+' conquest');
    check(h.inspectChapterObjective().destinationIds.includes(spec.commanderId),'The quest marker points to the assault commander');
    h.pressMap();await h.map.ready;await h.frames();await h.frames();
    check(h.map.state().campaign.view==='regions','M opens the unchanged Regions view');
    document.querySelector('[data-atlas-view="geopolitical"]').click();
    check(h.map.state().campaign.snapshot==='opening','Winning the field alone does not finish the territorial arc');
    check(document.getElementById('atlas-discovered-content').getAttribute('clip-path')!=='none','Geopolitical view retains discovery limits during the chapter');
    h.pressMap();
    h.talk(CHAPTER_ONE_REPORTS[side]);h.finishDialogue();
    check(!h.state().chapterOne.complete,'Final representative cannot bypass the conquest');
    check(h.save()&&h.reload(),'Pending conquest survives a save and Continue');h.freeze(true);
    check(h.aftermath.state.variant===spec.id&&!h.aftermath.state.cleared,'Continue resumes the uncompleted conquest');
    h.place(aftermathSite(spec.rallySite));await h.frames();
    h.talk(spec.commanderId);h.reply('begin-assault');
    check(h.combat.state.encounterId===spec.encounterId&&h.combat.state.enemies.length===7,'The actual '+spec.title+' encounter starts with its defenders');
    // Retreat first: leaving the assault cannot grant territory or the final report.
    h.place(h.combat.state.checkpoint??aftermathSite(spec.rallySite));
    h.aftermath.endEncounter(spec.encounterId);h.combat.startPractice(h.world.training);h.combat.finishPractice();
    check(!h.aftermath.state.cleared&&!h.state().chapterOne.complete,'An abandoned assault does not conquer the region');
    h.talk(spec.commanderId);h.reply('begin-assault');
    for(let i=0;i<450&&!h.aftermath.state.cleared;i++){
      for(const enemy of h.combat.state.enemies)if(enemy.hp>0&&enemy.active)h.combat.spellHit(enemy.id,1000);
      h.combat.update(.1);h.events();if(i%30===0)await h.frames();
    }
    check(h.aftermath.state.cleared,'Defeating the actual assault defenders captures '+spec.region);
    h.pressMap();await h.frames();
    check(h.map.state().campaign.snapshot===(side==='empire'?'chapter-monarchy':'chapter-coalition'),'Territory changes at capture, before the final city report');h.pressMap();
    check(h.save()&&h.reload()&&h.aftermath.state.cleared,'Captured territory survives Continue before the debrief');h.freeze(true);
    h.place(aftermathSite(spec.reportSite));h.talk(spec.principalId);h.reply('close-aftermath');
    check(h.aftermath.state.complete&&!h.state().chapterOne.complete,'Assault debrief unlocks the final city report');
    h.talk(CHAPTER_ONE_REPORTS[side]);h.finishDialogue();
    check(h.state().chapterOne.complete,side+' city representative completes Chapter 1');
    check(h.save(),'Chapter completion can be saved');
    check(h.reload()&&h.state().chapterOne.complete,'Continue retains chapter completion');h.freeze(true);
    h.pressMap();await h.frames();await h.frames();
    check(h.map.state().campaign.view==='regions','Reopening M defaults to Regions after inspecting politics');
    document.querySelector('[data-atlas-view="geopolitical"]').click();
    const expected=side==='empire'?'ambroni-empire':'izol',region=side==='empire'?'West Suval':'Moros Plain';
    check(h.map.state().campaign.owner(region)===expected,side+' completed Chapter 1 changes the map after Continue');
    check(document.querySelector('#atlas-campaign-layer [data-campaign-region="'+region+'"]').dataset.owner===expected,'Visible territory uses the saved chapter outcome');
    document.querySelector('[data-atlas-view="stability"]').click();
    check(!document.getElementById('atlas-stability-key').hidden,'Stability view displays its condition key');
    document.querySelector('[data-atlas-view="regions"]').click();
    check(getComputedStyle(document.getElementById('atlas-image')).display!=='none'&&document.querySelector('.atlas-campaign-info').hidden,'Regions restores the original chart without the political inspector');
    h.pressMap();
  }
  h.pressMap();await h.frames();await h.frames();document.querySelector('[data-atlas-view="geopolitical"]').click();h.map.focus('Moros Plain');
  check(h.state().frameErrors.count===0,'No renderer errors');
  return {ok:true,checks,state:h.state()};
}
