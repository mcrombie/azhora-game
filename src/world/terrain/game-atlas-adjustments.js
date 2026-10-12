import { URUBOND_HEXES } from '../../content/regions/urubond/urubond-atlas.js';
import {ORSA_RIVER_EDGES,ORSA_RETIRED_RIVER_KEYS,ORSA_HEADWATER_HILLS,riverEdgeKey} from '../../content/regions/outer-regions/orsa-river.js';
/** Game geography corrections, applied to read-only World Builder imports.
 * Keep the journal, developer atlas and built river survey on the same source.
 * The upstream map and its provenance hash remain unchanged. */
export const GAME_ATLAS_ADJUSTMENTS = Object.freeze(['tidehaven-northeast-bank-v1', 'drent-forested-peninsula-v1', 'northern-region-names-v1', 'mithala-city-quarters-v1', 'urubond-island-v1', 'noth-gorgiwood-orsa-v1', 'orsa-independent-headwaters-v2']);
export const GAME_REGION_RENAMES=Object.freeze({"West Gorgi Mountains": "Gorgiwood", "East Gorgi Mountains": "South Gorgi Mountains", "West Inseld": "West Ithzel", "East Inseld": "East Ithzel"});

/** The user-drawn headland east of Tidehaven, bending southeast toward Longstone. */
export const DRENT_PENINSULA_HEXES = Object.freeze([
  Object.freeze({ q: 16, r: 105 }), Object.freeze({ q: 16, r: 106 }),
]);

/**
 * The user's trade of 4 October 2026 (docs/mithala-city-brief.md): two North Mithala hexes go to
 * East Mithala and two East Mithala hexes go to North Mithala, so that all four Mithalas meet round
 * the city at the meeting of the arms - North 6,88, West 5,89, East 6,89 and South 5,90.
 */
export const MITHALA_CITY_TRADES = Object.freeze([
  Object.freeze({ q: 9, r: 86, from: 'North Mithala', to: 'East Mithala' }),
  Object.freeze({ q: 10, r: 86, from: 'North Mithala', to: 'East Mithala' }),
  Object.freeze({ q: 5, r: 88, from: 'East Mithala', to: 'North Mithala' }),
  Object.freeze({ q: 6, r: 88, from: 'East Mithala', to: 'North Mithala' }),
]);

/**
 * A region's cells as they were before `mithala-city-quarters-v1`, in the survey's own order (by row, then column):
 * for anything whose reviewed composition walked the old lists (the Mithala plain's sapling pass, which draws from one
 * seeded stream across East and then North Mithala). `cellsOf(name)` gives today's list for a region.
 */
export function cellsBeforeMithalaTrade(name, cellsOf) {
  const now = cellsOf(name) ?? [], gone = MITHALA_CITY_TRADES.filter(t => t.to === name), back = MITHALA_CITY_TRADES.filter(t => t.from === name);
  const kept = now.filter(c => !gone.some(t => t.q === c.q && t.r === c.r));
  const returned = back.map(t => (cellsOf(t.to) ?? []).find(c => c.q === t.q && c.r === t.r)).filter(Boolean);
  return [...kept, ...returned].sort((a, b) => a.r - b.r || a.q - b.q);
}

export function applyGameAtlasAdjustments(source) {
  const bank = source?.hexes?.['15,105'];
  if (!bank || !['Pueth', 'Drent'].includes(bank.region))
    throw new Error('The Tidehaven northeast bank no longer matches its game atlas correction.');
  const hexes = { ...source.hexes, '15,105': { ...bank, region: 'Drent' } };
  for (const { q, r } of DRENT_PENINSULA_HEXES) {
    const key = `${q},${r}`, prior = source.hexes[key];
    if (prior?.region && prior.region !== 'Drent')
      throw new Error('The Drent peninsula overlaps another authored region.');
    hexes[key] = { ...prior, q, r, terrain: 'forest', region: 'Drent', climate: prior?.climate ?? 'Cfb' };
  }
  // A map without these hexes (a test fixture) is left alone; one that gives them to anybody else
  // has been redrawn, and the trade has to be looked at again rather than applied over it.
  for (const { q, r, from, to } of MITHALA_CITY_TRADES) {
    const key = `${q},${r}`, prior = source.hexes[key];
    if (!prior) continue;
    if (![from, to].includes(prior.region))
      throw new Error('The Mithala city quarters no longer match their game atlas correction.');
    hexes[key] = { ...prior, region: to };
  }
  const rivers = { ...source.rivers };
  // Remove the obsolete southward reach through Tidehaven. The Tessen follows
  // the north bank of its new Drent hex, then meets the sea along the coast.
  // This isolated Drent-side spur was drawn in the atlas but never built.
  delete rivers['14,104|14,105'];
  delete rivers['14,105|15,105'];
  delete rivers['14,106|15,105'];
  rivers['15,104|15,105'] = 'small';
  rivers['15,105|16,104'] = 'small';
  rivers['16,104|16,105'] = 'small';
  const regions={...source.regions};
  for(const [oldName,newName] of Object.entries(GAME_REGION_RENAMES)){
    const previous=regions[oldName];if(!previous)continue;
    regions[newName]={...previous,name:newName};delete regions[oldName];
    for(const [key,cell] of Object.entries(hexes))if(cell.region===oldName)hexes[key]={...cell,region:newName,terrain:newName==='Gorgiwood'?'deep_forest':cell.terrain};
  }
  // Simultaneous relocation: a sequential rename would accidentally turn both
  // footprints into New Gorgiwood. South Thoth's absence makes this idempotent.
  if(regions['South Thoth']){
    if(!regions['Noth Hills']||regions['New Gorgiwood'])throw new Error('The Noth Hills relocation needs its two original footprints.');
    const oldHills=regions['Noth Hills'],oldThoth=regions['South Thoth'];
    regions['New Gorgiwood']={...oldHills,name:'New Gorgiwood',color:'#37664b'};
    regions['Noth Hills']={...oldThoth,name:'Noth Hills',color:'#a8a06a'};
    delete regions['South Thoth'];
    for(const [key,cell] of Object.entries(hexes)){
      if(cell.region==='Noth Hills')hexes[key]={...cell,region:'New Gorgiwood',terrain:'deep_forest'};
      else if(cell.region==='South Thoth')hexes[key]={...cell,region:'Noth Hills',terrain:'hills'};
    }
  }
  for(const key of ORSA_RETIRED_RIVER_KEYS)delete rivers[key];
  for(const {q,r,region} of ORSA_HEADWATER_HILLS){
    const key=`${q},${r}`,cell=hexes[key];if(!cell)continue;
    if(cell.region!==region)throw new Error('The Orsa headwater hills no longer lie inside Orsa.');
    hexes[key]={...cell,terrain:'hills'};
  }
  for(const edge of ORSA_RIVER_EDGES){
    const a=hexes[edge.a.join(',')],b=hexes[edge.b.join(',')];
    if(!a&&!b)continue; // Small geography fixtures need not contain Orsa.
    if(a?.region!=='North Orsa'||b?.region!=='South Orsa')throw new Error('The Orsa stream no longer follows the shared regional border.');
    rivers[riverEdgeKey(edge)]='small';
  }
  regions.Urubond={name:'Urubond',color:'#463b43'};
  for(const cell of URUBOND_HEXES){const key=`${cell.q},${cell.r}`,prior=hexes[key];
    if(prior?.region&&prior.region!=='Urubond')throw new Error('Urubond overlaps an authored region');
    hexes[key]={...prior,...cell,region:'Urubond',climate:'Cfc'};
  }
  return { ...source, hexes, rivers, regions };
}
