// A read-only parchment chart exported from World Builder's authored Azhora hex map.
// The player's chart has no shortcut to Cape Thalmagar; the cape stays uncharted until the story reveals it.
// The chart is covered by fog: only the hexes the traveler has charted (src/map-fog.js) show through,
// unless the developer's override lifts the fog and tints each region by how far it is built.
import { hexAtlasCorners } from './region-world.js';
import { PLAYABLE_SURVEY } from './region-survey.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const polygonPoints = (q, r) => hexAtlasCorners(q, r).map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');

export function createWorldMap() {
  const $ = id => document.getElementById(id);
  const viewport = $('atlas-viewport'), image = $('atlas-image'), traveler = $('atlas-traveler');
  let metadata, zoom = 1, fitScale = 1, offsetX = 0, offsetY = 0, width = 0, height = 0, dragging = null, travelerPoint = null;
  let chart = { cells: [], reveal: false, status: [] };
  const overlay = document.createElementNS(SVG_NS, 'svg');
  overlay.id = 'atlas-overlay'; overlay.setAttribute('aria-hidden', 'true');
  viewport.insertBefore(overlay, traveler ?? null);

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
    const charted = node('g', { fill: '#000', stroke: '#000', 'stroke-width': '7', 'stroke-linejoin': 'round', filter: 'url(#atlas-soft)' });
    for (const key of chart.cells) {
      const [q, r] = key.split(',').map(Number);
      if (Number.isFinite(q) && Number.isFinite(r)) charted.append(node('polygon', { points: polygonPoints(q, r) }));
    }
    mask.append(charted);
    const soften = node('filter', { id: 'atlas-soft', x: '-20%', y: '-20%', width: '140%', height: '140%' });
    soften.append(node('feGaussianBlur', { stdDeviation: '6' }));
    defs.append(soften, mask); overlay.append(defs);
    overlay.append(node('rect', { x: 0, y: 0, width: metadata.width, height: metadata.height, fill: '#2b3a36', 'fill-opacity': '.96', mask: 'url(#atlas-charted)' }));
  }

  function render() {
    if (!metadata || !width || !height) return;
    const scale = fitScale * zoom, w = metadata.width * scale, h = metadata.height * scale;
    offsetX = w <= width ? (width - w) / 2 : Math.max(width - w, Math.min(0, offsetX));
    offsetY = h <= height ? (height - h) / 2 : Math.max(height - h, Math.min(0, offsetY));
    image.style.transform = `translate(${offsetX}px,${offsetY}px) scale(${scale})`;
    overlay.style.transform = image.style.transform;
    // The traveler's marker sits in atlas pixels and follows every pan and zoom without scaling itself.
    if (traveler) {
      const shown = !!travelerPoint && Number.isFinite(travelerPoint.x) && Number.isFinite(travelerPoint.y);
      traveler.hidden = !shown;
      if (shown) traveler.style.transform = `translate(${offsetX + travelerPoint.x * scale}px,${offsetY + travelerPoint.y * scale}px)`;
    }
    $('atlas-zoom').textContent = `${Math.round(zoom * 100)}%`;
    $('atlas-out').disabled = zoom <= 1;
    $('atlas-in').disabled = zoom >= 24;
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
    const scale = fitScale * zoom;
    const mx = (x - offsetX) / scale, my = (y - offsetY) / scale;
    zoom = Math.max(1, Math.min(24, next));
    offsetX = x - mx * fitScale * zoom; offsetY = y - my * fitScale * zoom;
    render();
  }
  function focusRegion(name='Drent') {
    if (!metadata) return;
    const f = metadata.regions.find(region=>region.name===name)||metadata.focus;
    // Keep the coast and neighboring regions visible around Drent.
    zoom = Math.max(1, Math.min(24, Math.min(width / (f.width + 220), height / (f.height + 180)) / fitScale));
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
  function setChart({ cells = chart.cells, reveal = chart.reveal, status = chart.status } = {}) {
    chart = { cells: [...cells], reveal: !!reveal, status };
    drawOverlay(); render();
  }
  function setTraveler(point) { travelerPoint = point && Number.isFinite(point.x) && Number.isFinite(point.y) ? { x: point.x, y: point.y } : null; render(); }
  function focusTraveler() {
    if (!metadata || !travelerPoint) return false;
    zoom = Math.max(zoom, Math.min(24, Math.min(width / 520, height / 520) / fitScale));
    offsetX = width / 2 - travelerPoint.x * fitScale * zoom; offsetY = height / 2 - travelerPoint.y * fitScale * zoom; render(); return true;
  }
  $('atlas-traveler-button').onclick = () => focusTraveler();
  return {ready, focus:focusRegion, focusTraveler, setTraveler, setChart, open: () => requestAnimationFrame(resize),
    state: () => ({zoom, offsetX, offsetY, width, height, source: metadata?.source, traveler: travelerPoint ? { ...travelerPoint } : null,
      chart: { charted: chart.cells.length, reveal: chart.reveal, shapes: overlay.querySelectorAll('polygon').length }})};
}
