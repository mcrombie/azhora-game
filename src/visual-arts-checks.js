import { SYLVIA, SYLVIA_STUDIO } from './visual-arts.js';

/** Real F prompts, lesson buttons and renderer frames; no XP shortcuts. */
export async function runVisualArtsChecks(h){
  h.prepare();h.prepareGlun();
  const saved=h.snapshot(),checks=[];
  const check=(name,ok)=>{checks.push({name,ok:!!ok});if(!ok)throw new Error(name);};
  try{
    h.visualArts.cancel();
    await h.visit(SYLVIA.id);
    check('Sylvia is visible at her cottage',h.npcById.get(SYLVIA.id).actor.group.visible);
    check('Sylvia offers a green introduction marker',h.marker(SYLVIA.id).kind==='skill');
    await h.choose('sylvia-visual-arts');await h.finish();
    check('Introduction teaches Visual Arts without free practice XP',h.visualArts.taught()&&h.skills.xp('visualarts')===0);
    h.close();h.warp(SYLVIA_STUDIO.stand.x,SYLVIA_STUDIO.stand.z);await h.frames(4);h.tap('KeyF');await h.frames(2);
    check('The ordinary F prompt opens the easel',!!document.querySelector('[data-choice="art-study-drawing"]'));
    check('Painting is visibly locked until level 2',document.querySelector('[data-choice="art-study-painting"]')?.disabled);
    await h.choose('art-study-drawing');await h.frames(5);
    check('Drawing starts in ordinary play with a brush',!!h.visualArts.pose()&&h.player.group.getObjectByName('Painter brush')?.visible);
    h.tap('KeyF');await h.frames(2);
    check('Cancelling an unfinished study pays no XP',!h.visualArts.pose()&&h.skills.xp('visualarts')===0);
    h.tap('KeyF');await h.frames(2);await h.choose('art-study-drawing');
    for(let n=0;n<1200&&h.visualArts.pose();n++)await h.frames(1);
    check('Finishing real drawing frames grants 18 XP',!h.visualArts.pose()&&h.skills.xp('visualarts')===18);
    const progress=h.snapshot();h.restore(progress);await h.frames(3);
    check('Visual Arts teaching and XP survive checkpoint reload',h.visualArts.taught()&&h.skills.xp('visualarts')===18&&!h.visualArts.pose());
  }catch(error){checks.push({name:'Visual Arts native checks',ok:false,error:error.message});}
  finally{h.close();try{h.restore(saved);}catch(error){checks.push({name:'Restore isolated test baseline',ok:false,error:error.message});}}
  return{ok:checks.every(c=>c.ok),checks};
}
