import {createWalkSurfaces} from '../../../world/collision/walk-surfaces.js';
// Scenario characters and the user's approved civic history; no manuscript imports.
export const MINORA_COUNCIL=Object.freeze({
  taleth:{id:'taleth',name:'Taleth',title:'Wizard Guild Master',banner:'Wizard Guild',color:'#304e82',emblem:'star'},
  mayor:{id:'mayor',name:'Ishkur Vey',title:'Mayor of Minora',origin:'Ovesos',side:'west',banner:'Civic Government',color:'#277367',emblem:'bridge',
    room:'River Hall / Assembly and Mayor\u2019s Office',x:-2280,y:21.3,z:160,exit:{x:-2280,z:175},width:16,depth:22,
    look:{build:'broad',headgear:'bare',hairStyle:'long-curly',hair:0x705947,facialHair:'none',garment:'tunic',jerkin:false},skin:0xc39a78,tunic:0x274e47},
  temple:{id:'temple',name:'Haldor Sorn',title:'High Priest of Minora',origin:'Nesdor',side:'east',banner:'High Temple',color:'#9a414e',emblem:'sun',
    room:'Grand Temple',x:-2338,y:21.3,z:102,exit:{x:-2338,z:123},width:34,depth:42,
    look:{build:'tall-lean',headgear:'bare',hairStyle:'receding',hair:0xcbc5b5,facialHair:'none',garment:'robe',jerkin:false},skin:0xd1b29a,tunic:0xe3dbbc},
});
export const COUNCIL_ROOMS=['mayor','temple'];
export function councilRoom(id){const r=MINORA_COUNCIL[id];return COUNCIL_ROOMS.includes(id)?r:null;}
export function councilDoor(id){const r=councilRoom(id);return {x:r.x,y:r.y,z:r.z+r.depth/2-1.5};}
export function councilSpawn(id){const r=councilRoom(id);return {x:r.x,y:r.y,z:r.z+r.depth/2-6};}
// Older saves used an oversized single-floor hall. Preserve valid office
// elevations, but bring positions outside the corrected footprint to its entry.
export function councilSavedPosition(id,point){
  const r=councilRoom(id);
  return id==='mayor'&&(Math.abs(point.x-r.x)>r.width/2-.6||Math.abs(point.z-r.z)>r.depth/2-.6)?councilSpawn(id):point;
}
export function councilPerson(id){const r=councilRoom(id);return {x:r.x+(id==='mayor'?1:0),y:r.y+(id==='mayor'?MAYOR_HALL.floorRise:0),z:r.z+(id==='mayor'?-1.4:-3)};}

export const MAYOR_HALL=Object.freeze({floorRise:5.4,ceiling:10.8,
  stair:Object.freeze({x:-5.3,width:2.4,startZ:7,endZ:-5,steps:24}),
  // Three slabs surround the stair opening. Their actual mesh extents also
  // define support; downstairs never snaps up onto the office above it.
  upper:Object.freeze([
    Object.freeze({x:1.7,z:0,w:11.6,d:21}),
    Object.freeze({x:-5.8,z:-7.75,w:3.4,d:5.5}),
    Object.freeze({x:-5.8,z:8.75,w:3.4,d:3.5}),
  ])});

export function createMayorHallSupport(){
  const r=MINORA_COUNCIL.mayor,s=MAYOR_HALL.stair,y=r.y+MAYOR_HALL.floorRise;
  const surfaces=MAYOR_HALL.upper.map((p,i)=>({id:`minora-hall-office-${i}`,kind:'deck',width:p.w,
    a:{x:r.x+p.x,y,z:r.z+p.z-p.d/2},b:{x:r.x+p.x,y,z:r.z+p.z+p.d/2}}));
  surfaces.push({id:'minora-hall-stair',kind:'ramp',width:s.width,
    a:{x:r.x+s.x,y:r.y,z:r.z+s.startZ},b:{x:r.x+s.x,y,z:r.z+s.endZ}});
  return {...createWalkSurfaces(surfaces,()=>r.y),surfaces};
}

export const COUNCIL_CIVIC_TOPICS=Object.freeze({
  mayor:Object.freeze([
    Object.freeze({id:'history',label:'Why is there a mayor instead of a king?',words:'A century ago, the last King Vey ceded his crown under an accord with the Guild and the Temple. War with the Crefs had put the kingdom under great pressure. Taleth, the king’s mentor, helped guide that change. The Assembly meets downstairs; the mayor governs from this office.'}),
    Object.freeze({id:'government',label:'How does the Assembly choose its mayor?',words:'The Assembly elects the mayor. My family has held the office so often that people call it a dynasty, though the vote is still required. Our private estates and rented properties are not the city’s treasury. I want Minora to prosper; I also trust people my family has worked with for years. I know that trust can look like favoritism.'}),
    Object.freeze({id:'services',label:'How do the city and Guild support each other?',words:'The city provides the Guild with food, supplies and public funding. In return its wizards teach, advise us, maintain enchantments and help with engineering. Our granary supplies the city’s provisions, while private merchants keep the daily market working. The Temple runs its own charitable kitchens.'}),
  ]),
  temple:Object.freeze([
    Object.freeze({id:'history',label:'Who was worshipped here before the city grew?',words:'This was a shrine to Shay a thousand years ago. She is the goddess of the river and its fertility: the water that nourishes the fields and the lives along its banks. The city grew around that old sacred place. The Temple remembers a Minora older than its walls, its mayors and its royal house.'}),
    Object.freeze({id:'charity',label:'Who can eat at the temple kitchen?',words:'The homeless of Minora and civilian refugees from either league. Hunger does not become less urgent because a person came from the other bank. Our kitchen and shelter serve those who need them; allegiance is not the price of a meal.'}),
    Object.freeze({id:'government',label:'Why does the Temple sit on the council?',words:'When the last King Vey ceded his crown a century ago, the accord brought the civic government, Temple and Guild into a shared settlement. The mayor answers to the Assembly, and Taleth keeps the Guild’s counsel. We do not always agree, but no single office should mistake itself for the whole city.'}),
  ]),
});
