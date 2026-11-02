import { REGION_IDS } from '../../../world/terrain/region-world.js';
import { fortCircuit } from '../../../world/scenery/fortification.js';

// One town on the dry west bank of the gold estuary. The river, ford and
// waterfall remain outside its walls; the four gates meet the existing trails.
const point = (x, z) => Object.freeze({ x, z });
export const ALEZHOR_TOWN = Object.freeze({
  id: 'alezhor-town', name: 'Alezhor Town', region: REGION_IDS.Alezhor,
  x: -4040, z: 895, radius: 85,
  description: 'A walled port at the gold estuary: pale masonry, timber galleries, tiled courtyards and steep green roofs above the working quays.',
});
export const ALEZHOR_TOWN_OUTLINE = Object.freeze([
  [-4100,878],[-4084,858],[-4003,858],[-3977,879],
  [-3977,913],[-3990,918],[-4088,918],[-4100,907],
].map(p => point(...p)));
export const ALEZHOR_TOWN_CIRCUIT = fortCircuit({
  id: 'alezhor-town', kind: 'alezhor-wall', corners: ALEZHOR_TOWN_OUTLINE,
  gates: [
    { id: 'alezhor-west-gate', edge: 7, at: 14 },
    { id: 'alezhor-forest-gate', edge: 1, at: 44 },
    { id: 'alezhor-ford-gate', edge: 3, at: 23 },
    { id: 'alezhor-sea-gate', edge: 5, at: 50 },
  ],
  ditchEdges: [],
  standard: { wallHeight: 7.6, walkHeight: 6.1, wallThickness: 2.5,
    towerSize: 4.7, towerPlatform: 10.4, towerProjection: .5, gateWidth: 6.8 },
});
export const ALEZHOR_TOWN_LANES = Object.freeze([
  [[-4130,893],[-4100,893],[-4085,895],[-4040,895],[-4015,897],[-3977,902],[-3972,903]],
  [[-4040,844],[-4040,858],[-4040,865]],
  [[-4040,888],[-4040,895],[-4040,918],[-4040,927]],
  [[-4090,880],[-4090,895],[-4090,910]],
  [[-3990,879],[-3990,898],[-3990,908]],
].map(p => Object.freeze(p.map(v => point(...v)))));
export const ALEZHOR_TOWN_MARKET = Object.freeze({ x: -4043, z: 895, w: 34, d: 16 });
export const ALEZHOR_TOWN_HALL = Object.freeze({ id: 'alezhor-guildhall', x: -4037, z: 874, w: 23, d: 15, h: 8.4, yaw: 0, kind: 'hall' });
export const ALEZHOR_TOWN_BUILDINGS = Object.freeze((() => {
  const out = [ALEZHOR_TOWN_HALL];
  const house = (x,z,w,d,h,kind='house',yaw=0) => out.push(Object.freeze({ id:'alezhor-building-'+out.length, x,z,w,d,h,kind,yaw,variant:out.length }));
  // Short irregular terraces, generous cross streets, and a central open court.
  for (const [i,x] of [-4082,-4070,-4058,-4016,-4004,-3992].entries())
    house(x,870+(i%2)*1.2,8.2+(i%3)*.5,7.8,5.4+(i%3)*1.7,i===1?'log-house':'house');
  for (const [i,x] of [-4081,-4069,-4057,-4015,-4003].entries())
    house(x,882+(i%2)*.7,8.3,7.1,5.2+(i%3)*1.5,i===3?'log-house':'house');
  for (const [i,x] of [-4081,-4069,-4057,-4026,-4014,-4002].entries())
    house(x,908-(i%2)*.8,8.4+(i%2)*1.1,7.3,5.1+(i%3)*1.4,i%3===1?'log-house':'house');
  // The eastern bath court has three separate wings and a walk-in garden.
  house(-3986,882,7.3,9.3,4.5,'bath');
  house(-3995,878,9.8,4.6,4.1,'bath');
  house(-3995,886,9.8,4.6,4.1,'bath');
  // Small workshops and tall lofts give the town a mixed, accumulated skyline.
  for (const [x,z,w,d,h] of [[-4083,902,5.5,3.7,3.3],[-4070,901,5,3.7,3.1],[-4058,901,5.2,3.5,3.2],[-4025,903,5,3.4,3.1],[-4013,902,5,3.3,3.2],[-4001,903,5,3.4,3.4]])
    house(x,z,w,d,h,'workshop');
  house(-4075,923,15,5,5.3,'warehouse');
  house(-4005,923,15,5,5.9,'warehouse');
  return out;
})());
export const ALEZHOR_TOWN_DECKS = Object.freeze([
  { id:'alezhor-quay-ramp', x:-4040, z:926, w:7, d:16, y0:3.06, y1:3.2 },
  { id:'alezhor-quay', x:-4040, z:937, w:78, d:6, y0:3.2, y1:3.2 },
  { id:'alezhor-west-pier', x:-4073, z:949, w:4, d:24, y0:3.2, y1:3.2 },
  { id:'alezhor-east-pier', x:-4007, z:950, w:4, d:26, y0:3.2, y1:3.2 },
].map(Object.freeze));
export const ALEZHOR_TOWN_BOATS = Object.freeze([
  { x:-4065,z:951,length:14,beam:4.2,yaw:0,kind:'merchant' },
  { x:-4015,z:958,length:11,beam:3.5,yaw:0,kind:'merchant' },
  { x:-4080,z:952,length:6,beam:1.8,yaw:.15,kind:'fishing' },
  { x:-3999,z:962,length:6,beam:1.7,yaw:-.15,kind:'fishing' },
]);
export function alezhorTownReserved(x,z,margin=0) {
  if (x>-4110-margin&&x<-3970+margin&&z>848-margin&&z<930+margin) return true;
  return ALEZHOR_TOWN_DECKS.some(d=>Math.abs(x-d.x)<d.w/2+margin+2&&Math.abs(z-d.z)<d.d/2+margin+2);
}
export function alezhorTownDeckHeight(x,z) {
  for (const d of ALEZHOR_TOWN_DECKS) if (Math.abs(x-d.x)<=d.w/2&&Math.abs(z-d.z)<=d.d/2)
    return d.y0+(d.y1-d.y0)*(z-d.z+d.d/2)/d.d;
  return null;
}
