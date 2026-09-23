const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const finitePoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.z);
const known = marker => marker?.known === true || marker?.discovered === true;
const number = value => Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
let nextMapId = 0;

/** Uniform projection: north (-Z) is up, and actual world distances stay equal. */
export function projectTrailPoint(point, bounds, { width = 600, height = 430, padding = 32 } = {}) {
  const spanX = Math.max(1, bounds.maxX - bounds.minX), spanZ = Math.max(1, bounds.maxZ - bounds.minZ);
  const scale = Math.max(.01, Math.min((width - padding * 2) / spanX, (height - padding * 2) / spanZ));
  const left = (width - spanX * scale) / 2, top = (height - spanZ * scale) / 2;
  return { x: left + (point.x - bounds.minX) * scale, y: top + (point.z - bounds.minZ) * scale, scale,
    inside: finitePoint(point) && point.x >= bounds.minX && point.x <= bounds.maxX && point.z >= bounds.minZ && point.z <= bounds.maxZ };
}

/** A zoomed window in world metres, using the full available paper width. */
export function trailMapViewBounds(bounds, { width = 600, height = 430, padding = 28, zoom = 1, center } = {}) {
  const spanX = Math.max(1, bounds.maxX - bounds.minX), spanZ = Math.max(1, bounds.maxZ - bounds.minZ);
  const amount = Math.min(3, Math.max(1, Number.isFinite(zoom) ? zoom : 1));
  const areaWidth = Math.max(1, width - padding * 2), areaHeight = Math.max(1, height - padding * 2);
  const scale = Math.min(areaWidth / spanX, areaHeight / spanZ) * amount;
  const visibleX = areaWidth / scale, visibleZ = areaHeight / scale;
  const coordinate = (value, minimum, maximum, visible) => visible >= maximum - minimum ? (minimum + maximum) / 2
    : Math.max(minimum + visible / 2, Math.min(maximum - visible / 2, value));
  const midpoint = { x: (bounds.minX + bounds.maxX) / 2, z: (bounds.minZ + bounds.maxZ) / 2 };
  const x = coordinate(finitePoint(center) ? center.x : midpoint.x, bounds.minX, bounds.maxX, visibleX);
  const z = coordinate(finitePoint(center) ? center.z : midpoint.z, bounds.minZ, bounds.maxZ, visibleZ);
  return { minX: x - visibleX / 2, maxX: x + visibleX / 2, minZ: z - visibleZ / 2, maxZ: z + visibleZ / 2 };
}

/** Unknown details remain unknown even if a caller accidentally passes their names. */
export function trailMapSelection(model, id) {
  if (!model || !id) return null;
  const marker = (model.landmarks || []).find(marker => marker.id === id)
    || (model.goal?.id === id ? model.goal : null) || (model.openGoal?.id === id ? model.openGoal : null);
  if (!marker) return null;
  const isGoal = marker === model.goal || marker === model.openGoal, isKnown = known(marker) || isGoal;
  return { id: marker.id, name: isKnown ? marker.name || 'Known place' : 'Unexplored',
    description: isKnown ? marker.description || (isGoal ? 'Your main journey leads here.' : 'A place recorded along your journey.')
      : 'Visit this place to learn what is here. You can mark it after you discover it.',
    known: isKnown, discovered: marker.discovered === true, trackable: isKnown && marker.trackable === true,
    tracked: model.tracked?.id === marker.id, objective: model.goal?.id === marker.id,
    // The long road's next stop wears the same filled gold quest symbol.
    openObjective: model.openGoal?.id === marker.id,
    x: marker.x, z: marker.z };
}

function distanceText(a, b) {
  if (!finitePoint(a) || !finitePoint(b)) return '';
  const distance = Math.hypot(a.x - b.x, a.z - b.z);
  return distance < 1000 ? `${Math.round(distance)} m` : `${(distance / 1000).toFixed(1)} km`;
}

