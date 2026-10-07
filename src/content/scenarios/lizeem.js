// A bounded test scenario, separate from the adventure's canonical faction roster.
// Links follow shared borders on the existing atlas; no movement through neutral Minora.
export const LIZEEM_SCENARIO = {
  id:'lizeem-east-west-v3', name:'The East-West War', defaultSeed:1731,
  hero:{name:'Teresod',region:'isareos',settlement:'Minora',faction:null},
  factions:[
    {id:'minora',name:'City-state of Minora',short:'Minora',color:'#d2bb83'},
    {id:'west',name:'West Lizeem League',short:'West Lizeem',color:'#789e91'},
    {id:'east',name:'East Lizeem League',short:'East Lizeem',color:'#bf7969'},
  ],
  wars:[['west','east']],
  regions:[
    {id:'isareos',position:{x:1186.287,y:2548.387},name:'Isareos',owner:'minora',garrison:60,recruits:0,neighbors:['nethereum','caricas']},
    {id:'nethereum',position:{x:1170.61,y:2652.444},name:'Nethereum',owner:'west',garrison:70,recruits:3,neighbors:['isareos','ovesos','caricas']},
    {id:'ovesos',position:{x:1323.651,y:2744.421},name:'Ovesos',owner:'west',garrison:45,recruits:2,neighbors:['nethereum','caricas','nesdor']},
    {id:'caricas',position:{x:1328.483,y:2617},name:'Caricas',owner:'east',garrison:85,recruits:4,neighbors:['isareos','nethereum','ovesos','nesdor']},
    {id:'nesdor',position:{x:1454.923,y:2736},name:'Nesdor',owner:'east',garrison:55,recruits:3,neighbors:['ovesos','caricas']},
  ],
  // Positions are atlas region centers. Crossing and terrain delays are authored
  // test assumptions, not an automatic reconstruction of roads or bridges.
  routes:[
    {regions:['isareos','nethereum'],name:'Isa crossing',terrainMultiplier:1,crossingDays:1},
    {regions:['isareos','caricas'],name:'Isareos hills',terrainMultiplier:1.25,crossingDays:0},
    {regions:['nethereum','ovesos'],name:'Western farmlands',terrainMultiplier:1,crossingDays:0},
    {regions:['nethereum','caricas'],name:'Lizeem crossing and upland approach',terrainMultiplier:1.25,crossingDays:1},
    {regions:['ovesos','caricas'],name:'River crossing to the Caricas shelf',terrainMultiplier:1.25,crossingDays:1},
    {regions:['ovesos','nesdor'],name:'Lower Lizeem crossing',terrainMultiplier:1,crossingDays:1},
    {regions:['caricas','nesdor'],name:'Eastern river plain',terrainMultiplier:1,crossingDays:0},
  ],
  rules:{garrisonCap:180,reserve:12,marchDistancePerDay:80,decisionEvery:3,defenseBonus:1.12,recoveryDays:2,armyRecoveryDays:3,maxRaisedArmies:3},
};
