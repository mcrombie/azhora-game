/** Temporary damage for developer tools. No hunting, loot, XP or save data. */
export function createDeveloperWildlifeDamage({ creatures, body, changed = () => {} }) {
  const byId = new Map(creatures.map(animal => [animal.id, animal]));
  const health = new Map(creatures.map(animal => {
    const radius = Math.max(.22, (animal.zone?.radius ?? .25) * (animal.scale ?? 1));
    const maxHp = Math.max(15, Math.min(400, Math.round(radius * 100)));
    return [animal.id, { hp: maxHp, maxHp }];
  }));
  const dead = id => health.get(id)?.hp === 0;
  const view = id => {
    const h = health.get(id);
    return h ? { ...h, dead: h.hp === 0 } : null;
  };
  function bodies() {
    const result = [];
    for (const animal of creatures) {
      if (dead(animal.id)) continue;
      const at = body(animal);
      if (!at || ![at.x, at.y, at.z].every(Number.isFinite)) continue;
      result.push({ id: animal.id, species: animal.species ?? 'red-squirrel', team: 'wildlife', height: 0, ...at, ...view(animal.id) });
    }
    return result;
  }
  function damage(id, amount, { testing = false } = {}) {
    const animal = byId.get(id), h = health.get(id);
    if (!testing || !animal || !Number.isFinite(amount) || amount <= 0 || amount > 10000)
      return { handled: false, damage: 0 };
    if (!h.hp) return { handled: true, id, damage: 0, ...view(id), killed: false };
    // Unloaded/underwater animals are not targets. The caller also has the
    // actual body's height to reject overhead or underground cone contacts.
    if (!body(animal)) return { handled: false, damage: 0 };
    const actual = Math.min(h.hp, amount); h.hp -= actual;
    changed(animal);
    return { handled: true, id, damage: actual, ...view(id), killed: !h.hp };
  }
  function resetDamage() {
    let restored = 0;
    for (const animal of creatures) {
      const h = health.get(animal.id);
      if (h.hp === h.maxHp) continue;
      h.hp = h.maxHp; restored++; changed(animal);
    }
    return restored;
  }
  return { bodies, damage, resetDamage, dead, view };
}
