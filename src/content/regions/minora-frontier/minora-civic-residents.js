import {MENORA_NPC_ANCHORS,MENORA_GATES} from './menora-city.js';

// Named local representatives of existing city households and garrison, not
// additions to the campaign population or food demand. No private reserve data.
const house=n=>`menora-house-${n}`;
const woman=(hair=0x563b2b)=>({slight:true,dress:true,hair,hairStyle:'long-tied'});
const man=(hair=0x47372a)=>({headgear:'bare',hairStyle:'cropped',hair,facialHair:'clean',garment:'jerkin'});
const person=(id,name,occupation,home,work,x,z,look,tunic,extra={})=>({id,name,occupation,home,work,x,z,yaw:Math.PI,look,tunic,role:'villager',place:'Minora',region:'isareos',...extra});
const stop=(x,z,place,wait=8)=>Object.freeze({x,z,place,wait});

// Follow existing streets and the Guild Footbridge. Stop outside institutions;
// the ambassador never disappears into a locked facade or cuts through a plot.
export const MINORA_AMBASSADOR_ROUTE=Object.freeze([
  stop(-2358,30,'Elfland legation',16),stop(-2360,36,'Guild Quarter',0),stop(-2360,63,'Guild Quarter',0),stop(-2340,63,'Library approach',0),stop(-2340,70,'Guild Way',0),
  stop(-2400,70,'Wizards’ Guild',24),stop(-2360,70,'Guild Way',0),stop(-2308,70,'Sacred Way',0),
  stop(-2308,128,'Old Shrine Quarter',0),stop(-2330,128,'Shay’s Temple',24),stop(-2308,128,'Sacred Way',0),
  stop(-2308,135,'Temple Way',0),stop(-2266.5,135,'River Promenade',0),stop(-2266.5,160,'Mayor’s office',24),
  stop(-2266.5,135,'River Promenade',0),stop(-2308,135,'Temple Way',0),stop(-2308,70,'Sacred Way',0),
  stop(-2340,70,'Guild Way',0),stop(-2340,63,'Library approach',0),stop(-2360,63,'Guild Quarter',0),stop(-2360,36,'Guild Quarter',0),
]);

const watch=(index,x,z,yaw,duty,extra={})=>person(`minora-watch-${index}`,'Minora watch',duty,
  index%2?house(6):'menora-west-barracks','menora-west-barracks',x,z,{
    ...man(index%2?0x513e2f:0x77746a),build:index%2?'tall-lean':'broad',garment:'gambeson',weapon:'spear',
  },0x315e57,{role:'mercenary',yaw,guard:true,service:'watch',...extra});

export const MINORA_CIVIC_RESIDENTS=Object.freeze([
  ...MENORA_NPC_ANCHORS.guards.map((p,i)=>watch(i,p.x,p.z,p.yaw,`${MENORA_GATES[Math.floor(i/2)].name} watch`)),
  watch(8,-2320,184,Math.PI,'Public granary watch',{work:'menora-storehouse',walk:[5,0]}),
  watch(9,-2270,132,0,'River watch',{routine:[stop(-2270,132,'White Bridge landing',12),stop(-2268,150,'River Promenade',0),stop(-2268,173,'River landing',12),stop(-2268,150,'River Promenade',0)]}),
  person('minora-baker','City baker','Baker',house(3),house(3),-2365,177, woman(),0x9b7950,{workGesture:'basket'}),
  person('minora-innkeeper','Pilgrims’ innkeeper','Innkeeper',house(4),house(4),-2340,177,woman(0x42322b),0x776749),
  person('minora-cooper','River cooper','Cooper',house(5),house(5),-2368.5,192,man(0x888178),0x6e4a35,{role:'mercenary',workGesture:'hammer'}),
  person('minora-bookbinder','Guild bookbinder','Bookbinder',house(9),house(9),-2351,64,woman(0x804732),0x526f79,{workGesture:'bundle'}),
  person('minora-food-merchant','Provision merchant','Food merchant',house(13),house(13),-2353,183,man(),0x7e6840,{role:'mercenary',workGesture:'measure'}),
  person('minora-lodging-keeper','Charitable lodging keeper','Lodging keeper',house(1),house(1),-2422,179,woman(0x9a968e),0x5c8078),
  person('minora-refugee-west','Western farm worker','Displaced farm worker',house(1),null,-2418,141,man(),0x826b4d,{role:'mercenary',origin:'west',service:'relief'}),
  person('minora-refugee-east','Eastern orchard worker','Displaced orchard worker',house(1),null,-2411,140,woman(0x33251d),0x7f7164,{origin:'east',service:'relief'}),
  person('minora-relief-visitor','Minoran basket mender','Basket mender without secure housing',null,null,-2408,139,man(0xbab6ab),0x817b64,{role:'mercenary',service:'relief',workGesture:'basket'}),
  person('minora-courtyard-resident','Courtyard tenant','Launderer',house(2),house(2),-2417,186,woman(),0x6e8290,{walk:[3,0],workGesture:'bundle'}),
  person('minora-guild-apprentice','Guild apprentice','Maintenance apprentice',house(7),'menora-sorcerers-guild',-2394,36,man(),0x47686a,{role:'mercenary',walk:[0,4]}),
  person('minora-vey-son','Ishkur Vey’s son','Public works assistant',house(12),house(10),-2280,124,man(0x4f3525),0x587174,{role:'relay-clerk'}),
  person('minora-elf-ambassador','Ambassador of Elfland','Elfland’s ambassador',house(8),house(8),-2358,30,
    {elven:true,build:'tall-lean',headgear:'bare',hairStyle:'long-tied',hair:0xc5bd91,facialHair:'clean',garment:'short-cloak',jerkin:false},0x476d61,
    {role:'mercenary',skin:0xcdb293,routine:MINORA_AMBASSADOR_ROUTE}),
].map(d=>Object.freeze({...d,routine:d.routine?Object.freeze(d.routine):undefined})));

