const $ = id => document.getElementById(id);
const detached = value => JSON.parse(JSON.stringify(value));
const canonical = value => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));

/** The single atlas, from continent to local detail: browsing never becomes travel. */
export async function runLocalMapSmoke(h) {
  const { worldMap, normalSnapshot, prepareLocalMap, getMode, frames, press, release } = h;
  let checks = 0, readonlyChecks = 0, zoomChecks = 0;
  const assert = (condition, message) => { checks++; if (!condition) throw new Error(`Atlas smoke: ${message}`); };
  const tap = async code => { press(code); release(code); await frames(3); };
  const click = async id => {
    const node = $(id);
    assert(node && !node.disabled && node.getClientRects().length > 0, `missing visible control ${id}`);
    node.click(); await frames(3);
  };
  const opened = () => assert(getMode() === 'journal' && $('tab-map').classList.contains('active')
    && $('world-map').getClientRects().length > 0, 'the unified atlas is not visible');
  const snapshot = () => detached(normalSnapshot());
  const unchanged = (before, message) => { assert(same(normalSnapshot(), before), message); readonlyChecks++; };
  const checkZoom = (condition, message) => { assert(condition, message); zoomChecks++; };
  try {
    assert(worldMap, 'the host did not supply the world atlas');
    await prepareLocalMap(); await frames(8); await worldMap.ready;
    await tap('KeyM'); opened();
    assert(!$('tab-trails'), 'a second local map tab is still exposed');
    // The authored SVG's lettering is split out, so the decoded terrain image uses a blob URL.
    const atlasImage = $('atlas-image');
    assert(worldMap.state().source?.endsWith('world-builder/map/resources/examples/azhora.wwmap')
      && atlasImage.complete && atlasImage.naturalWidth > 0, 'the authored World Builder atlas did not load');
    assert(worldMap.state().traveler, 'the traveler has no position on the atlas');
    // Reading the map can intentionally finish its tutorial. Take the read-only
    // baseline after that first opening, before any zoom or browsing.
    const before = snapshot(), chart = detached(worldMap.state().chart);
    const startZoom = worldMap.state().zoom;
    await click('atlas-in');
    checkZoom(worldMap.state().zoom > startZoom, 'Zoom in did not magnify the same atlas');
    for (let i = 0; i < 8 && !worldMap.state().detail.visible; i++) await click('atlas-in');
    checkZoom(worldMap.state().detail.visible, 'close zoom never reveals local detail');
    assert($('atlas-local-detail') && worldMap.state().detail.roads > 0, 'nearby roads were not added to the atlas');
    assert(worldMap.state().chart.charted === chart.charted && worldMap.state().chart.glimpsed === chart.glimpsed,
      'zooming revealed unexplored tiles');
    unchanged(before, 'zooming changed the adventure or checkpoint');
    const closeZoom = worldMap.state().zoom;
    await click('atlas-out'); checkZoom(worldMap.state().zoom < closeZoom, 'Zoom out did not reduce magnification');
    await click('atlas-fit'); checkZoom(worldMap.state().zoom === 1, 'Whole map did not show the entire atlas');
    await click('atlas-traveler-button');
    checkZoom(worldMap.state().zoom > 1, 'Where I am did not return to the traveler');
    const viewport = $('atlas-viewport'), zoom = worldMap.state().zoom, box = viewport.getBoundingClientRect();
    viewport.dispatchEvent(new WheelEvent('wheel', { deltaY: -120, clientX: box.left + box.width / 2,
      clientY: box.top + box.height / 2, bubbles: true, cancelable: true }));
    await frames(3); checkZoom(worldMap.state().zoom > zoom, 'wheel zoom did not work');
    unchanged(before, 'fitting, centering, or wheel zoom changed gameplay');
    press('KeyW'); press('ShiftLeft'); await tap('Space'); await tap('KeyR'); await frames(8);
    release('KeyW'); release('ShiftLeft'); opened(); unchanged(before, 'movement escaped the paused map');
    await click('tab-journey'); assert($('tab-journey').classList.contains('active') && $('journey-browser').getClientRects().length > 0, 'Journey tab disappeared');
    await click('tab-map'); opened(); unchanged(before, 'switching journal tabs changed the adventure');
    await tap('Escape'); assert(getMode() === 'playing', 'Escape did not return to play');
    await tap('KeyL'); opened();
    assert(!$('trail-map') || !$('trail-map').getClientRects().length, 'L still opened the legacy chart');
    await tap('Escape');
    return { ok: true, localMapAssertions: checks, localMapReadonlyChecks: readonlyChecks,
      localMapZoomChecks: zoomChecks, unifiedAtlas: true, localDetailOnZoom: true,
      movementPaused: true, zoomDidNotRevealTiles: true, worldBuilderAtlasPreserved: true };
  } finally {
    for (const key of ['KeyL', 'KeyM', 'KeyW', 'KeyR', 'ShiftLeft', 'Space']) release(key);
  }
}
