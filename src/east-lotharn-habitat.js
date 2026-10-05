/** Local soil and shelter for the Lotharn's supplementary woods. Pure numeric
 * sampling: callers supply the ground currently used by the regional builder.
 * Heights alone do not make a tree line in this warm, wet mountain range. */
const clamp = value => Math.max(0, Math.min(1, value));
const smooth = (a, b, value) => { const t = clamp((value - a) / (b - a)); return t * t * (3 - 2 * t); };

export function lotharnWoodlandHabitat(x, z, heightAt) {
  const height = heightAt(x, z), step = 2;
  const east = heightAt(x + step, z), west = heightAt(x - step, z);
  const north = heightAt(x, z - step), south = heightAt(x, z + step);
  const slope = Math.hypot(east - west, south - north) / (step * 2);
  // The footprint check also catches a narrow shelf between two sheer faces.
  const ledge = Math.max(...[east, west, north, south].map(y => Math.abs(y - height))) / step;
  const around = [heightAt(x + 18, z), heightAt(x - 18, z), heightAt(x, z - 18), heightAt(x, z + 18)];
  if (![height, slope, ledge, ...around].every(Number.isFinite)) return { height, slope, shelter: 0, soil: 0, density: 0 };
  const hollow = around.reduce((sum, y) => sum + y - height, 0) / 4;
  const shelter = clamp(.32 + hollow / 18 + (Math.max(around[1], around[2]) - height) / 40);
  const soil = 1 - smooth(.4, 1.1, Math.max(slope, ledge));
  // Coherent pockets of deeper soil, not independent tree-by-tree noise.
  const pocket = .5 + .28 * Math.sin(x / 43 + Math.sin(z / 71)) + .22 * Math.sin(z / 31 - x / 97);
  const shoulder = 235 + shelter * 105 + pocket * 32;
  const density = soil * (.42 + .58 * shelter) * (.65 + .35 * pocket)
    * (1 - smooth(shoulder - 70, shoulder + 20, height));
  return { height, slope, shelter, soil, density };
}

/** The canopy transition follows rooted soil and relative exposure. There is no
 * climatic height limit here: sheltered high ground in these wet mountains can
 * carry the same woodland as a lower hollow. The older habitat function remains
 * above for compatibility with the first supplementary planting. */
export function lotharnCanopyHabitat(x, z, heightAt) {
  const height = heightAt(x, z), step = 1.2;
  const near = [[step, 0], [-step, 0], [0, -step], [0, step]].map(([dx, dz]) => heightAt(x + dx, z + dz));
  const around = [[24, 0], [-24, 0], [0, -24], [0, 24]].map(([dx, dz]) => heightAt(x + dx, z + dz));
  if (![height, ...near, ...around].every(Number.isFinite)) return { height, slope: Infinity, shelter: 0, soil: 0, grove: 0, density: 0, stature: 0 };
  const slope = Math.hypot(near[0] - near[1], near[3] - near[2]) / (step * 2);
  const footing = Math.max(...near.map(y => Math.abs(y - height))) / step;
  const mean = around.reduce((sum, y) => sum + y, 0) / around.length;
  const shelter = clamp(.42 + (mean - height) / 32 + (Math.max(around[1], around[2]) - height) / 90);
  const exposure = smooth(7, 20, height - mean);
  // Trees can hold a soil-covered shoulder, but not a sheer rock riser or a
  // narrow ledge whose root footprint straddles a large height discontinuity.
  const soil = (1 - smooth(.65, 1.65, slope)) * (1 - smooth(.9, 2, footing));
  const pocket = .5 + .26 * Math.sin(x / 39 + Math.sin(z / 67)) + .24 * Math.sin(z / 29 - x / 83);
  const grove = smooth(.2, .8, pocket);
  const density = soil * grove * (.22 + shelter * .78) * (1 - exposure);
  const stature = clamp(.2 + .45 * soil + .35 * shelter);
  return { height, slope, shelter, exposure, soil, grove, density, stature };
}

/** Trees established by review revision 13448f7. Keep these saved identities,
 * species and proportions when the soil below them is shaped further. Only the
 * root height is sampled anew. Rows: x, z, kind, height, trunk scale, rotation. */
