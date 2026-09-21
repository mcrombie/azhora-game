// A read-only parchment chart exported from World Builder's authored Azhora hex map.
// The player's chart has no shortcut to Cape Thalmagar; the cape stays uncharted until the story reveals it.
// The chart is covered by fog: only the hexes the traveler has charted (src/map-fog.js) show through,
// unless the developer's override lifts the fog and tints each region by how far it is built.
import { hexAtlasCorners } from './region-world.js';
import { PLAYABLE_SURVEY } from './region-survey.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const polygonPoints = (q, r) => hexAtlasCorners(q, r).map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');

const MAX_ZOOM = 64;
/** How much of the chart a first look shows around the traveler, in atlas pixels: a region and its neighbours. */
export const LOCAL_VIEW = 520;

export function createWorldMap() {
  const $ = id => document.getElementById(id);
  const viewport = $('atlas-viewport'), image = $('atlas-image'), traveler = $('atlas-traveler');
  const travelerArrow = traveler?.querySelector('b') ?? null;
  /** Which way the traveler is facing on the chart, in radians clockwise from the top of it. */
  let travelerHeading = null;
  let metadata, zoom = 1, fitScale = 1, offsetX = 0, offsetY = 0, width = 0, height = 0, dragging = null, travelerPoint = null;
  // The chart opens on the traveler, close enough to read; once the traveler has chosen a zoom it keeps it.
  let opened = false;
  let chart = { cells: [], reveal: false, status: [], silhouettes: [], labels: [] };
  const overlay = document.createElementNS(SVG_NS, 'svg');
  overlay.id = 'atlas-overlay'; overlay.setAttribute('aria-hidden', 'true');
  viewport.insertBefore(overlay, traveler ?? null);
  // Charted places are marked in screen space, like the traveler's own mark, so
  // their labels stay the same size however far the chart is zoomed.
  const placeLayer = document.createElement('div');
  placeLayer.id = 'atlas-places'; placeLayer.setAttribute('aria-hidden', 'true');
  viewport.insertBefore(placeLayer, traveler ?? null);
  let places = [];
  // Areas are named as soon as the chart is more than glanced at; the smaller places
  // inside them wait until the traveler has zoomed in far enough to read them.
  const placeShown = place => place.kind === 'area' || zoom >= 3.5;
  const placeNamed = place => place.kind === 'area' ? zoom >= 1.8 : zoom >= 5.5;
  function drawPlaces() {
    placeLayer.replaceChildren();
    for (const place of places) {
      const mark = document.createElement('div');
      mark.className = `atlas-place ${place.kind}`;
      const dot = document.createElement('i'), label = document.createElement('span');
      label.textContent = place.name; mark.append(dot, label);
      place.mark = mark; placeLayer.append(mark);
    }
    positionPlaces();
  }
  // Marks are placed top to bottom; a label that would sit on the one above it is
  // nudged down, and dropped altogether if there is no room. The dots never move.
  function positionPlaces() {
    const scale = fitScale * zoom, taken = [];
    const shown = places.filter(place => place.mark && placeShown(place))
      .map(place => ({ place, x: offsetX + place.x * scale, y: offsetY + place.y * scale }))
      .sort((a, b) => a.y - b.y);
    for (const place of places) if (place.mark) place.mark.hidden = !placeShown(place);
    for (const item of shown) {
      let nudge = 0, named = placeNamed(item.place);
      const clashes = offset => taken.some(box => Math.abs(box.y - (item.y + offset)) < 14 && Math.abs(box.x - item.x) < 150);
      if (named) {
        while (nudge <= 42 && clashes(nudge)) nudge += 14;
        if (clashes(nudge)) named = false; else taken.push({ x: item.x, y: item.y + nudge });
      }
      item.place.mark.classList.toggle('named', named);
      item.place.mark.style.setProperty('--nudge', `${nudge}px`);
      item.place.mark.style.transform = `translate(${item.x}px,${item.y}px)`;
    }
  }

  const node = (name, attributes = {}) => {
    const element = document.createElementNS(SVG_NS, name);
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
    return element;
  };
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
      return;
    }
    const defs = node('defs'), mask = node('mask', { id: 'atlas-charted', maskUnits: 'userSpaceOnUse' });
    mask.append(node('rect', { x: 0, y: 0, width: metadata.width, height: metadata.height, fill: '#fff' }));
    const charted = node('g', { fill: '#000', stroke: '#000', 'stroke-width': '1.5', 'stroke-linejoin': 'round', filter: 'url(#atlas-soft)' });
    for (const key of chart.cells) {
      const [q, r] = key.split(',').map(Number);
      if (Number.isFinite(q) && Number.isFinite(r)) charted.append(node('polygon', { points: polygonPoints(q, r) }));
    }
    mask.append(charted);
    const soften = node('filter', { id: 'atlas-soft', x: '-20%', y: '-20%', width: '140%', height: '140%' });
    soften.append(node('feGaussianBlur', { stdDeviation: '2.4' }));
    defs.append(soften, mask); overlay.append(defs);
    // Unknown country is dark - not parchment, not a hatch. The hexes the traveler has walked are
    // cut out of it and show the real atlas; everything else is the edge of a chart. The dark is
    // OPAQUE: at .93 the atlas's own shapes and lettering - black ink on bright parchment - read
    // straight through it, and a traveler who had charted one hex could read the continent.
    overlay.append(node('rect', { x: 0, y: 0, width: metadata.width, height: metadata.height,
      fill: '#0b1620', 'fill-opacity': '1', mask: 'url(#atlas-charted)' }));
    // A coast you have been shown is a lighter shape in the dark: the country's own hexes, filled
    // flat, so the land reads against the sea and nothing inside it does. The same mask keeps ground
    // you have actually walked showing through.
    // Opaque as well, for the same reason: the colour is what '#33506a' at .62 over the dark used
    // to come out as, so a known coast looks as it did and no longer shows its interior through.
    const shapes = node('g', { fill: '#243a4e', 'fill-opacity': '1', stroke: '#243a4e', 'stroke-opacity': '1',
      'stroke-width': '1.2', 'stroke-linejoin': 'round', mask: 'url(#atlas-charted)' });
    shapes.dataset.role = 'silhouettes';
    for (const region of chart.silhouettes ?? []) {
      for (const cell of region.cells ?? []) shapes.append(node('polygon', { points: polygonPoints(cell.q, cell.r) }));
    }
    if (shapes.childElementCount) overlay.append(shapes);
    // A country somebody has named for you carries its name, drawn here because the atlas's own
    // label is under the dark. Nothing else of it is drawn unless its shape is known too.
    const labels = node('g', { fill: '#cfe0f2', 'fill-opacity': '.82', 'font-family': 'Adventure, Georgia, serif',
      'text-anchor': 'middle', 'pointer-events': 'none' });
    labels.dataset.role = 'labels';
    for (const label of chart.labels ?? []) {
      const text = node('text', { x: label.x, y: label.y, 'font-size': label.size ?? 34 });
      text.textContent = label.name;
      labels.append(text);
    }
    if (labels.childElementCount) overlay.append(labels);
  }

  function render() {
    if (!metadata || !width || !height) return;
    const scale = fitScale * zoom, w = metadata.width * scale, h = metadata.height * scale;
    offsetX = w <= width ? (width - w) / 2 : Math.max(width - w, Math.min(0, offsetX));
    offsetY = h <= height ? (height - h) / 2 : Math.max(height - h, Math.min(0, offsetY));
    image.style.transform = `translate(${offsetX}px,${offsetY}px) scale(${scale})`;
    overlay.style.transform = image.style.transform;
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
    image.decode(),
  ]).then(([data]) => {
    metadata = data;
    image.style.width = `${data.width}px`; image.style.height = `${data.height}px`;
    drawOverlay();
    $('atlas-loading').hidden = true;
    for (const button of document.querySelectorAll('.atlas-toolbar button')) button.disabled = false;
    fit(); return data;
  }).catch(error => {
    $('atlas-loading').textContent = 'The world map could not load. Close and reopen Azhora to try again.';
    console.error(error); return null;
  });
  /** What the traveler has charted, and whether the developer is looking past the fog. */
  function setChart({ cells = chart.cells, reveal = chart.reveal, status = chart.status, marks = null,
    silhouettes = chart.silhouettes, labels = chart.labels } = {}) {
    chart = { cells: [...cells], reveal: !!reveal, status, silhouettes, labels };
    if (marks) { places = marks.map(place => ({ ...place })); drawPlaces(); }
    drawOverlay(); render();
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
  return {ready, focus:focusRegion, focusTraveler, setTraveler, setChart, open,
    state: () => ({zoom, offsetX, offsetY, width, height, source: metadata?.source, traveler: travelerPoint ? { ...travelerPoint } : null,
      chart: { charted: chart.cells.length, reveal: chart.reveal, shapes: overlay.querySelectorAll('polygon').length,
        silhouettes: chart.silhouettes.length, silhouetteCells: overlay.querySelectorAll('[data-role="silhouettes"] polygon').length,
        labels: [...overlay.querySelectorAll('[data-role="labels"] text')].map(text => text.textContent),
        marks: places.length, marked: [...placeLayer.querySelectorAll('.atlas-place:not([hidden])')].length }})};
}
