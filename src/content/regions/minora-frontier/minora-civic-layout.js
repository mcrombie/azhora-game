import {MENORA_BUILDINGS} from './menora-city.js';
import {GUILD_STABLE} from './guild-stable-layout.js';

// Public, renderer-free civic register. The existing buildings keep their stable
// IDs and housing classification. A shop below a home does not erase its homes;
// visitors are described separately and do not inflate permanent capacity.
const freeze=Object.freeze;
export const MINORA_WARDS=freeze({
  shrine:freeze({id:'shrine',name:'Old Shrine Quarter',color:'#598578',pale:'#e5e3ce',emblem:'river-grain',description:'The old temple, charitable lodgings and households around the shrine of Shay.'}),
  river:freeze({id:'river',name:'Riverward',color:'#577687',pale:'#e1e2d4',emblem:'barge',description:'The public granary, river workers and the trades that keep cargo moving.'}),
  guild:freeze({id:'guild',name:'Guild Quarter',color:'#495d83',pale:'#e4dfce',emblem:'star',description:'The invited Wizard Guild, its library, lodgings and neighboring households.'}),
  hall:freeze({id:'hall',name:'Hall Quarter',color:'#8c674e',pale:'#eee1c6',emblem:'bridge',description:'The elected assembly, market businesses and homes near River Hall.'}),
});
const records=[
  ['menora-sorcerers-guild','Wizard Guild','guild','Wizard Guild','Guild chambers and teaching','guild',
    'Taleth and the Guild work from this tower. The city provides a food and maintenance allowance in return for their services.',
    'The last king of House Vey invited the Guild about a century ago. He had been Taleth’s pupil and believed magic could help a city strained by the Cref wars. Under the ensuing accord he became Mayor.', ['taleth'],null],
  ['menora-guild-library','Guild Library','guild','Wizard Guild','Library and civic records','library',
    'Seshat keeps the ledgers and helps readers find the Guild’s books. The library also preserves records of the city’s changing government.',
    'The Guild’s arrival added new learning to a city whose temple was already ancient.', ['seshat'],null],
  ['menora-grand-temple','Temple of Shay','shrine','Temple of Shay','Worship and temple administration','temple',
    'Shay is the goddess of the river, agriculture and fertility. High Priest Haldor Sorn tends her temple and shares responsibility for Minora’s government.',
    'The first human settlers founded Shay’s shrine in the first century of the calendar, nearly a thousand years ago. The temple teaches that Shay instructed them to build here.', ['temple'],null],
  ['menora-sanctuary-annex','Shay’s Cloister','shrine','Temple of Shay','Temple kitchen, relief and care','relief',
    'The cloister prepares shared meals and supports the charitable lodging nearby. A modest number of displaced families from both leagues receive help here.',
    'The temple’s duty to feed those in need predates the Guild and the present assembly.', ['satet'],null],
  ['menora-river-hall','River Hall','hall','City of Minora','Neighborhood assembly and Mayor’s office','assembly',
    'Representatives elected by the four neighborhoods meet below the Mayor’s office. Crafts, trade and established families all influence civic life.',
    'The last king of House Vey became Mayor and shared authority with the temple and Guild. The family’s estates and rentals have helped its successors keep winning office.', ['mayor'],null],
  ['menora-west-barracks','City Watch Barracks','shrine','City of Minora','Watch duty, equipment and provisions','watch',
    'Minora has one city watch, commanded by the High Councilor. Rudiger keeps its supplies in order.',
    'The watch serves the city through its changes of government; the neighborhood watch families live beside these barracks.', ['rudiger'],null],
  ['menora-storehouse','Public River Granary','river','City of Minora','Public food reserve and measured deliveries','granary',
    'Nepri measures public grain deliveries while Hapi oversees the barges. Public reserves belong to the city, separately from merchants’ private stock.',
    'Minora’s river crossings made it a meeting place for farm countries. Keeping their supplies moving remains essential to the city.', ['nepri','hapi'],null],
  ['menora-house-1','Cloister Guesthouse','shrine','Temple of Shay','Charitable lodging and resident household','charity',
    'A resident household keeps modest charitable beds for pilgrims and people displaced from either league. Shared meals come from the cloister kitchen.',
    'The guesthouse shares the old quarter’s well and the temple’s duty of hospitality.', ['minora-lodging-keeper','minora-refugee-west','minora-refugee-east'],'Charitable beds for pilgrims and displaced families'],
  ['menora-house-2','Vey Court Homes','shrine','House Vey','Rented family homes','homes',
    'Working households rent these homes from House Vey. Repairs, rents and the shared courtyard are everyday matters with political consequences.',
    'Land and rental income helped the former royal family retain its influence after monarchy became elected civic office.', ['minora-courtyard-resident'],null],
  ['menora-house-3','Market Bakehouse','hall','Baker household','Bread shop and family home','bakery',
    'A household bakes and sells bread here and lives upstairs. Flour deliveries and an early oven keep the market supplied.',
    'The bakehouse serves the market between the temple quarter and River Hall.', ['minora-baker'],null],
  ['menora-house-4','The Four Bridges','hall','Innkeeper household','Paid inn and resident household','inn',
    'Travelers and pilgrims pay for meals and lodging. The innkeeper’s household lives above the common room and welcomes news from either bank.',
    'Its common room faces the trading countries’ market stalls, where news from both banks reaches Minora.', ['minora-innkeeper'],'Paid guest rooms'],
  ['menora-house-5','Quayside Cooper','river','Cooper household','Barrel repair and family home','cooper',
    'The cooper repairs casks for grain, provisions and river cargo in a compact workshop, with the household above.',
    'Well-kept casks keep river water out of the grain and provisions carried along the quays.', ['minora-cooper'],null],
  ['menora-house-6','Watch Families’ Homes','shrine','City of Minora','Housing for watch households','homes',
    'City watch members and their families live beside the barracks, near the shared courts and the temple cloister.',
    'The watch’s families share the same courts, markets and shortages as their neighbors.', ['watch-households'],null],
  ['menora-house-7','Guild Lodgings','guild','Wizard Guild','Homes for Guild staff and apprentices','homes',
    'Guild staff and apprentices live here, near the tower, stable and library. Their errands and lessons carry them through the neighborhood each day.',
    'The Guild’s invitation brought new households and new demands for food and maintenance.', ['minora-guild-apprentice'],null],
  ['menora-house-8','Elfland Legation','guild','Elfland legation','Ambassador’s residence','legation',
    'Elfland’s lone ambassador lives and works here without a staff. The ambassador watches Minoran politics with particular concern for Ibbenwood.',
    'An old neighborhood house now accommodates a diplomatic presence in this mostly human city.', ['minora-elf-ambassador'],null],
  ['menora-house-9','Ink and Binding','guild','Bookbinder household','Stationer, book repair and family home','books',
    'The household binds and repairs books and supplies writing materials to the Guild and civic clerks.',
    'A century of Guild work added another craft to the older city’s trades.', ['minora-bookbinder'],null],
  ['menora-house-10','White Bridge Office','hall','City of Minora','Crossing office and warden’s home','bridge',
    'Imhotep keeps the White Bridge crossing records and lives here. The office faces the eastern gate approach.',
    'The bridge joins trading partners whose armies are not allowed to march through neutral Minora.', ['imhotep'],null],
  ['menora-house-11','Riverworkers’ Homes','river','House Vey','Rented homes for river households','homes',
    'Barge hands, porters and their families rent these homes near the public granary. The work below and the households above depend on the same river trade.',
    'House Vey’s rental holdings extend beyond the prosperous streets around River Hall.', ['riverworker-households'],null],
  ['menora-house-12','House Vey Residence','hall','House Vey','Private family residence','estate',
    'The Vey family’s private home is separate from the Mayor’s public office. Ishkur Vey’s adult son lives within this family, apart from the duties of civic staff.',
    'The family no longer holds a crown, but its estates, patronage and repeated electoral victories preserve much of its influence.', ['mayor','minora-vey-son'],null],
  ['menora-house-13','River Provisions','river','Provisioner household','Private food shop and family home','provisions',
    'A household sells its own stock of provisions here. Its counter and small storeroom are separate from the public granary next door.',
    'Private merchants and public measurers work close together without owning the same supplies.', ['minora-food-merchant'],null],
  ['minora-guild-stable','Guild Stable','guild','Wizard Guild','Horse care and tack','stable',
    'Bear tends the Guild stable and provides Teresod’s horse. Its open stalls hold feed, water and riding equipment.',
    'Even the city’s wizards depend on ordinary animal care, fodder and skilled hands.', ['bear'],null],
];
const footprints=new Map(MENORA_BUILDINGS.map(b=>[b.id,b]));
footprints.set('minora-guild-stable',{...GUILD_STABLE,height:4.95,kind:'stable'});
export const MINORA_CIVIC_BUILDINGS=freeze(records.map(([id,name,ward,owner,purpose,service,description,history,residents,visitorUse])=>{
  const b=footprints.get(id),stable=service==='stable',temple=service==='temple',tower=service==='guild';
  const front=b.z+b.depth/2;
  return freeze({id,name,ward,owner,purpose,service,description,history,residents:freeze(residents),
    x:b.x,z:b.z,width:b.width,depth:b.depth,height:b.height,
    housing:freeze({permanent:b.kind==='house',visitorUse}),
    entrance:freeze({x:b.x,z:front+(temple?7:stable?1.5:1)}),
    plaque:freeze({x:b.x,z:front+.51,y:tower?10.5:temple?10.8:stable?3.15:5.15,width:stable?4.6:5.4,height:.95}),
  });
}));
const byId=new Map(MINORA_CIVIC_BUILDINGS.map(b=>[b.id,b]));
export const minoraCivicBuilding=id=>byId.get(id)??null;
export function nearestMinoraCivicBuilding(position,maxDistance=5){
  let result=null,distance=maxDistance;
  for(const b of MINORA_CIVIC_BUILDINGS){const d=Math.hypot(position.x-b.entrance.x,position.z-b.entrance.z);if(d<distance){distance=d;result=b;}}
  return result;
}