/** Native SVG field map. No image assets, atlas fetches, or gameplay mutations. */
export function trailMapSVG(model, { width = 600, height = 430, selectedId = null, clipId = 'trail-field-clip', zoom = 1, center } = {}) {
  if (!model?.bounds) return '';
  width = Math.max(240, width); height = Math.max(230, height);
  const bounds = model.bounds, options = { width, height, padding: height < 330 ? 20 : 28 };
  const view = trailMapViewBounds(bounds, { ...options, zoom, center }), project = p => projectTrailPoint(p, view, options);
  const visible = point => finitePoint(point) && project(point).inside && point.x >= bounds.minX && point.x <= bounds.maxX && point.z >= bounds.minZ && point.z <= bounds.maxZ;
  const topLeft = project({ x: bounds.minX, z: bounds.minZ }), bottomRight = project({ x: bounds.maxX, z: bounds.maxZ });
  const clipLeft = Math.max(options.padding, topLeft.x), clipTop = Math.max(options.padding, topLeft.y);
  const clipWidth = Math.max(0, Math.min(width - options.padding, bottomRight.x) - clipLeft);
  const clipHeight = Math.max(0, Math.min(height - options.padding, bottomRight.y) - clipTop);
  // Parchment tones per district; the chart is inked like the traveler's atlas.
  const scale = topLeft.scale, landColor = ({ 1: '#dfd2a5', 2: '#e9dcb0', 3: '#d9d5ab', 4: '#e4d8b2' })[model.region?.id] || '#e3d6ac';
  const path = points => points.filter(finitePoint).map((p, i) => { const q = project(p); return `${i ? 'L' : 'M'}${number(q.x)},${number(q.y)}`; }).join(' ');
  const svg = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${number(width)} ${number(height)}" role="group" aria-label="${escape(model.region?.name || 'Local region')}, north is up" class="trail-field-svg">`,
    `<defs><clipPath id="${escape(clipId)}"><rect x="${number(clipLeft)}" y="${number(clipTop)}" width="${number(clipWidth)}" height="${number(clipHeight)}" rx="5"/></clipPath><filter id="${escape(clipId)}-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.014" numOctaves="2" seed="3"/><feColorMatrix type="matrix" values="0 0 0 0 0.38  0 0 0 0 0.28  0 0 0 0 0.14  0 0 0 0.16 0"/></filter></defs>`,
    `<g clip-path="url(#${escape(clipId)})">`,
    `<rect x="${number(topLeft.x)}" y="${number(topLeft.y)}" width="${number(bottomRight.x - topLeft.x)}" height="${number(bottomRight.y - topLeft.y)}" rx="5" fill="${landColor}" stroke="#5e4630aa"/>`,
    `<rect x="${number(topLeft.x)}" y="${number(topLeft.y)}" width="${number(bottomRight.x - topLeft.x)}" height="${number(bottomRight.y - topLeft.y)}" rx="5" filter="url(#${escape(clipId)}-grain)" class="trail-grain"/>`,
  ];
  for (const water of model.waters || []) {
    if (water.kind === 'circle' && finitePoint(water) && Number.isFinite(water.radius)) {
      const p = project(water); svg.push(`<circle cx="${number(p.x)}" cy="${number(p.y)}" r="${number(water.radius * scale)}" class="trail-water"/>`);
    } else if (water.kind === 'polygon' && water.points?.length > 2) svg.push(`<path d="${path(water.points)}Z" class="trail-water"/>`);
  }
  // Islands are land inside that water: the Pebbles are drawn back over the Stills.
  for (const land of model.lands || [])
    if (land.points?.length > 2) svg.push(`<path d="${path(land.points)}Z" class="trail-land" fill="${landColor}"/>`);
  for (const points of model.paths || []) if (Array.isArray(points) && points.length > 1) {
    const d = path(points); svg.push(`<path d="${d}" class="trail-road-edge"/><path d="${d}" class="trail-road"/>`);
  }
  for (const building of model.buildings || []) {
    if (!finitePoint(building) || !Number.isFinite(building.width) || !Number.isFinite(building.depth)) continue;
    const p = project(building), w = building.width * scale, h = building.depth * scale;
    svg.push(`<rect x="${number(p.x - w / 2)}" y="${number(p.y - h / 2)}" width="${number(w)}" height="${number(h)}" transform="rotate(${number(-(building.angle || 0) * 180 / Math.PI)} ${number(p.x)} ${number(p.y)})" class="trail-building"/>`);
  }
  svg.push('</g>');
  const inView = (model.landmarks || []).filter(visible);
  const labels = [], labelBoxes = [];
  function label(marker, className = '') {
    if (!known(marker) && marker !== model.goal) return;
    const p = project(marker), text = marker.name || 'Known place';
    // Keep the map readable when town services share a small area. All known
    // names also remain in the adjacent keyboard-accessible place list.
    const textWidth = Math.min(163, text.length * 5.65 + 4), boxHeight = 14;
    const choices = [[11, -7, 'start'], [-11, -7, 'end'], [11, 17, 'start'], [-11, 17, 'end'], [12, -22, 'start'], [-12, -22, 'end']];
    for (const [dx, dy, anchor] of choices) {
      const x = p.x + dx, y = p.y + dy, left = anchor === 'start' ? x : x - textWidth;
      const box = { x: left - 2, y: y - boxHeight + 2, width: textWidth + 4, height: boxHeight + 2 };
      if (box.x < 9 || box.y < 7 || box.x + box.width > width - 9 || box.y + box.height > height - 28) continue;
      if (labelBoxes.some(other => box.x < other.x + other.width && box.x + box.width > other.x && box.y < other.y + other.height && box.y + box.height > other.y)) continue;
      labelBoxes.push(box);
      labels.push(`<text x="${number(x)}" y="${number(y)}" text-anchor="${anchor}" class="trail-place-label ${className}"${text.length > 29 ? ` textLength="${textWidth}" lengthAdjust="spacingAndGlyphs"` : ''}>${escape(text)}</text>`);
      return;
    }
  }
  const selected = inView.find(marker => marker.id === selectedId), trackedHere = visible(model.tracked) ? model.tracked : null;
  const goalHere = visible(model.goal) ? model.goal : null;
  const openGoalHere = visible(model.openGoal) && model.openGoal.id !== goalHere?.id ? model.openGoal : null;
  if (selected) label(selected, 'is-selected');
  if (goalHere && goalHere.id !== selected?.id) label(goalHere, 'is-main-goal');
  if (openGoalHere && openGoalHere.id !== selected?.id) label(openGoalHere, 'is-main-goal');
  if (trackedHere && trackedHere.id !== selected?.id && trackedHere.id !== goalHere?.id) label(trackedHere, 'is-tracked');
  for (const marker of inView.filter(known).sort((a, b) => a.z - b.z))
    if (![selected?.id, trackedHere?.id, goalHere?.id].includes(marker.id)) label(marker);
  for (const marker of inView) {
    const p = project(marker), isKnown = known(marker), text = isKnown ? marker.name : 'Unexplored place';
    const classes = ['trail-map-marker', isKnown ? 'is-known' : 'is-unknown', marker.id === selectedId ? 'is-selected' : '', marker.id === model.tracked?.id ? 'is-tracked' : ''].filter(Boolean).join(' ');
    svg.push(`<g class="${classes}" data-trail-place="${escape(marker.id)}" transform="translate(${number(p.x)},${number(p.y)})" role="button" tabindex="0" aria-label="${escape(text)}${isKnown ? ', select place' : ', visit to discover'}" aria-pressed="${marker.id === selectedId}"><title>${escape(text)}</title><circle r="11" class="trail-pin-hit"/><circle r="${isKnown ? 4.4 : 3.1}" class="trail-pin-dot"/></g>`);
  }
  if (trackedHere) {
    const p = project(trackedHere);
    svg.push(`<g transform="translate(${number(p.x)},${number(p.y)})" class="trail-tracked-marker" pointer-events="none"><circle r="10"/><path d="M0,-10 L0,-21 L9,-18 L0,-15"/></g>`);
  }
  if (goalHere) {
    const p = project(goalHere);
    svg.push(`<g transform="translate(${number(p.x)},${number(p.y)})" class="trail-goal-marker trail-map-marker" data-trail-place="${escape(goalHere.id)}" role="button" tabindex="0" aria-label="${escape(goalHere.name || 'Main objective')}, main journey"><title>${escape(goalHere.name || 'Main objective')} — main journey</title><circle r="12" class="trail-pin-hit"/><path d="M0,-7 L7,0 L0,7 L-7,0Z"/></g>`);
  }
  if (openGoalHere) {
    const p = project(openGoalHere);
    svg.push(`<g transform="translate(${number(p.x)},${number(p.y)})" class="trail-open-goal-marker trail-map-marker" data-trail-place="${escape(openGoalHere.id)}" role="button" tabindex="0" aria-label="${escape(openGoalHere.name || 'The long way round')}, the long way round"><title>${escape(openGoalHere.name || 'The long way round')} — the long way round</title><circle r="12" class="trail-pin-hit"/><path d="M0,-7 L7,0 L0,7 L-7,0Z"/></g>`);
  }
  // The bird the traveler is watching, if the host is offering one: the same pair
  // of wings the round chart draws, on the sheet he opens to work out where he is.
  // It is where the bird was when he opened the journal, which is what a note is.
  if (visible(model.bird)) {
    const p = project(model.bird);
    svg.push(`<g transform="translate(${number(p.x)},${number(p.y)})" class="trail-bird-marker" pointer-events="none"><title>A bird within your reach</title><circle r="8"/><path d="M-5,1.6 L-2.5,-1 L0,.6 L2.5,-1 L5,1.6"/></g>`);
  }
  svg.push(...labels);
  if (visible(model.player)) {
    const p = project(model.player), heading = Number.isFinite(model.player.heading) ? model.player.heading * 180 / Math.PI : null;
    svg.push(`<g transform="translate(${number(p.x)},${number(p.y)})" class="trail-player-marker" pointer-events="none"><title>You are here</title><circle r="10" class="trail-player-halo"/>${heading === null ? '<circle r="4.8" class="trail-player-dot"/>' : `<path transform="rotate(${number(heading)})" d="M0,-9 L-5.7,6.7 L0,3.8 L5.7,6.7Z"/>`}</g>`);
  }
  const barMeters = scale * 40 <= 110 ? 40 : 20, barWidth = barMeters * scale;
  svg.push(`<g class="trail-map-scale" transform="translate(18,${number(height - 17)})"><path d="M0,-3 V2 H${number(barWidth)} V-3"/><text x="${number(barWidth + 7)}" y="5">${barMeters} m</text></g>`);
  svg.push(`<g class="trail-map-north" transform="translate(${number(width - 22)},24)"><text text-anchor="middle" y="-4">N</text><path d="M0,2 L-3.4,13 L0,10 L3.4,13Z"/></g></svg>`);
  return svg.join('');
}

