import {YUNETHRE_TOWN as T} from './yunethre-world.js';

// Local cast and livelihoods, not population totals or food-production units.
// The town's council speaker is owned by the Chapter 2 host, not this roster.
const person=(id,name,species,occupation,dx,dz,yaw,walk,words)=>Object.freeze({
  id:`laketown-${id}`,name,species,occupation,place:'Laketown',x:T.x+dx,z:T.z+dz,yaw,
  walk:Object.freeze(walk),words:Object.freeze(words),
});
export const LAKETOWN_RESIDENTS=Object.freeze([
  person('oren','Oren','human','Fisherman and net keeper',-32,24,1,[2,-2],{
    hello:'Mind the net floats underfoot. I am Oren. The boat is working the tarn; I mend what the lake sends back torn.',
    work:'We row out from the high landing, set the net beyond the reeds, then bring the catch back to sort. Fresh fish go to the common; the rest go to our smokehouse. The hut by the pier holds our gear.',
    news:'Follow the stone stair west to the fishing hut. Watch for a while and you will see the boat come home and set out again.',
    war:'An army can take a road in an afternoon. It takes a village longer to replace a lost boat. I would rather keep feeding our neighbours.',
  }),
  person('mara','Mara','human','Innkeeper',16,-32,Math.PI,[4,0],{
    hello:'Welcome. There is a place at the common table if you have come in peace.',
    work:'I keep the inn. High benches for some guests, low stools for others, and clear floor for those with four hooves. The builders learned to ask before measuring.',
    news:'Councillor Rowan speaks for the town on the common. He listens longer than he talks, which is why we keep sending him.',
    war:'The traders bring plenty of rumours. I offer them supper before I decide which ones to believe.',
  }),
  person('aelin','Aelin','elf','Net weaver',-18,-3,1.8,[0,2],{
    hello:'Hold that knot to the light. A sound net is mostly empty space, carefully held together.',
    work:'I weave the fishing nets and repair sailcloth. My neighbours build the boats; I make sure the fish have something to argue with.',
    news:'Our houses borrow from one another. Those branching eaves rest on dwarf-laid stone. There is no separate elven quarter here.',
    war:'Celder keeps its faction human-only; elves, dwarves, centaurs and satyrs are excluded. Here in Laketown we work beside one another. We depend on people beyond these fields, and a promise of safety should include them too.',
  }),
  person('silven','Silven','elf','Herbalist',39,5,-1,[0,-3],{
    hello:'Easy with the baskets. Some leaves bruise before you notice.',
    work:'I tend the small gardens and trade herbs for lake fish. My doorway is wide enough for my centaur neighbours to visit without bowing their heads.',
    news:'The orchard lies beyond the northern houses. Please use the paths through the young trees.',
    war:'An injured neighbour is still a neighbour, whatever standard frightened them onto our road.',
  }),
  person('brunna','Brunna','dwarf','Cooper',35,31,-2,[0,-3],{
    hello:'A barrel that leaks is a basket with ambitions. I make barrels.',
    work:'Fish tubs, water casks, pickling barrels. The boatwright takes my offcuts and I take his. Little in this yard goes to waste.',
    news:'We put stone beneath timber here, not in place of it. A dry sill makes a longer-lived house.',
    war:'What concerns me is whether the roads stay open and the families along them can bring their work to market.',
  }),
  person('dorrin','Dorrin','dwarf','Boatwright',-33,-5,.8,[0,3],{
    hello:'You can admire the hull, but do not sit in it until the seams are finished.',
    work:'Shallow boats for the reeds, a stout keel for the open tarn. Oren brings me all the damage he pretends not to have done.',
    news:'The fishing landing is up the stone stair. The village lies below the lake rim; that is why the fish have a longer walk to market than you might expect.',
    war:'A fishing boat is no warship. I hope nobody asks me to pretend otherwise.',
  }),
  person('tavar','Tavar','centaur','Carter',24,27,-1.3,[2,3],{
    hello:'Leave room for the cart to turn, friend. These baskets are heavier than they look.',
    work:'I carry grain, orchard fruit and fish between the yards and the common. The broad sheltered courts suit us better than narrow staircases.',
    news:'The centaur camp is east of town. Those who live here have work and neighbours of our own.',
    war:'Do not mistake everyone with hooves for a raider. My family lives here. Celder will not admit centaurs to its human ranks, and that makes the road between us uneasy even for a carter.',
  }),
  person('nessa','Nessa','centaur','Orchard keeper',31,-31,2.1,[3,0],{
    hello:'The wind has brought the scent of the lake all the way to the orchard today.',
    work:'I tend the orchard and bring fruit to market. Our open courts share their rafters with the elven branch carvers and their low stone walls with the masons.',
    news:'The northern lane reaches the trees. The garden beds are farther east, beyond the last houses.',
    war:'I want to be deciding when to prune, not which path is safe enough to bring a basket down.',
  }),
  person('pell','Pell','satyr','Reed worker',-23,9,2.1,[-2,1],{
    hello:'Baskets, fish traps, roof binding. All from a plant most travellers step over.',
    work:'I cut and weave reeds. A little of our curved timber work has crept into nearly every porch in town. Dorrin says it is because none of us can draw a straight line.',
    news:'The fishing hut has new drying racks. Give the nets space; they snag on almost anything, including horns.',
    war:'The lake keeps no borders. It is a useful thing to remember when the arguing starts.',
  }),
  person('fen','Fen','satyr','Fish seller',10,-5,Math.PI,[2,0],{
    hello:'Fresh from the tarn when the boat is in; smoked fish when it is not. No mysterious third option.',
    work:'I sort the catch and sell what our households do not take. The fishing crew bring it down from the high landing in baskets.',
    news:'Rowan is on the common. He knows more about the council business than I do, but considerably less about a fair price for trout.',
    war:'People should be worrying about supper. Not about whether their neighbours will still be here to eat it.',
  }),
]);

export function laketownResidentWords(id,topic){
  const person=LAKETOWN_RESIDENTS.find(p=>p.id===id);if(!person)return null;
  if(topic==='future')return 'We will hear the council out. For now there is work to do and a village to look after.';
  if(topic==='memory')return 'Ask Councillor Rowan about your agreements. I can speak for my own work, not the council.';
  return person.words[topic]??person.words.hello;
}
