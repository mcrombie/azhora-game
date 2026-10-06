import { MAIN_QUEST_PLAYTESTS } from './main-quest-playtests.js';
import { BEN } from '../../content/quests/spider/spider-quest.js';
import { LIZ } from '../../content/quests/roadside/cat-quest.js';
import { TROY } from '../../content/quests/roadside/murder-quest.js';
import { JESSE } from '../../content/quests/jesse/jesse-carriage-world.js';
import { CAGNEY } from '../../content/quests/cagney/cagney-quest.js';
import { KATY } from '../../content/quests/roadside/katy.js';
import { KAYLA } from '../../content/quests/kayla/kayla.js';
import { CUB } from '../../content/quests/bear-family/cub-honey-quest.js';
import { regions } from '../../world/terrain/region-world.js';

/** Exercise the public playtest, story, travel and hack controls without playing entire quests. */
export async function runTestingToolsChecks(h) {
  const started = performance.now(), checks = [];
  const check = (ok, message) => {
    if (!ok) throw new Error(`Testing tools: ${message}; ${JSON.stringify(h.state())}`);
    checks.push(message);
  };
  const control = (id, expand = false) => {
    const node = document.getElementById(id), section = node?.closest('details');
    if (expand && section && !section.open) section.querySelector('summary').click();
    check(node && !node.disabled && node.getClientRects().length, `${id} is available`);
    return node;
  };
  const open = async () => {
    await h.open();
    check(h.state().mode === 'testing', 'Testing tools open');
  };
  await h.prepare(); await h.frames(2);
  const saved = h.saved();
  check(!!saved, 'A normal adventure checkpoint exists before testing');
  const unchanged = label => check(h.saved() === saved, `${label} preserves the normal checkpoint`);
  const mountRace = async () => {
    await open(); control('test-kayla-autoplay').click();
    for (let n = 0; n < 1200 && !h.state().kaylaRace.mounted && h.autoplay.active; n++) await h.frames(1);
    check(h.state().kaylaRace.mounted, 'Kayla autoplay mounts through the actual race invitation');
    h.stop();
  };
  try {
    await open();
    const mainGroup=document.getElementById('test-main-heading'),silverGroup=document.getElementById('test-silver-heading'),namedGroup=document.getElementById('test-named-heading');
    check(!!(mainGroup.compareDocumentPosition(silverGroup)&Node.DOCUMENT_POSITION_FOLLOWING)&&!!(silverGroup.compareDocumentPosition(namedGroup)&Node.DOCUMENT_POSITION_FOLLOWING),'Gold, silver, then named quest-givers appear in order');
    check(document.activeElement.id==='test-main-arrival-autoplay','F8 initially focuses the first gold quest');
    for(const entry of [...MAIN_QUEST_PLAYTESTS,...MAIN_QUEST_PLAYTESTS].reverse()){
      await open();control(`test-main-${entry.id}-autoplay`).click();
      check(h.autoplay.active&&h.autoplay.id==='main'&&h.state().testingEnabled,`${entry.title} starts fresh main autoplay`);
      h.stop();await h.frames(2);const s=h.story();
      if(entry.id==='arrival')check(s.questStage===0&&s.chartLesson==='unissued'&&!s.journey.started,'Arrival resets tutorial and chart prerequisites');
      else if(entry.id==='road')check(s.campaign.chapterId==='drent-road'&&!s.journey.complete&&s.chartLesson==='complete','Road starts after training and before the Nothom report');
      else if(entry.id==='lauvel')check(s.campaign.chapterId==='luscia-aftermath'&&s.luscia.stage==='meet-relay-clerk',"Courier starts before accepting Iven's assignment");
      else if(entry.id==='moros')check(s.campaign.chapterId==='moros-camp'&&s.moros.stage==='report-at-gate'&&!s.border.complete,'Muster resets to reporting at the gate');
      else check(s.campaign.chapterId==='suval-envoy'&&s.border.stage==='take-orders'&&!s.aftermath.variant,'Solis starts before the parley without a stale aftermath');
      check(h.resume()&&h.autoplay.id==='main',`${entry.title} resumes with P's dispatcher`);h.stop();unchanged(entry.title);
    }
    await open();control('test-main-road-autoplay').click();h.offerRoadFork();
    check(h.autoplay.active&&h.questChoiceOpen(),'Gold road keeps autoplay through the real post-ambush choice');
    const forkDeadline=performance.now()+5000;
    while(h.questChoiceOpen()&&performance.now()<forkDeadline)await h.frames(1);
    check(!h.questChoiceOpen()&&h.autoplay.active&&h.autoplay.id==='main'&&!h.civil().drent.accepted,'Gold road chooses Continue to Nothom without accepting the silver investigation');
    h.stop();unchanged('Main road fork');
    await open();control('test-main-arrival-autoplay').click();h.stop();
    check(h.restoreAdventure()&&!h.state().testingEnabled&&!h.playtest(),'Loading the normal adventure clears the abandoned gold playtest boundary');
    h.autoplay.start();h.autoplay.step(0);check(h.autoplay.active,'Ordinary main autoplay is not stopped by an abandoned demo');h.stop();unchanged('Return to normal adventure');
    for(const kind of ['drent','luscia']){
      await open();control(`test-silver-${kind}-autoplay`).click();
      check(h.autoplay.active&&h.autoplay.id===`civil-${kind}`&&h.state().testingEnabled,`${kind} starts dedicated silver autoplay`);
      h.stop();await h.frames(2);const q=h.civil()[kind];
      check(kind==='drent'?q.ambushDefeated&&!q.accepted&&!q.outcome:['unmet','peaceful'].includes(q.soldier)&&!q.introduced&&!q.republicContact,`${kind} begins with fresh quest state`);
      check(h.resume()&&h.autoplay.id===`civil-${kind}`,`${kind} resumes its own quest before acceptance`);h.stop();unchanged(`${kind} silver playtest`);
    }
    await open();control('test-dwarf-autoplay').click();
    check(h.autoplay.active&&h.autoplay.id==='dwarf'&&h.state().testingEnabled,'Dwarfland starts its dedicated city-entry and smithing autoplay');
    h.stop();await h.frames(2);
    check(h.resume()&&h.autoplay.id==='dwarf','Dwarfland resumes before accepting the introductory task');h.stop();unchanged('Dwarfland introduction');
    for (const [kind, npc] of [['ben', BEN], ['liz', LIZ], ['troy', TROY], ['cagney', CAGNEY], ['jesse', JESSE], ['catie', KATY], ['race', KAYLA], ['cub', CUB]]) {
      await open();
      control(`test-${kind==='race'?'kayla':kind}-autoplay`).click();
      check(h.autoplay.active && h.autoplay.id === kind && h.state().testingEnabled,
        `${npc.name}'s card starts its own testing autoplay`);
      // Stop synchronously, before a frame can advance dialogue or movement.
      h.stop(); await h.frames(2);
      check(!h.autoplay.active, `${npc.name}'s autoplay stops cleanly`);
      unchanged(`${npc.name}'s autoplay`);
    }
    for (const [kind, npcId] of [['satchel', 'relay-clerk'], ['republic', 'relay-republican'], ['recall', null]]) {
      await open();control('test-main-road-autoplay').click();h.stop();
      await open(); control(`test-story-${kind}`, true).click();
      check(!h.playtest(),`${kind} story jump clears the old gold playtest boundary`);
      check(h.state().mode === 'dialogue' && h.state().testingEnabled && !h.autoplay.active,
        `${kind} opens its story decision in the testing session`);
      check(h.dialogueNpc() === (npcId ?? h.recall().courier), `${kind} opens the intended character's conversation`);
      unchanged(`${kind} story jump`);
    }
    await mountRace(); await open();
    const country = control('test-country'), place = control('test-place');
    const pueth = regions.find(region => region.name === 'Pueth');
    country.value = pueth.name; country.dispatchEvent(new Event('change', { bubbles: true }));
    place.value = '0'; control('test-goto').click(); await h.frames(12);
    check(!h.state().kaylaRace.mounted, 'Country travel dismounts an active testing race');
    check(h.state().mode === 'playing' && Math.hypot(h.position().x - pueth.spawn.x, h.position().z - pueth.spawn.z) < .01,
      'Country and place travel reaches the selected arrival');
    unchanged('Country travel');
    await mountRace(); await open();
    const drent = regions.find(region => region.id === 1).spawn;
    control('test-point').value = `${drent.x}, ${drent.z}`; control('test-point-go').click(); await h.frames(12);
    check(!h.state().kaylaRace.mounted, 'Coordinate travel dismounts an active testing race');
    check(h.state().mode === 'playing' && Math.hypot(h.position().x - drent.x, h.position().z - drent.z) < .01,
      'Coordinate travel reaches the requested point');
    unchanged('Coordinate travel');
    await open();
    const revealed = h.state().chartRevealed;
    control('test-reveal-chart').click();
    check(h.state().chartRevealed === !revealed, 'Map reveal toggles on or off');
    control('test-reveal-chart').click();
    check(h.state().chartRevealed === revealed, 'Map reveal returns to its previous setting');
    unchanged('Map reveal');
    control('test-dev-horse').click();
    check(h.state().mode === 'playing' && h.state().testingEnabled && h.horse().owned && h.horse().developerMount,
      'Developer horse is granted as a testing mount');
    unchanged('Developer horse');
    await open();
    return { testingToolsChecks: checks.length, checks, elapsedMs: Math.round(performance.now() - started) };
  } finally { h.stop(); }
}
