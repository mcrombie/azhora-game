import { FARMSTEADS, REGIONAL_FARM_ROWS, CARICAS_FARM_ROWS } from '../../world/scenery/regional-farmland.js';
/** Exercise the actual field UI, then reload its ordinary session checkpoint. */
export async function checkCountrysideFarming(h, {check,capture,travel}) {
  const tap=code=>{h.press(code);h.release(code);};
  const choose=async id=>{const b=document.querySelector(`#dialogue-choices [data-choice="${id}"]`);check(b&&!b.disabled,`${id} is available at this regional bed`);b.click();await h.frames(2);};
  check(h.world.farmlandMetrics?.farms===FARMSTEADS.length,'All regional farm sites are rendered');
  check(h.world.farmlandMetrics?.gardenBeds===REGIONAL_FARM_ROWS.length,`All ${REGIONAL_FARM_ROWS.length} regional garden beds connect to the farming system`);
  // The Caricas crops are sown only on its seventeen beds (src/gameplay/skills/farming/farming.js, 6 October 2026).
  check(CARICAS_FARM_ROWS.length===17&&h.farming.sowable(REGIONAL_FARM_ROWS.find(row=>row.region==='Feradom').id).every(kind=>!kind.region),'Caricas crops stay on the Caricas farms');
  for(const id of ['feradom-middle-fields','ambron-south-allotments']) {
    const farm=FARMSTEADS.find(f=>f.id===id),row=farm.rows[0];
    await travel(farm.region);
    h.viewFarm(farm);await capture(farm.region==='Feradom'?'feradom-farmland':'ambron-farmland');
    h.warp({...row,yaw:0});await h.frames(3);
    tap('KeyF');await h.frames(2);
    check(h.state().mode==='dialogue'&&document.getElementById('speaker').textContent===row.name,`F opens ${row.name}`);
    await choose('farm-shared-seeds');
    const seeds=h.inventory.count('carrot-seed'),xp=h.skills.xp('farming');
    await choose('farm-sow-carrot');
    check(h.farming.rowState(row.id,h.clock()).stage==='sown'&&h.inventory.count('carrot-seed')===seeds-1,'Sowing consumes one seed and changes the visible bed');
    tap('KeyF');await h.frames(2);await choose('farm-water');
    check(h.farming.rowState(row.id,h.clock()).watered&&h.skills.xp('farming')===xp+4,'Watering a regional bed earns normal Farming XP');
    check(h.save(),'The planted regional bed saves into the testing checkpoint');
    check(await h.reload(),'The regional crop checkpoint reloads normally');await h.frames(3);
    check(h.farming.rowState(row.id,h.clock()).watered,'The saved crop retains watering and growth time');
    h.advanceClock(75);await h.frames(3);
    check(h.farming.rowState(row.id,h.clock()).stage==='ripe','Watered regional crops ripen with active game time');
    const carrots=h.inventory.count('carrot');tap('KeyF');await h.frames(2);await choose('farm-harvest');
    check(h.inventory.count('carrot')===carrots+3&&h.skills.xp('farming')===xp+26,'Harvest gives three carrots and the normal Farming experience');
    check(h.farming.rowState(row.id,h.clock()).stage==='bare','Harvested regional beds are ready for another planting');
  }
}
