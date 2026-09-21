import { INVENTORY_ITEMS } from './inventory.js';
import { createJourney } from './journey.js';
import { validateWeaponSnapshot, WEAPON_TYPES, TRADEABLE_WEAPONS } from './weapons.js';
import { mercenaryById } from './mercenaries.js';
import { validatePlayerCharacter } from './player-characters.js';
import { journeySites, WORLD_BOUNDS as PLAYABLE_BOUNDS } from './regions.js';
import { METRES_PER_HEX, AUTHORED_METRES_PER_HEX, toWorld } from './world-scale.js';
import { validateWoodlandProgress, copyWoodlandProgress } from './woodland-progress.js';
import { createForestStory, validateForestStorySnapshot } from './forest-story.js';
import { createForestHideoutQuest, validateForestHideoutSnapshot } from './forest-hideout.js';
import { createRegionalLife, validateRegionalLifeSnapshot } from './regional-life.js';
import { createCampaign } from './campaign.js';
import { validateMapTutorial } from './map-tutorial.js';
import { createMorosChapter, validateMorosSnapshot } from './moros-chapter.js';
import { createBorderChapter, validateBorderSnapshot } from './border-chapter.js';
import { createAftermathChapter, validateAftermathSnapshot, AFTERMATH_VARIANTS } from './aftermath-chapter.js';
import { createRiding, validateRidingSnapshot } from './riding.js';
import { createSkills, validateSkillsSnapshot } from './skills.js';
import { createBirding, validateBirdingSnapshot } from './birding.js';
import { createMapFog, validateMapFogSnapshot } from './map-fog.js';
import { createCartography, validateCartographySnapshot } from './cartography.js';
import { createSwimming, validateSwimmingSnapshot } from './swimming.js';
import { validateCompanionsSnapshot } from './companions.js';
import { validateGearSnapshot } from './gear.js';
import { createFishing, validateFishingSnapshot } from './fishing-skill.js';
import { createMycology, validateMycologySnapshot } from './mycology.js';
import { createBotany, validateBotanySnapshot } from './botany.js';
import { createPipe, validatePipeSnapshot } from './pipeweed.js';
import { createJimson, validateJimsonSnapshot } from './jimson-quest.js';
import { createKaty, validateKatySnapshot } from './katy.js';
import { createVineyard, validateVineyardSnapshot } from './vineyard.js';
import { createBatmanHunt, validateHuntSnapshot } from './batman.js';
import { createBurying, validateBuryingSnapshot } from './lauvel-burying.js';
import { createLightKeeper, validateLightSnapshot } from './lighthouse.js';
import { createBosco, validateBoscoSnapshot } from './bosco.js';
import { createHeist, validateHeistSnapshot } from './rival-light.js';
import { createBeekeeper, validateBeekeeperSnapshot } from './beekeeper.js';
import { validateRefugeesSnapshot } from './refugees.js';
import { validateFallenSnapshot } from './bystanders.js';
import { validateArchaeologySnapshot } from './archaeology.js';
import { validateWineSnapshot } from './wine.js';
import { validateCookingSnapshot } from './cooking.js';
import { validateWineAtticSnapshot } from './wine-attic.js';
import { validatePuckSnapshot, createPuck } from './wine-goblin.js';
import { validateChameleonSnapshot, createChameleon } from './chameleon.js';
import { validateTroupeSnapshot } from './troupe.js';
import { validateBrandySnapshot } from './brandy.js';
import { validateSaltSnapshot } from './salt-sultan.js';
import { validateWoodcuttingSnapshot } from './woodcutting.js';
import { validateConstructionSnapshot } from './construction.js';
import { createGeology, validateGeologySnapshot } from './geology.js';
import { createTalkingTree, validateTalkingTreeSnapshot } from './talking-tree.js';
import { createFerry, validateFerrySnapshot } from './ferry.js';
import { createRenaLetters, validateRenaLettersSnapshot } from './rena-letters.js';
import { createOgreToll, validateOgreSnapshot } from './amod-ogre.js';
import { validateGameModeSnapshot } from './game-mode.js';
import { createLinguist, validateLinguistSnapshot } from './linguist.js';
import { createLongRoad, validateLongRoadSnapshot } from './long-road.js';
import { createFarming, validateFarmingSnapshot } from './farming.js';
import { createLusciaChapter } from './luscia-chapter.js';

