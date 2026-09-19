import { canStand } from './game-state.js';
import { FOREST_STORY_SITES } from './forest-story.js';

const $ = id => document.getElementById(id);
const detached = value => JSON.parse(JSON.stringify(value));
const canonical = value => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));

/** Real UI checks: chart browsing must never become travel or a quest shortcut. */
export async function runLocalMapSmoke(h) {
  const { world, player, forestStory, checkpoint, trailMap, localMapModel, trackPlace, trackedPlace,
    normalSnapshot, prepareLocalMap, discoverySet, getMode, readState, frames, press, release, warp } = h;
  let checks = 0, regionViews = 0, readonlyChecks = 0, zoomChecks = 0;
  const assert = (condition, message) => { checks++; if (!condition) throw new Error(`Local map smoke: ${message}`); };
  const tap = async code => { press(code); release(code); await frames(3); };
  const click = async selector => {
    const node = document.querySelector(selector);
    assert(node && !node.disabled && node.getClientRects().length > 0, `missing or disabled visible control ${selector}`);
    if (typeof node.click === 'function') node.click();
    else node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await frames(3);
  };
  const snapshot = () => detached(normalSnapshot());
  const unchanged = (before, message) => { assert(same(normalSnapshot(), before), message); readonlyChecks++; };
  const opened = () => assert(getMode() === 'journal' && $('tab-trails').classList.contains('active')
    && $('trail-map').getClientRects().length > 0, 'local chart is not the visible journal tab');
  const viewRegion = async id => {
    await click(`[data-trail-region="${id}"]`);
    assert(trailMap.state().regionId === id, `region ${id} button did not change the chart`); regionViews++;
  };
  const markButton = () => $('trail-map-track') || $('trail-map').querySelector('[data-trail-action="mark"]');
  const clearButton = () => $('trail-map-clear') || $('trail-map').querySelector('[data-trail-action="clear"]');
  const chooseKnown = async id => click(`[data-trail-list-place="${id}"]`);
  const mark = async () => {
    const button = markButton(); assert(button && !button.disabled, 'selected known place cannot be marked');
    button.click(); await frames(3);
  };
  const closeBounds = (a, b) => a && b && ['minX', 'maxX', 'minZ', 'maxZ'].every(key => Math.abs(a[key] - b[key]) < .000001);
  const checkZoom = (condition, message) => { assert(condition, message); zoomChecks++; };

  try {
    await prepareLocalMap(); await frames(8);
    assert(getMode() === 'playing' && readState().questStage === 1 && !readState().testingEnabled,
      'fixture did not begin as an ordinary stage-one village visit');
    assert(discoverySet.has('village') && !discoverySet.has('bee-fold'), 'fixture did not discover only the intended starting area');
    assert(!trackedPlace(), 'fixture has an unexpected optional pin');
    const initial = snapshot(), mainTitle = $('quest-title').textContent;
    const bee = FOREST_STORY_SITES.find(place => place.id === 'bee-fold');
    assert(bee && world.forestPlaces.some(place => place.id === bee.id && place.x === bee.x && place.z === bee.z), 'the actual Bee Fold is missing');

    await tap('KeyL'); opened();
    assert(trailMap.state().currentRegionId === 1 && trailMap.state().regionId === 1, 'L did not start on the player region');
    assert($('trail-map').querySelectorAll('[data-trail-region]').length === (world.regions?.length ?? 4), 'the chart does not expose every local region');
    assert($('trail-map').querySelectorAll('.trail-water').length >= 2, 'the village chart omitted the authored coast or pond');
    assert(!$('trail-map').textContent.includes(bee.name), 'the undiscovered Bee Fold name leaked into map text');
    const unknownMarker = $('trail-map').querySelector('[data-trail-place="bee-fold"]');
    assert(unknownMarker && unknownMarker.getAttribute('aria-label').includes('Unexplored'), 'unknown marker exposed a name to accessibility tools');
    await click('[data-trail-place="bee-fold"]');
    assert(trailMap.state().selected?.known === false && trailMap.state().selected?.trackable === false,
      'selecting an unknown marker made it known or trackable');
    assert(markButton()?.disabled, 'unknown marker offers an enabled Mark button');
    assert(!$('trail-map').textContent.includes(bee.name), 'selecting an unknown marker leaked its real name');
    assert(trackPlace('bee-fold') === false && !trackedPlace(), 'the host accepted an undiscovered place ID');
    unchanged(initial, 'opening or inspecting the chart changed gameplay or the checkpoint');

    const fitBounds = { ...trailMap.state().viewBounds }, fullRegionBounds = localMapModel(1).bounds;
    checkZoom(trailMap.state().zoom === 1 && $('trail-map-zoom-out').disabled && $('trail-map-fit').disabled,
      'the initial chart does not start fitted to its whole region');
    await click('#trail-map-zoom-in');
    const closer = trailMap.state();
    checkZoom(closer.zoom === 1.5 && closer.viewBounds.maxX - closer.viewBounds.minX < fitBounds.maxX - fitBounds.minX
      && closer.viewBounds.maxZ - closer.viewBounds.minZ < fitBounds.maxZ - fitBounds.minZ,
    'Zoom in did not reduce the map window in actual world metres');
    unchanged(initial, 'zooming in changed the adventure or save');
    await chooseKnown('forest-woodcutter');
    const focused = trailMap.state(), location = localMapModel(1).landmarks.find(place => place.id === 'forest-woodcutter');
    const marker = $('trail-map').querySelector('[data-trail-place="forest-woodcutter"]');
    const markerBox = marker?.getBoundingClientRect(), paperBox = $('trail-map').querySelector('.trail-map-canvas').getBoundingClientRect();
    checkZoom(focused.zoom === 1.5 && focused.selected?.id === location?.id && focused.selected?.known
      && location.x >= focused.viewBounds.minX && location.x <= focused.viewBounds.maxX
      && location.z >= focused.viewBounds.minZ && location.z <= focused.viewBounds.maxZ,
    'selecting a known place while zoomed did not keep its actual coordinates in view');
    checkZoom(markerBox && markerBox.width > 0 && markerBox.left + markerBox.width / 2 >= paperBox.left
      && markerBox.left + markerBox.width / 2 <= paperBox.right && markerBox.top + markerBox.height / 2 >= paperBox.top
      && markerBox.top + markerBox.height / 2 <= paperBox.bottom, 'the selected place was not rendered inside the zoomed paper');
    assert(!trackedPlace(), 'zoom or selection silently marked a destination');
    await click('#trail-map-zoom-in'); await click('#trail-map-zoom-out');
    checkZoom(trailMap.state().zoom === 1.5, 'Zoom out did not undo one zoom step');
    await click('#trail-map-fit');
    const fitted = trailMap.state();
    checkZoom(fitted.zoom === 1 && fitted.selectedId === 'forest-woodcutter' && closeBounds(fitted.viewBounds, fitBounds)
      && fitted.viewBounds.minX <= fullRegionBounds.minX + .000001 && fitted.viewBounds.maxX >= fullRegionBounds.maxX - .000001
      && fitted.viewBounds.minZ <= fullRegionBounds.minZ + .000001 && fitted.viewBounds.maxZ >= fullRegionBounds.maxZ - .000001,
    'Fit did not restore the entire region while keeping the selected place');
    unchanged(initial, 'selecting, zooming out, or fitting the chart changed the adventure');
    const paper = $('trail-map').querySelector('.trail-map-canvas');
    paper.dispatchEvent(new WheelEvent('wheel', { deltaY: -120, bubbles: true, cancelable: true })); await frames(3);
    checkZoom(trailMap.state().zoom === 1.25, 'the actual map wheel handler did not zoom one quarter-step');
    unchanged(initial, 'wheel zoom changed the adventure or checkpoint');

    // Real movement/action keys must have no effect while reading the map.
    press('KeyW'); press('ShiftLeft'); press('KeyQ');
    await tap('Space'); await tap('KeyR'); await tap('ControlLeft'); await frames(12);
    release('KeyW'); release('ShiftLeft'); release('KeyQ');
    opened(); unchanged(initial, 'movement or combat input escaped the paused local chart');
    for (const id of [2, 3, 4]) {
      await viewRegion(id);
      checkZoom(trailMap.state().zoom === 1, `changing to region ${id} did not reset the zoom to Fit`);
      assert(trailMap.state().currentRegionId === 1, 'browsing another region changed the current region');
      assert(localMapModel(id).player.x === player.group.position.x && localMapModel(id).player.z === player.group.position.z,
        'another regional chart relocated its player marker');
      unchanged(initial, `browsing region ${id} moved the player, revealed places, or altered the save`);
    }
    assert(!$('trail-map').textContent.includes('North Relay'), 'browsing the fourth region revealed an unvisited relay');
    await viewRegion(1); await chooseKnown('village');
    assert(trailMap.state().selected?.known && trailMap.state().selected?.trackable, 'discovered village is not selectable');
    await mark();
    assert(trackedPlace()?.id === 'village' && trailMap.state().trackedId === 'village', 'Mark did not choose the stable village ID');
    assert($('quest-title').textContent === mainTitle && localMapModel().goal?.name?.includes('Lakota'),
      'optional tracking replaced the main tutorial destination');
    unchanged(initial, 'marking a place changed ordinary gameplay or checkpoint data');
    assert(trackPlace('not-a-place') === false && trackedPlace()?.id === 'village', 'invalid tracking replaced a valid pin');

    await tap('KeyL'); assert(getMode() === 'playing', 'L did not close the local chart'); await frames(8);
    assert($('trail-pin-label').textContent.includes('Tidehaven Village') && $('trail-pin').getClientRects().length > 0,
      'the optional pin did not appear beside the minimap');
    await click('#open-trail-map'); opened(); unchanged(initial, 'clicking the minimap changed gameplay or its save');
    const clear = clearButton(); assert(clear && !clear.disabled, 'the map has no enabled clear-marker control');
    clear.click(); await frames(3); assert(!trackedPlace() && trailMap.state().trackedId === null, 'map Clear did not remove the optional pin');
    unchanged(initial, 'clearing the map pin changed the adventure');
    await tap('Escape'); assert(getMode() === 'playing', 'Escape did not close the map');

    // Only approaching and inspecting the real woodland site should reveal it.
    assert(canStand(bee.x, bee.z, world), 'the Bee Fold inspection position is blocked');
    warp(bee.x, bee.z); await frames(8);
    assert(discoverySet.has(bee.id), 'visiting the actual Bee Fold did not discover it');
    assert($('interaction-label').textContent === bee.prompt, 'the Bee Fold does not expose its ordinary F prompt');
    await tap('KeyF');
    assert(getMode() === 'dialogue' && $('speaker').textContent === bee.name, 'F did not inspect the actual Bee Fold');
    assert(forestStory.snapshot().inspected.includes(bee.id), 'the physical inspection did not add a woodland note');
    await tap('Escape'); assert(getMode() === 'playing', 'inspection did not return to play');
    assert(readState().questStage === 1 && $('quest-title').textContent === mainTitle, 'a woodland map discovery advanced the main tutorial');
    const visited = snapshot(), saved = checkpoint.read();
    assert(saved.ok && saved.data?.woodland?.discoveries.includes(bee.id) && saved.data?.forestStory?.inspected.includes(bee.id),
      'real discovery and inspection were not saved through the existing checkpoint');

    await tap('KeyL'); opened(); await chooseKnown(bee.id);
    assert(trailMap.state().selected?.name === bee.name && trailMap.state().selected?.discovered,
      'the newly discovered place did not become named in the chart');
    assert($('trail-map').textContent.includes(bee.name), 'known woodland name is absent from the map and list');
    await mark(); assert(trackedPlace()?.id === bee.id, 'the discovered woodland site cannot be tracked');
    unchanged(visited, 'marking a newly discovered site changed the saved adventure');
    await viewRegion(4);
    assert(trailMap.state().trackedId === bee.id && trackedPlace()?.id === bee.id, 'viewing another region moved or forgot the selected pin');
    unchanged(visited, 'browsing another region with a pin altered discoveries or the checkpoint');
    await tap('Escape'); await frames(8);
    assert($('trail-pin-label').textContent.includes(bee.name), 'the live HUD forgot the woodland pin');
    await click('#trail-pin-clear'); assert(!trackedPlace(), 'the HUD clear button failed');
    unchanged(visited, 'clearing the HUD pin changed the adventure');

    // The original Journey and continental atlas remain available by their keys.
    await tap('KeyJ');
    assert(getMode() === 'journal' && $('tab-journey').classList.contains('active') && $('journal-content').getClientRects().length > 0,
      'J no longer opens the original Journey tab');
    await click('#tab-trails'); opened();
    await click('#tab-map');
    assert($('tab-map').classList.contains('active') && $('world-map').getClientRects().length > 0
      && $('atlas-image').getAttribute('src').includes('azhora-world-map.svg'), 'World map tab no longer displays the developed atlas');
    await tap('Escape'); await tap('KeyM');
    assert(getMode() === 'journal' && $('tab-map').classList.contains('active'), 'M no longer opens the continental atlas');
    await tap('Escape');
    assert(getMode() === 'playing' && readState().questStage === 1 && !readState().testingEnabled, 'map checks left gameplay in the wrong mode');
    unchanged(visited, 'switching journal/local/atlas tabs changed the adventure or save');
    assert(same(normalSnapshot().inventory, initial.inventory) && same(normalSnapshot().weapons, initial.weapons),
      'the map or inspection granted items or wore equipment');
    return { ok: true, localMapAssertions: checks, localMapReadonlyChecks: readonlyChecks, localMapZoomChecks: zoomChecks, localRegionViews: regionViews,
      realDiscovery: bee.id, unknownNamesHidden: true, movementPaused: true, mainTutorialUnchanged: true,
      pinDidNotChangeSave: true, zoomDidNotChangeSave: true, fitRestoresRegion: true,
      originalJournalAndAtlasAvailable: true, pinCleared: !trackedPlace() };
  } finally {
    for (const key of ['KeyL', 'KeyW', 'KeyQ', 'KeyR', 'KeyF', 'ShiftLeft', 'ControlLeft', 'Space']) release(key);
  }
}