export function createTrailMap({ mount, getModel, onTrack = () => {}, onClear = () => {} }) {
  if (!mount || typeof getModel !== 'function') throw new Error('The trail map needs a mount and a model provider.');
  const clipId = `trail-field-clip-${++nextMapId}`;
  let model = null, viewedRegion = null, selectedId = null, width = 600, height = 420, zoom = 1, disposed = false;
  mount.classList.add('trail-map');
  mount.innerHTML = `<div class="trail-map-toolbar"><div class="trail-region-tabs" role="group" aria-label="View a local region"></div><button type="button" class="trail-current-region">Where I am</button></div>
    <div class="trail-map-layout"><section class="trail-map-sheet" aria-label="Local field map"><div class="trail-sheet-heading"><div class="trail-sheet-title"><span class="trail-eyebrow">DRENT · FIELD NOTES</span><h3></h3><p></p></div><div class="trail-map-tools" role="group" aria-label="Map zoom"><button type="button" id="trail-map-zoom-out" data-trail-action="zoom-out" aria-label="Zoom out" title="Zoom out">−</button><output class="trail-map-zoom" aria-label="Map magnification">1×</output><button type="button" id="trail-map-zoom-in" data-trail-action="zoom-in" aria-label="Zoom in" title="Zoom in on your selected place">+</button><button type="button" id="trail-map-fit" data-trail-action="fit" title="Show the whole region">Fit</button></div></div><div class="trail-map-canvas"></div><div class="trail-map-legend"><span><i class="trail-legend-player"></i>You</span><span><i class="trail-legend-goal"></i>Main journey</span><span><i class="trail-legend-pin"></i>Marked place</span><span><i class="trail-legend-unknown"></i>Unexplored</span></div></section>
    <aside class="trail-map-notes"><div class="trail-place-list-heading"><h4>Known places</h4><span></span></div><div class="trail-place-list" aria-label="Known places in this region"></div><div class="trail-map-selection" aria-live="polite"></div></aside></div>
    <div class="trail-map-footer"><p class="trail-map-context"></p><p class="trail-map-marked"></p></div><div class="trail-map-status" role="status" aria-live="polite"></div>`;
  const $ = selector => mount.querySelector(selector), tabs = $('.trail-region-tabs'), canvas = $('.trail-map-canvas'), list = $('.trail-place-list'), details = $('.trail-map-selection');
  const currentButton = $('.trail-current-region');
  currentButton.dataset.trailAction = 'current';
  function currentRegionName() { return model?.regions?.find(region => region.id === model.currentRegionId)?.name || 'another region'; }
  function selectedView() { return trailMapSelection(model, selectedId); }
  function mapCenter() {
    const selected = selectedView();
    if (finitePoint(selected)) return selected;
    if (finitePoint(model?.player) && projectTrailPoint(model.player, model.bounds).inside) return model.player;
    return null;
  }
  function viewBounds() { return model ? trailMapViewBounds(model.bounds, { width, height: Math.max(230, height), padding: height < 330 ? 20 : 28, zoom, center: mapCenter() }) : null; }
  function drawMap() {
    if (!model) return;
    canvas.innerHTML = trailMapSVG(model, { width, height, selectedId, clipId, zoom, center: mapCenter() });
    $('#trail-map-zoom-out').disabled = zoom <= 1;
    $('#trail-map-zoom-in').disabled = zoom >= 3;
    $('#trail-map-fit').disabled = zoom <= 1;
    $('.trail-map-zoom').textContent = `${number(zoom)}×`;
    $('.trail-map-context').textContent = zoom > 1 ? 'Select a place to look closer. Fit shows the whole region.'
      : model.outside ? `You are outside every border the atlas draws. This is the nearest sheet, ${currentRegionName()}, and you are off it.`
        : viewedRegion === model.currentRegionId ? 'North is up. Select a place, then zoom in to look closer.'
          : `You are in ${currentRegionName()}. Viewing this map does not move you.`;
  }
  function setZoom(amount) {
    if (disposed || !model) return;
    const focus = focusToken(); zoom = Math.min(3, Math.max(1, Math.round(amount * 4) / 4)); drawMap(); restoreFocus(focus);
  }
  function drawSelection() {
    const selected = selectedView();
    details.replaceChildren();
    const eyebrow = document.createElement('span'); eyebrow.className = 'trail-eyebrow';
    eyebrow.textContent = !selected ? 'YOUR OWN WAY' : selected.objective ? 'MAIN JOURNEY' : selected.known ? selected.discovered ? 'VISITED PLACE' : 'A PLACE YOU KNOW' : 'OFF THE KNOWN TRAIL';
    const title = document.createElement('h4'); title.id = 'trail-map-selection-name'; title.textContent = selected?.name || 'Choose a place';
    const description = document.createElement('p'); description.id = 'trail-map-selection-detail'; description.textContent = selected?.description || 'Select a place on the map or in your notes. Mark a known place to follow its teal marker.';
    description.title = description.textContent;
    details.append(eyebrow, title, description);
    const actions = document.createElement('div'); actions.className = 'trail-map-actions';
    const mark = document.createElement('button'); mark.type = 'button'; mark.className = 'trail-mark-button'; mark.dataset.trailAction = 'mark';
    mark.id = 'trail-map-track';
    mark.textContent = selected?.tracked ? 'Trail marked' : 'Mark trail'; mark.disabled = !selected?.trackable || selected.tracked;
    mark.title = !selected ? 'Select a known place first' : !selected.known ? 'Discover this place before marking it' : selected.tracked ? 'This place is already marked' : !selected.trackable ? 'Your main journey already marks this destination' : 'Show this place as your optional destination';
    mark.onclick = () => { const live = selectedView(); if (!live?.known || !live.trackable || live.tracked) return; if (onTrack(live.id) === false) return; refresh(); $('.trail-map-status').textContent = `${live.name} marked.`; };
    const clear = document.createElement('button'); clear.type = 'button'; clear.className = 'trail-clear-button'; clear.dataset.trailAction = 'clear'; clear.textContent = 'Clear marker'; clear.disabled = !model?.tracked;
    clear.id = 'trail-map-clear';
    clear.onclick = () => { if (!model?.tracked || onClear() === false) return; refresh(); $('.trail-map-status').textContent = 'Optional marker cleared.'; };
    actions.append(mark, clear); details.append(actions);
  }
  function drawList() {
    const scroll = list.scrollTop; list.replaceChildren();
    const places = (model.landmarks || []).filter(known).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    $('.trail-place-list-heading span').textContent = String(places.length);
    if (!places.length) {
      const empty = document.createElement('p'); empty.className = 'trail-list-empty'; empty.textContent = 'Walk the paths to add places to these notes.'; list.append(empty);
    }
    for (const place of places) {
      const row = document.createElement('button'); row.type = 'button'; row.className = 'trail-place-row'; row.dataset.trailListPlace = place.id;
      row.classList.toggle('is-selected', place.id === selectedId); row.classList.toggle('is-tracked', place.id === model.tracked?.id);
      row.setAttribute('aria-pressed', String(place.id === selectedId)); row.title = `${place.name} — ${distanceText(model.player, place)}`;
      const dot = document.createElement('i'); dot.className = 'trail-list-dot'; dot.setAttribute('aria-hidden', 'true');
      const text = document.createElement('span'), name = document.createElement('strong'), meta = document.createElement('small');
      name.textContent = place.name; meta.textContent = `${place.id === model.tracked?.id ? 'Marked' : place.discovered ? 'Visited' : 'Known'}${distanceText(model.player, place) ? ` · ${distanceText(model.player, place)}` : ''}`;
      text.append(name, meta); row.append(dot, text); row.onclick = () => select(place.id); list.append(row);
    }
    list.scrollTop = scroll;
  }
  function focusToken() {
    const active = document.activeElement;
    if (!mount.contains(active)) return null;
    if (active.dataset.trailListPlace) return { type: 'list', id: active.dataset.trailListPlace };
    if (active.dataset.trailPlace) return { type: 'marker', id: active.dataset.trailPlace };
    if (active.dataset.trailAction) return { type: 'action', id: active.dataset.trailAction };
    if (active.dataset.trailRegion) return { type: 'region', id: active.dataset.trailRegion };
    return null;
  }
  function restoreFocus(token) {
    if (!token) return;
    const attr = ({ list: 'trailListPlace', marker: 'trailPlace', action: 'trailAction', region: 'trailRegion' })[token.type];
    const node = [...mount.querySelectorAll(token.type === 'marker' ? '[data-trail-place]' : 'button')].find(node => node.dataset[attr] === token.id);
    if (node && !node.disabled) node.focus({ preventScroll: true });
    else if (token.type === 'action') {
      const group = ['zoom-in', 'zoom-out', 'fit'].includes(token.id) ? $('.trail-map-tools') : details;
      const alternative = [...group.querySelectorAll('button')].find(button => !button.disabled) || tabs.querySelector('.is-active');
      alternative?.focus({ preventScroll: true });
    }
  }
  function refresh() {
    if (disposed) return null;
    const focus = focusToken(), next = getModel(viewedRegion ?? undefined);
    if (!next?.bounds || !next?.region) return null;
    model = next; viewedRegion = model.region.id;
    if (selectedId && !selectedView()) selectedId = null;
    tabs.replaceChildren();
    for (const region of model.regions || []) {
      const button = document.createElement('button'); button.type = 'button'; button.dataset.trailRegion = String(region.id);
      button.textContent = `${region.id} · ${region.name}`; button.className = 'trail-region-button'; button.classList.toggle('is-active', region.id === viewedRegion);
      button.setAttribute('aria-pressed', String(region.id === viewedRegion)); button.title = `View ${region.name}`;
      button.onclick = () => { viewedRegion = region.id; selectedId = null; zoom = 1; refresh(); }; tabs.append(button);
    }
    currentButton.disabled = viewedRegion === model.currentRegionId;
    currentButton.title = `View your current region: ${currentRegionName()}`;
    $('.trail-sheet-heading h3').textContent = model.region.name;
    $('.trail-sheet-heading p').textContent = model.region.subtitle || 'Paths, places, and the road ahead';
    $('.trail-map-marked').textContent = model.tracked ? `Marked: ${model.tracked.name}${projectTrailPoint(model.tracked, model.bounds).inside ? '' : ' · in another region'}` : 'Gold follows your main journey. Teal follows your chosen place.';
    drawMap(); drawList(); drawSelection(); restoreFocus(focus);
    return state();
  }
  function select(id) {
    if (!trailMapSelection(model, id)) return false;
    const focus = focusToken(); selectedId = id; drawMap(); drawList(); drawSelection(); restoreFocus(focus); return true;
  }
  function resize() {
    if (disposed) return;
    const box = canvas.getBoundingClientRect();
    if (box.width < 20 || box.height < 20) return;
    const nextWidth = Math.round(box.width), nextHeight = Math.round(box.height);
    if (width === nextWidth && height === nextHeight) return;
    const focus = focusToken(); width = nextWidth; height = nextHeight; drawMap(); restoreFocus(focus);
  }
  function open(regionId) {
    viewedRegion = regionId ?? null; zoom = 1; mount.classList.remove('hidden'); mount.hidden = false;
    refresh(); requestAnimationFrame(resize); return state();
  }
  function state() {
    return { regionId: viewedRegion, currentRegionId: model?.currentRegionId ?? null, selectedId, selected: selectedView(),
      trackedId: model?.tracked?.id ?? null, knownCount: (model?.landmarks || []).filter(known).length,
      unexploredCount: (model?.landmarks || []).filter(marker => !known(marker)).length, width, height, zoom, viewBounds: viewBounds() };
  }
  currentButton.onclick = () => { viewedRegion = model?.currentRegionId ?? null; selectedId = null; zoom = 1; refresh(); };
  $('#trail-map-zoom-in').onclick = () => setZoom(zoom + .5);
  $('#trail-map-zoom-out').onclick = () => setZoom(zoom - .5);
  $('#trail-map-fit').onclick = () => setZoom(1);
  const click = event => { const marker = event.target.closest('[data-trail-place]'); if (marker && canvas.contains(marker)) select(marker.dataset.trailPlace); };
  const key = event => {
    const marker = event.target.closest('[data-trail-place]');
    if (!marker || !['Enter', 'Space'].includes(event.code)) return;
    event.preventDefault(); event.stopPropagation(); select(marker.dataset.trailPlace);
  };
  const wheel = event => { event.preventDefault(); event.stopPropagation(); if (event.deltaY) setZoom(zoom + (event.deltaY < 0 ? .25 : -.25)); };
  canvas.addEventListener('click', click); canvas.addEventListener('keydown', key);
  canvas.addEventListener('wheel', wheel, { passive: false });
  const observer = new ResizeObserver(resize); observer.observe(canvas);
  return { open, refresh, state, select, dispose() { if (disposed) return; disposed = true; observer.disconnect(); canvas.removeEventListener('click', click); canvas.removeEventListener('keydown', key); canvas.removeEventListener('wheel', wheel); mount.replaceChildren(); } };
}