export const ROAD_CHECKPOINT_KEY = 'azhora-road-checkpoint-v1';
export const ROAD_CHECKPOINT_VERSION = 1;
// The playable extent comes from the authored regions (worldBoundsFor), so a
// saved position is judged against the ground that actually exists.
const WORLD_BOUNDS = Object.freeze({ ...PLAYABLE_BOUNDS });
const failed = reason => ({ ok: false, data: null, reason });

/**
 * Stable adventure checkpoints. Legacy onward-only saves remain supported.
 * Storage is injected so the rules can run without touching a browser or disk.
 */
export function createRoadCheckpoint({ storage, key = ROAD_CHECKPOINT_KEY } = {}) {
  function validate(data) {
    if (!data || typeof data !== 'object' || data.version !== ROAD_CHECKPOINT_VERSION
      || !Number.isInteger(data.questStage) || data.questStage < 1 || data.questStage > 10 || data.questStage === 4
      || (data.questStage < 10 && !data.woodland))
      return failed('This is not a supported road checkpoint.');
    if (!Array.isArray(data.inventory) || data.inventory.length > Object.keys(INVENTORY_ITEMS).length)
      return failed('The saved satchel is invalid.');
    const stock = new Map();
    for (const item of data.inventory) {
      if (!item || !Object.hasOwn(INVENTORY_ITEMS, item.id) || stock.has(item.id)
        || !Number.isSafeInteger(item.quantity) || item.quantity <= 0
        || (!INVENTORY_ITEMS[item.id].stackable && item.quantity !== 1)) return failed('The saved satchel contains an invalid item or quantity.');
      stock.set(item.id, item.quantity);
    }
    // A traded sword is fine, an unarmed traveler is not.
    const required = [...(data.questStage >= 2 ? ['harbor-letter'] : []), ...(data.questStage >= 6 ? ['road-token'] : [])];
    if (!required.every(id => stock.has(id)) || !Object.keys(WEAPON_TYPES).some(id => stock.has(id)))
      return failed('The road checkpoint is missing your sword, message, or travel token.');
    const inventory = { has: id => stock.has(id) };
    const journey = createJourney();
    if (!journey.restore(data.journey) || journey.state.started !== (data.questStage === 10))
      return failed('The saved road quests are invalid.');
    if (!validateWeaponSnapshot(data.weapons, inventory)) return failed('The saved weapon condition does not match your satchel.');
    if (!Array.isArray(data.journeyGathered) || new Set(data.journeyGathered).size !== data.journeyGathered.length
      || data.journeyGathered.some(id => !Object.hasOwn(journeySites, id) || !['sticks', 'fruit'].includes(journeySites[id].type)))
      return failed('The saved gathering sites are invalid.');
    if (typeof data.meadowCleared !== 'boolean' || typeof data.heardDoom !== 'boolean'
      || (Object.hasOwn(data, 'lysaComplete') && typeof data.lysaComplete !== 'boolean')) return failed('The saved road history is invalid.');
    if (Object.hasOwn(data, 'mapTutorial') && !validateMapTutorial(data.mapTutorial)) return failed('The saved map tutorial is invalid.');
    // Which of the eleven you are. A save written before anyone could choose has no field
    // at all; that game was played as Cromb, and it is restored as Cromb; a save from the one
    // morning he was spelled `crom` names him that way and is still him.
    if (!validatePlayerCharacter(data.player)) return failed('The saved character is not one of the eleven.');
    if (!validateMorosSnapshot(data.moros)) return failed('The saved Moros camp chapter is invalid.');
    if (!validateBorderSnapshot(data.border)) return failed('The saved border chapter is invalid.');
    if (!validateAftermathSnapshot(data.aftermath)) return failed('The saved chapter after the border battle is invalid.');
    if (!validateRidingSnapshot(data.riding)) return failed('The saved horse is invalid.');
    if (!validateSkillsSnapshot(data.skills)) return failed('The saved skills are invalid.');
    if (!validateBirdingSnapshot(data.birding)) return failed('The saved birding notes are invalid.');
    if (!validateMapFogSnapshot(data.chart)) return failed('The saved chart is invalid.');
    if (!validateCartographySnapshot(data.cartography)) return failed('The saved chart of countries is invalid.');
    if (!validateSwimmingSnapshot(data.swimming)) return failed('The saved swimming is invalid.');
    if (!validateCompanionsSnapshot(data.companions)) return failed('The saved companions are invalid.');
    if (!validateGearSnapshot(data.gear)) return failed('The saved gear is invalid.');
    if (!validateFishingSnapshot(data.fishing)) return failed('The saved fishing notes are invalid.');
    if (!validateMycologySnapshot(data.mycology)) return failed('The saved mushroom notes are invalid.');
    // Botany was herbology before it took in the trees; an older save keeps its notes.
    if (!validateBotanySnapshot(data.botany ?? data.herbology)) return failed('The saved plant notes are invalid.');
    if (!validatePipeSnapshot(data.pipe)) return failed('The saved pipe is invalid.');
    if (!validateJimsonSnapshot(data.jimson)) return failed('The saved errand for Toft is invalid.');
    if (!validateKatySnapshot(data.katy)) return failed('The saved search for Batman is invalid.');
    if (!validateVineyardSnapshot(data.vineyard)) return failed('The saved walk of the vineyard is invalid.');
    if (!validateBuryingSnapshot(data.burying)) return failed('The saved burying at the Lauvel is invalid.');
    if (!validateHuntSnapshot(data.hunt)) return failed('The saved case against the blue trade is invalid.');
    if (!validateLightSnapshot(data.light)) return failed('The saved visit to the Suval Light is invalid.');
    if (!validateBoscoSnapshot(data.bosco)) return failed('The saved dog is invalid, which is a terrible thing to have to say.');
    if (!validateHeistSnapshot(data.heist)) return failed('The saved business with the Elod Light is invalid.');
    if (!validateBeekeeperSnapshot(data.troy)) return failed('The saved combs from the Bee Fold are invalid.');
    if (!validateRefugeesSnapshot(data.refugees)) return failed('The saved road for the Lauvel refugees is invalid.');
    if (!validateFallenSnapshot(data.fallen)) return failed('The saved list of the dead is invalid.');
    if (!validateArchaeologySnapshot(data.archaeology)) return failed('The saved notes from the digs are invalid.');
    if (!validateWineSnapshot(data.wine)) return failed('The saved tasting notes are invalid.');
    if (!validateCookingSnapshot(data.cooking)) return failed('The saved recipes are invalid.');
    if (!validateWineAtticSnapshot(data.wineAttic)) return failed('The saved visit to the Wine Attic is invalid.');
    // A road saved before Ed and Puck were two creatures keeps its `ed` key, which was Puck's half.
    if (!validatePuckSnapshot(data.puck ?? data.ed)) return failed('The saved goblin is invalid.');
    if (!validateChameleonSnapshot(data.chameleon)) return failed('The saved chameleon is invalid.');
    if (!validateTroupeSnapshot(data.troupe)) return failed('The saved players of Nylon are invalid.');
    if (!validateBrandySnapshot(data.brandy)) return failed('The saved visit to Brandy Frank is invalid.');
    if (!validateSaltSnapshot(data.salt)) return failed('The saved voyage of the Sultana is invalid.');
    if (!validateWoodcuttingSnapshot(data.woodcutting)) return failed('The saved woodcutting is invalid.');
    if (!validateConstructionSnapshot(data.construction)) return failed('The saved building is invalid.');
    if (!validateGeologySnapshot(data.geology)) return failed('The saved stone notes are invalid.');
    if (!validateTalkingTreeSnapshot(data.oldTree)) return failed('The saved state of the Old Tree is invalid.');
    if (!validateFerrySnapshot(data.ferry)) return failed('The saved crossing to Peblos is invalid.');
    if (!validateRenaLettersSnapshot(data.renaLetters)) return failed('The saved letters between the Ardrys are invalid.');
    if (!validateOgreSnapshot(data.ogreToll)) return failed('The saved toll at the Amod pass stones is invalid.');
    // Which game this was: one field, and no field at all is a normal-mode adventure, which is
    // every save written before there were modes (src/game-mode.js, docs/hard-mode.md).
    if (!validateGameModeSnapshot(data.mode)) return failed('The saved game mode is not one this build knows.');
    if (!validateLinguistSnapshot(data.linguist)) return failed('The saved tongues of Azhora are invalid.');
    if (!validateLongRoadSnapshot(data.longRoad)) return failed('The saved long road through Drent is invalid.');
    if (!validateFarmingSnapshot(data.farming, { playSeconds: Number.isFinite(data.playSeconds) ? data.playSeconds : Infinity })) return failed('The saved rows at the commons are invalid.');
    if (Object.hasOwn(data, 'playSeconds') && (!Number.isFinite(data.playSeconds) || data.playSeconds < 0 || data.playSeconds > 1e8)) return failed('The saved play time is invalid.');
    if (Object.hasOwn(data, 'mercenaryWeapons')) {
      const held = data.mercenaryWeapons;
      if (!held || typeof held !== 'object' || Array.isArray(held)) return failed('The saved company is invalid.');
      for (const [id, weapon] of Object.entries(held)) {
        if (!mercenaryById(id) || !weapon || !TRADEABLE_WEAPONS.includes(weapon.id)
          || !Number.isInteger(weapon.durability) || weapon.durability < 0 || weapon.durability > WEAPON_TYPES[weapon.id].maxDurability) return failed('The saved company is invalid.');
      }
    }
    // A checkpoint written before the world grew carries no worldScale; it was
    // taken at AUTHORED_METRES_PER_HEX, so its position is moved the same way
    // the ground under it moved before the bounds are judged.
    if (Object.hasOwn(data, 'worldScale')
      && data.worldScale !== METRES_PER_HEX && data.worldScale !== AUTHORED_METRES_PER_HEX)
      return failed('The saved checkpoint was taken in a world this build cannot place you in.');
    const saved = data.position;
    const migrate = !Object.hasOwn(data, 'worldScale') || data.worldScale === AUTHORED_METRES_PER_HEX;
    const p = saved && Number.isFinite(saved.x) && Number.isFinite(saved.z) && migrate
      ? toWorld(saved.x, saved.z) : saved;
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.z)
      || p.x <= WORLD_BOUNDS.minX || p.x >= WORLD_BOUNDS.maxX
      || p.z <= WORLD_BOUNDS.minZ || p.z >= WORLD_BOUNDS.maxZ) return failed('The saved position lies outside the playable road.');
    if (Object.hasOwn(data, 'health') && (!Number.isFinite(data.health) || data.health < 0 || data.health > 100))
      return failed('The saved health is invalid.');
    if (Object.hasOwn(data, 'woodland') && !validateWoodlandProgress(data.woodland, stock))
      return failed('The saved woodland progress is invalid.');
    if (!validateForestStorySnapshot(data.forestStory)) return failed('The saved woodland stories are invalid.');
    if (!validateForestHideoutSnapshot(data.forestHideout)) return failed('The saved woodland encounter is invalid.');
    if (!validateRegionalLifeSnapshot(data.regionalLife)) return failed('The saved lives along the road are invalid.');
    if (data.forestHideout?.accepted && data.questStage < 10) return failed('The goblin camp lies across the Tessen, beyond your business in Tidehaven.');
    if (data.woodland && data.questStage >= 3 && (data.woodland.practiceHits < 2 || data.woodland.practiceDodges < 1))
      return failed('The saved combat lessons are incomplete.');
    if (data.questStage < 10 && (data.meadowCleared || data.journeyGathered.length))
      return failed('The saved onward journey has not begun.');
    // The civil-war campaign is optional in a save (older saves predate it) but
    // may not have moved past Drent before the road's final report was filed.
    const campaign = createCampaign();
    if (Object.hasOwn(data, 'campaign')) {
      if (!campaign.restore(data.campaign)) return failed('The saved campaign is invalid.');
      if (campaign.view().chapterId !== 'drent-road' && !journey.state.complete) return failed('The saved campaign outran the road out of Drent.');
    }

    // The Luscia chapter is optional too, and may not stand ahead of the road
    // that opens it or of the campaign that records its reward.
    const luscia = createLusciaChapter();
    if (Object.hasOwn(data, 'luscia')) {
      if (!luscia.restore(data.luscia)) return failed('The saved Luscia chapter is invalid.');
      if (luscia.state.started && !journey.state.complete) return failed('The saved Luscia chapter outran the road out of Drent.');
      if (luscia.state.complete && !campaign.snapshot().completed.includes('luscia-aftermath'))
        return failed('The saved Luscia chapter is ahead of the campaign.');
    }

    // The three chapters past the Lauvel had no such check, so a save could hold the day
    // after a battle that was never fought, or an Empire morning for a traveler the border
    // chapter says signed for the Republic. Each of them is written in the same breath as
    // the campaign chapter it belongs to (`morosAct`, `borderAct`, `aftermathAct` in
    // main.js all move the campaign on before `saveRoad`), so the two must agree. Older
    // saves that carry none of these sections are untouched, and a section is only ever
    // judged against a campaign the save also carries.
    if (Object.hasOwn(data, 'campaign')) {
      const story = campaign.snapshot(), done = id => story.completed.includes(id);
      const moros = createMorosChapter();
      if (Object.hasOwn(data, 'moros') && moros.restore(data.moros)) {
        if (moros.state.started && !done('luscia-aftermath')) return failed('The saved Moros camp outran the field at the Lauvel.');
        if (moros.state.complete && !done('moros-camp')) return failed('The saved Moros camp is ahead of the campaign.');
      }
      const border = createBorderChapter();
      if (Object.hasOwn(data, 'border') && border.restore(data.border)) {
        if (border.state.started && !done('moros-camp')) return failed('The saved border chapter outran the Marshal’s muster.');
        if (border.state.side && story.side && border.state.side !== story.side)
          return failed('The saved border chapter fights for one side and the campaign for the other.');
        if (border.state.complete && !done('border-battle')) return failed('The saved border battle is ahead of the campaign.');
      }
      const aftermath = createAftermathChapter();
      if (Object.hasOwn(data, 'aftermath') && aftermath.restore(data.aftermath) && aftermath.state.variant) {
        const variant = aftermath.state.variant, spec = AFTERMATH_VARIANTS[variant];
        if (story.side && spec.side !== story.side) return failed('The saved day after the battle belongs to the other side.');
        if (story.chapterId !== variant && !done(variant)) return failed('The saved day after the battle is not the one the campaign reached.');
      }
    }

    // Store only the known schema. Fresh objects keep callers from modifying a
    // validated value through a previously retained array or nested reference.
    const result = {
      version: ROAD_CHECKPOINT_VERSION, worldScale: METRES_PER_HEX, questStage: data.questStage, journey: journey.snapshot(),
      inventory: [...stock].map(([id, quantity]) => ({ id, quantity })),
      weapons: { version: 1, equippedId: data.weapons.equippedId,
        sword: { ...data.weapons.sword }, stick: { ...data.weapons.stick }, ...(data.weapons.extra ? { extra: { ...data.weapons.extra } } : {}) },
      journeyGathered: [...data.journeyGathered], meadowCleared: data.meadowCleared,
      position: { x: p.x, z: p.z }, heardDoom: data.heardDoom,
    };
    // Which game this was. One field, and a save without it is a normal-mode adventure.
    if (Object.hasOwn(data, 'mode')) result.mode = data.mode;
    if (Object.hasOwn(data, 'player')) result.player = data.player;
    if (Object.hasOwn(data, 'lysaComplete')) result.lysaComplete = data.lysaComplete;
    if (Object.hasOwn(data, 'health')) result.health = data.health;
    if (Object.hasOwn(data, 'woodland')) result.woodland = copyWoodlandProgress(data.woodland);
    if (Object.hasOwn(data, 'forestStory')) { const story = createForestStory(); story.restore(data.forestStory); result.forestStory = story.snapshot(); }
    if (Object.hasOwn(data, 'forestHideout')) { const hideout = createForestHideoutQuest(); hideout.restore(data.forestHideout); result.forestHideout = hideout.snapshot(); }
    if (Object.hasOwn(data, 'regionalLife')) { const life = createRegionalLife(); life.restore(data.regionalLife); result.regionalLife = life.snapshot(); }
    if (Object.hasOwn(data, 'campaign')) result.campaign = campaign.snapshot();
    if (Object.hasOwn(data, 'mapTutorial')) result.mapTutorial = data.mapTutorial;
    if (Object.hasOwn(data, 'moros')) { const chapter = createMorosChapter(); chapter.restore(data.moros); result.moros = chapter.snapshot(); }
    if (Object.hasOwn(data, 'border')) { const chapter = createBorderChapter(); chapter.restore(data.border); result.border = chapter.snapshot(); }
    if (Object.hasOwn(data, 'aftermath')) { const chapter = createAftermathChapter(); chapter.restore(data.aftermath); result.aftermath = chapter.snapshot(); }
    if (Object.hasOwn(data, 'riding')) { const riding = createRiding(); riding.restore(data.riding); result.riding = riding.snapshot(); }
    if (Object.hasOwn(data, 'skills')) { const skills = createSkills(); skills.restore(data.skills); result.skills = skills.snapshot(); }
    if (Object.hasOwn(data, 'birding')) { const birding = createBirding(); birding.restore(data.birding); result.birding = birding.snapshot(); }
    if (Object.hasOwn(data, 'chart')) { const fog = createMapFog(); fog.restore(data.chart); result.chart = fog.snapshot(); }
    if (Object.hasOwn(data, 'cartography')) { const chart = createCartography(); chart.restore(data.cartography); result.cartography = chart.snapshot(); }
    if (Object.hasOwn(data, 'swimming')) { const swim = createSwimming(); swim.restore(data.swimming); result.swimming = swim.snapshot(); }
    if (Object.hasOwn(data, 'fishing')) { const fishing = createFishing(); fishing.restore(data.fishing); result.fishing = fishing.snapshot(); }
    if (Object.hasOwn(data, 'mycology')) { const mycology = createMycology(); mycology.restore(data.mycology); result.mycology = mycology.snapshot(); }
    if (Object.hasOwn(data, 'botany') || Object.hasOwn(data, 'herbology')) { const botany = createBotany(); botany.restore(data.botany ?? data.herbology); result.botany = botany.snapshot(); }
    if (Object.hasOwn(data, 'pipe')) { const pipe = createPipe(); pipe.restore(data.pipe); result.pipe = pipe.snapshot(); }
    if (Object.hasOwn(data, 'jimson')) { const jimson = createJimson(); jimson.restore(data.jimson); result.jimson = jimson.snapshot(); }
    if (Object.hasOwn(data, 'katy')) { const katy = createKaty(); katy.restore(data.katy); result.katy = katy.snapshot(); }
    if (Object.hasOwn(data, 'vineyard')) { const vineyard = createVineyard(); vineyard.restore(data.vineyard); result.vineyard = vineyard.snapshot(); }
    if (Object.hasOwn(data, 'burying')) { const burying = createBurying(); burying.restore(data.burying); result.burying = burying.snapshot(); }
    if (Object.hasOwn(data, 'hunt')) { const hunt = createBatmanHunt(); hunt.restore(data.hunt); result.hunt = hunt.snapshot(); }
    if (Object.hasOwn(data, 'light')) { const light = createLightKeeper(); light.restore(data.light); result.light = light.snapshot(); }
    if (Object.hasOwn(data, 'bosco')) { const bosco = createBosco(); bosco.restore(data.bosco); result.bosco = bosco.snapshot(); }
    if (Object.hasOwn(data, 'heist')) { const heist = createHeist(); heist.restore(data.heist); result.heist = heist.snapshot(); }
    if (Object.hasOwn(data, 'troy')) { const troy = createBeekeeper(); troy.restore(data.troy); result.troy = troy.snapshot(); }
    if (Object.hasOwn(data, 'refugees')) result.refugees = data.refugees;
    if (Object.hasOwn(data, 'fallen')) result.fallen = { version: 1, ids: [...data.fallen.ids] };
    if (Object.hasOwn(data, 'archaeology')) result.archaeology = { ...data.archaeology, found: { ...data.archaeology.found } };
    if (Object.hasOwn(data, 'wine')) result.wine = { ...data.wine, tasted: { ...data.wine.tasted } };
    // The goblin's state, under its new key, accepting the one it was saved under before the split.
    if (Object.hasOwn(data, 'puck') || Object.hasOwn(data, 'ed')) { const puck = createPuck(); puck.restore(data.puck ?? data.ed); result.puck = puck.snapshot(); }
    if (Object.hasOwn(data, 'chameleon')) { const ed = createChameleon(); ed.restore(data.chameleon); result.chameleon = ed.snapshot(); }
    if (Object.hasOwn(data, 'troupe')) result.troupe = { ...data.troupe };
    if (Object.hasOwn(data, 'brandy')) result.brandy = { ...data.brandy };
    if (Object.hasOwn(data, 'salt')) result.salt = { ...data.salt };
    if (Object.hasOwn(data, 'woodcutting')) result.woodcutting = { ...data.woodcutting };
    if (Object.hasOwn(data, 'construction')) result.construction = { ...data.construction, posts: { ...data.construction.posts } };
    if (Object.hasOwn(data, 'wineAttic')) result.wineAttic = { ...data.wineAttic, life: [...data.wineAttic.life], scary: [...data.wineAttic.scary] };
    if (Object.hasOwn(data, 'cooking')) result.cooking = { ...data.cooking, known: [...data.cooking.known], made: { ...data.cooking.made } };
    if (Object.hasOwn(data, 'geology')) { const geology = createGeology(); geology.restore(data.geology); result.geology = geology.snapshot(); }
    if (Object.hasOwn(data, 'linguist')) { const linguist = createLinguist(); linguist.restore(data.linguist); result.linguist = linguist.snapshot(); }
    if (Object.hasOwn(data, 'longRoad')) { const road = createLongRoad(); road.restore(data.longRoad); result.longRoad = road.snapshot(); }
    if (Object.hasOwn(data, 'farming')) { const farm = createFarming(); farm.restore(data.farming); result.farming = farm.snapshot(); }
    if (Object.hasOwn(data, 'oldTree')) { const tree = createTalkingTree(); tree.restore(data.oldTree); result.oldTree = tree.snapshot(); }
    if (Object.hasOwn(data, 'ferry')) { const boat = createFerry(); boat.restore(data.ferry); result.ferry = boat.snapshot(); }
    if (Object.hasOwn(data, 'renaLetters')) { const letters = createRenaLetters(); letters.restore(data.renaLetters); result.renaLetters = letters.snapshot(); }
    if (Object.hasOwn(data, 'ogreToll')) { const toll = createOgreToll(); toll.restore(data.ogreToll); result.ogreToll = toll.snapshot(); }
    if (Object.hasOwn(data, 'playSeconds')) result.playSeconds = data.playSeconds;
    if (Object.hasOwn(data, 'mercenaryWeapons')) result.mercenaryWeapons = Object.fromEntries(Object.entries(data.mercenaryWeapons).map(([id, weapon]) => [id, { id: weapon.id, durability: weapon.durability }]));
    if (Object.hasOwn(data, 'luscia')) result.luscia = luscia.snapshot();
    return { ok: true, data: result, reason: '' };
  }

  function read() {
    try {
      if (typeof storage?.getItem !== 'function') return failed('Checkpoint storage is unavailable.');
      const raw = storage.getItem(key);
      if (raw === null || raw === undefined) return { ok: true, data: null, reason: '' };
      if (typeof raw !== 'string' || raw.length > 65536) return failed('The saved checkpoint could not be read.');
      return validate(JSON.parse(raw));
    } catch {
      return failed('The saved checkpoint could not be read. Your current game is unchanged.');
    }
  }

  function save(data) {
    try {
      const checked = validate(data);
      if (!checked.ok) return checked;
      if (typeof storage?.setItem !== 'function') return failed('Checkpoint storage is unavailable.');
      storage.setItem(key, JSON.stringify(checked.data));
      return checked;
    } catch {
      return failed('The checkpoint could not be saved. You can keep playing and try again.');
    }
  }

  function clear() {
    try {
      if (typeof storage?.removeItem !== 'function') return failed('Checkpoint storage is unavailable.');
      storage.removeItem(key);
      return { ok: true, data: null, reason: '' };
    } catch {
      return failed('The checkpoint could not be cleared.');
    }
  }

  return { read, save, clear };
}
