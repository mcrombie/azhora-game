const canonical = value => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const copy = value => JSON.parse(JSON.stringify(value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const $ = id => document.getElementById(id);

/** Isolated renderer exercise: UI entry, real keyboard flight and atlas clicks. */
export async function runDeveloperSmoke(h) {
  const { developer, frames, press, release, readState, checkpoint, prepare, normalStateSnapshot } = h;
  let checks = 0, atlasSelections = 0, boostMeters = 0, riseMeters = 0, descentMeters = 0;
  const assert = (condition, message) => { checks++; if (!condition) throw new Error(`Developer smoke: ${message}`); };
  const tap = async code => { press(code); release(code); await frames(3); };
  const click = async node => {
    assert(node && node.isConnected, 'requested developer control is absent');
    assert(!node.disabled, 'requested developer control is disabled');
    node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); await frames(3);
  };
  const waitFor = async (condition, message) => {
    const deadline = performance.now() + 25000;
    while (!condition()) { assert(performance.now() < deadline, message); await frames(2); }
  };
  const regionPath = id => [...document.querySelectorAll('#ghost-map-content [data-dev-region]')].find(node => node.dataset.devRegion === id);
  const visitButton = id => [...document.querySelectorAll('#ghost-destinations [data-ghost-visit]')].find(node => node.dataset.ghostVisit === id);

  try {
    assert(typeof prepare === 'function' && typeof normalStateSnapshot === 'function', 'normal adventure fixture hooks are missing');
    await prepare(); await frames(4);
    assert(readState().mode === 'playing' && !developer.active, 'fixture did not start in normal play');
    const original = copy(normalStateSnapshot()), originalSave = copy(checkpoint.read());
    assert(originalSave.ok && originalSave.data, 'fixture must have a normal adventure checkpoint to protect');
    const unchanged = label => {
      assert(same(normalStateSnapshot(), original), `${label}: ghost exploration changed the normal character, inventory, or story`);
      assert(same(checkpoint.read(), originalSave), `${label}: ghost exploration overwrote the normal adventure checkpoint`);
    };

    await tap('F8');
    assert(readState().mode === 'testing', 'F8 did not open testing tools');
    const opener = $('ghost-dev-open');
    assert(opener?.getClientRects().length, 'testing tools do not expose the ghost developer button');
    await click(opener); await developer.ready; await frames(5);
    assert(developer.active && developer.state().atlasOpen, 'ghost developer button did not open the atlas');
    assert(!$('developer-mode').hidden && $('ghost-atlas').getClientRects().length, 'developer atlas panel is hidden');
    const atlas = await developer.ready;
    assert(atlas && atlas.regions.length === 131 && developer.state().regionCount === 131, 'developer atlas is missing authored Azhora regions');
    const paths = [...document.querySelectorAll('#ghost-map-content [data-dev-region]')];
    assert(paths.length === atlas.regions.length, 'atlas does not expose one clickable path per authored region');
    assert(new Set(paths.map(node => node.dataset.devRegion)).size === paths.length, 'atlas region click targets have duplicate IDs');

    // Select all authored polygons, but build only one representative survey.
    for (const node of paths) {
      node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      const selected = developer.state().selectedRegion;
      assert(selected === node.dataset.devRegion && node.getAttribute('aria-pressed') === 'true', `atlas click did not select ${node.dataset.devRegion}`);
      const source = atlas.regions.find(region => region.id === selected);
      assert($('ghost-region-name').textContent === source.name, `${selected}: selected region heading does not match the atlas`);
      const buttons = [...document.querySelectorAll('#ghost-destinations [data-ghost-visit]')];
      assert(buttons.length > 0 && buttons.every(button => !button.disabled), `${selected}: atlas selection has no usable visit action`);
      if (!source.destinationIds.length) {
        assert(buttons.length === 1 && buttons[0].dataset.ghostVisit === `survey:${selected}`, `${selected}: unbuilt region has no survey destination`);
        assert($('ghost-region-note').textContent.includes('gameplay not built'), `${selected}: terrain survey is not identified as unfinished gameplay`);
      }
      atlasSelections++;
    }
    await frames(2); unchanged('atlas selection');

    await click(regionPath('Cape Thalmagar'));
    assert(developer.state().selectedRegion === 'Cape Thalmagar', 'the Cape polygon did not select Thalmagar');
    await click(visitButton('cape-thalmagar'));
    assert(developer.active && !developer.state().atlasOpen && developer.state().scene === 'cape-thalmagar', 'Cape visit did not enter its separate fortress scene');
    assert(developer.state().world?.developerOnly && developer.state().world?.playable === false,
      'the fortress prototype is not separated from playable campaign content');
    assert(developer.state().world.fortressHeight > 200, 'Cape scene is missing its large fortress');
    assert(developer.state().ghostOpacity > 0 && developer.state().ghostOpacity < 1, 'ghost avatar is not translucent');
    let avatar = null; developer.scene.traverse(object => { if (object.name === 'Developer ghost') avatar = object; });
    assert(avatar?.visible, 'the flying ghost avatar is not present in the developer scene');
    let ghostMeshes = 0;
    avatar.traverse(object => {
      if (!object.isMesh) return; ghostMeshes++;
      for (const material of Array.isArray(object.material) ? object.material : [object.material])
        assert(material.transparent && material.opacity > 0 && material.opacity < 1, 'a ghost body part kept its opaque gameplay material');
    });
    assert(ghostMeshes > 5, 'ghost avatar has no recognizable body');

    // Start beneath the fortress platform and fly through its volume. Setup is
    // explicit; displacement below comes exclusively from normal keyboard input.
    assert(developer.setPosition({ x: 0, y: 40, z: -112 }), 'could not place the free-flight inspection fixture');
    assert(developer.setView({ yaw: 0, pitch: 0 }), 'could not point the inspection camera forward'); await frames(2);
    const flightStart = copy(developer.state().flight.position);
    press('KeyW'); press('Tab');
    await waitFor(() => flightStart.z - developer.state().flight.position.z >= 42, 'W + Tab did not produce fast forward flight');
    release('KeyW'); release('Tab'); await frames(2);
    const flightEnd = developer.state().flight.position; boostMeters = distance(flightStart, flightEnd);
    assert(boostMeters >= 42 && Math.abs(flightEnd.x) < .001 && Math.abs(flightEnd.y - 40) < .001,
      'fortress geometry blocked or displaced level ghost flight');
    assert(developer.state().flight.boostSpeed >= 100, 'ghost boost is not fast enough to inspect a region');
    const riseStart = developer.state().flight.position.y; press('Space');
    await waitFor(() => developer.state().flight.position.y - riseStart >= 12, 'Space did not raise the ghost');
    release('Space'); await frames(2); riseMeters = developer.state().flight.position.y - riseStart;
    const descendStart = developer.state().flight.position.y; press('ControlLeft');
    await waitFor(() => descendStart - developer.state().flight.position.y >= 8, 'Ctrl did not lower the ghost');
    release('ControlLeft'); await frames(2); descentMeters = descendStart - developer.state().flight.position.y;
    assert(riseMeters >= 12 && descentMeters >= 8, 'vertical flight controls did not travel the expected distance');
    unchanged('fortress flight');

    const speedBefore = developer.state().flight.speed;
    document.querySelector('canvas').dispatchEvent(new WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true }));
    await frames(2); assert(developer.state().flight.speed > speedBefore, 'scroll-up did not increase ghost flight speed');
    press('KeyW'); await frames(3); await tap('KeyM');
    assert(developer.state().atlasOpen, 'M did not reopen the atlas during flight');
    const mapPosition = copy(developer.state().flight.position); await frames(12);
    assert(same(developer.state().flight.position, mapPosition), 'held movement continued while browsing the atlas');
    release('KeyW'); await tap('KeyM');
    assert(!developer.state().atlasOpen, 'M did not resume the existing flight scene');
    await frames(5); assert(same(developer.state().flight.position, mapPosition), 'old movement keys remained held after closing the atlas');
    await tap('KeyM');

    const survey = atlas.regions.filter(region => !region.destinationIds.length && region.cells.length)
      .sort((a, b) => Math.abs(a.cells.length - 100) - Math.abs(b.cells.length - 100))[0];
    assert(survey, 'atlas has no unbuilt terrain survey to inspect');
    await click(regionPath(survey.id)); await click(visitButton(`survey:${survey.id}`));
    assert(developer.state().scene === 'terrain-survey' && developer.state().regionId === survey.id,
      'unbuilt region visit did not create its terrain survey scene');
    assert(developer.state().world?.cells === survey.cells.length && developer.state().world.subtitle.includes('gameplay not built'),
      'survey omitted authored terrain cells or presented itself as completed gameplay');
    let cellInstances = 0;
    developer.scene.traverse(object => {
      if (object.isInstancedMesh && object.geometry.type === 'CylinderGeometry') cellInstances += object.count;
    });
    assert(cellInstances === survey.cells.length, 'rendered survey ground does not contain every authored region cell');
    assert([...Object.values(developer.state().flight.position), ...Object.values(developer.camera.position)].filter(v => typeof v === 'number').every(Number.isFinite),
      'terrain survey produced non-finite flight or camera coordinates');
    unchanged('terrain survey');

    await tap('KeyM'); await click(regionPath('Drent'));
    const routeStops = [...document.querySelectorAll('#ghost-local-route [data-dev-destination]')];
    assert(routeStops.length === 4, 'Drent is missing the four local playable destinations');
    await click(routeStops.find(node => node.dataset.devDestination === 'region-4'));
    assert(developer.state().scene === 'eastreena' && developer.state().destination === 'region-4', 'local region4 marker did not return to the playable world scene');
    // East Suval lies south of Luscia on the atlas: large positive z, east of the Moros.
    assert(developer.state().flight.position.z > 200 && developer.state().flight.position.z < 460 && developer.state().flight.position.x > -320 && developer.state().flight.position.x < 150,
      'East Suval local destination uses the wrong world coordinates');
    unchanged('local region inspection');
    if(h.ghostVisibilityState){
      const before=h.ghostVisibilityState();
      assert(before.road.groups.some(group=>group.visible), 'ghost visit to East Suval left all road wildlife culled');
      // The goblin camp stands in north Luscia; the woodland ecology stays in Drent, so each is observed from nearby.
      developer.setPosition({x:-448,y:12,z:150});await frames(3);
      assert(h.ghostVisibilityState().camp.visible===2, 'ghost inspection did not reveal both camp lookouts from its own position');
      developer.setPosition({x:-130,y:12,z:-31});await frames(3);
      const observed=h.ghostVisibilityState();
      assert(observed.forest.groups.some(group=>group.visible), 'ghost inspection left the forest detail groups hidden');
      const poses=state=>({animals:state.animals.map(({x,y,z,clock})=>({x,y,z,clock})),birds:state.birds.map(({x,y,z,clock})=>({x,y,z,clock}))});
      assert(same(poses(before.forest),poses(observed.forest)), 'ghost visibility changed woodland animal positions or simulation time');
      assert(same(before.road.creatures,observed.road.creatures), 'ghost visibility advanced the road wildlife');
      assert(before.camp.clock===observed.camp.clock, 'ghost visibility advanced the camp lookouts');
      unchanged('camp ghost inspection');
    }
    await tap('F8');
    assert(!developer.active && $('developer-mode').hidden && readState().mode === 'playing', 'F8 did not return from developer view to ordinary play');
    unchanged('return to adventure');
    assert(!document.body.classList.contains('ghost-view'), 'developer UI styling remained active over normal gameplay');
    return { ok: true, developerAssertions: checks, atlasSelections, authoredRegions: paths.length,
      fortressVisited: true, ghostMeshCount: ghostMeshes, boostMeters: Math.round(boostMeters * 10) / 10,
      riseMeters: Math.round(riseMeters * 10) / 10, descentMeters: Math.round(descentMeters * 10) / 10,
      surveyRegion: survey.id, surveyCells: survey.cells.length, renderedSurveyCells: cellInstances,
      localRegion4Visited: true, adventureUnchanged: true, checkpointUnchanged: true };
  } finally {
    for (const key of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'Tab', 'ShiftLeft', 'Space', 'ControlLeft', 'KeyM', 'F8']) release(key);
    if (developer.active) developer.close();
  }
}
