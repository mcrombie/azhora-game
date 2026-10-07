// Legacy quest state retains the old movement exports for existing callers.
export {getMovementInput,WATERLINE,waterAt,canStand,canSwim,moveCharacter} from './locomotion.js';

/**
 * **Chapter 1, in three subquests** (the user, 22 September 2026): report to Jojo, train with
 * Glun, report to Nothom. That is the whole of it. What came out of the main quest: the goblins
 * in the Greenway, the report to Quartermaster Corvan in the Avrel clearing, the supply parcels
 * and the second goblin fight, the wolves at the cart, and the bridge over the Caloss - which is
 * not gone from the game but is a side quest now, and an optional one (src/content/chapters/journey/journey.js).
 *
 * A subquest is a **title**, and a title can span two steps: walking up the pier to Jojo and
 * speaking to her are both `Report to Harbourmaster Jojo`, because the player has one thing to do
 * and the second half of it is only the first half arrived at. The house spelling is harbour with
 * a u, as everywhere else the game writes it.
 *
 * **These numbers are read in six places** - the save validator (src/app/saves/road-checkpoint.js), the
 * autopilot's ladder (src/gameplay/autoplay/autopilot.js), `TUTORIAL_DONE` in the marker rules
 * (src/gameplay/quests/quest-markers.js), the road smoke, the chapter list (src/content/chapters/journey/story-chapters.js) and every
 * save. Renumbering means visiting all six, which is what going from eleven steps to four cost.
 */
export const questSteps = [
  {title:'Report to Harbourmaster Jojo', detail:'The bell was ringing before your boat was tied up. Walk ashore and find Jojo, the harbourmaster, at the head of the pier.', lesson:'A first step', hint:'WASD to walk · Q forward-left · E forward-right. Hold Shift or Tab to run.'},
  {title:'Report to Harbourmaster Jojo', detail:'Speak to Jojo at the head of the pier. She has the Empire’s letter, and she will tell you who to see before you take the road.', lesson:'Meet your neighbours', hint:'Approach Jojo and press F to speak. F or Enter continues a conversation.'},
  {title:'Training with Officer Glun', detail:'Report to Officer Glun at the straw post by the village crossroads. He decides whether a hired sword goes up that road, and he will have all three of sword, shield and feet out of you first.', lesson:'Sword, shield and feet', hint:'Left-click or R to swing. Hold V to take a blow on your shield. Hold a direction and press C to step out of the way.'},
  {title:'Report to Nothom', detail:'Glun has given you the chart and your orders: west out of Drent, over the Caloss, and on to Nothom in Luscia. Find Iven at the army’s relay post on the town square; he holds your assignment. Nothing behind you closes — Tidehaven and the whole of Drent stay where they are, and the road back is a minute and a half.', lesson:'A journey begun', hint:'Follow the gold marker west. Press J to review the road ahead; M opens the chart Glun gave you.'},
];
/** The three by name, for anything that would rather name a subquest than count steps. */
export const SUBQUESTS = Object.freeze([
  Object.freeze({ id: 'report-jojo', title: questSteps[0].title, from: 0, to: 1 }),
  Object.freeze({ id: 'train-glun', title: questSteps[2].title, from: 2, to: 2 }),
  Object.freeze({ id: 'report-nothom', title: questSteps[3].title, from: 3, to: 3 }),
]);
/** The last step, which the tutorial does not close: the journey and the chapters take it from here. */
export const QUEST_DONE = questSteps.length - 1;
export function advanceQuest(stage, event) {
  if(stage===0 && event==='ashore') return 1;
  if(stage===1 && event==='accept-letter') return 2;
  if(stage===2 && event==='trained') return 3;
  return stage;
}
