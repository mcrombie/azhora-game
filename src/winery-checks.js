import { VINTNER, CELLAR_HAND, WINEMAKER } from './winery.js';
import { WINE_INTRO_TEACHERS } from './wine.js';
import { BEN } from './spider-quest.js';
import { KATY } from './katy.js';

/** Exercise actual host conversations and buttons, independently of the magic quests.
 * Fixture hooks only prepare safe state, reset Wine, or set the prerequisite level. */
export async function runWineryChecks(h) {
  const checks=[],failures=[],started=performance.now();
  const check=(ok,message)=>{if(!ok)throw new Error(message);checks.push(message);};
  const same=(a,b)=>{
    if(Object.is(a,b))return true;
    if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
    const left=Object.keys(a).sort(),right=Object.keys(b).sort();
    return left.length===right.length&&left.every((key,index)=>key===right[index]&&same(a[key],b[key]));
  };
  const quests=s=>({spider:s.spider,cat:s.cat,murder:s.murder});
  const otherLessons=s=>({
    taught:s.skills.taught.filter(id=>id!=='wine'),
    // Travel may earn chart XP; a Wine lesson must not pay Farming or Sorcery XP.
    xp:Object.fromEntries(['farming','fire','mind','beast'].map(id=>[id,s.skills.skills[id]?.xp??0])),
  });
  const ids=()=>h.choices().map(choice=>choice.id);
  const talk=async id=>{await h.converse(id);await h.finish();};
  async function learn(id,label) {
    await h.resetWine();
    check(!h.wine.met&&!h.skills.taught('wine'),label+': Wine begins untaught');
    await talk(id);
    check(ids().includes('learn-wine-here'),label+': the ordinary conversation offers Wine');
    // Hearing their opening request can mark a quest as asked; isolate the Wine choice itself.
    const before=h.snapshot();
    await h.choose('learn-wine-here');await h.finish();await h.close();await h.frames(2);
    const after=h.snapshot();
    check(h.wine.met&&h.skills.taught('wine'),label+': selecting the lesson teaches the separate Wine skill');
    check(same(quests(before),quests(after)),label+': teaching Wine preserves the magic quest states');
    check(same(otherLessons(before),otherLessons(after)),label+': no Farming or Sorcery lesson or XP is granted');
    const learned=h.snapshot();
    await talk(id);
    check(!ids().includes('learn-wine-here'),label+': a taught introduction is not offered twice');
    await h.close();
    const revisited=h.snapshot();
    check(same(otherLessons(learned),otherLessons(revisited))&&learned.skills.skills.wine?.xp===revisited.skills.skills.wine?.xp,label+': revisiting does not award skill progress again');
  }
  try {
    await h.prepare();await h.frames(2);
    const people=[VINTNER,CELLAR_HAND,WINEMAKER];
    for(const person of people)check(h.npcById.get(person.id)?.name===person.name,person.name+' is present under the original saved identity');
    const winemakers=[...h.npcById.values()].filter(npc=>npc.modelRole==='wine-maker').map(npc=>npc.id).sort();
    check(same(winemakers,people.map(person=>person.id).sort()),'Only Rob, MAT and KAT are spawned as winemakers');
    check(!h.npcById.has('vine-keeper'),'The former winery vine keeper is not spawned');
    check(h.npcById.has(KATY.id),'Katy remains available in Port Calos');
    check(WINE_INTRO_TEACHERS.length===5,'The five requested Wine introductions are registered');
    for(const id of WINE_INTRO_TEACHERS) {
      await h.prepare();
      await learn(id,h.npcById.get(id)?.name??id);
    }
    for(const stage of ['paid','taught']) {
      await h.prepare();await h.setBenStage(stage);
      await learn(BEN.id,'Ben after the '+stage+' reward');
    }
    for(const level of [1,5]) {
      await h.prepare();await h.resetWine();await h.farmingLevel(level);
      await talk(VINTNER.id);
      const before=h.snapshot();
      check(!ids().includes('learn-wine-here'),'Rob at Farming '+level+' does not offer the Wine introduction');
      await h.close();await h.frames(3);
      const marker=h.marker(VINTNER.id),expected=level<5?'skill-locked':'skill';
      check(marker?.visible&&marker.kind===expected,'Rob at Farming '+level+' displays the '+expected+' lesson marker');
      check(!h.wine.met&&!h.skills.taught('wine'),'Rob at Farming '+level+' does not teach Wine');
      const after=h.snapshot();
      check(same(otherLessons(before),otherLessons(after))&&before.skills.skills.wine?.xp===after.skills.skills.wine?.xp,'Rob at Farming '+level+' grants no placeholder XP or lesson');
      check(same(quests(before),quests(h.snapshot())),'Rob at Farming '+level+' does not create or advance a magic quest');
    }
    await h.prepare();
    const before=h.snapshot();
    await talk(KATY.id);
    check(!ids().some(id=>/batman|bat-search/i.test(id)),'Katy offers no old Batman quest at Port Calos');
    await h.close();await h.frames(2);
    check(same(quests(before),quests(h.snapshot())),'Talking to Katy does not alter other quests');
    check(!h.state().frameErrors?.count,'All winery and Wine teacher conversations complete without renderer errors');
  } catch(error) {
    failures.push({message:error.stack??error.message});
  } finally {
    await h.close();
  }
  return {ok:!failures.length,checks,failures,durationMs:Math.round(performance.now()-started),frameErrors:h.state().frameErrors};
}
