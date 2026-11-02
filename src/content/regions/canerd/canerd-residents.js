import {CANERD,CANERD_GARDEN} from './canerd-world.js';

// Local household members, not population or production units. The diplomatic
// envoy and gate soldiers remain owned by the Chapter 2 host.
const stop=(x,z,wait=0,yaw=0,activity='walking',place='Canerd Castle')=>Object.freeze({x:CANERD.x+x,z:CANERD.z+z,wait,yaw,activity,place});
const at=(p,wait,yaw,activity,place)=>Object.freeze({...p,wait,yaw,activity,place});
const route=points=>Object.freeze(points);
const person=(id,name,occupation,appearance,routine)=>Object.freeze({
  id:`canerd-${id}`,name,occupation,species:'human',faction:'celder',place:'Canerd Castle',
  role:'mercenary',pace:.9,...appearance,routine:route(routine),...routine[0],
});
const garden=CANERD_GARDEN;
const gardenOut=garden.gardenerRoute.slice(1,-1).map(p=>at(p,p.x===garden.gardenerWork.x&&p.z===garden.gardenerWork.z?16:0,Math.PI,'tending','Canerd garden'));
const gardenerLoop=[
  at(garden.approach,8,Math.PI/2,'tending','Canerd garden'),...gardenOut,
  at(garden.gardenerRest,12,Math.PI,'resting','Canerd garden'),...[...gardenOut].reverse(),
];
const workIndex=gardenerLoop.findIndex(p=>p.x===garden.gardenerWork.x&&p.z===garden.gardenerWork.z);

export const CANERD_RESIDENTS=Object.freeze([
  person('arbor-wizard','The Arbor Wizard','Arbor Wizard',{
    tunic:0x526849,skin:0xc5a083,pace:.82,workGesture:'measure',
    look:{build:'tall-lean',headgear:'bare',hairStyle:'long-tied',hair:0xd9d5c8,facialHair:'full',garment:'robe'},
  },[
    stop(-5,-8,115,Math.PI*.5,'studying','Canerd hall'),
    stop(-5,-14,100,-Math.PI*.5,'studying','Canerd hall'),
    stop(-5,-8,0,0),stop(-5,5,22,.6,'watching','Canerd court'),
    stop(1,14.5),at(garden.entry,0,0,'walking','Canerd garden'),
    at(garden.approach,34,Math.PI/2,'observing','Canerd sacred oak'),
    at(garden.entry,0,0,'walking','Canerd garden'),stop(1,14.5),stop(-5,5,18,Math.PI,'watching','Canerd court'),
  ]),
  person('mera','Mera','Castle gardener',{
    tunic:0x887347,workGesture:'rake',look:{slight:true,dress:true,headgear:'bare',hairStyle:'braid',hair:0x403023},
  },[...gardenerLoop.slice(workIndex),...gardenerLoop.slice(0,workIndex)]),
  person('tovin','Tovin','Household cook',{
    tunic:0xa99e80,workGesture:'basket',look:{build:'broad',headgear:'bare',hairStyle:'cropped',hair:0x584538,facialHair:'trimmed',garment:'bare-forearms'},
  },[
    stop(20,5,10,Math.PI/2,'sorting','Canerd service court'),stop(24,5,5,Math.PI,'carrying','Canerd service court'),
    stop(24,-5,14,Math.PI*.5,'sorting','Canerd household range'),stop(24,5,3,-Math.PI/2),
  ]),
  person('edrin','Edrin','Court steward',{
    tunic:0x694c3e,workGesture:'bundle',look:{build:'slight',headgear:'bare',hairStyle:'cropped',hair:0x939082,facialHair:'stubble',garment:'jerkin'},
  },[
    stop(-1,-12,15,Math.PI/2,'checking','Canerd hall'),stop(-1,-6,12,Math.PI,'checking','Canerd hall'),
    stop(-1,-4,7,-Math.PI/2,'watching','Canerd hall'),
  ]),
  person('hessa','Hessa','Stablehand',{
    tunic:0x79634c,workGesture:'rake',look:{slight:true,headgear:'bare',hairStyle:'long-tied',hair:0x3a2920,garment:'jerkin'},
  },[
    stop(19,-8,10,-Math.PI/2,'sweeping','Canerd stables'),stop(19,-14,12,Math.PI,'sweeping','Canerd stables'),
    stop(19,0,8,-Math.PI/2,'checking','Canerd stables'),stop(19,9,9,0,'resting','Canerd service court'),
  ]),
  person('bren','Bren','Court messenger',{
    tunic:0x68747c,workGesture:'bundle',pace:1.05,look:{build:'wiry',headgear:'bare',hairStyle:'cropped',hair:0x2e241c,facialHair:'clean',garment:'jerkin'},
  },[
    stop(-10,8,8,Math.PI/2,'waiting','Canerd court'),stop(-10,20,11,Math.PI/2,'waiting','Canerd court'),
    stop(-8,24,8,0,'watching','Canerd court'),stop(-8,8,12,Math.PI,'waiting','Canerd court'),
  ]),
]);
