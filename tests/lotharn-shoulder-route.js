import assert from 'node:assert/strict';
import { canStand } from '../src/gameplay/movement/game-state.js';
import { canWalkSlope, sampleClimbSurface } from '../src/gameplay/movement/climbing.js';
import { RAMPS, PEAKS, pointOn } from '../src/content/regions/east-lotharn/east-lotharn-world.js';
export function walkingLane(world, way) {
  const steps = Math.ceil(way.line.length / .75), offsets = [-1.4, -1.2, -.9, -.6, -.3, 0, .3, .6, .9, 1.2, 1.4];
  const stages = [];
  for (let i = 0; i <= steps; i++) {
    const along = way.line.length * i / steps, sample = pointOn(way.line, along);
    const fade = Math.min(1, along / 4, (way.line.length - along) / 4);
    const candidates = offsets.map(offset => {
      const p = { x: sample.x + sample.nx * offset * fade, z: sample.z + sample.nz * offset * fade, way: way.id, station: along, climb: true };
      const cost = canStand(p.x, p.z, world)
        ? 100 * Math.max(0, sampleClimbSurface(world, p.x, p.z).slope - .87) ** 2 + Math.abs(offset) * .0001 : Infinity;
      return { p, cost, score: Infinity, previous: -1 };
    });
    if (!i) candidates.forEach(node => { node.score = node.cost; });
    else for (let j = 0; j < candidates.length; j++) {
      const node = candidates[j];
      for (let k = Math.max(0, j - 2); k <= Math.min(offsets.length - 1, j + 2); k++) {
        const prior = stages[i - 1][k];
        const movement = Math.abs(offsets[j] - offsets[k]) * .01;
        const slopeCost = canWalkSlope(prior.p.x, prior.p.z, node.p.x, node.p.z, world) ? 0 : 2;
        const score = prior.score + node.cost + movement + slopeCost;
        if (score < node.score) { node.score = score; node.previous = k; }
      }
    }
    stages.push(candidates);
  }
  const last = stages.at(-1); let picked = last.reduce((best, n, i) => n.score < last[best].score ? i : best, 0);
  assert.ok(Number.isFinite(last[picked].score), `${way.id}: no clear lane within the authored trail`);
  const out = [];
  for (let i = stages.length - 1; i >= 0; i--) { const node = stages[i][picked]; out.push(node.p); picked = node.previous; }
  return out.reverse();
}


export function centralShoulderRoute(world, band=1){
 const peak=PEAKS.find(p=>p.id==='central-peak');
 const ways=RAMPS.filter(w=>w.peak===peak.id&&w.band>=band-1),lanes=ways.map(w=>walkingLane(world,w));
 const side=(w,s,offset)=>{const p=pointOn(w.line,s);return{x:p.x+p.nx*offset,z:p.z+p.nz*offset,way:'existing resting ledge beside ramp5',climb:true};};
 const ascent=ways.flatMap((w,i)=>w.id!=='central-peak-ramp-5'?lanes[i]:[
   ...lanes[i].filter(p=>p.station<=36),...[36,40,44,48,52,55].map(s=>side(w,s,-5)),lanes[i].at(-1)]);
 // Return by the existing lower ledge after the controlled cross-slope descent.
 // Reversing the entire long fifth-ramp climb without that rest exhausts a novice.
 // One 2 m outward sidestep on the lower ledge passes the retained trunk at
 // (-1217.246,-1056.922); its collider stays active throughout the return.
 const orderedDescent=[];for(let i=ways.length-1;i>=0;i--){const w=ways[i];orderedDescent.push(...(w.id!=='central-peak-ramp-5'?[...lanes[i]].reverse():[
   lanes[i].at(-1),...[55,52,48,44,40,36,32,28].map(s=>side(w,s,-5)),side(w,28,5),
   ...[24,20,16,12,8,4].map(s=>side(w,s,s===20?7:5)),lanes[i][0]]));}
 // The final authored ramp is the summit arrival. A straight chord from that
 // arrival to the named peak centre crosses an unrelated cliff; do not invent it.
 return {name:`central authored ascent from band ${band} and resting-ledge return`,points:[...ascent,...orderedDescent.slice(1)]};
}
