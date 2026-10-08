// Scenario characters: new authored inventions, not imported manuscript people.
export const MINORA_COUNCIL=Object.freeze({
  taleth:{id:'taleth',name:'Taleth',title:'Wizard Guild Master',banner:'Wizard Guild',color:'#304e82',emblem:'star'},
  mayor:{id:'mayor',name:'Ishkur Vey',title:'Mayor of Minora',origin:'Ovesos',side:'west',banner:'Civic Government',color:'#277367',emblem:'bridge',
    room:'Mayor\u2019s Hall',x:-2280,y:21.3,z:160,exit:{x:-2280,z:175},width:30,depth:34,
    look:{build:'broad',headgear:'bare',hairStyle:'long-curly',hair:0x705947,facialHair:'none',garment:'tunic',jerkin:false},skin:0xc39a78,tunic:0x274e47},
  temple:{id:'temple',name:'Haldor Sorn',title:'High Priest of Minora',origin:'Nesdor',side:'east',banner:'High Temple',color:'#9a414e',emblem:'sun',
    room:'Grand Temple',x:-2338,y:21.3,z:102,exit:{x:-2338,z:123},width:34,depth:42,
    look:{build:'tall-lean',headgear:'bare',hairStyle:'receding',hair:0xcbc5b5,facialHair:'none',garment:'robe',jerkin:false},skin:0xd1b29a,tunic:0xe3dbbc},
});
export const COUNCIL_ROOMS=['mayor','temple'];
export function councilRoom(id){const r=MINORA_COUNCIL[id];return COUNCIL_ROOMS.includes(id)?r:null;}
export function councilDoor(id){const r=councilRoom(id);return {x:r.x,z:r.z+r.depth/2-1.5};}
export function councilSpawn(id){const r=councilRoom(id);return {x:r.x,y:r.y,z:r.z+r.depth/2-6};}
export function councilPerson(id){const r=councilRoom(id);return {x:r.x,y:r.y,z:r.z-3};}
