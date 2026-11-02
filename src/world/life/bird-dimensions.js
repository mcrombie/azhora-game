// Scale corrections for the regional wildlife rigs. Body and spread-wing
// dimensions are independent: a duck's folded primaries do not describe its
// full wingspan. World units are metres; zone scale still permits variation.
// Earth species use representative adults. Fictional species retain their
// authored body sizes; the bone-bird's authored span is 2.5 m.
const dimensions={
  'wading-bird':[.80,1.80], egret:[.80,1.45], stilt:[.68,.72],
  duck:[.84,.90], goose:[.95,1.60], gull:[.60,1.06],
  'turkey-vulture':[.89,1.75], harrier:[.69,1.15], 'plateau-hawk':[.93,1.30],
  'sea-plunger':[.87,1.80], albatross:[1,3.30], 'bone-bird':[1,2.50],
  crane:[1,1.80], grouse:[1,.64],
};
export function regionalBirdSize(species,wingExtent,shoulder){
  const [scale,span]=dimensions[species]??[1,null];
  return {scale,wingScale:span?(span/(2*scale)-shoulder)/wingExtent:1};
}
