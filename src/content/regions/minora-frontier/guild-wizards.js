import {GUILD_EXPANSION} from './guild-expansion.js';
// The first two neighboring chambers of an expanding guild tower. Offsets are
// relative to Taleth's chamber; scenery and conversation use the same places.
const SENRO_TOPICS=Object.freeze([
  Object.freeze({id:'work',question:'How does the Stillroom fit here?',topic:'A room beyond its walls',
    answer:'Space is my part; stillness is Taleth\'s. The guild keeps the Stillroom folded inside the tower so you can train without the war advancing outside. Ask Taleth for combat training; the Stillroom\'s doorway brings you back to him.'}),
  Object.freeze({id:'windows',question:'Where do those windows look?',topic:'Windows onto elsewhere',
    answer:'The north window looks over the Cold Stones, far to the north. Opposite it are the Azhor Stones in the south. Drent lies through the east window, and the West Oremindi Mountains through the west. I fold the distance between window and view; these windows are not doorways. My cases remember where the floor was when I packed them. Apparently I packed that one sideways.'}),
  Object.freeze({id:'routes',question:'Can those doors take me elsewhere?',topic:'Old routes, carefully checked',
    answer:'Some old guild doors lead into forgotten paths. Others lead into cupboards, which is why I check before sending anyone through. I am still sorting those routes. The stairs connect all eleven chambers. Bolbur keeps a whole sanctuary folded above Maelon; his arch is a working doorway.'}),
]);
const HADRIN_TOPICS=Object.freeze([
  Object.freeze({id:'work',question:'What are you making?',topic:'A little magic for everyday life',
    answer:'Dry boots, a warm cup, a lamp that follows your work! Grand spells have their place, but so does finding your tools before breakfast. Try the displays: the armor polishes itself, the lamps hover, and my golem is learning a steady hand. Most of them still need a little persuasion.'}),
  Object.freeze({id:'conveniences',question:'Is the broom helping?',topic:'Help with a mind of its own',
    answer:'Splendidly! Unless I need the pliers. I taught it to put things in order before deciding what order meant. Now it tries a new arrangement every few moments. Taleth keeps time still in the tower; my enchantments carry on doing their jobs. A restful place can still be a busy one.'}),
  Object.freeze({id:'equipment',question:'Could you improve my staff?',topic:'Tools worth growing attached to',
    answer:'Oh, I would enjoy that! A sound grip, a better focus, an enchantment suited to its owner. I am still testing the fittings, so I cannot alter your staff yet. Eventually I hope to help with staffs and other enchanted equipment. For now, Taleth can teach you to use what you carry.'}),
]);
export const GUILD_WIZARDS=Object.freeze([
  ...GUILD_EXPANSION,
  Object.freeze({
    id:'senro',name:'Snero Fold',title:'Wizard of Doors and Distances',floor:'senro',
    offset:Object.freeze({x:-2,y:-10.8,z:-2}),
    greeting:'Snero Fold. Doors and distances. Have you seen my traveling case? Never mind, I see it, on the wall. Welcome! The chamber has more room inside than its walls suggest. Taleth is one flight up; there is no hurry while you are here.',
    question:SENRO_TOPICS[0].question,topic:SENRO_TOPICS[0].topic,answer:SENRO_TOPICS[0].answer,
    topics:SENRO_TOPICS,
  }),
  Object.freeze({
    id:'hadrin',name:'Hadrin Brightlock',title:'Wizard of Enchantment',floor:'hadrin',
    offset:Object.freeze({x:-2,y:10.8,z:-2}),
    greeting:'Ah, a visitor! Hadrin Brightlock. Mind the broom; it has reorganized my tools again. I make useful little enchantments, though useful sometimes takes a few attempts. Come close to the golem, armor or workbenches and press F to look. Taleth is one flight below.',
    question:HADRIN_TOPICS[0].question,topic:HADRIN_TOPICS[0].topic,answer:HADRIN_TOPICS[0].answer,
    topics:HADRIN_TOPICS,
  }),
]);
