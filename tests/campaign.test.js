import test from 'node:test';
import assert from 'node:assert/strict';
import { createCampaign, settleBorderBattle, CHAPTERS, REGIONAL_ARCS, CAMPAIGN_MISSIONS, LOTHARN_SURVEY_POINTS, campaignGraphIssues, validateCampaignSnapshot } from '../src/campaign.js';
import { LEVEL_ONE_PROVINCES } from '../src/campaign-world.js';

function fixture() {
  const events = [];
  const campaign = createCampaign({ onEvent: event => events.push(event) });
  return { campaign, events };
}

function reachTheFork(campaign) {
  assert.equal(campaign.completeChapter('drent-road').ok, true);
  assert.equal(campaign.completeChapter('luscia-aftermath').ok, true);
  assert.equal(campaign.completeChapter('moros-camp').ok, true);
  assert.equal(campaign.view().kind, 'fork');
}

test('the chapter graph is closed and every chapter names a designed region', () => {
  assert.deepEqual(campaignGraphIssues(), []);
  assert.equal(CHAPTERS['drent-road'].next, 'luscia-aftermath');
  assert.equal(CHAPTERS['oremindi-convergence'].next, null);
  assert.ok(Object.keys(REGIONAL_ARCS).length >= 13);
});

test('the prologue road leads through Luscia (horse) and the Moros to the fork; out-of-order reports fail', () => {
  const { campaign, events } = fixture();
  const view = campaign.view();
  assert.equal(view.chapterId, 'drent-road'); assert.equal(view.level, 0); assert.equal(view.sideName, 'Undecided');
  assert.equal(campaign.completeChapter('luscia-aftermath').ok, false);
  assert.equal(campaign.chooseSide('empire').ok, false);
  assert.equal(campaign.resolveArc('Peblos', 'coalition').ok, false, 'Drent has no militia to join');
  assert.equal(campaign.completeChapter('drent-road').ok, true);
  assert.equal(campaign.view().region, 'Luscia'); assert.equal(campaign.view().level, 1); assert.equal(campaign.view().horse, false);
  const luscia = campaign.completeChapter('luscia-aftermath');
  assert.equal(luscia.reward, 'horse'); assert.equal(campaign.view().horse, true);
  assert.equal(campaign.completeChapter('moros-camp').ok, true);
  assert.equal(campaign.view().kind, 'fork'); assert.equal(campaign.view().region, 'West Suval');
  assert.equal(campaign.completeChapter('suval-envoy').ok, false, 'the fork needs a decision');
  assert.equal(events.length, 3);
  assert.ok(events.every((event, index) => event.sequence === index + 1));
});