export const MINORA_RESIDENT_HOMES=Object.freeze({
  seshat:house(7),satet:'menora-sanctuary-annex',hapi:house(11),nepri:house(2),imhotep:house(10),rudiger:house(6),
});

const words=(hello,work,war,future='I hope the peace gives us time to keep the city in good order.')=>Object.freeze({hello,work,war,future});
const WATCH_WORDS=words(
  'Minora watch. Civilians from either league may find shelter here. Armed columns must stay outside the city.',
  'We keep the gates, public stores and river landings secure. The High Councilor commands our watch. Neighborhood militia help during emergencies.',
  'Our duty is to Minora. A traveller’s eastern or western home is no reason to turn them away. The public granary and the temple kitchen both need clear approaches.');
export const MINORA_CIVIC_CONVERSATIONS=Object.freeze({
  ...Object.fromEntries(MINORA_CIVIC_RESIDENTS.filter(d=>d.guard).map(d=>[d.id,WATCH_WORDS])),
  seshat:words('Seshat, Guild ledger clerk. The library keeps the records of the city’s agreement with the wizards, as well as their books.', 'I keep the Guild accounts and lodge with its other employees. Minora supplies food and maintenance in return for teaching, engineering and public assistance; a private commission has its own account.', 'Taleth taught the last king in his youth. A century ago that king became Mayor and shared power with the Guild and temple. House Vey has kept winning the mayoralty since.'),
  satet:words('I am Satet. These bowls are for the temple meal. Refugees from either league and people from Minora may ask for help.', 'I live at the cloister and help prepare meals and clean the bowls. The charitable lodging is nearby. The temple uses its own provisions to feed people in need.', 'High Priest Haldor Sorn favors East Lizeem, but the kitchen serves civilians from both leagues. Hungry people should not have to argue their politics for a meal.'),
  nepri:words('Nepri, grain measurer. This is the public granary. Leave the receiving space clear.', 'I measure deliveries and record the city’s public grain. I rent a home in Vey Court. Temple and merchant stocks have their own accounts; they are not mine to promise.', 'The city depends on food reaching it from both banks. A good measurement cannot make up for a missing barge.'),
  rudiger:words('Rudiger. I keep the watch’s provisions in order.', 'The barracks has quarters and equipment stores. My household lives in the watch-family homes nearby. The High Councilor commands the watch, whose meals come from its existing allocation, not from whatever happens to be left over.', 'Our duty is to the city under its High Councilor. Neighborhood militia help in emergencies, but civilians from both leagues are entitled to shelter here.'),
  imhotep:words('Imhotep, White Bridge warden. Keep the crossing clear and tell me if something needs repair.', 'My home is above the bridge office. Ishkur Vey’s son helps with measurements and public works. He has to learn from the people who maintain these crossings.', 'Minora needs these bridges for civilians and supplies. Military columns must use routes outside the city.'),
  'minora-baker':words('Bread for the street and the lodgings. Let the next customer reach the counter.', 'I bake here and live above the shop. The grain comes through the city’s suppliers; I cannot bake a promise when a delivery fails.', 'Refugees need bread as much as pilgrims do. The temple gives meals, and we supply what its kitchen orders.'),
  'minora-innkeeper':words('A bed, a meal, or directions to Shay’s shrine? This is the pilgrims’ inn.', 'My household lives upstairs. Pilgrims and traders rent the other rooms. People without money should ask at the charitable lodging near the cloister.', 'Minora receives people from both leagues. I care whether my guests can share a table without quarrelling.'),
  'minora-cooper':words('A sound barrel is cheaper than a spoiled load. Mind the hoops.', 'I repair casks for merchants and the public granary. My home is here beside the workshop.', 'We depend on goods reaching Minora. Broken containers are my problem; armies on the roads are a much larger one.'),
  'minora-bookbinder':words('If the pages are loose, bring the whole book. A loose sheet has a habit of becoming someone else’s history.', 'I bind books and supply writing materials. My family lives above the shop; the Guild and civic offices keep us busy.', 'The Guild’s agreement with Minora is a century old. A king became a mayor, but the written office was never made hereditary.'),
  'minora-food-merchant':words('Provisions for a household, not a whole army. Tell me what you need.', 'I run this shop and keep stock behind it. We buy and sell food already brought to the city; the public granary is a separate store.', 'When the river trade is interrupted, households feel it. Minora needs suppliers on both banks.'),
  'minora-lodging-keeper':words('This is the charitable lodging. If you need a place, speak to me; the temple kitchen is near the cloister.', 'I keep the beds and help poor pilgrims and displaced people find shelter. We began with some spare places; more arrivals mean harder choices.', 'Civilians from both leagues are admitted. The person in the next bed may have fled the army your family supports.'),
  'minora-refugee-west':words('I came from the western farms. Minora gave me a place at the charitable lodging.', 'I worked the fields before the fighting drove us away. I am looking for work while we wait to learn whether it is safe to return.', 'The watch let us through, and the temple gave us a meal. There are eastern families here too. We have all had to leave something behind.'),
  'minora-refugee-east':words('We came from the eastern country. The keeper found us beds near the cloister.', 'I know orchard work. Until we can return, I would rather help here than spend every hour waiting for news.', 'Shay’s kitchen serves us and the western families alike. That matters more to me today than which councilor gives the finest speech.'),
  'minora-relief-visitor':words('I am from Minora. Losing a room does not make it stop being your home.', 'I mend baskets when I can get the work. The temple helps with meals, but finding secure lodging is another matter.', 'There were people needing help here before the refugees arrived. There should be room to care about both.'),
  'minora-courtyard-resident':words('Leave a little room for the washing. Several households share this court.', 'I take in washing and rent here from House Vey. The family owns homes as well as estates; their name appears on many of our rent accounts.', 'The Mayor keeps the city working. That does not mean every tenant must agree that his family should always win the Assembly vote.'),
  'minora-guild-apprentice':words('I am carrying out maintenance for the Guild. The wizards still need ordinary supplies.', 'I lodge with other Guild workers. The city supplies food, maintenance and funding in exchange for teaching, engineering and public assistance. Private commissions are separate.', 'Taleth taught Minora’s last king when he was young. During the Cref wars, that king invited the Guild and agreed to share power with it and the temple.'),
  'minora-vey-son':words('I am helping Imhotep with public works. If there is a damaged crossing or drain, he needs the location.', 'I work from the bridge office and live at Vey House. Imhotep knows these crossings better than I do; I bring the measurements and learn from the people maintaining them.', 'Repairs still need doing while the Assembly argues. Please put the workers’ names on the report as well as mine.'),
  'minora-elf-ambassador':words('I represent the King of Elfland. Minora is our nearest friendly major state, and events in the human countries concern Ibbenwood.', 'I live alone at the legation. I visit the Guild, temple and Mayor’s office to hear their accounts, then compare what each has chosen to tell me.', 'Our king fears that human conflict may threaten Ibbenwood. I am here to understand the balance of power, not to mistake one official’s assurances for the whole city.'),
});

// Optional public, read-only context from the civic ledger. Never disclose the
// temple’s strategic reserve or convert visible actors into food consumers.
export function minoraCivicWords(id,topic,context){
  if(topic!=='news'||!context)return null;
  if(['minora-lodging-keeper','minora-refugee-west','minora-refugee-east','minora-relief-visitor','satet'].includes(id)&&context.reliefText)return context.reliefText;
  if(['nepri','minora-food-merchant','minora-baker'].includes(id)&&context.supplyText)return context.supplyText;
  return null;
}
