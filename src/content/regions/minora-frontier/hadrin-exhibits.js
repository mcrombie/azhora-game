// Local workshop coordinates shared by scenery, observation and verification.
// These objects are curiosities, not inventory rewards or campaign resources.
export const HADRIN_EXHIBITS=Object.freeze([
  {id:'golem',name:"Brightlock's workshop golem",x:9,z:9.6,aimY:1.9,front:-1,range:3.4,
    description:'Stone plates surround a brass skeleton. An open chest panel reveals its turning blue core. The unfinished golem patiently checks its joints while Hadrin works.',
    note:'Hadrin: "A steady hand before a strong one. Raise an arm, turn the head, then stop exactly when asked."',
    action:'Watch its test',response:'The golem greets you with a raised hand, then carefully returns to rest.'},
  {id:'everlight',name:'Everlight lantern',x:1.5,z:-8.6,aimY:2.65,front:1,range:3.4,
    description:'A warm lantern hangs in the air above a brass stand. Its light is caught inside a crystal; there is no wick to trim and no oil to spill.',
    note:'Hadrin: "It remembers the light of a summer afternoon. The trick is persuading it that bedtime still applies."'},
  {id:'mending-hammer',name:'Mending hammer',x:-1.7,z:-8.6,aimY:2.0,front:1,range:3.4,
    description:'A little hammer taps above a split stone tablet. Rune tiles, spare fittings and half-finished charms crowd the bench around it.',
    note:'Hadrin: "It remembers the shape a piece ought to have. A useful assistant, provided I give it the right example."'},
  {id:'wayfinder',name:'Homeward wayfinder',x:-8.8,z:7.2,aimY:1.7,front:1,range:3.1,
    description:'A blue crystal rests in a brass compass frame beside charts and small bottles. Its pointer slowly turns, searching for the doorway its maker taught it to remember.',
    note:'Hadrin: "This one points home. Snero insists that a door can move without becoming a different door. We are still arguing about that."'},
  {id:'rainkeeper-cup',name:'Rainkeeper cup',x:-7.1,z:7.2,aimY:1.6,front:1,range:3.1,
    description:'A silver-rimmed cup sits beside a stoppered flask and a ring of tiny blue stones. A bead of water hovers above its rim without spilling.',
    note:'Hadrin: "It holds a mouthful of rain fresh until you need it. Not an endless spring, mind you. Enchantment is no excuse for forgetting your waterskin."'},
  {id:'armor',name:'Self-polishing armor',x:-8.2,z:-6.5,aimY:1.6,front:1,range:3.3,eyeY:2.8,viewDistance:4.8,
    description:'An enchanted cloth rubs circles over a suit of armor on its repair stand. One shoulder plate is still waiting to be fitted beside an open tin of polish.',
    note:'Hadrin: "Look at that shine! It still polishes the same spot, but that is a wonderfully clean spot. The straps need ordinary mending."',
    action:'Watch it polish',response:'The cloth tackles the breastplate with renewed enthusiasm. Hadrin makes another note about teaching it to move on.'},
  {id:'broom',name:'The overhelpful broom',x:5.8,z:10.2,aimY:1.85,front:-1,range:3.1,
    description:'A broom hovers over a low bench, pushing a mallet and pliers into neat groups. Then it changes its mind and rearranges them again.',
    note:'Hadrin: "Size, purpose, alphabetical order... it has opinions. I asked for a tidy workshop, not a new place for my pliers every morning!"',
    action:'Watch it sort',response:'The broom briskly moves the tools across the bench, then begins another arrangement. Hadrin watches with affectionate exasperation.'},
].map(e=>Object.freeze(e)));

export const HADRIN_FLOOR_Y=10.8;

// Position is relative to Taleth's floor origin. Height prevents an exhibit on
// the floor above from taking the interaction intended for Taleth below.
export function hadrinExhibitTarget(position,{room,mode}){
  if(room!=='tower'||mode!=='playing'||Math.abs(position.y-HADRIN_FLOOR_Y)>1.7)return null;
  let nearest=null,distance=Infinity;
  for(const e of HADRIN_EXHIBITS){
    const d=Math.hypot(position.x-e.x,position.z-e.z);
    if(d<e.range&&d<distance){nearest=e;distance=d;}
  }
  return nearest;
}
