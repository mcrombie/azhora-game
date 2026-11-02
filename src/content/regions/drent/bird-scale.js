// Adult-sized models in metres. Representative sizes, not a claim that every
// individual is identical. Reference: Cornell's All About Birds species guides.
// Upright owl/heron measurements use standing model height, not body length.
// Each row: model body scale, extended wingspan, original rig wingspan/shoulder.
const sizes={
  'cardinal-male':[.54,.28,.456,.05], 'cardinal-female':[.54,.28,.456,.05],
  wren:[.52,.29,.32,.042], titmouse:[.51,.24,.326,.043],
  crow:[.69,.93,.83,.085], hummingbird:[.365,.10,.218,.017],
  robin:[.50,.37,.504,.0525], chickadee:[.40,.18,.328,.036],
  mockingbird:[.395,.34,.502,.055], 'mourning-dove':[.43,.45,.511,.056],
  'blue-jay':[.51,.40,.57,.0625], goldfinch:[.36,.21,.356,.039],
  catbird:[.41,.25,.456,.05], 'downy-woodpecker':[.51,.29,.365,.04],
  'red-bellied-woodpecker':[.53,.42,.479,.0525], 'pileated-woodpecker':[.61,.72,.707,.0775],
  nuthatch:[.51,.25,.356,.039], 'wood-thrush':[.47,.33,.433,.046],
  bluebird:[.44,.30,.410,.045], 'red-winged-blackbird':[.49,.35,.456,.05],
  kingfisher:[.66,.54,.502,.055], 'barred-owl':[1.15,1.05,.746,.088],
  heron:[1.25,1.80,.904,.082], 'mallard-drake':[1.29,.90,.646,.068],
  'mallard-duck':[1.29,.90,.646,.068], gull:[1.04,1.06,.79,.07],
  'turkey-vulture':[1.12,1.75,1.306,.115],
};
export function birdScale(species){
  const [scale,span,rawSpan,shoulder]=sizes[species];
  return {scale,flightWingScale:(span/scale-2*shoulder)/(rawSpan-2*shoulder)};
}