export const LOTHARN_SHELTER_TREES = Object.freeze([
  [-1198.9437059814816,-1084.8506576193417,"oak",10.10922611909498,0.7301750680431723,0.7781194845680147],
  [-1171.4560239658465,-1046.1965921533215,"chestnut",13.245516383945942,0.9443121458403767,2.6530196297727526],
  [-1166.7865913443973,-1060.635583880629,"beech",8.517776593510062,0.7606890729628503,2.7255306381173434],
  [-1171.592042161036,-1052.6790287157442,"beech",12.695390054527671,0.9881101591512562,4.03628840864636],
  [-1172.890056328732,-996.8935207583081,"oak",11.620320665461538,0.9158255184069276,4.167619640352204],
  [-1191.6157736991304,-1025.0583177817125,"hickory",12.809519525185971,0.869097510073334,5.139897484444082],
  [-1171.478411889519,-976.9889144388098,"hickory",12.049935092060043,1.0259035007096828,3.4374517877027393],
  [-1183.000427376363,-957.4131066890504,"oak",13.822787288916754,0.9098620168864727,4.208936778260395],
  [-1198.75877181429,-1023.847222804844,"oak",12.5882732569929,0.735417340323329,5.382413389226422],
  [-1196.8897159061166,-1034.9216932969239,"chestnut",11.071371153244543,0.9117509074509145,5.866335181696341],
  [-1186.477393339272,-953.7302356542159,"hickory",11.143360139482027,0.7657030251808464,0.35193649999797344],
  [-1184.848735606182,-1020.4052195724171,"maple",11.114563259822004,0.7659662058576941,1.4637497396115213],
  [-1173.3488121152627,-1008.8356762233261,"hickory",14.026915801852565,1.0780535358004273,0.8808547049574554],
  [-1150.4875873996648,-1031.5561832932826,"oak",10.75299303152191,0.8451726984232664,1.2602417735662312],
  [-1175.9405814193892,-968.7087605505321,"maple",12.489957959177106,0.8029786176048219,2.792964928913862],
  [-996.356458318304,-1011.4532495441917,"beech",9.21455719217496,0.9065870779566467,3.9306987303309144],
  [-1211.1434745219306,-934.1375392920557,"chestnut",9.847512194522828,0.7836601440794766,1.5032919546961785],
  [-1201.2685267337367,-937.0249959056486,"oak",9.85453223149809,0.8182586564682424,2.897984348181635],
  [-1234.2116807902933,-941.0218242163058,"oak",13.574306255076081,0.9870845085009934,3.704254937404767],
  [-1221.7421122443632,-931.2361619382385,"beech",10.889548843914676,1.0792069626040757,5.7125350896269085],
  [-1184.5792069880997,-948.4824436743032,"maple",12.48486776753139,0.9792935196310282,5.340999113088474],
  [-1167.056847558241,-942.4062602867592,"oak",15.20485694580443,0.7191396622918546,2.2106155536510053],
  [-1163.8558166882729,-947.07018966677,"chestnut",11.969169562264101,0.7741224028170108,4.50552593450062],
  [-903.9145610377894,-782.3074021063182,"chestnut",11.943562236130237,0.7775061304681002,2.9240402797423304],
  [-915.35206912912,-803.0049251265261,"tulip-poplar",14.271353016209575,0.9026145706884563,4.909427552130073],
  [-909.6893731587337,-804.1334029178504,"maple",10.352689103210064,0.9146054587326944,3.856300368029624],
  [-1333.8760124602127,-735.5238178180118,"oak",10.378798357173801,0.8814715980552137,1.6670266861654819],
  [-1354.9893562531802,-722.5015855346394,"maple",9.997077043414365,0.7626663267612457,2.5430773914139717],
  [-1285.3958123679042,-729.7569575643686,"maple",10.65615274658783,0.9505273809656501,6.016695894086734],
  [-1292.765720802243,-726.1507589745854,"oak",11.808275004066527,0.7354402651078998,1.59678288474679],
  [-1269.389689652133,-739.545602843031,"chestnut",11.731712844557801,0.8246918110176921,5.199234185079113],
].map(Object.freeze));

/** Match the six bottom vertices of the rendered trunk, burying its highest
 * exposed root by three centimetres even on a sloping terrain triangle. */
export function lotharnTreeFoot(tree, surfaceAt) {
  let lowest = Infinity;
  for (let i = 0; i < 6; i++) {
    const angle = tree.rot + i / 6 * Math.PI * 2;
    lowest = Math.min(lowest, surfaceAt(tree.x + Math.sin(angle) * .36 * tree.s, tree.z + Math.cos(angle) * .36 * tree.s));
  }
  return lowest - .03;
}

/** Rows for a narrow crest-aligned terrain ribbon. Outside turns use circular
 * joins; inside turns meet at the offset lines' intersection. A regular world
 * grid can miss a narrow ridge's apex even when its samples are half a metre apart. */
export function lotharnCrestRows(line, step = .4) {
  const segments = line.slice(1).map((b, i) => {
    const a = line[i], dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
    return { a, b, dx: dx / length, dz: dz / length, nx: -dz / length, nz: dx / length, length };
  });
  const join = (a, b) => {
    const cross = a.dx * b.dz - a.dz * b.dx, dot = a.dx * b.dx + a.dz * b.dz;
    return cross > 1e-6 && dot > -.95 ? { nx: (a.nx + b.nx) / (1 + dot), nz: (a.nz + b.nz) / (1 + dot) } : null;
  };
  const rows = [];
  const add = row => {
    const last = rows.at(-1);
    if (!last || Math.hypot(last.x - row.x, last.z - row.z, last.nx - row.nx, last.nz - row.nz) > 1e-8) rows.push(row);
  };
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i], next = segments[i + 1];
    const from = i ? join(segments[i - 1], s) ?? s : s, to = next ? join(s, next) ?? s : s;
    const count = Math.max(1, Math.ceil(s.length / step));
    for (let j = 0; j <= count; j++) {
      const t = j / count;
      add({ x: s.a.x + (s.b.x - s.a.x) * t, z: s.a.z + (s.b.z - s.a.z) * t,
        nx: from.nx + (to.nx - from.nx) * t, nz: from.nz + (to.nz - from.nz) * t });
    }
    if (next && !join(s, next)) {
      const start = Math.atan2(s.nz, s.nx), turn = Math.atan2(s.nx * next.nz - s.nz * next.nx, s.nx * next.nx + s.nz * next.nz);
      const count = Math.max(1, Math.ceil(Math.abs(turn) / .1));
      for (let j = 1; j <= count; j++) {
        const angle = start + turn * j / count;
        add({ x: s.b.x, z: s.b.z, nx: Math.cos(angle), nz: Math.sin(angle) });
      }
    }
  }
  return rows;
}
