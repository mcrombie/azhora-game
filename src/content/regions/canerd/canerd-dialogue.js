import {CANERD_RESIDENTS} from './canerd-residents.js';
import {treeSpecies} from '../../../world/life/tree-species.js';

const words=Object.freeze({
  'canerd-arbor-wizard':{
    hello:'People here call me the Arbor Wizard. Usually you will find me in the hall with my notes; from time to time I walk out to look at our sacred oak. Have you been looking closely at the trees on your travels?',
    work:'I compare bark, buds, leaves and the shape of branches, then write down where each tree grows. The gardener knows this ground better than any book. I spend most of my day here in the castle, and visit the oak between my other work.',
    news:'The garden path enters from the court, west of the oak. Leave the roots and planted beds undisturbed. There is more to see in one familiar tree than a hurried visitor expects.',
    war:'Celder admits humans to its household and ranks. Elves, dwarves, centaurs and satyrs have no place in that membership. Across the way, Laketown has neighbours of all five peoples. That difference keeps ordinary meetings uneasy. I would sooner hear what someone has noticed in the woods.',
    trees:'Look at several features together: bark, the way a twig branches, the shape of the crown, and leaves when you can see them. Acor is a local name for English oak, not another species. The same tree can have more than one name without becoming two discoveries.',
  },
  'canerd-mera':{
    hello:'Mind the planted beds. I am Mera, and keeping a garden alive is a rather steadier occupation than admiring it.',
    work:'I loosen the soil, clear the paths and check what is growing around the oak. I leave room around the roots. The wizard comes to observe; I make sure there is still something healthy to observe.',
    news:'You can walk around the beds on the paving. The oak is the heart of the garden, but the smaller plants need their share of light.',
    war:'Only humans belong to this castle household. Laketown does things differently. I have heard good advice from its orchard keepers; a useful piece of advice does not become worse because of who gives it.',
  },
  'canerd-tovin':{
    hello:'Tovin, household cook. These supplies will not carry themselves, however impressive the towers look.',
    work:'I sort the household stores and carry what is needed into the service range. Someone has to remember supper while everyone else remembers ceremony.',
    news:'The stable passage needs to stay clear. Hessa is forever rescuing a broom from under somebody’s basket.',
    war:'The household is human, by Celder’s rule. Traders from Laketown live among elves, dwarves, centaurs and satyrs. There is strain between the places, and it is the people carrying food who hear much of it.',
  },
  'canerd-edrin':{
    hello:'Edrin, steward of the court household. Please keep the hall doorway clear for those coming to speak.',
    work:'I check the hall, carry household papers and make sure the daily business has somewhere to happen. Decisions belong to the lord and his appointed speakers, not to me.',
    news:'The hall and service range are open from the court. The western stair reaches the battlement; the high tower is another matter.',
    war:'Celder’s faction and household are human-only. Centaurs, elves, dwarves and satyrs are excluded from membership. Laketown’s mixed community has reason to watch its dealings with us carefully. Questions of agreements belong with the envoy.',
  },
  'canerd-hessa':{
    hello:'Hessa. Leave the stable entrance open, please. A quiet yard takes work.',
    work:'I sweep the passage, check the stalls and keep the stable yard orderly. The fair is not a daily market; the empty pens still need looking after.',
    news:'The trough sits to the eastern side. The clear way through the stable is on the west, where I walk.',
    war:'I belong to Celder’s human household. The centaur carters at Laketown are people doing their own work, not horses to be stabled. The quarrel between our communities makes their journeys harder.',
  },
  'canerd-bren':{
    hello:'Bren, court messenger. I am waiting for the next household errand, not collecting volunteers for a campaign.',
    work:'Between messages I check the court and keep an eye on the gate. Walking the same short way is easier than finding that somebody has blocked it with a load.',
    news:'The Arbor Wizard is generally in the hall. If the notes have tired his eyes, try the oak in the garden.',
    war:'At Canerd I carry messages for a human household. At Laketown you meet humans, elves, dwarves, centaurs and satyrs on the same common. The difference is not an easy one along this road.',
  },
});

export function canerdResidentTopics(id){
  if(id==='canerd-sacred-oak')return [];
  if(!CANERD_RESIDENTS.some(p=>p.id===id))return null;
  return id==='canerd-arbor-wizard'?[{id:'trees',label:'Talk about trees'},{id:'lifelist',label:'Share my tree life list'}]:[];
}

// Read the supplied list only. This conversation never observes a tree, awards
// experience, changes a quest, or writes back to the independent journal.
export function canerdResidentWords(id,topic,{treeLifeList=[]}={}){
  if(id==='canerd-sacred-oak')return 'Hrrrm. Another voice. I was having a perfectly good century. Go away, little wanderer. Let an old oak sleep.';
  const person=words[id];if(!person)return null;
  if(id==='canerd-arbor-wizard'&&topic==='lifelist'){
    const supplied=typeof treeLifeList?.species==='function'?treeLifeList.species():treeLifeList;
    const species=[...new Set((Array.isArray(supplied)?supplied:[]).map(key=>treeSpecies(key)?.id).filter(Boolean))].map(treeSpecies);
    if(!species.length)return 'An empty list is a beginning. Look closely at a tree on your next walk and record what you can identify. Bring your observations back if you like; I am interested in what grows where you have been.';
    const names=species.slice(-3).map(p=>p.name).join(', ');
    return `You have recorded ${species.length} tree species. ${names}${species.length>3?' among them':''}—I would gladly hear where you found ${species.length===1?'it':'them'}. Keep noting the place as well as the name. It helps us understand the tree’s company, soil and shelter.`;
  }
  if(topic==='future'||topic==='memory')return 'I can tell you about daily life here. The envoy speaks for Celder’s agreements; I do not change them.';
  return person[topic]??person.hello;
}
