// A read-only parchment chart exported from World Builder's authored Azhora hex map.
// The player's chart has no shortcut to Cape Thalmagar; the cape stays uncharted until the story reveals it.
export function createWorldMap() {
  const $ = id => document.getElementById(id);
  const viewport = $('atlas-viewport'), image = $('atlas-image'), traveler = $('atlas-traveler');
  let metadata, zoom = 1, fitScale = 1, offsetX = 0, offsetY = 0, width = 0, height = 0, dragging = null, travelerPoint = null;

  function render() {
    if (!metadata || !width || !height) return;
    const scale = fitScale * zoom, w = metadata.width * scale, h = metadata.height * scale;
    offsetX = w <= width ? (width - w) / 2 : Math.max(width - w, Math.min(0, offsetX));
    offsetY = h <= height ? (height - h) / 2 : Math.max(height - h, Math.min(0, offsetY));
    image.style.transform = `translate(${offsetX}px,${offsetY}px) scale(${scale})`;
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
    $('atlas-loading').hidden = true;
    for (const button of document.querySelectorAll('.atlas-toolbar button')) button.disabled = false;
    fit(); return data;
  }).catch(error => {
    $('atlas-loading').textContent = 'The world map could not load. Close and reopen Azhora to try again.';
    console.error(error); return null;
  });
  function setTraveler(point) { travelerPoint = point && Number.isFinite(point.x) && Number.isFinite(point.y) ? { x: point.x, y: point.y } : null; render(); }
  function focusTraveler() {
    if (!metadata || !travelerPoint) return false;
    zoom = Math.max(zoom, Math.min(24, Math.min(width / 520, height / 520) / fitScale));
    offsetX = width / 2 - travelerPoint.x * fitScale * zoom; offsetY = height / 2 - travelerPoint.y * fitScale * zoom; render(); return true;
  }
  $('atlas-traveler-button').onclick = () => focusTraveler();
  return {ready, focus:focusRegion, focusTraveler, setTraveler, open: () => requestAnimationFrame(resize), state: () => ({zoom, offsetX, offsetY, width, height, source: metadata?.source, traveler: travelerPoint ? { ...travelerPoint } : null})};
}
