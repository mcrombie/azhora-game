/** Developer destinations on the authored atlas. Normal journal mapping stays read-only. */
import { regionDesign, levelInfo, provisionalLevel, terrainCounts } from './campaign-world.js';

export const DEV_ATLAS_SIZE = Object.freeze({ width: 3062.266, height: 4088 });
export const DEV_ATLAS_PROVENANCE = Object.freeze({
  source: '../../world-builder/map/resources/examples/azhora.wwmap',
  sha256: 'b36c32babaf85213a93459c87eeabe79455268db714681f88444831a221588df',
  localityNote: 'The four playable regions are the authored Drent, Luscia, Moros Plain and East Suval hexes at 56 m per hex. Tidehaven\u2019s exact place on the Drent coast is still provisional; the local route diagram is not to world-map scale.',
  capeNote: 'Cape Thalmagar is an authored region northwest of the Oremindi. The fortress and surrounding dark wasteland are a new gameplay prototype within that region.',
  surveyNote: 'Terrain survey · gameplay not built. Terrain categories and region outlines come from World Builder; elevation and scenery are illustrative.',
});

const point = (x, y, q, r) => Object.freeze({ x, y, u: x / DEV_ATLAS_SIZE.width, v: y / DEV_ATLAS_SIZE.height, q, r });
// This authored Drent land hex faces the sea to its east. It is a provisional
// locality anchor, NOT a surveyed location for Tidehaven or a claim that a
// 700 m path crosses the whole of Drent.
const drentAnchor = point(1870.615, 2560, 14, 106);
const lusciaAnchor = point(1679.6, 2636.2, 7, 109);
const morosAnchor = point(1598.8, 2717.9, 1, 112);
const suvalAnchor = point(1825.4, 2748.9, 11, 113);
const capeAnchor = point(1025.374, 1864, -2, 77);
// The four playable regions sit on their own authored hexes now: Drent's coast,
// Luscia across the Caloss, the Moros Plain west of it and East Suval to the south.
const local = (region, name, travelTarget, insetY, regionId, atlas) => Object.freeze({
  id: `region-${region}`, name, region, regionId, scene: 'eastreena',
  travelTarget, atlas, placement: 'authored-region',
  inset: Object.freeze({ x: 50, y: insetY }), status: 'Playable local region',
});
export const DEV_WORLD_DESTINATIONS = Object.freeze([
  local(1, 'Drent', 'drent', 88, 'Drent', drentAnchor),
  local(2, 'Luscia', 'luscia', 64, 'Luscia', lusciaAnchor),
  local(3, 'Moros Plain', 'moros', 40, 'Moros Plain', morosAnchor),
  local(4, 'East Suval', 'suval', 16, 'East Suval', suvalAnchor),
  Object.freeze({ id: 'cape-thalmagar', name: 'Cape Thalmagar', regionId: 'Cape Thalmagar',
    scene: 'cape-thalmagar', travelTarget: 'cape-thalmagar', atlas: capeAnchor,
    placement: 'provisional-fortress-within-authored-region', status: 'Fortress prototype' }),
]);

