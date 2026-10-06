import {COMPANY_PLAYABLE} from './player-characters.js';
import {BORDER_ARENA} from './border-chapter.js';
import {chapterOneEncounter,CHAPTER_ONE_REPORTS} from './chapter-one.js';

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
  check(h.state().chapterOne?.player===PLAYABLE[4].id,'Selected mercenary starts Chapter 1');
  check(h.column.positions().length===20,'Twenty allied soldiers are assembled');
  check(h.border.view().stage==='take-orders','The Solis envoy quest precedes battle');
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
    check(h.state().chapterOne.reported&&!h.state().chapterOne.complete,'Commander report leaves the city report pending');
    h.talk(CHAPTER_ONE_REPORTS[side]);h.finishDialogue();
    check(h.state().chapterOne.complete,side+' city representative completes Chapter 1');
    check(h.save(),'Chapter completion can be saved');
    check(h.reload()&&h.state().chapterOne.complete,'Continue retains chapter completion');h.freeze(true);
  }
  check(h.state().frameErrors.count===0,'No renderer errors');
  return {ok:true,checks,state:h.state()};
}
