/** Construction-only Array#forEach, with resumable callbacks and identical order. */
export function* forEachBuild(items, visit) {
  const length = items.length;
  for (let index = 0; index < length; index++) {
    if (index && index % 32 === 0) yield;
    if (index in items) yield* visit(items[index], index, items);
  }
}