test('siding with the Empire: battle, Solis, Ambron, one province, Amod, the Lotharn, Mithala, the Oremindi frontier', () => {
  const { campaign } = fixture();
  reachTheFork(campaign);
  assert.equal(campaign.chooseSide('nobody').ok, false);
  assert.equal(campaign.chooseSide('empire').ok, true);
  assert.equal(campaign.view().chapterId, 'border-battle');
  assert.deepEqual(campaign.battleOdds(), { side: 'empire', chance: 50, tilt: 0, truce: false });
  assert.equal(campaign.completeChapter('border-battle').ok, false, 'a battle needs an outcome');
  assert.equal(campaign.completeChapter('border-battle', 'victory').ok, true);
  assert.equal(campaign.view().chapterId, 'solis-sweep');
  assert.equal(campaign.completeChapter('solis-sweep').ok, true);
  assert.equal(campaign.mapControl()['West Suval'], 'empire');
  assert.equal(campaign.completeChapter('report-ambron').ok, true);
  assert.equal(campaign.view().kind, 'arc');
  assert.deepEqual(campaign.view().destinations, [...LEVEL_ONE_PROVINCES]);
  assert.equal(campaign.completeChapter('first-pacification').ok, false, 'no province is pacified yet');
  assert.equal(campaign.resolveArc('Pueth', 'empire').ok, true);
  assert.equal(campaign.view().chapterId, 'amod-hill-chief', 'one pacified province completes the assignment by itself');
  assert.equal(campaign.mapControl().Pueth, 'empire');
  assert.equal(campaign.completeChapter('amod-hill-chief', 'defeat').ok, true, 'defeat against the goblins is a retry');
  assert.equal(campaign.view().chapterId, 'amod-hill-chief');
  assert.equal(campaign.resolveArc('Amod', 'truce').ok, true);
  assert.equal(campaign.battleOdds().chance, 75, 'a pacified province and a truce tilt the goblin battle');
  assert.equal(campaign.completeChapter('amod-hill-chief', 'victory').ok, true);
  assert.equal(campaign.completeChapter('lotharn-scout').ok, true);
  assert.equal(campaign.completeChapter('lotharn-survey').ok, false, 'three corners first');
  assert.equal(campaign.surveyPoint('nowhere').ok, false);
  for (const point of LOTHARN_SURVEY_POINTS) assert.equal(campaign.surveyPoint(point).ok, true);
  assert.equal(campaign.surveyPoint(LOTHARN_SURVEY_POINTS[0]).ok, false);
  assert.equal(campaign.completeChapter('lotharn-survey').ok, true);
  assert.equal(campaign.completeChapter('west-lotharn-outpost').ok, true);
  assert.equal(campaign.view().level, 4);
  assert.equal(campaign.completeChapter('orc-chief-lotharn', 'defeat').ok, true);
  assert.equal(campaign.view().chapterId, 'orc-chief-lotharn');
  assert.equal(campaign.completeChapter('orc-chief-lotharn', 'victory').ok, true);
  assert.equal(campaign.completeChapter('mithala-scout').ok, true);
  const frontier = campaign.view();
  assert.equal(frontier.chapterId, 'oremindi-convergence'); assert.equal(frontier.level, 5); assert.equal(frontier.frontier, true);
  assert.equal(campaign.completeChapter('oremindi-convergence').ok, false);
  assert.equal(campaign.state.attempts['amod-hill-chief'], 2);
});

test('siding with the Coalition mirrors the Empire arc westward and a lost border battle still moves on', () => {
  const { campaign } = fixture();
  reachTheFork(campaign);
  assert.equal(campaign.chooseSide('coalition').ok, true);
  assert.equal(campaign.completeChapter('border-battle', 'defeat').ok, true);
  assert.equal(campaign.view().chapterId, 'solis-fallback');
  assert.equal(campaign.completeChapter('solis-fallback').ok, true);
  assert.equal(campaign.mapControl()['Moros Plain'], 'empire');
  assert.equal(campaign.view().region, 'West Izol'); assert.equal(campaign.view().level, 0);
  assert.equal(campaign.completeChapter('sail-west-izol').ok, true);
  assert.equal(campaign.resolveArc('Luscia', 'coalition').ok, true);
  assert.equal(campaign.view().chapterId, 'nesdor-sand-chief');
  assert.equal(campaign.completeChapter('nesdor-sand-chief', 'victory').ok, true);
  for (const id of ['ovesos-scout', 'oves-outpost']) assert.equal(campaign.completeChapter(id).ok, true);
  assert.equal(campaign.completeChapter('orc-chief-oves', 'victory').ok, true);
  assert.equal(campaign.completeChapter('pyros-scout').ok, true);
  assert.equal(campaign.view().chapterId, 'oremindi-convergence');
  assert.equal(campaign.view().sideName, 'Republican Coalition');
});

test('a Coalition victory hands the plain and Solis to the Republic', () => {
  const { campaign } = fixture();
  reachTheFork(campaign);
  campaign.chooseSide('coalition');
  assert.equal(campaign.completeChapter('border-battle', 'victory').ok, true);
  assert.equal(campaign.completeChapter('moros-outpost').ok, true);
  assert.equal(campaign.mapControl()['Moros Plain'], 'coalition');
  assert.equal(campaign.mapControl()['West Suval'], 'coalition');
});

