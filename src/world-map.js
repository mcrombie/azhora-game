// A read-only parchment chart exported from World Builder's authored Azhora hex map.
// The player's chart has no shortcut to Cape Thalmagar; the cape stays uncharted until the story reveals it.
// The chart is covered by fog: only the hexes the traveler has charted (src/map-fog.js) show through,
// unless the developer's override lifts the fog and tints each region by how far it is built.
import { hexAtlasCorners } from './region-world.js';
import { PLAYABLE_SURVEY } from './region-survey.js';
import { atlasLocalDetail, atlasMarkKnown, atlasRegionLabelKnown, atlasExplorationScope, splitAtlasRegionLabels, GLIMPSED_TERRAIN } from './world-map-detail.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const polygonPoints = (q, r) => hexAtlasCorners(q, r).map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');

export const MAX_ZOOM = 128;
export const DETAIL_ZOOM = 12;
/** How much of the chart a first look shows around the traveler, in atlas pixels: the nearby road and a few surrounding hexes. */
export const LOCAL_VIEW = 100;

export function createWorldMap() {
  const $ = id => document.getElementById(id);
  const viewport = $('atlas-viewport'), image = $('atlas-image'), traveler = $('atlas-traveler');
  const travelerArrow = traveler?.querySelector('b') ?? null;
  /** Which way the traveler is facing on the chart, in radians clockwise from the top of it. */
  let travelerHeading = null;
  let metadata, zoom = 1, fitScale = 1, offsetX = 0, offsetY = 0, width = 0, height = 0, dragging = null, travelerPoint = null;
  // The chart opens on the traveler, close enough to read; once the traveler has chosen a zoom it keeps it.
  let opened = false;
  let chart = { cells: [], glimpsed: [], reveal: false, status: [], silhouettes: [], labels: [] };
  let visited = new Set(), terrainCells = new Map(), terrainSource = null;
  let localDetail = atlasLocalDetail(null);
  let authoredLabels = null;
  const detail = document.createElementNS(SVG_NS, 'svg');
  detail.id = 'atlas-local-detail'; detail.setAttribute('aria-hidden', 'true');
  viewport.insertBefore(detail, traveler ?? null);
  for (const region of PLAYABLE_SURVEY.regions) for (const cell of region.cells) terrainCells.set(`${cell.q},${cell.r}`, cell.terrain);
  const overlay = document.createElementNS(SVG_NS, 'svg');
  overlay.id = 'atlas-overlay'; overlay.setAttribute('aria-hidden', 'true');
  viewport.insertBefore(overlay, traveler ?? null);
  // Charted places are marked in screen space, like the traveler's own mark, so
  // their labels stay the same size however far the chart is zoomed.
  const placeLayer = document.createElement('div');
  placeLayer.id = 'atlas-places'; placeLayer.setAttribute('aria-hidden', 'true');
  viewport.insertBefore(placeLayer, traveler ?? null);
  let places = [], renderedPlaces = [];
  // Areas are named as soon as the chart is more than glanced at; the smaller places
  // inside them wait until the traveler has zoomed in far enough to read them.
  const placeShown = place => atlasMarkKnown(place, visited, chart.reveal)
    && (['quest', 'tracked', 'area'].includes(place.kind) || zoom >= (place.kind === 'local' ? DETAIL_ZOOM : 3.5));
  const placeNamed = place => ['quest', 'tracked'].includes(place.kind) ? zoom >= 3.5 : place.kind === 'area' ? zoom >= 1.8 : zoom >= 5.5;
  function drawPlaces() {
    placeLayer.replaceChildren();
    renderedPlaces = [...new Map([...places, ...localDetail.markers].map(place => [place.id, { ...place }])).values()];
    for (const place of renderedPlaces) {
      const mark = document.createElement('div');
      mark.className = `atlas-place ${place.kind}`;
      if (place.colour) mark.style.setProperty('--quest-colour', place.colour);
      const dot = document.createElement('i'), label = document.createElement('span');
      label.textContent = place.name; mark.append(dot, label);
      place.mark = mark; place.label = label; placeLayer.append(mark);
    }
    positionPlaces();
  }
  // Place important labels first, reserve space for the player, and keep all
  // text in screen pixels. Repeated town names yield to their area label.
  function positionPlaces() {
    const scale = fitScale * zoom, taken = [], namedPlaces = [];
    const tx = travelerPoint ? offsetX + travelerPoint.x * scale : null;
    const ty = travelerPoint ? offsetY + travelerPoint.y * scale : null;
    if (tx !== null) taken.push({ x: tx - 13, y: ty - 25, w: 27, h: 40 }, { x: tx + 12, y: ty - 46, w: 194, h: 25 });
    const priority = kind => ({ quest: 0, tracked: 1, area: 2, place: 3, local: 4 })[kind] ?? 4;
    const simple = name => String(name).toLowerCase().replace(/\b(the|village|town)\b/g, '').replace(/[^a-z0-9]/g, '');
    const shown = renderedPlaces.filter(place => place.mark && placeShown(place))
      .map(place => ({ place, x: offsetX + place.x * scale, y: offsetY + place.y * scale }))
      .filter(item => item.x >= -12 && item.x <= width + 12 && item.y >= -12 && item.y <= height + 12)
      .sort((a, b) => priority(a.place.kind) - priority(b.place.kind) || a.y - b.y);
    for (const place of renderedPlaces) if (place.mark) place.mark.hidden = true;
    const clashes = box => taken.some(other => box.x < other.x + other.w + 5 && box.x + box.w + 5 > other.x
      && box.y < other.y + other.h + 5 && box.y + box.h + 5 > other.y);
    for (const item of shown) {
      const { place, x, y } = item;
      place.mark.hidden = false;
      let named = placeNamed(place), placement = null;
      const key = simple(place.name);
      if (namedPlaces.some(other => other.key === key && Math.hypot(other.x - x, other.y - y) < 170)) named = false;
      const w = Math.min(260, Math.max(65, place.name.length * 7 + 16)), h = 23;
      if (named) {
        for (const [dx, dy] of [[12,-10],[12,20],[12,-38],[-w-12,-10],[-w-12,20],[-w-12,-38],[-w/2,43],[-w/2,-63]]) {
          const box = { x: x + dx, y: y + dy, w, h };
          if (box.x < 5 || box.y < 5 || box.x + w > width - 5 || box.y + h > height - 5 || clashes(box)) continue;
          placement = { dx, dy }; taken.push(box); namedPlaces.push({ key, x, y }); break;
        }
        named = !!placement;
      }
      place.mark.classList.toggle('named', named);
      if (placement) { place.label.style.left = `${placement.dx}px`; place.label.style.top = `${placement.dy}px`; }
      place.mark.style.transform = `translate(${x}px,${y}px)`;
    }
  }

  const node = (name, attributes = {}) => {
    const element = document.createElementNS(SVG_NS, name);
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
    return element;
  };
  function drawLocalDetail() {
    if (!metadata) return;
    detail.replaceChildren();
    detail.setAttribute('viewBox', `0 0 ${metadata.width} ${metadata.height}`);
    detail.setAttribute('width', metadata.width); detail.setAttribute('height', metadata.height);
    const pathText = points => points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(3)},${p.y.toFixed(3)}`).join(' ');
    for (const points of localDetail.paths) {
      const kind = points.kind === 'trail' ? 'trail' : 'road';
      detail.append(node('path', { d: pathText(points), class: `atlas-${kind}-edge` }));
      detail.append(node('path', { d: pathText(points), class: `atlas-${kind}` }));
    }
    for (const points of localDetail.buildings) detail.append(node('path', { d: `${pathText(points)}Z`, class: 'atlas-building' }));
  }
  function drawRegionNames() {
    if (!authoredLabels) return;
    const labels = authoredLabels.cloneNode(false);
    labels.removeAttribute('id'); labels.dataset.role = 'labels';
    labels.setAttribute('pointer-events', 'none');
    for (const original of authoredLabels.children) {
      if (atlasRegionLabelKnown(original.getAttribute('data-region'), chart.labels, chart.reveal)) labels.append(original.cloneNode(true));
    }
    if (labels.childElementCount) overlay.append(labels);
  }
  /** Redraw the fog, or the developer's tints, over the whole chart. */
  function drawOverlay() {
    if (!metadata) return;
    overlay.replaceChildren();
    overlay.setAttribute('viewBox', `0 0 ${metadata.width} ${metadata.height}`);
    overlay.setAttribute('width', metadata.width); overlay.setAttribute('height', metadata.height);
    if (chart.reveal) {
      // The developer's chart: no fog, and every region tinted by how far it is built.
      const colours = new Map((chart.status ?? []).map(entry => [entry.id, entry.colour]));
      for (const region of PLAYABLE_SURVEY.regions) {
        const colour = colours.get(region.name ?? region.id);
        if (!colour) continue;
        const group = node('g', { fill: colour, 'fill-opacity': '.3', stroke: colour, 'stroke-opacity': '.5', 'stroke-width': '1' });
        for (const cell of region.cells) group.append(node('polygon', { points: polygonPoints(cell.q, cell.r) }));
        overlay.append(group);
      }
      drawRegionNames(); return;
    }
    const defs = node('defs'), mask = node('mask', { id: 'atlas-charted', maskUnits: 'userSpaceOnUse' });
    mask.append(node('rect', { x: 0, y: 0, width: metadata.width, height: metadata.height, fill: '#fff' }));
    const charted = node('g', { fill: '#000' });
    for (const key of chart.cells) {
      const [q, r] = key.split(',').map(Number);
      if (Number.isFinite(q) && Number.isFinite(r)) charted.append(node('polygon', { points: polygonPoints(q, r) }));
    }
    mask.append(charted);
    defs.append(mask); overlay.append(defs);
    // Unknown country is dark - not parchment, not a hatch. The hexes the traveler has walked are
    // cut out of it and show the real atlas; everything else is the edge of a chart. The dark is
    // OPAQUE: at .93 the atlas's own shapes and lettering - black ink on bright parchment - read
    // straight through it, and a traveler who had charted one hex could read the continent.
    overlay.append(node('rect', { x: 0, y: 0, width: metadata.width, height: metadata.height,
      fill: '#0b1620', 'fill-opacity': '1', mask: 'url(#atlas-charted)' }));
    // A known country contributes only its original name. Its coast, outline and
    // interior emerge from nearby/visited hexes, never a province-wide silhouette.
    const glimpse = node('g', { 'data-role': 'glimpsed', 'stroke-width': '.5', stroke: '#182b31' });
    for (const key of chart.glimpsed) {
      if (visited.has(key)) continue;
      const [q, r] = key.split(',').map(Number);
      if (!Number.isFinite(q) || !Number.isFinite(r)) continue;
      const terrain = terrainCells.get(key) ?? (terrainSource ? 'ocean' : 'unknown');
      glimpse.append(node('polygon', { points: polygonPoints(q, r), fill: GLIMPSED_TERRAIN[terrain] ?? GLIMPSED_TERRAIN.unknown }));
    }
    overlay.append(glimpse);
    // A heard-of country gets its original inked name, without revealing its terrain. The
    // terrain image has no region labels of its own, so explored ground cannot duplicate it.
    drawRegionNames();
  }

  function render() {
    if (!metadata || !width || !height) return;
    const scale = fitScale * zoom, w = metadata.width * scale, h = metadata.height * scale;
    offsetX = w <= width ? (width - w) / 2 : Math.max(width - w, Math.min(0, offsetX));
    offsetY = h <= height ? (height - h) / 2 : Math.max(height - h, Math.min(0, offsetY));
    image.style.transform = `translate(${offsetX}px,${offsetY}px) scale(${scale})`;
    overlay.style.transform = image.style.transform;
    detail.style.transform = image.style.transform;
    detail.style.opacity = String(Math.max(0, Math.min(1, (zoom - DETAIL_ZOOM) / 6)));
    positionPlaces();
    // The traveler's marker sits in atlas pixels and follows every pan and zoom without scaling itself.
    if (traveler) {
      const shown = !!travelerPoint && Number.isFinite(travelerPoint.x) && Number.isFinite(travelerPoint.y);
      traveler.hidden = !shown;
      if (shown) {
        traveler.style.transform = `translate(${offsetX + travelerPoint.x * scale}px,${offsetY + travelerPoint.y * scale}px)`;
        // The pointer sits outside the dot and swings round it, so the marker says both where
        // the traveler is standing and which way they are looking.
        if (travelerArrow) {
          travelerArrow.hidden = travelerHeading === null;
          if (travelerHeading !== null) travelerArrow.style.transform = `rotate(${travelerHeading * 180 / Math.PI}deg)`;
        }
      }
    }
    $('atlas-zoom').textContent = `${Math.round(zoom * 100)}%`;
    $('atlas-out').disabled = zoom <= 1;
    $('atlas-in').disabled = zoom >= MAX_ZOOM;
  }
  function resize() {
    if (!metadata || !viewport.clientWidth || !viewport.clientHeight) return;
    const previousScale = fitScale * zoom;
    const cx = (width / 2 - offsetX) / previousScale, cy = (height / 2 - offsetY) / previousScale;
    width = viewport.clientWidth; height = viewport.clientHeight;
    fitScale = Math.min(width / metadata.width, height / metadata.height);
    offsetX = width / 2 - cx * fitScale * zoom; offsetY = height / 2 - cy * fitScale * zoom;
    render();
  }
  function fit() { zoom = 1; resize(); render(); }
  function zoomAt(next, x = width / 2, y = height / 2) {
    if (!metadata) return;
    opened = true;
    const scale = fitScale * zoom;
    const mx = (x - offsetX) / scale, my = (y - offsetY) / scale;
    zoom = Math.max(1, Math.min(MAX_ZOOM, next));
    offsetX = x - mx * fitScale * zoom; offsetY = y - my * fitScale * zoom;
    render();
  }
  function focusRegion(name='Drent') {
    if (!metadata) return;
    const f = metadata.regions.find(region=>region.name===name)||metadata.focus;
    // Keep the coast and neighboring regions visible around Drent.
    zoom = Math.max(1, Math.min(MAX_ZOOM, Math.min(width / (f.width + 220), height / (f.height + 180)) / fitScale));
    offsetX = width / 2 - (f.x + f.width / 2) * fitScale * zoom;
    offsetY = height / 2 - (f.y + f.height / 2) * fitScale * zoom;
    render();
  }

  $('atlas-fit').onclick = fit;
  $('atlas-izol').onclick = ()=>focusRegion();
  $('atlas-in').onclick = () => zoomAt(zoom * 1.5);
  $('atlas-out').onclick = () => zoomAt(zoom / 1.5);
  viewport.addEventListener('wheel', event => {
    event.preventDefault();
    const rect = viewport.getBoundingClientRect();
    zoomAt(zoom * Math.exp(-event.deltaY * .0015), event.clientX - rect.left, event.clientY - rect.top);
  }, {passive: false});
  viewport.addEventListener('pointerdown', event => {
    if (event.button !== 0 || !metadata) return;
    event.preventDefault(); viewport.focus({preventScroll: true});
    dragging = {id: event.pointerId, x: event.clientX, y: event.clientY};
    viewport.setPointerCapture(event.pointerId); viewport.classList.add('dragging');
  });
  viewport.addEventListener('pointermove', event => {
    if (!dragging || dragging.id !== event.pointerId) return;
    offsetX += event.clientX - dragging.x; offsetY += event.clientY - dragging.y;
    dragging.x = event.clientX; dragging.y = event.clientY; render();
  });
  function release() { dragging = null; viewport.classList.remove('dragging'); }
  viewport.addEventListener('lostpointercapture', release);
  viewport.addEventListener('pointerup', release);
  viewport.addEventListener('pointercancel', release);
  viewport.addEventListener('keydown', event => {
    const direction = {ArrowLeft:[60,0], ArrowRight:[-60,0], ArrowUp:[0,60], ArrowDown:[0,-60]}[event.code];
    if (direction) { offsetX += direction[0]; offsetY += direction[1]; render(); }
    else if (event.key === '+' || event.key === '=') zoomAt(zoom * 1.5);
    else if (event.key === '-') zoomAt(zoom / 1.5);
    else if (event.code === 'Home') fit();
    else return;
    event.preventDefault(); event.stopPropagation();
  });
  new ResizeObserver(resize).observe(viewport);
  const ready = Promise.all([
    fetch('./assets/azhora-world-map.json').then(response => { if (!response.ok) throw new Error('Map data missing'); return response.json(); }),
    fetch('./assets/azhora-world-map.svg').then(response => { if (!response.ok) throw new Error('Map drawing missing'); return response.text(); }),
  ]).then(async ([data, source]) => {
    const layers = splitAtlasRegionLabels(source);
    const names = new DOMParser().parseFromString(`<svg xmlns="${SVG_NS}">${layers.labels}</svg>`, 'image/svg+xml');
    authoredLabels = names.querySelector('#region-labels');
    if (!authoredLabels || names.querySelector('parsererror')) throw new Error('Map lettering could not load');
    const terrainURL = URL.createObjectURL(new Blob([layers.terrain], { type: 'image/svg+xml' }));
    try { image.src = terrainURL; await image.decode(); } finally { URL.revokeObjectURL(terrainURL); }
    metadata = data;
    image.style.width = `${data.width}px`; image.style.height = `${data.height}px`;
    drawOverlay(); drawLocalDetail();
    $('atlas-loading').hidden = true;
    for (const button of document.querySelectorAll('.atlas-toolbar button')) button.disabled = false;
    fit(); return data;
  }).catch(error => {
    $('atlas-loading').textContent = 'The world map could not load. Close and reopen Azhora to try again.';
    console.error(error); return null;
  });
  /** What the traveler has charted, and whether the developer is looking past the fog. */
  function setChart({ cells = chart.cells, glimpsed = chart.glimpsed, reveal = chart.reveal, status = chart.status, marks = null,
    labels = chart.labels, terrainRegions = null } = {}) {
    const scope = atlasExplorationScope({ cells, glimpsed, reveal });
    // Ignore legacy silhouette inputs even when loading an older cartography state.
    chart = { cells: [...scope.visited], glimpsed: [...scope.nearby], reveal: scope.reveal, status, silhouettes: [], labels };
    visited = scope.visited;
    if (terrainRegions && terrainRegions !== terrainSource) {
      terrainSource = terrainRegions;
      for (const region of terrainRegions) for (const cell of region.cells ?? []) terrainCells.set(`${cell.q},${cell.r}`, cell.terrain);
    }
    if (marks) places = marks.filter(place => Number.isFinite(place?.x) && Number.isFinite(place?.y)).map(place => ({ ...place }));
    drawPlaces(); drawOverlay(); render();
  }
  /** The existing atlas gains roads, buildings and known places as it zooms in. */
  function setLocalMap(model) {
    localDetail = atlasLocalDetail(model);
    drawLocalDetail(); drawPlaces(); render();
  }
  /**
   * Where the traveler stands on the chart, which way they are facing, and the name of the
   * region for the marker's label. `heading` is in radians clockwise from the top of the chart
   * (src/region-layout.js `worldHeadingToAtlas`), and null hides the pointer.
   */
  function setTraveler(point, { region = null, heading = null } = {}) {
    travelerPoint = point && Number.isFinite(point.x) && Number.isFinite(point.y) ? { x: point.x, y: point.y } : null;
    travelerHeading = Number.isFinite(heading) ? heading : null;
    const label = traveler?.querySelector('span');
    if (label) label.textContent = region ? `You are here · ${region}` : 'You are here';
    render();
  }
  /** The zoom at which the chart shows a region and its neighbours around the traveler. */
  const localZoom = () => Math.min(MAX_ZOOM, Math.max(1, Math.min(width / LOCAL_VIEW, height / LOCAL_VIEW) / fitScale));
  function centreOnTraveler() {
    offsetX = width / 2 - travelerPoint.x * fitScale * zoom; offsetY = height / 2 - travelerPoint.y * fitScale * zoom; render();
  }
  function focusTraveler() {
    if (!metadata || !travelerPoint) return false;
    zoom = Math.max(zoom, localZoom());
    centreOnTraveler(); return true;
  }
  $('atlas-traveler-button').onclick = () => focusTraveler();
  /** Opening the chart: always on the traveler; the first time, close enough to read the country round about. */
  function open() {
    ready.then(() => requestAnimationFrame(() => {
      resize();
      if (!metadata || !travelerPoint || !width || !height) return;
      if (!opened) { zoom = localZoom(); opened = true; }
      centreOnTraveler();
    }));
  }
  return {ready, focus:focusRegion, focusTraveler, setTraveler, setChart, setLocalMap, open,
    state: () => ({zoom, offsetX, offsetY, width, height, source: metadata?.source, traveler: travelerPoint ? { ...travelerPoint } : null,
      detail: { roads: localDetail.paths.length, buildings: localDetail.buildings.length, marks: localDetail.markers.length, visible: zoom > DETAIL_ZOOM },
      chart: { charted: chart.cells.length, glimpsed: chart.glimpsed.length, reveal: chart.reveal, shapes: overlay.querySelectorAll('polygon').length,
        silhouettes: chart.silhouettes.length, silhouetteCells: overlay.querySelectorAll('[data-role="silhouettes"] polygon').length,
        labels: [...overlay.querySelectorAll('[data-role="labels"] text')].map(text => text.getAttribute('data-region')),
        marks: places.length, marked: [...placeLayer.querySelectorAll('.atlas-place:not([hidden])')].length }})};
}
