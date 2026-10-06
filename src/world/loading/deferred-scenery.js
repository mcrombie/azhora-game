// Stable handles let quest controllers exist before their distant scenery.
// State-setting calls are replayed when the real scene is installed.
export function deferredScenery(defaults = {}) {
  const value = { metrics: {}, update() {}, ...defaults }, pending = new Map();
  const methods = ['update', 'setHolder', 'holder', 'placeFerryBoat', 'setTaskComplete'];
  let actual = null;
  for (const name of methods) value[name] = (...args) => {
    if (actual?.[name]) return actual[name](...args);
    if (name !== 'update' && name !== 'holder') pending.set(`${name}:${name === 'setTaskComplete' ? args[0] : ''}`, [name, args]);
    return defaults[name]?.(...args);
  };
  return { value, install(built) {
    actual = built ?? {};
    for (const [key, item] of Object.entries(actual)) {
      if (methods.includes(key)) continue;
      if (Array.isArray(value[key]) && Array.isArray(item)) value[key].splice(0, value[key].length, ...item);
      else if (key === 'metrics') Object.assign(value.metrics, item);
      else value[key] = item;
    }
    for (const [name, args] of pending.values()) actual[name]?.(...args);
    pending.clear(); return value;
  } };
}