const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const unescape = value => String(value).replace(/&(amp|lt|gt|quot|apos|#39);/g, (_, entity) => ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'" })[entity]);
const attribute = (attributes, name) => unescape(attributes.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`))?.[1] ?? '');

function parsePolygons(path) {
  // The exporter writes only absolute M/L/Z hexagons. Reject unexpected path
  // commands instead of silently inventing a shape or treating a bbox as land.
  if (!path || /[^MLZ\d.,+\-\s]/.test(path)) throw new Error('Unsupported authored atlas polygon.');
  const matches = [...path.matchAll(/M([^Z]+)Z/g)];
  if (!matches.length || matches.map(match => match[0]).join('') !== path.replace(/\s/g, '')) throw new Error('Malformed authored atlas polygon.');
  return matches.map(match => {
    const polygon = match[1].split('L').map(pair => pair.split(',').map(Number));
    if (polygon.length !== 6 || polygon.some(pair => pair.length !== 2 || pair.some(value => !Number.isFinite(value))))
      throw new Error('Invalid authored atlas hexagon.');
    return polygon;
  });
}

/** The existing SVG contains exact polygon paths for every painted region. */
export function createDeveloperAtlasData(metadata, svgText, surveyData = null) {
  if (!metadata || !Number.isFinite(metadata.width) || metadata.width <= 0
    || !Number.isFinite(metadata.height) || metadata.height <= 0 || !Array.isArray(metadata.regions))
    throw new Error('Developer atlas metadata is missing.');
  if (surveyData && (surveyData.version !== 1 || surveyData.sha256 !== metadata.sha256
    || surveyData.width !== metadata.width || surveyData.height !== metadata.height || !Array.isArray(surveyData.regions)))
    throw new Error('Developer survey data does not match the authored atlas. Refresh both map exports.');
  const regionGroup = String(svgText).match(/<g\b[^>]*\bid="region-tints"[^>]*>([\s\S]*?)<\/g>/)?.[1];
  if (!regionGroup) throw new Error('Authored region polygons were not found.');
  const paths = new Map();
  for (const match of regionGroup.matchAll(/<path\b([^>]*?)\/?\s*>/g)) {
    const id = attribute(match[1], 'data-region'), d = attribute(match[1], 'd');
    if (!id || paths.has(id)) throw new Error('Duplicate or unnamed atlas region.');
    paths.set(id, { d, polygons: parsePolygons(d) });
  }
  const surveys = new Map((surveyData?.regions ?? []).map(region => [region.id, region]));
  const regions = metadata.regions.map(region => {
    const shape = paths.get(region.id);
    if (!shape || !region.name || ['x', 'y', 'width', 'height', 'centerX', 'centerY'].some(key => !Number.isFinite(region[key])))
      throw new Error(`Missing authored polygon or bounds for ${region.id}.`);
    const survey = surveys.get(region.id);
    if (surveyData && (!survey || !Array.isArray(survey.cells) || !survey.cells.length
      || survey.cells.some(cell => !Number.isFinite(cell.x) || !Number.isFinite(cell.y) || !surveyData.palette?.[cell.terrain])))
      throw new Error(`Missing or invalid survey terrain for ${region.id}.`);
    return { ...region, ...shape, bounds: { x: region.x, y: region.y, width: region.width, height: region.height },
      cells: survey?.cells.map(cell => ({ ...cell })) ?? [],
      destinationIds: DEV_WORLD_DESTINATIONS.filter(destination => destination.regionId === region.id).map(destination => destination.id) };
  });
  if (paths.size !== regions.length) throw new Error('Atlas region metadata and shapes disagree.');
  return { width: metadata.width, height: metadata.height, source: metadata.source, sha256: metadata.sha256,
    hexSize: surveyData?.hexSize ?? metadata.grid?.hexSize ?? 16,
    palette: { ...(surveyData?.palette ?? {}) }, regions };
}

function contains(polygon, x, y) {
  let inside = false;
  for (let i = 0, previous = polygon.length - 1; i < polygon.length; previous = i++) {
    const [ax, ay] = polygon[previous], [bx, by] = polygon[i];
    const cross = (x - ax) * (by - ay) - (y - ay) * (bx - ax);
    if (Math.abs(cross) < 1e-7 && x >= Math.min(ax, bx) - 1e-7 && x <= Math.max(ax, bx) + 1e-7
      && y >= Math.min(ay, by) - 1e-7 && y <= Math.max(ay, by) + 1e-7) return true;
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
  }
  return inside;
}

/** Exact land hits avoid neighboring regions with overlapping bounding boxes. */
export function hitAtlasRegion(atlas, x, y) {
  if (!atlas || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  return atlas.regions.find(region => x >= region.x && x <= region.x + region.width
    && y >= region.y && y <= region.y + region.height
    && region.polygons.some(polygon => contains(polygon, x, y))) ?? null;
}

export function developerRegionSelection(atlas, regionId) {
  const region = atlas?.regions.find(candidate => candidate.id === regionId);
  if (!region) return null;
  const destinations = DEV_WORLD_DESTINATIONS.filter(destination => destination.regionId === regionId);
  const survey = { id: `survey:${region.id}`, name: region.name, scene: 'terrain-survey', travelTarget: region.id,
    regionId: region.id, status: 'Terrain survey · gameplay not built', placement: 'authored-region',
    atlas: { x: region.centerX, y: region.centerY, u: region.centerX / atlas.width, v: region.centerY / atlas.height } };
  return { region, name: region.name, destinations: destinations.length ? destinations : [survey],
    survey, canSurvey: region.cells.length > 0,
    note: regionId === 'Drent' ? DEV_ATLAS_PROVENANCE.localityNote
      : regionId === 'Cape Thalmagar' ? DEV_ATLAS_PROVENANCE.capeNote : DEV_ATLAS_PROVENANCE.surveyNote };
}

/** Host delegates click/Enter on [data-dev-region]. No teleport happens here. */
export function developerAtlasMarkup(atlas, { selectedRegionId = '' } = {}) {
  if (!atlas?.regions?.length) return '';
  const paths = atlas.regions.map(region => {
    const selected = region.id === selectedRegionId, authored = region.destinationIds.length > 0;
    // Campaign difficulty tints every region; a provisional level is one the
    // brief never stated and terrain alone suggested.
    const design = regionDesign(region.id);
    const level = design?.level ?? provisionalLevel(terrainCounts(region)), tier = levelInfo(level);
    const label = `${region.name} · ${authored ? 'open playable destinations' : 'open terrain survey; gameplay not built'} · level ${level} ${tier.name}${design && !design.provisional ? '' : ' (provisional)'}`;
    return `<path class="dev-atlas-region${selected ? ' selected' : ''}${authored ? ' built' : ''}" data-dev-region="${escape(region.id)}" data-level="${level}" d="${escape(region.d)}" tabindex="0" role="button" aria-label="${escape(label)}" aria-pressed="${selected}" fill="${selected ? '#f5d389' : tier.tint}" fill-opacity="${selected ? '.28' : '.16'}" stroke="${selected ? '#ffe4a2' : '#ffe4a2'}" stroke-opacity="${selected ? '.9' : '0'}" stroke-width="2" vector-effect="non-scaling-stroke"><title>${escape(label)}</title></path>`;
  }).join('');
  // Shared marker for the local districts; separate pins would imply map-scale
  // positions that World Builder does not contain. The host can show the inset.
  const pins = [DEV_WORLD_DESTINATIONS[0], DEV_WORLD_DESTINATIONS[4]].map(destination =>
    `<g class="dev-atlas-pin" pointer-events="none" transform="translate(${destination.atlas.x} ${destination.atlas.y})"><circle r="12" fill="#ffe4a2" stroke="#1d3430" stroke-width="3"/><circle r="4" fill="#1d3430"/></g>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${atlas.width} ${atlas.height}" class="dev-atlas-svg" role="group" aria-label="Developer atlas: select an authored Azhora region"><image href="./assets/azhora-world-map.svg" width="${atlas.width}" height="${atlas.height}" pointer-events="none"/>${paths}${pins}</svg>`;
}

/** A schematic local route, intentionally separate from the continental atlas. */
export function developerLocalRouteMarkup({ selectedId = '' } = {}) {
  const stops = DEV_WORLD_DESTINATIONS.filter(destination => destination.region);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" class="dev-local-route" role="group" aria-label="Drent local route; schematic, not to world-map scale"><path d="M45 264L45 48" fill="none" stroke="#acbca1" stroke-width="3"/>${stops.map(destination => `<g data-dev-destination="${destination.id}" role="button" tabindex="0" aria-label="Visit region ${destination.region}: ${escape(destination.name)}" aria-pressed="${selectedId === destination.id}" transform="translate(45 ${destination.inset.y * 3})"><circle r="13" fill="${selectedId === destination.id ? '#ffe4a2' : '#263d35'}" stroke="#d8ca93" stroke-width="2"/><text x="0" y="5" text-anchor="middle" fill="${selectedId === destination.id ? '#263d35' : '#ffe4a2'}" font-size="13">${destination.region}</text><text x="25" y="5" fill="#f6ecd1" font-size="14">${escape(destination.name)}</text></g>`).join('')}</svg>`;
}
