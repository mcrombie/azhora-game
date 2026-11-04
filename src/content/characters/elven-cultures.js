/** Living elven peoples. Night Elves are not Thalmagar's undead Dark Elves. */
export const ELVEN_CULTURES = Object.freeze({
  day: Object.freeze({id:'day',name:'Day Elves',otherName:'Wood Elves',skin:0xc9af87,eyes:0x282d23,hair:0x342e23,
    tunics:Object.freeze([0x374a40,0x46533c]),mantle:'#394b3b',avoidsSunlight:false,
    description:'The wood elves, also called Day Elves, inhabit the forests. Their woodland way of life is distinct from Sevron.'}),
  night: Object.freeze({id:'night',name:'Night Elves',home:'Sevron',skin:0xe5e0db,eyes:0xb32938,hair:0x282c36,
    tunics:Object.freeze([0x414f65,0x536374]),mantle:'#354356',avoidsSunlight:true,
    description:'Sevron’s pale-skinned, red-eyed Night Elves live underground, shun sunlight, and venture onto the surface only at night.'}),
});
