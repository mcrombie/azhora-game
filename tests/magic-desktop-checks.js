import { BEN, SPIDER_DEN } from '../src/spider-quest.js';
import { BEN_ROUTE } from '../src/ben-guide.js';
import { CAT, LIZ, LIZ_STAND } from '../src/cat-quest.js';
import { TROY, WITNESS_IDS, MURDERER, TESTIMONY } from '../src/murder-quest.js';

/** Real host dialogue, quest frame triggers, combat, rewards, input and persisted spells.
 * Warps keep this bounded; the Node test separately walks Mop all the way back to Liz.
 */
export async function runMagicDesktopChecks(h) {
  const checks=[];
  const check=(ok,name)=>{if(!ok)throw new Error(`Magic desktop: ${name}`);checks.push(name);};
  const frames=async(n=2)=>{for(let i=0;i<n;i++)await new Promise(requestAnimationFrame);};
  const until=async(test,name,limit=360)=>{for(let i=0;i<limit&&!test();i++)await frames(1);check(test(),name);};
  const choice=id=>{
    for(let i=0;i<12&&!document.querySelector(`[data-choice="${id}"]`);i++)h.nextSpeech();
    const button=document.querySelector(`[data-choice="${id}"]`);check(button&&!button.disabled,`Dialogue offers ${id}`);button.click();
  };
  const talk=id=>{const npc=h.npcById.get(id);check(npc,`Present NPC ${id}`);h.warp({x:npc.actor.group.position.x+1,z:npc.actor.group.position.z});h.conversation(npc);};
  const cast=id=>{h.magic.select(id);h.press('KeyZ');h.release('KeyZ');};
  const key=code=>{h.press(code);h.release(code);};
  const sorcerySheet=learned=>{
    key('KeyK');
    const all=document.querySelector('.skill-browser-scope[data-scope="all"]');
    check(all,'K opens the Skills browser');all.click();
    const category=document.querySelector('.skill-browser-category');category.value='Sorcery';category.dispatchEvent(new Event('change',{bubbles:true}));
    const names=[...document.querySelectorAll('.skill-browser-row .skill-browser-name')].map(node=>node.textContent);
    check(JSON.stringify(names)===JSON.stringify(['Animal Sorcery','Fire Sorcery','Mind Sorcery']),'Sorcery contains the three named schools');
    document.querySelector('.skill-browser-row[data-skill="fire"]').click();
    check(document.querySelector('[data-spell="fireball"] .skill-browser-spell-status')?.textContent===(learned?'Learned':'Not learned'),
      learned?'The Fire Sorcery guide records the earned Fireball lesson':'A level-one Fire Sorcery skill does not claim Fireball is learned');
    key('Escape');
  };
  h.prepare();h.unfreeze();
  sorcerySheet(false);
  talk(BEN.id);choice('ben-yes');check(h.spiderQuest.state.stage==='walking','Ben accepts through live dialogue');
  const ben=h.npcById.get(BEN.id),start=ben.actor.group.position.clone();
  await until(()=>h.spiderQuest.state.guide?.waiting,'Ben walks ahead then waits when the player stays behind',900);h.freeze();
  const waiting=ben.actor.group.position.clone();
  check(waiting.distanceTo(start)>7&&waiting.distanceTo(start)<14,'Ben walked a modest lead instead of teleporting to the player');
  h.warp({x:start.x+15,z:start.z+15});h.unfreeze();await frames(20);h.freeze();
  check(ben.actor.group.position.distanceTo(waiting)<.15,'Ben waits in place rather than following the player away from the den');
  h.warp({x:waiting.x+2,z:waiting.z});h.unfreeze();
  await until(()=>ben.actor.group.position.distanceTo(waiting)>.4,'Ben resumes leading once the player catches up');h.freeze();
  const savedGuide=ben.actor.group.position.clone();
  check(h.save()&&h.reload()&&ben.actor.group.position.distanceTo(savedGuide)<.1,'The guide resumes from his saved position and route');
  // The full walk through the north gate is covered against actual collision
  // geometry in spider-quest.test.js. Relocate this fixture at the final leg.
  const near=BEN_ROUTE.at(-1);ben.actor.group.position.set(near.x,h.world.heightAt(near.x,near.z),near.z);
  h.world.npcPositions[BEN.id]={...near};h.spiderQuest.rememberGuide({...near,waypoint:BEN_ROUTE.length-1,waiting:false});
  h.warp({x:near.x+20,z:near.z});h.unfreeze();await frames(5);h.freeze();
  check(h.spiderQuest.state.walking,'Ben does not start the den fight without the nearby player');
  h.warp(SPIDER_DEN.center);check(h.save()&&h.reloadLegacyBen(),'An old checkpoint without guide data loads through the real validator');
  check(h.spiderQuest.state.guide?.waypoint===BEN_ROUTE.length-1&&Math.hypot(ben.actor.group.position.x-near.x,ben.actor.group.position.z-near.z)<.1,
    'An old den save puts Ben at the nearby safe route stop');
  check(h.save(),'The migrated guide is saved before a temporary injury');const livingCheckpoint=h.checkpointCopy();h.downBen();
  check(h.benDown(),'The ordinary world damage system can knock Ben down');h.unfreeze();await frames(5);h.freeze();
  check(h.spiderQuest.state.walking&&h.combat.state.phase!=='active','An unconscious Ben cannot start a new living combat ally');
  check(h.reloadCheckpoint(livingCheckpoint)&&!h.benDown(),'Reloading the earlier living checkpoint restores the guide without stale corpse state');h.unfreeze();
  h.warp(SPIDER_DEN.center);await until(()=>h.spiderQuest.state.stage==='fighting','Entering the den starts the actual spider fight');h.freeze();
  h.warp({x:SPIDER_DEN.retreatLine+2,z:SPIDER_DEN.center.z});h.combat.update(.05);h.handleCombatEvents();
  check(h.combat.state.phase==='peaceful'&&h.spiderQuest.state.stage==='walking','Retreat with Ben alive returns the quest to an available escort');
  check(h.save()&&h.reload(),'An unfinished Ben quest saves and reloads after retreat');
  check(h.spiderQuest.state.walking,'Reload leaves Ben ready to retry the den');
  h.warp(SPIDER_DEN.center);h.unfreeze();await until(()=>h.spiderQuest.state.stage==='fighting','Re-entering the den restarts the real fight');h.freeze();
  h.weapons.equip('simple-sword');
  for(let i=0;i<6000&&h.combat.state.phase==='active';i++){
    const enemy=h.combat.state.enemies.find(actor=>actor.active);if(!enemy)break;
    if(h.combat.state.player.action!=='dodge')h.warp({x:enemy.x,z:enemy.z+1.6});
    if(enemy.action==='windup'&&enemy.progress>.88)h.combat.dodge({x:1,z:0});
    else if(enemy.action==='idle'&&h.combat.state.player.action==='idle')h.combat.attack(Math.PI);
    h.combat.update(1/60);h.handleCombatEvents();
  }
  check(h.spiderQuest.state.stage==='killed','Sword combat and the host event handler settle Ben alive');
  check(h.save(),'Ben’s unrewarded victory can be saved');const unrewarded=h.checkpointCopy();
  const coinsBefore=h.inventory.count('copper-piece');
  talk(BEN.id);
  const bounty=document.querySelector('[data-choice="ben-bounty"]'),lesson=document.querySelector('[data-choice="ben-lesson"]');
  check(bounty?.getClientRects().length&&lesson?.getClientRects().length&&/35/.test(bounty.textContent)&&/Fireball/i.test(lesson.textContent)&&/wand/i.test(lesson.textContent),
    'Ben immediately presents both explicit rewards: 35 copper or Fireball with a spare wand');
  choice('ben-bounty');h.closeDialogue();
  check(h.spiderQuest.state.stage==='paid'&&h.inventory.count('copper-piece')===coinsBefore+35&&!h.magic.known('fireball'),
    'Choosing Ben’s bounty pays 35 copper without teaching Fireball');
  check(h.save()&&h.reload(),'The exclusive bounty choice survives reload');
  talk(BEN.id);check(!document.querySelector('[data-choice="ben-lesson"]'),'A paid Ben quest does not also offer the Fireball lesson');h.closeDialogue();
  check(h.reloadCheckpoint(unrewarded)&&h.spiderQuest.state.stage==='killed','The separate lesson case reloads the unrewarded victory fixture');
  talk(BEN.id);choice('ben-lesson');
  check(h.magic.known('fireball')&&h.skills.taught('fire')&&h.inventory.has('wand')&&h.weapons.equippedId==='simple-sword',
    'Ben teaches Fireball and gives a spare wand while leaving the sword equipped');
  check(h.inventory.count('copper-piece')===coinsBefore,'The lesson choice does not also award the bounty');
  choice('ben-equip-wand');
  check(document.getElementById('inventory-equipment')?.getClientRects().length&&h.weapons.equippedId==='simple-sword',
    'Ben’s equipment explanation opens the satchel without changing equipment');
  check(/simple sword/i.test(document.querySelector('[data-equipment-slot="weapon"]')?.textContent??''),'The satchel identifies the sword currently held');
  key('Escape');h.unfreeze();await frames(3);sorcerySheet(true);await frames(3);
  const heldFocus=h.magic.view().focus;cast('fireball');await frames(12);
  check(h.weapons.equippedId==='simple-sword'&&h.magic.view().focus===heldFocus&&!h.magic.view().casting,
    'Z cannot cast or spend focus while the sword is equipped');
  check(document.querySelector('.magic-hud')?.dataset.ready==='equipment'&&/wand|staff/i.test(document.querySelector('.magic-hud-status')?.textContent??''),
    'The spell HUD clearly asks for casting equipment');
  key('KeyI');
  const wandRow=document.querySelector('[data-item-id="wand"]');check(wandRow,'The spare wand appears in the satchel');wandRow.click();
  const equip=document.querySelector('#inventory-detail [data-equip="wand"]');check(equip&&!equip.disabled,'The selected wand offers an explicit Equip action');equip.click();
  check(h.weapons.equippedId==='wand'&&h.inventory.has('simple-sword')&&/wand/i.test(document.querySelector('[data-equipment-slot="weapon"]')?.textContent??''),
    'Equipping the wand updates the main hand and keeps the sword in the satchel');
  key('Escape');h.freeze();

  // A isolated fighting patch, far enough from ordinary townspeople to avoid an accidental crime.
  const shot={x:SPIDER_DEN.center.x,z:SPIDER_DEN.center.z};h.warp(shot);
  check(h.combat.startEncounter({id:'magic-desktop-target',level:0,center:shot,checkpoint:shot,retreatAxis:'x',retreatLine:shot.x+30,
    enemies:[{id:'magic-check-goblin',kind:'goblin',x:shot.x,z:shot.z-5,hp:200,entry:60}]}),'Spell test uses a real combat target');
  // Facing is host player rotation, not a fabricated projectile.
  h.face?.(Math.PI);h.unfreeze();cast('fireball');
  await until(()=>h.combat.state.enemies[0]?.hp<200,'Z casts learned Fireball and damages its target');h.freeze();
  check(h.skills.xp('fire')>0,'Actual fire damage earns school experience');
  h.combat.revive();h.handleCombatEvents();h.magic.stop();

  h.unfreeze();talk(LIZ.id);choice('cat-yes');h.closeDialogue();
  h.warp({x:CAT.at.x+1.5,z:CAT.at.z});
  await until(()=>h.catQuest.state.stage==='following','Mop notices the player and follows through the live frame');
  // Fixture relocation exercises the real home trigger without a minute of screen-time walking.
  const cat=h.npcById.get(CAT.id);cat.actor.group.position.set(LIZ_STAND.x+2,h.world.heightAt(LIZ_STAND.x+2,LIZ_STAND.z),LIZ_STAND.z);
  h.world.npcPositions[CAT.id]={x:LIZ_STAND.x+2,z:LIZ_STAND.z};h.warp(LIZ_STAND);
  await until(()=>h.catQuest.state.stage==='home','Mop arriving in Liz’s clearing completes the escort');h.freeze();
  talk(LIZ.id);choice('cat-purse');h.closeDialogue();check(h.catQuest.state.stage==='paid','Liz pays the chosen coin reward');
  check(h.save()&&h.reload(),'Liz’s paid quest reloads with its earned lesson still available');
  talk(LIZ.id);choice('cat-lesson');check(h.magic.view().selected==='summon-bees','Liz selects the new spell even when Fireball was selected');h.closeDialogue();
  check(h.magic.known('summon-bees')&&h.skills.taught('beast'),'Returning to Liz after payment still teaches Summon Bees');
  h.warp(shot);h.combat.startEncounter({id:'magic-desktop-bees',level:0,center:shot,checkpoint:shot,retreatAxis:'x',retreatLine:shot.x+30,
    enemies:[{id:'magic-bees-goblin',kind:'goblin',x:shot.x,z:shot.z-5,hp:200,entry:60}]});
  h.magic.update(0);h.unfreeze();cast('summon-bees');
  await until(()=>h.combat.state.enemies[0]?.hp<200,'Summon Bees reaches and stings an actual enemy');h.freeze();
  check(h.skills.xp('beast')>0,'Bee stings earn Beast experience');h.combat.revive();h.handleCombatEvents();h.magic.stop();

  talk(TROY.id);choice('murder-take');h.closeDialogue();
  for(const id of WITNESS_IDS){talk(id);choice('ask-bregga');h.closeDialogue();
    if(id===WITNESS_IDS[0])check(h.save()&&h.reload()&&h.murder.state.heard.includes(TESTIMONY[id].gives),'Troy’s first clue survives reload before the remaining interviews');}
  check(h.murder.state.ready,'All three live witness dialogues supplied their separate clues');
  talk(TROY.id);choice('murder-name');choice(`accuse-${MURDERER}`);h.closeDialogue();
  check(h.murder.state.stage==='solved','Troy accepts the supported accusation');
  talk(TROY.id);choice('murder-purse');h.closeDialogue();
  check(h.murder.state.stage==='paid'&&h.save()&&h.reload(),'Troy’s coin choice survives reload before the earned lesson');
  talk(TROY.id);choice('murder-lesson');h.closeDialogue();
  check(h.magic.known('mindread')&&h.skills.taught('mind'),'Troy teaches the actual Mind Read spell');
  // Out-of-combat recovery advances the same focus clock; it grants no spell or quest progress.
  h.magic.update(10);h.magic.update(10);h.magic.update(10);
  const witness=h.npcById.get(WITNESS_IDS[0]);h.warp({x:witness.actor.group.position.x+1,z:witness.actor.group.position.z});
  const mindBefore=h.skills.xp('mind');h.unfreeze();await frames(3);h.freeze();cast('mindread');
  check(h.skills.xp('mind')>mindBefore,'Mind Read actually reveals a nearby person’s thought and earns experience');
  check(h.magic.snapshot().read.includes(WITNESS_IDS[0]),`Z reads the intended nearby witness (${h.magic.snapshot().read.join(', ')})`);
  talk(WITNESS_IDS[0]);choice('read-them');
  check(document.body.textContent.includes('three weeks')||document.body.textContent.includes('Three weeks'),'Explicit Read them dialogue shows the authored Cobble thought');
  h.closeDialogue();check(h.save()&&h.reload(),'Three earned spells save and reload through the desktop checkpoint');h.freeze();
  check(['fireball','summon-bees','mindread'].every(id=>h.magic.known(id)),'Reload preserves all three learned spells');
  check(h.inventory.has('wand')&&h.weapons.status('wand').usable,'Reload preserves a usable casting focus');
  const earnedSpells=[...h.magic.view().learned];
  // A second isolated attempt exercises the host's actual ally-down event,
  // then the roster-clearing retreat that used to forget Ben's death.
  h.prepare();talk(BEN.id);choice('ben-yes');h.closeDialogue();
  ben.actor.group.position.set(near.x,h.world.heightAt(near.x,near.z),near.z);
  h.world.npcPositions[BEN.id]={...near};h.spiderQuest.rememberGuide({...near,waypoint:BEN_ROUTE.length-1,waiting:false});
  h.warp(SPIDER_DEN.center);h.unfreeze();
  await until(()=>h.spiderQuest.state.stage==='fighting','A second live attempt starts for the death regression');h.freeze();
  h.combat.spellHit(BEN.id,1000,{spellId:'fireball'});h.handleCombatEvents();
  check(h.combat.state.allies.find(actor=>actor.id===BEN.id)?.hp===0&&h.spiderQuest.state.benDown,
    'Actual lethal combat damage marks Ben fallen through the host handler');
  h.warp({x:SPIDER_DEN.retreatLine+2,z:SPIDER_DEN.center.z});h.combat.update(.05);h.handleCombatEvents();
  check(h.save()&&h.reload()&&h.spiderQuest.state.stage==='abandoned'&&h.spiderQuest.state.benDown,
    'Retreat and reload cannot resurrect Ben or reopen his lesson');
  check(!h.spiderQuest.begin()&&h.spiderQuest.take('lesson')===null,'A fallen Ben cannot restart the quest or grant Fireball');
  check(h.errors().count===0,'No renderer frame errors');
  return{checks:checks.length,passed:checks,spells:earnedSpells};
}
