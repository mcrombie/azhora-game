/** A small favor, separate from the road tutorial and its progression. */
export function createAcornQuest(initialState = {}) {
  const allowedStatuses = ['available', 'active', 'complete'];
  let status = allowedStatuses.includes(initialState?.status) ? initialState.status : 'available';
  const target = 5;
  return {
    id: 'a-little-kindness',
    title: 'A little kindness',
    target,
    get status() { return status; },
    get friendship() { return status === 'complete' ? 'fond' : 'unfamiliar'; },
    get friendshipLabel() { return status === 'complete' ? 'Fond of you' : 'Acquaintance'; },
    accept() {
      if (status !== 'available') return false;
      status = 'active';
      return true;
    },
    turnIn(inventory) {
      if (status !== 'active' || !inventory || typeof inventory.count !== 'function'
          || typeof inventory.remove !== 'function' || typeof inventory.has !== 'function'
          || typeof inventory.grant !== 'function' || typeof inventory.add !== 'function'
          || inventory.count('acorn') < target) return false;
      const alreadyHasReward = inventory.has('tinderbox');
      const selected = inventory.selectedId?.();
      // Complete the exchange synchronously. A failed reward grant returns the
      // acorns and their selection, so a failed exchange cannot spend the favor.
      if (!inventory.remove('acorn', target)) return false;
      if (!alreadyHasReward && !inventory.grant('tinderbox')) {
        inventory.add('acorn', target);
        if (selected) inventory.select?.(selected);
        return false;
      }
      status = 'complete';
      return true;
    },
    serialize: () => ({status}),
  };
}
