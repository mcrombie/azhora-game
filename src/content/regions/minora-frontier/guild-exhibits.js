import {HADRIN_EXHIBITS} from './hadrin-exhibits.js';
import {GUILD_EXPANSION} from './guild-expansion.js';
const exhibit=(floor,id,name,x,z,description,action,response,extra={})=>({floor,id,name,x,z,y:GUILD_EXPANSION.find(w=>w.id===floor).offset.y,aimY:1.9,front:1,range:3.6,viewDistance:5.5,
  description,action,response,note:GUILD_EXPANSION.find(w=>w.id===floor).name+' / '+GUILD_EXPANSION.find(w=>w.id===floor).domain,...extra});
export const GUILD_EXHIBITS=Object.freeze([
  ...HADRIN_EXHIBITS.map(e=>({...e,floor:'hadrin',y:10.8})),
  exhibit('veyra','restoration','Veyra’s mending table',0,-8,'A broken ceramic bowl rests beside softly glowing water. Medicinal plants and clean beds surround the work.','Watch Veyra restore the bowl','The separated pieces draw together. The water settles; the repaired bowl rests whole for a moment before Veyra resets the demonstration.'),
  exhibit('nessa','dream','The dream basin',0,-8,'Mist holds an indistinct light. Nessa offers a brief, repeatable glimpse; you need not sleep or accept its meaning.','Watch the dream','Two roads converge beneath a dark horizon. A small light remains. Nessa: “Keep the image, but leave its meaning open.”'),
  exhibit('odran','kettle-pour','Odran’s bound kettle',0,-8,'Its instruction reads: “Pour only when no cup is empty.” The empty cup prevents the kettle from doing its job.','Ask: Pour once into this cup','The kettle pours one cup, then stops. A limited instruction with a clear ending.',{alternatives:[{id:'kettle-refuse',label:'Ask: Pour after the cup is full',response:'The kettle shakes its spout. The empty cup still cannot satisfy that instruction.'}]}),
  exhibit('helba','mycelium','The living restoration bed',0,-8,'Pale fungal threads weave between roots and a drooping plant. Flowers and pitcher plants flourish around the room.','Nourish the garden bed','A pulse follows the mycelial threads. The little plant lifts as nourishment reaches its roots.'),
  exhibit('neris','illusion-city','The uncertain miniature',0,-8,'A carefully detailed little city occupies the stage. Neris invites you to question what you see.','Change city / forest','Stone streets dissolve into trees; another gesture restores the city.'),
  exhibit('neris','borrow-face','The mirror of borrowed faces',8,6,'Silvered glass reflects you and the chamber. Borrow a face, then walk around in it. These illusions change only your appearance and fade when you leave this floor.','Wear the ceremonial mask','An emerald mask and plum mantle settle over your usual clothes.',{front:-1,frontOnly:true,alternatives:[
    {id:'borrow-elf',label:'Become an elf',response:'Pointed ears, fair hair and a green mantle: the mirror lends you an elven appearance.'},
    {id:'borrow-goblin',label:'Become a goblin',response:'You take a smaller, green-skinned form with broad ears and a mischievous face.'},
    {id:'restore-face',label:'Restore Teresod',response:'The illusion dissolves. You are yourself again.'},
  ]}),
  exhibit('oris','silence-candles','The listening candles',0,-8,'Seven candles wait for the same note. The demonstration is visible even with sound muted.','Sound the extinguishing note','One clear note passes through the stand. Every flame goes out; the candles relight after a short pause.'),
  exhibit('oris','whisper','The whisper bowls',9,6,'A matching bowl waits across the chamber. Light traces the path of a whispered message.','Send a whisper','“A quiet voice can travel far.” A luminous ripple carries the sentence from the other bowl to this one.'),
  ...['solid','liquid','gas','plasma'].map((state,i)=>exhibit('maelon','matter-'+state,state[0].toUpperCase()+state.slice(1)+' matter',i%2?8:-8,i<2?-7:7,
    ['An ordered crystalline lattice holds a definite shape.','Suspended droplets move around a contained flow.','Visible tracer curls reveal a gas spreading through its vessel.','Charged matter glows inside a containment field.'][i],
    'Observe '+state+' matter',['The lattice turns, keeping its form.','The droplets lengthen, flow and gather again.','The tracer curls rise and spread through the chamber.','The contained arc brightens and pulses between its boundaries.'][i])),
].map(Object.freeze));
export function guildExhibitTarget(position,{room,mode},extras=[]){
  if(room!=='tower'||mode!=='playing')return null;
  let nearest=null,distance=Infinity;
  for(const e of [...GUILD_EXHIBITS,...extras]){
    if(Math.abs(position.y-e.y)>1.7)continue;
    if(e.frontOnly&&(position.z-e.z)*e.front<.65)continue;
    const d=Math.hypot(position.x-e.x,position.z-e.z);if(d<e.range&&d<distance){nearest=e;distance=d;}
  }return nearest;
}