test('regional arcs pay trust, flip provinces, and double-dealing is exposed on the third crossing', () => {
  const { campaign, events } = fixture();
  reachTheFork(campaign);
  assert.equal(campaign.resolveArc('Nowhere', 'empire').ok, false);
  assert.equal(campaign.resolveArc('Luscia', 'truce').ok, false, 'Luscia has no truce');
  assert.equal(campaign.resolveArc('Peblos', 'coalition').ok, true, 'the islands can be worked before the fork');
  assert.equal(campaign.view().trust.coalition, 27); assert.equal(campaign.view().trust.empire, 52);
  campaign.chooseSide('empire');
  assert.equal(campaign.view().trust.empire, 67);
  assert.equal(campaign.resolveArc('Peblos', 'coalition').ok, false, 'already settled for that side');
  assert.equal(campaign.resolveArc('Peblos', 'empire').ok, true, 'a province can be won back');
  assert.equal(campaign.mapControl().Peblos, 'empire');
  assert.equal(campaign.view().exposed, false);
  assert.equal(campaign.resolveArc('Vastos', 'coalition').ok, true);
  assert.equal(campaign.resolveArc('Meneth', 'coalition').ok, true);
  assert.equal(campaign.view().exposed, false);
  const third = campaign.resolveArc('Pueth', 'coalition');
  assert.equal(third.exposed, true);
  assert.equal(campaign.view().exposed, true);
  assert.ok(campaign.view().trust.empire < 40, 'the Empire found out');
  assert.equal(campaign.battleOdds().chance, 30, 'working against your side tilts your own battle');
  assert.ok(events.some(event => event.actionId === 'resolve-arc' && event.exposed));
});

test('five pacified provinces open the invasion of West Izol; the Coalition needs seven for Ambron', () => {
  const { campaign } = fixture();
  reachTheFork(campaign);
  campaign.chooseSide('empire');
  campaign.completeChapter('border-battle', 'victory'); campaign.completeChapter('solis-sweep'); campaign.completeChapter('report-ambron');
  assert.deepEqual(campaign.availableMissions(), []);
  for (const id of LEVEL_ONE_PROVINCES) assert.equal(campaign.resolveArc(id, 'empire').ok, true);
  assert.deepEqual(campaign.milestones(), { side: 'empire', provinces: 5, threeOfFive: true, fiveOfFive: true });
  assert.deepEqual(campaign.availableMissions().map(mission => mission.id), ['invade-west-izol']);
  assert.equal(campaign.resolveMission('invade-elagos', 'victory').ok, false, 'the other side’s war');
  assert.equal(campaign.resolveMission('invade-west-izol', 'defeat').ok, true);
  assert.equal(campaign.mapControl()['West Izol'], 'izoli');
  assert.equal(campaign.resolveMission('invade-west-izol', 'victory').ok, true);
  assert.equal(campaign.mapControl()['West Izol'], 'empire');
  assert.deepEqual(campaign.availableMissions().map(mission => mission.id), ['subdue-east-izol']);
  assert.equal(campaign.resolveMission('invade-west-izol', 'victory').ok, false, 'already won');

  const republic = fixture().campaign;
  reachTheFork(republic); republic.chooseSide('coalition');
  republic.completeChapter('border-battle', 'victory'); republic.completeChapter('moros-outpost'); republic.completeChapter('sail-west-izol');
  for (const id of LEVEL_ONE_PROVINCES) republic.resolveArc(id, 'coalition');
  assert.deepEqual(republic.availableMissions(), [], 'Nesdor and the Moros are still needed');
  republic.resolveArc('Nesdor', 'coalition'); republic.resolveArc('Moros Plain', 'coalition');
  assert.deepEqual(republic.availableMissions().map(mission => mission.id), ['invade-elagos']);
  assert.equal(republic.resolveMission('invade-elagos', 'victory').ok, true);
  assert.equal(republic.mapControl().Elagos, 'coalition');
  assert.deepEqual(republic.availableMissions().map(mission => mission.id), ['liberate-drent']);
  assert.equal(CAMPAIGN_MISSIONS['liberate-drent'].region, 'Drent');
});

