import {YUNETHRE_TOWN as T, YUNETHRE_CAMP as C} from '../../content/regions/minora-frontier/yunethre-world.js';
import {CHAPTER_LOCATIONS} from '../../content/chapters/yunethre/locations.js';
const assert = (value, message) => {if (!value) throw Error(message);};
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const views = {
  town: {x: T.x + 21, z: T.z + 8, yaw: 1.05, pitch: .2, distance: 8},
  fields: {x: T.x + 48, z: T.z + 77, yaw: -1.2, pitch: .45, distance: 14},
  camp: {x: C.x - 10, z: C.z + 6, yaw: -1.7, pitch: .15, distance: 7},
  celder: {...CHAPTER_LOCATIONS.celder, z: CHAPTER_LOCATIONS.celder.z + 3, yaw: .5, pitch: .12, distance: 6},
};
export async function visit(api, name) {
  if (name === 'departure') {
    assert(api.chapter.interact() && api.chapter.choose('accept'), 'Chapter assignment available');
    await api.chapterTransition(null, CHAPTER_LOCATIONS.departure);
    assert(api.chapter.command({type: 'depart'}).ok, 'Chapter departed');
    api.reveal(false); api.resume(); api.look({yaw: Math.PI / 2, pitch: .32, distance: 8});
    for (let i = 0; i < 4; i++) api.step(.04, .04);
    await pause(300);
    const goal = api.minimap.state().draw.goal;
    assert(goal && goal.distance > 500, 'Distant Laketown objective remains on the minimap');
    assert(api.chapter.navigation()?.shortLabel === 'Laketown', 'Outdoor directions name Laketown');
    const pointer = document.getElementById('taleth-main-quest-marker');
    assert(!pointer.hidden && pointer.dataset.target === 'town' && Number(pointer.dataset.distance) > 500, 'Screen direction and distance are visible');
    return {name, goal, navigation: api.chapter.navigation(), pointer: {text: pointer.textContent, ...pointer.dataset}};
  }
  if (name === 'map') {
    api.openMap(); await pause(500);
    const marks = api.chapter.mapMarks();
    assert(marks.some(mark => mark.name === 'Laketown'), 'The atlas receives the Laketown objective');
    assert(api.state().map.objectives.some(mark => mark.targetId === 'town' && mark.visible), 'The briefed destination stays visible over unknown terrain: ' + JSON.stringify(api.state().map.objectives));
    const pin = document.querySelector('.atlas-place[data-place-id="yunethre-objective"]');
    assert(pin && !pin.hidden, 'Actual Laketown pin exists on the atlas');
    return {name, marks, map: JSON.parse(JSON.stringify(api.state().map))};
  }
  api.resume(); if (name === 'town') api.reveal(true);
  await api.visit(views[name]);
  api.look(views[name]); api.resume();
  for (let i = 0; i < 20; i++) {api.step(.04, .04); await pause(50);}
  if (name === 'town') {
    const end = performance.now() + 30000;
    while (!api.testWorld.regionalLife()?.loaded) {
      assert(performance.now() < end, 'Yunethre resident life did not load'); api.step(.04, .04); await pause(100);
    }
  }
  const life = api.testWorld.regionalLife();
  assert(!life?.error, 'Resident life load error: ' + life?.error);
  assert(!api.state().frameErrors.length, 'Frame errors during the regional art review');
  assert(api.stable.owned, 'Chapter horse survives scenery changes');
  return {name, position: api.state().position, life: life ? {loaded: life.loaded, residents: life.campResidents,
    animalCount: life.animals?.creatures.length, visuals: life.visuals} : null, render: api.renderStats()};
}
