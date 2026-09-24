/** A bounded real-window check. The first hit MUST use the host's ordinary
 * attack/update loop. Fixture setup may use the law host directly afterwards.
 * No campaign autoplay, wall-clock sleeps or unbounded fight loops. */
export async function runLawDesktopChecks(h) {
  const checks = [];
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const pass = name => { checks.push(name); h.log?.(name); };
  await h.prepare();
  try {
    const targetId = h.targetId, before = h.health(targetId);
    assert(before?.hp > 0, 'The physical-swing target is not alive');
    await h.strikeNpc(targetId);
    const after = h.health(targetId);
    assert(after.hp > 0 && after.hp < before.hp, 'An ordinary physical swing did not wound the live NPC');
    assert(h.bounty() > 0, 'The physical assault did not create a bounty');
    pass('An ordinary sword contact wounds a peaceful NPC and records assault');

    h.fundFine();
    await h.awaitGuard(); // host bounds this to at most 12 seconds of simulation
    const choices = h.choices().map(choice => typeof choice === 'string' ? choice : choice.id);
    for (const id of ['law-pay', 'law-jail', 'law-refuse']) assert(choices.includes(id), `Arrest omitted ${id}`);
    const fine = h.bounty(), coins = h.inventory.count('copper-piece');
    await h.choose('law-pay');
    assert(h.bounty() === 0, 'Paying the offered fine did not clear the bounty');
    assert(h.inventory.count('copper-piece') === coins - fine, 'Paying the fine did not charge its exact amount');
    pass('A nearby guard offers fine, jail and resistance; paying settles the bounty');

    const mainProgress = h.mainProgress();
    await h.strikeNpc(targetId);await h.awaitGuard();await h.choose('law-refuse');
    const lawHud = h.lawHud();
    assert(lawHud.encounterId === 'imperial-arrest' && lawHud.phase === 'active', 'Refusing arrest did not start guard combat');
    assert(!lawHud.encounterVisible && lawHud.title === '' && lawHud.count === '', 'Arrest combat inherited a main-quest banner or enemy count');
    assert(lawHud.wantedVisible && lawHud.wantedTitle === 'RESISTING ARREST', 'Arrest combat lost its wanted status');
    assert(/custody/.test(lawHud.wantedHelp) && !/or refuse/.test(lawHud.wantedHelp), 'Wanted help still describes an arrest choice after combat starts');
    assert(h.mainProgress() === mainProgress, 'Refusing arrest changed main-quest progress');
    const custody = h.loseArrest();
    assert(custody.startingMaxHp === 100 && custody.startingWeapon === 'simple-sword' && custody.startingBlades === 1 && custody.startingAllies === 0,
      'The guard test must start with a solo level-one swordsman at 100 HP');
    assert(custody.attacks > 3 && custody.guardDamage > 0, 'The guard test did not exercise walking forward and spamming sword attacks');
    assert(custody.closest >= custody.requiredGap - .015, `Forward attack spam overlapped a guard: ${custody.closest.toFixed(3)}m < ${custody.requiredGap.toFixed(3)}m`);
    assert(custody.phase === 'peaceful' && custody.jailed && custody.mode === 'playing', `Forward attack spam should lose to the watch and lead to custody: ${JSON.stringify(custody)}`);
    assert(h.mainProgress() === mainProgress, 'Arrest defeat advanced or reset the main quest');
    pass('Refusal uses only the wanted badge; guards withstand forward attack spam without body overlap and custody leaves the main quest unchanged');

    const id = await h.downCivilian(); // real ordinary NPC, nonessential; setup damage may use crime.assault
    const key = `npc:${id}`, body = h.corpses.model.get(key);
    assert(body?.status === 'dead' && body.lootable, 'An actual NPC death has no lootable corpse');
    assert(h.health(id)?.status === 'dead', 'The NPC did not stay dead');
    h.corpses.update(3, 3, { playing: true });
    assert(h.corpses.view.actor(key)?.group.visible, 'The corpse disappeared after the old shrink timer');
    assert(h.corpses.view.actor(key).group.scale.x === 1, 'The dead actor shrank');
    const count = h.corpses.model.list().length, savedBody = h.corpses.model.get(key);
    assert(await h.saveReload(), 'The road checkpoint could not be reloaded');
    const restored = h.corpses.model.get(key);
    assert(restored?.status === 'dead' && restored.x === savedBody.x && restored.z === savedBody.z, 'Reload lost the body or moved it');
    assert(JSON.stringify(restored.loot) === JSON.stringify(savedBody.loot), 'Reload changed the body’s remaining gear');
    assert(h.corpses.model.list().length === count, 'Reload duplicated the body');
    pass('A visible full-size body and its gear survive the ordinary save/reload path');

    h.positionAtBody(restored);
    const expected = restored.loot.filter(item => !h.inventory.has(item.id) || h.itemStackable(item.id));
    assert(expected.length > 0, 'The corpse fixture has no transferable loot');
    const prior = Object.fromEntries(expected.map(item => [item.id, h.inventory.count(item.id)]));
    assert(h.corpses.interact(key), 'The normal body interaction did not open');
    await h.choose('loot-body');
    for (const item of expected) assert(h.inventory.count(item.id) === prior[item.id] + item.quantity, `Body did not transfer ${item.id} exactly once`);
    const remaining = h.corpses.model.get(key).loot;
    assert(await h.saveReload(), 'The looted checkpoint could not be reloaded');
    assert(JSON.stringify(h.corpses.model.get(key).loot) === JSON.stringify(remaining), 'Reload replenished a looted body');
    const counts = expected.map(item => h.inventory.count(item.id));
    h.corpses.model.loot(key, h.inventory);
    assert(expected.every((item, index) => h.inventory.count(item.id) === counts[index]), 'A repeated search duplicated already taken items');
    pass('The body interaction transfers items once, including after a second reload');
    const specials = h.specialPeople();
    for (const person of specials) {
      assert(h.downSpecial(person.id).externalHits === 1, `${person.id} could not be struck through the physical-contact host`);
      const body = h.corpses.model.get(`npc:${person.id}`);
      assert(body?.kind === person.kind, `${person.id} lost its creature identity on falling`);
    }
    await h.renderFrames();
    assert(specials.every(person => !h.specialVisible(person.id)), 'A custom animation host redrew a dead actor');
    assert(await h.saveReload(), 'The checkpoint with special creatures could not be reloaded');
    await h.renderFrames();
    for (const person of specials) {
      assert(h.health(person.id).status === 'dead' && !h.specialVisible(person.id), `${person.id} resurrected after reload`);
      h.positionAtBody(h.corpses.model.get(`npc:${person.id}`));
      await h.renderFrames();
      assert(h.corpses.view.actor(`npc:${person.id}`)?.group.visible, `${person.id} has no rendered fallen model`);
    }
    pass('Custom creatures and stable horses retain their bodies and stay dead through actual frames and reload');
    return { ok: true, checks, arrest: { seconds: custody.frames / 60, minSeparation: custody.closest,
      guardDamage: custody.guardDamage, attackRequests: custody.attacks } };
  } finally { await h.finish?.(); }
}