test('snapshots restore exactly and inconsistent saves are rejected without changing the campaign', () => {
  const { campaign } = fixture();
  reachTheFork(campaign); campaign.chooseSide('empire'); campaign.resolveArc('Peblos', 'coalition');
  campaign.completeChapter('border-battle', 'victory');
  const saved = campaign.snapshot();
  const copy = createCampaign();
  assert.equal(copy.restore(saved), true);
  assert.deepEqual(copy.snapshot(), saved);
  assert.deepEqual(copy.view(), campaign.view());
  saved.arcs.Peblos = 'nobody';
  assert.equal(copy.restore(saved), false);
  assert.equal(copy.view().chapterId, 'solis-sweep', 'a rejected save leaves the campaign untouched');
  const bad = [
    { ...campaign.snapshot(), side: null },
    { ...campaign.snapshot(), chapterId: 'sail-west-izol' },
    { ...campaign.snapshot(), horse: false },
    { ...campaign.snapshot(), trust: { empire: 120, coalition: 0 } },
    { ...campaign.snapshot(), completed: ['drent-road', 'drent-road'] },
    { ...campaign.snapshot(), battles: { 'luscia-aftermath': 'victory' } },
    { ...campaign.snapshot(), missions: { 'invade-elagos': 'maybe' } },
    { ...campaign.snapshot(), control: { Nowhere: 'empire' } },
    { ...campaign.snapshot(), version: 2 },
    null, 'campaign', [],
  ];
  for (const data of bad) assert.equal(validateCampaignSnapshot(data), false);
  assert.equal(validateCampaignSnapshot(createCampaign().snapshot()), true);
  const stale = campaign.snapshot();
  stale.completed = stale.completed.map(String); stale.arcs = { ...stale.arcs };
  assert.equal(createCampaign().restore(stale), true);
});

test('winning the border battle takes the other side’s ground, and a save that rolled a won fight as lost is put on the conquest', () => {
  // The Empire's sellsword who wins takes Solis, and West Suval with it.
  const empire = createCampaign(); reachTheFork(empire); empire.chooseSide('empire');
  assert.equal(empire.completeChapter('border-battle', 'victory').ok, true);
  assert.equal(empire.view().chapterId, 'solis-sweep');
  empire.completeChapter('solis-sweep');
  assert.equal(empire.mapControl()['West Suval'], 'empire', 'Solis is the Emperor’s');
  // The Republic's takes the Legion's outpost, and the Moros with it.
  const republic = createCampaign(); reachTheFork(republic); republic.chooseSide('coalition');
  republic.completeChapter('border-battle', 'victory');
  assert.equal(republic.view().chapterId, 'moros-outpost');
  republic.completeChapter('moros-outpost');
  assert.equal(republic.mapControl()['Moros Plain'], 'coalition', 'the outpost flies the Republic’s flag');
  // A save from when the day was rolled: the fight was won, the day came out lost.
  for (const [side, fallback, conquest] of [['empire', 'moros-fallback', 'solis-sweep'], ['coalition', 'solis-fallback', 'moros-outpost']]) {
    const old = createCampaign(); reachTheFork(old); old.chooseSide(side); old.completeChapter('border-battle', 'defeat');
    assert.equal(old.view().chapterId, fallback);
    const onIt = old.snapshot();
    old.completeChapter(fallback);
    const pastIt = old.snapshot();
    assert.notEqual(settleBorderBattle(onIt), onIt, 'a rolled defeat is settled');
    for (const saved of [onIt, pastIt]) {
      const loaded = createCampaign();
      assert.equal(loaded.restore(saved), true);
      assert.equal(loaded.view().chapterId, conquest, `${side}: on to the conquest`);
      assert.ok(!loaded.view().completed.includes(fallback));
      assert.equal(loaded.snapshot().battles['border-battle'], 'victory');
    }
  }
  const won = createCampaign(); reachTheFork(won); won.chooseSide('empire'); won.completeChapter('border-battle', 'victory');
  assert.equal(settleBorderBattle(won.snapshot()).chapterId, 'solis-sweep', 'a won save is left alone');
});
