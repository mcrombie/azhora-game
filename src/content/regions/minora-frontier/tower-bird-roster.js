// Resident birds, not couriers. Lengths are representative adult body lengths
// in world metres; owls use upright height. Small songbirds stay small.
export const TOWER_BIRDS=Object.freeze([
  {floor:'helba',species:'ruby-throated-hummingbird',name:'Ruby-throated hummingbird',length:.09,form:'hummingbird',perch:'flowers',x:4,z:3,height:1.6,yaw:-.5,back:'#477957',belly:'#e1ded0',wing:'#515b52',head:'#427c56',accent:'#b64744',beak:'#2e3030'},
  {floor:'odran',species:'common-raven',name:'Common raven',length:.63,form:'raven',perch:'archive',x:5.8,z:2.8,height:1.6,yaw:-.6,back:'#28323b',belly:'#30343b',wing:'#202b35',head:'#252d35',accent:'#4a5663',beak:'#222a30'},
  {floor:'nessa',species:'snowy-owl',name:'Snowy owl',length:.57,form:'owl',perch:'moon',x:4.6,z:2.9,height:1.6,yaw:-.7,back:'#e5e3d8',belly:'#f2eee1',wing:'#d7d9d1',head:'#ecebdd',accent:'#737e85',beak:'#474b4b',eye:'#dfb94d'},
  {floor:'veyra',species:'mourning-dove',name:'Mourning dove',length:.30,form:'dove',perch:'basin',x:4.7,z:2.9,height:1.45,yaw:-.5,back:'#a29787',belly:'#ccb8a0',wing:'#a99b87',head:'#a99d8f',accent:'#4a4640',beak:'#53505a'},
  {floor:'senro',species:'barn-swallow',name:'Barn swallow',length:.18,form:'swallow',perch:'luggage',x:5.7,z:2.9,height:1.65,yaw:-.5,back:'#294d60',belly:'#e1c9a3',wing:'#2b3f50',head:'#29475a',accent:'#ae664b',beak:'#35373a'},
  {floor:'taleth',species:'barn-owl',name:'Barn owl',length:.36,form:'owl',perch:'dial',x:4.6,z:2.9,height:1.6,yaw:-.6,back:'#b59a6b',belly:'#eee2c5',wing:'#ae9168',head:'#c3ab7f',accent:'#e9ddbe',beak:'#c3af8b',eye:'#262b30'},
  {floor:'hadrin',species:'eurasian-magpie',name:'Eurasian magpie',length:.46,form:'magpie',perch:'workshop',x:5.7,z:2.9,height:1.55,yaw:-.5,back:'#23343a',belly:'#e6e3d6',wing:'#274a51',head:'#243239',accent:'#e4e1d5',beak:'#30373b'},
  {floor:'neris',species:'blue-jay',name:'Blue jay',length:.28,form:'jay',perch:'theatre',x:4.5,z:2.9,height:1.6,yaw:-.7,back:'#5b86ad',belly:'#dfe4dd',wing:'#3c6b9c',head:'#6897b6',accent:'#253b51',beak:'#313a45'},
  {floor:'oris',species:'domestic-canary',name:'Domestic canary',length:.13,form:'songbird',perch:'lyre',x:4.8,z:2.9,height:1.6,yaw:-.6,back:'#c6af43',belly:'#edcf59',wing:'#ae9b46',head:'#e4c54d',accent:'#ede3a5',beak:'#c89e79'},
  {floor:'maelon',species:'belted-kingfisher',name:'Belted kingfisher',length:.32,form:'kingfisher',perch:'water',x:5.6,z:2.8,height:1.6,yaw:-.5,back:'#536d7b',belly:'#ece8d9',wing:'#425d6c',head:'#4d6d80',accent:'#384d5a',beak:'#313f48'},
  {floor:'bolbur',species:'peregrine-falcon',name:'Peregrine falcon',length:.43,form:'falcon',perch:'branch',x:4.6,z:3.1,height:1.6,yaw:-.7,back:'#586470',belly:'#e1cdb0',wing:'#46545f',head:'#3b4751',accent:'#463e38',beak:'#c9ac55'},
].map(b=>Object.freeze(b)));

export const towerBirdFor=id=>TOWER_BIRDS.find(b=>b.floor===id);
