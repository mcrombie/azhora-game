// Synchronous callers and Full mode drain the same deterministic construction
// steps used by the cooperative region loader.
export function finishBuild(iterator) {
  let next;
  do { next = iterator.next(); } while (!next.done);
  return next.value;
}

// Legacy helpers may attach directly to the world. Move only the children added
// by this synchronous construction step, before control returns to the renderer.
// Objects added by gameplay between steps must remain outside the hidden stage.
export function* stageBuildSteps(iterator, world, stage) {
  while (true) {
    // Observe additions during this synchronous step only. Scanning the entire
    // finished world at every yield makes later builds increasingly expensive.
    const add = world.add, hadOwnAdd = Object.hasOwn(world, 'add'), additions = [];
    world.add = function (...objects) {
      if (this === world) additions.push(...objects.filter(object => object.parent !== world));
      return add.apply(this, objects);
    };
    let next;
    try { next = iterator.next(); }
    finally {
      if (hadOwnAdd) world.add = add; else delete world.add;
      for (const child of additions)
        if (child !== stage && child.parent === world) stage.add(child);
    }
    if (next.done) return next.value;
    yield next.value;
  }
}
