import {LIZEEM_SCENARIO} from './lizeem.js';

// Taleth's historical projection is authored context, not thirty turns played
// through the campaign. The live scenario still begins at its existing day 0.
const imperial={isareos:'empire',nethereum:'empire',ovesos:'empire',caricas:'empire',nesdor:'empire'};
const independent={isareos:'minora',nethereum:'nethereum',ovesos:'ovesos',caricas:'caricas',nesdor:'nesdor'};
const western={...independent,nethereum:'west',ovesos:'west'};
const present=Object.fromEntries(LIZEEM_SCENARIO.regions.map(region=>[region.id,region.owner]));
const frames=[
  {day:1,title:'The crown falls',seconds:4,owners:imperial,highlight:Object.keys(imperial),war:false,
    caption:'Republican rebels overthrow Cedric. His younger brother takes a constitution-limited crown. Cedric has disappeared, presumed dead. All five provinces remain imperial.'},
  {day:3,title:'Minora renews its independence',seconds:3,owners:{...imperial,isareos:'minora'},highlight:['isareos'],war:false,
    caption:'Fed up with Cedric, Minora reclaims independence over Isareos alone. Its council welcomes neighboring allies.'},
  {day:4,title:'Nethereum breaks away',seconds:1.5,owners:{...imperial,isareos:'minora',nethereum:'nethereum'},highlight:['nethereum'],war:false,
    caption:'Nethereum declares independence.'},
  {day:5,title:'Caricas declares independence',seconds:1.5,owners:{...imperial,isareos:'minora',nethereum:'nethereum',caricas:'caricas'},highlight:['caricas'],war:false,
    caption:'Caricas follows, across the river.'},
  {day:6,title:'Ovesos becomes independent',seconds:1.5,owners:{...independent,nesdor:'empire'},highlight:['ovesos'],war:false,
    caption:'Ovesos breaks away. Only Nesdor remains imperial.'},
  {day:7,title:'Five independent states',seconds:1.5,owners:independent,highlight:['nesdor'],war:false,
    caption:'Nesdor declares independence. Five separate states now stand.'},
  {day:21,title:'The West Lizeem League',seconds:3,owners:western,highlight:['nethereum','ovesos'],war:false,
    caption:'Nethereum and Ovesos form West Lizeem: an alliance, not conquest. Minora stays neutral.'},
  {day:23,title:'The East Lizeem League',seconds:3,owners:present,highlight:['caricas','nesdor'],war:false,
    caption:'Caricas and Nesdor form East Lizeem: a second alliance, not an annexation. Minora remains neutral.'},
  {day:29,title:'A week on the brink',seconds:2,owners:present,highlight:[],war:false,
    caption:'For the final week, the borders hold. The two leagues face each other across the river.'},
  {day:30,title:'Today: war is declared',seconds:4,owners:present,highlight:['nethereum','ovesos','caricas','nesdor'],war:true,
    caption:'Today, the leagues declare war. Minora stays neutral. This is the moment from which your campaign begins.'},
];

export const LIZEEM_PRELUDE=Object.freeze({
  id:'lizeem-thirty-days',title:'Thirty days before the war',deviceName:'Chronoscope',
  factions:Object.freeze([
    {id:'empire',name:'Ambroni Empire',short:'Empire',color:'#a393b4'},
    ...LIZEEM_SCENARIO.factions.map(faction=>({...faction})),
    {id:'nethereum',name:'Independent Nethereum',short:'Nethereum',color:'#84a777'},
    {id:'ovesos',name:'Independent Ovesos',short:'Ovesos',color:'#92b7b4'},
    {id:'caricas',name:'Independent Caricas',short:'Caricas',color:'#c89968'},
    {id:'nesdor',name:'Independent Nesdor',short:'Nesdor',color:'#ba94a0'},
  ].map(Object.freeze)),
  frames:Object.freeze(frames.map(frame=>Object.freeze({...frame,owners:Object.freeze({...frame.owners}),highlight:Object.freeze([...frame.highlight])}))),
});

const supported=new Set(['lizeem-east-west-v3','lizeem-world-v3','lizeem-world-v4','lizeem-world-v5','lizeem-world-v6','lizeem-world-v7','lizeem-world-v8']);
export function preludeForScenario(scenarioId){return supported.has(scenarioId)?LIZEEM_PRELUDE:null;}
