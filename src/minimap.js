// The local chart uses world metres and the same north (-Z) as the terrain.
// Rendering only reads adventure state; opening or drawing it reveals nothing.
const TAU = Math.PI * 2;
const finitePoint = point => point && Number.isFinite(point.x) && Number.isFinite(point.z);
const positive = (value, fallback) => Number.isFinite(value) && value > 0 ? value : fallback;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
// Parchment and ink, matching the traveler's chart and the local trail sheets.
export const MINIMAP_PALETTE = Object.freeze({ ground: { 1: '#d9caa0', 2: '#e6d8ad', 3: '#d3d0a6', 4: '#e0d3ab' }, groundFallback: '#dccfa4',
  water: '#b4c4be', waterEdge: '#4f5e63', coastWater: '#a9bcb8', coastEdge: '#5e4630', sand: '#cdb98a', trail: '#5e463099', roadEdge: '#3d2b1ab8', road: '#f0e3c0',
  timber: '#8b7355', house: '#8b7355', stone: '#a4906d', rock: '#9c8f78', ink: '#3d2b1a', boundary: '#5e46306b', frontier: '#7a4a12',
  known: '#f2e6c4', unknown: '#5e46304d', targetRing: '#3d2b1aea',
  // Birding's own colour, which is nobody else's: not the errand gold, not the marked place's teal.
  bird: '#9fd8e8' });
const groundColors = MINIMAP_PALETTE.ground;

export function miniMapProjection({ position, radius = 62, size = 300, padding = 10 } = {}) {
  const origin = finitePoint(position) ? { x: position.x, z: position.z } : { x: 0, z: 0 };
  radius = positive(radius, 62); size = Math.max(32, positive(size, 300));
  padding = clamp(Number.isFinite(padding) ? padding : 10, 1, size / 2 - 1);
  const center = size / 2, ring = center - padding, scale = ring / radius;
  const bounds = { minX: origin.x - radius, maxX: origin.x + radius, minZ: origin.z - radius, maxZ: origin.z + radius };
  function project(point, { clampToRing = false, inset = 0 } = {}) {
    if (!finitePoint(point)) return null;
    const dx = point.x - origin.x, dz = point.z - origin.z, distance = Math.hypot(dx, dz);
    const limit = Math.max(0, ring - Math.max(0, Number.isFinite(inset) ? inset : 0));
    const pixels = distance * scale, clamped = clampToRing && pixels > limit;
    const factor = clamped ? limit / distance : scale;
    return { x: center + dx * factor, y: center + dz * factor, distance,
      bearing: distance ? Math.atan2(dx, -dz) : 0, inside: pixels <= ring, clamped };
  }
  return { bounds, scale, center, ring, size, radius, project };
}

function known(discoveries, id) {
  return Boolean(id && (typeof discoveries?.has === 'function' ? discoveries.has(id) : Array.isArray(discoveries) && discoveries.includes(id)));
}

function dimensions(collider) {
  return { width: positive(collider.width, positive(collider.hx, positive(collider.r, 1)) * 2),
    depth: positive(collider.depth, positive(collider.hz, positive(collider.r, 1)) * 2) };
}

function dot(ctx, x, y, radius, fill, stroke = null) {
  ctx.beginPath(); ctx.arc(x, y, radius, 0, TAU);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
}

/** Draw one north-up, player-centered local view. Targets are ordinary {x,z,id?} objects. */
export function drawMinimap(ctx, { world = {}, position, goal = null, openGoal = null, combat = null, angle = 0,
  time = 0, discoveries = new Set(), tracked = null, bird = null, radius = 62, size = 300, northOffset = 0 } = {}) {
  const view = miniMapProjection({ position, radius, size });
  const { project, bounds, scale, center, ring } = view;
  size = view.size;
  const region = finitePoint(position) ? world.regionAt?.(position.x, position.z) : null;
  const counts = { paths: 0, buildings: 0, waterShapes: 0, landmarks: 0, discovered: 0, enemies: 0, heightSamples: 0 };
  // Open country has no palette of its own; it draws on Drent's, and says its own name above.
  const result = { bounds, scale, regionId: region?.id || 1, open: region?.open === true, goal: null, openGoal: null, optional: null, counts, player: null };
  if (!ctx) return result;
  ctx.clearRect(0, 0, size, size);
  ctx.save(); ctx.beginPath(); ctx.arc(center, center, center - 1, 0, TAU); ctx.clip();
  // World -Z is drawn up by default; a north offset turns the whole chart so true north stays at the top.
  if (Number.isFinite(northOffset) && northOffset !== 0) { ctx.translate(center, center); ctx.rotate(northOffset); ctx.translate(-center, -center); }
  ctx.fillStyle = MINIMAP_PALETTE.groundFallback; ctx.fillRect(0, 0, size, size);
  // Districts are filled from their authored hex outlines, so a view near a
  // border shows the real shape of both sides at the same chart scale.
  const districtLoops = district => {
    const loops = Array.isArray(district?.border) && district.border.length ? district.border : district?.outline;
    return Array.isArray(loops) && loops.length && Array.isArray(loops[0]) ? loops : null;
  };
  for (const district of world.regions || []) {
    const loops = districtLoops(district);
    if (!loops) continue;
    const box = district.bounds;
    if (box && (box.maxX < bounds.minX || box.minX > bounds.maxX || box.maxZ < bounds.minZ || box.minZ > bounds.maxZ)) continue;
    ctx.fillStyle = groundColors[district.id] || MINIMAP_PALETTE.groundFallback;
    ctx.beginPath();
    for (const loop of loops) {
      const points = loop.map(point => project(point)).filter(Boolean);
      if (points.length < 3) continue;
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      ctx.closePath();
    }
    ctx.fill();
  }

  const authoritativeWater = Array.isArray(world.mapWaters) && world.mapWaters.length > 0;
  if (authoritativeWater) for (const water of world.mapWaters) {
    if (water.kind === 'circle' && finitePoint(water)) {
      const p = project(water), r = positive(water.radius, 1) * scale;
      if (p.x + r < 0 || p.x - r > size || p.y + r < 0 || p.y - r > size) continue;
      ctx.lineWidth = 2.5; dot(ctx, p.x, p.y, r, MINIMAP_PALETTE.water, MINIMAP_PALETTE.waterEdge); counts.waterShapes++;
    } else if (water.kind === 'polygon') {
      const points = (water.points || []).map(point => project(point)).filter(Boolean);
      if (points.length < 3 || points.every(p => p.x < 0) || points.every(p => p.x > size)
        || points.every(p => p.y < 0) || points.every(p => p.y > size)) continue;
      ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      ctx.closePath(); ctx.fillStyle = water.id === 'coast-water' ? MINIMAP_PALETTE.coastWater : MINIMAP_PALETTE.water;
      ctx.strokeStyle = water.id === 'coast-water' ? MINIMAP_PALETTE.coastEdge : MINIMAP_PALETTE.waterEdge;
      ctx.lineWidth = water.id === 'coast-water' ? 5 : 2.5; ctx.stroke(); ctx.fill(); counts.waterShapes++;
    }
  }
  // Islands are land inside that water, so they are painted back over it.
  for (const land of Array.isArray(world.mapLands) ? world.mapLands : []) {
    const points = (land.points || []).map(point => project(point)).filter(Boolean);
    if (points.length < 3 || points.every(p => p.x < 0) || points.every(p => p.x > size)
      || points.every(p => p.y < 0) || points.every(p => p.y > size)) continue;
    ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.closePath();
    ctx.fillStyle = groundColors[world.regions?.find(region => region.name === land.region)?.id] || MINIMAP_PALETTE.groundFallback;
    ctx.strokeStyle = MINIMAP_PALETTE.coastEdge; ctx.lineWidth = 3; ctx.stroke(); ctx.fill();
    counts.landShapes = (counts.landShapes ?? 0) + 1;
  }
  // A fallback for small isolated test worlds without rendered water metadata:
  // trace the actual height-field/sea intersection instead of a straight coast.
  // Pond and river have their own elevated surfaces and come from water colliders.
  // At most 61 columns are sampled, and inland views need just two heights each.
  if (!authoritativeWater && typeof world.heightAt === 'function') {
    const margin = (center - ring + 1) / scale;
    const columns = 60, edges = [[], []], minX = bounds.minX - margin, maxX = bounds.maxX + margin;
    const minZ = bounds.minZ - margin, maxZ = bounds.maxZ + margin;
    const sample = (x, z) => { counts.heightSamples++; return world.heightAt(x, z); };
    for (let i = 0; i <= columns; i++) {
      const x = minX + (maxX - minX) * i / columns;
      const low = sample(x, minZ), high = sample(x, maxZ);
      for (let edge = 0; edge < 2; edge++) {
        const level = edge ? .06 : .95;
        let north = minZ, south = maxZ;
        if (!Number.isFinite(high) || high > level) north = maxZ;
        else if (Number.isFinite(low) && low > level) {
          for (let step = 0; step < 8; step++) {
            const z = (north + south) / 2;
            if (sample(x, z) > level) north = z; else south = z;
          }
        }
        edges[edge].push(project({ x, z: north }));
      }
    }
    for (let edge = 0; edge < 2; edge++) {
      if (!edges[edge].some(p => p.y < size)) continue;
      ctx.fillStyle = edge ? MINIMAP_PALETTE.coastWater : MINIMAP_PALETTE.sand; ctx.beginPath();
      ctx.moveTo(-5, size + 5);
      for (const p of edges[edge]) ctx.lineTo(p.x, p.y);
      ctx.lineTo(size + 5, size + 5); ctx.closePath(); ctx.fill();
      if (edge) counts.waterShapes++;
    }
  }

  const visible = (point, extra = 0) => finitePoint(point)
    && point.x + extra >= bounds.minX && point.x - extra <= bounds.maxX
    && point.z + extra >= bounds.minZ && point.z - extra <= bounds.maxZ;
  const waterColliders = (world.colliders || []).filter(c => c.kind === 'river-water' || c.kind === 'pond-water');
  // Water blockers describe the river's bend and leave its real bridge opening.
  for (const water of authoritativeWater ? [] : waterColliders) {
    const dimensions2D = dimensions(water), margin = Math.max(dimensions2D.width, dimensions2D.depth) / 2;
    if (!visible(water, margin)) continue;
    const p = project(water); ctx.fillStyle = MINIMAP_PALETTE.water;
    if (positive(water.r, 0)) dot(ctx, p.x, p.y, water.r * scale, MINIMAP_PALETTE.water);
    else ctx.fillRect(p.x - dimensions2D.width * scale / 2, p.y - dimensions2D.depth * scale / 2, dimensions2D.width * scale, dimensions2D.depth * scale);
    counts.waterShapes++;
  }
  if (!authoritativeWater && world.pond && !waterColliders.some(c => c.kind === 'pond-water') && visible(world.pond, positive(world.pond.radius, 5))) {
    const p = project(world.pond); dot(ctx, p.x, p.y, positive(world.pond.radius, 5) * scale, MINIMAP_PALETTE.water); counts.waterShapes++;
  }

  const line = (points, width, color) => {
    ctx.beginPath(); let started = false, segments = 0;
    for (const point of points || []) {
      const p = project(point);
      if (!p) { started = false; continue; }
      if (!started) { ctx.moveTo(p.x, p.y); started = true; }
      else { ctx.lineTo(p.x, p.y); segments++; }
    }
    if (!segments) return;
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
  };
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // Minor woodland spurs stay distinct from the continuous northbound road.
  for (let i = 1; i < (world.paths || []).length; i++) {
    line(world.paths[i], 3.1, MINIMAP_PALETTE.trail); counts.paths++;
  }
  const mainPaths = [world.paths?.[0]];
  if (world.routeJourney && !world.paths?.[0]?.some(p => p.z <= world.routeJourney.at(-1)?.z)) mainPaths.push(world.routeJourney);
  for (const path of mainPaths) if (path?.length > 1) {
    line(path, 7.2, MINIMAP_PALETTE.roadEdge); line(path, 4.8, MINIMAP_PALETTE.road); counts.paths++;
  }
  if (finitePoint(world.boatStart) && finitePoint(world.spawn) && finitePoint(world.paths?.[0]?.[0])) {
    line([world.spawn, world.paths[0][0]], 3.9 * scale, MINIMAP_PALETTE.timber);
  }
  const bridgeRails = (world.colliders || []).filter(c => c.kind === 'bridge-rail' && finitePoint(c));
  if (bridgeRails.length >= 2) {
    const minX = Math.min(...bridgeRails.map(c => c.x)), maxX = Math.max(...bridgeRails.map(c => c.x));
    const minZ = Math.min(...bridgeRails.map(c => c.z - positive(c.hz, 1))), maxZ = Math.max(...bridgeRails.map(c => c.z + positive(c.hz, 1)));
    if (maxZ >= bounds.minZ && minZ <= bounds.maxZ) {
      const p = project({ x: minX, z: minZ }); ctx.fillStyle = MINIMAP_PALETTE.timber;
      ctx.fillRect(p.x, p.y, (maxX - minX) * scale, (maxZ - minZ) * scale);
    }
  }

  for (const c of world.colliders || []) {
    if (!c.kind || c.kind.endsWith('-water') || c.kind.endsWith('-tree')) continue;
    const house = c.kind === 'house', solid = house || c.kind === 'windmill' || c.kind === 'cart'
      || c.kind === 'bridge-rail' || c.kind === 'bridge-damage' || c.kind === 'ridge-rock' || c.kind === 'ruin-pillar';
    if (!solid) continue;
    const d = dimensions(c);
    if (!visible(c, Math.max(d.width, d.depth))) continue;
    const p = project(c);
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Number.isFinite(c.angle) ? -c.angle : 0);
    ctx.fillStyle = house || c.kind === 'windmill' ? MINIMAP_PALETTE.house : MINIMAP_PALETTE.stone;
    ctx.strokeStyle = MINIMAP_PALETTE.ink; ctx.lineWidth = 1;
    if (c.kind === 'ridge-rock') dot(ctx, 0, 0, positive(c.r, 1) * scale, MINIMAP_PALETTE.rock);
    else { ctx.fillRect(-d.width * scale / 2, -d.depth * scale / 2, d.width * scale, d.depth * scale);
      ctx.strokeRect(-d.width * scale / 2, -d.depth * scale / 2, d.width * scale, d.depth * scale); }
    ctx.restore(); if (house || c.kind === 'windmill') counts.buildings++;
  }

  // Region borders follow the authored outlines; the frontier stroke is the army's line west of the Moros camp.
  ctx.setLineDash([3, 5]);
  for (const district of world.regions || []) {
    const loops = districtLoops(district), box = district.bounds;
    if (!loops) continue;
    if (box && (box.maxX < bounds.minX || box.minX > bounds.maxX || box.maxZ < bounds.minZ || box.minZ > bounds.maxZ)) continue;
    for (const loop of loops) line([...loop, loop[0]], 1, MINIMAP_PALETTE.boundary);
  }
  if (Number.isFinite(world.border?.barrierX))
    line([{ x: world.border.barrierX, z: bounds.minZ }, { x: world.border.barrierX, z: bounds.maxZ }], 1, MINIMAP_PALETTE.boundary);
  else if (Number.isFinite(world.border?.barrierZ))
    line([{ x: bounds.minX, z: world.border.barrierZ }, { x: bounds.maxX, z: world.border.barrierZ }], 1, MINIMAP_PALETTE.boundary);
  ctx.setLineDash([]);
  if (finitePoint(world.frontier) && visible(world.frontier, 3)) {
    const p = project(world.frontier); ctx.lineWidth = 2; ctx.strokeStyle = MINIMAP_PALETTE.frontier;
    ctx.beginPath(); ctx.moveTo(p.x - 13, p.y); ctx.lineTo(p.x + 13, p.y); ctx.stroke();
  }

  for (const place of world.landmarks || []) {
    const p = project(place); if (!p || !p.inside) continue;
    const discovered = known(discoveries, place.id);
    ctx.lineWidth = 1;
    if (discovered) {
      dot(ctx, p.x, p.y, 3.3, MINIMAP_PALETTE.known, MINIMAP_PALETTE.ink); counts.discovered++;
    } else dot(ctx, p.x, p.y, 1.65, MINIMAP_PALETTE.unknown);
    counts.landmarks++;
  }
  for (const fire of world.firePits || []) {
    if (!visible(fire) || !(known(discoveries, fire.id) || (world.landmarks || []).some(l => known(discoveries, l.id) && Math.hypot(l.x - fire.x, l.z - fire.z) < 13))) continue;
    const p = project(fire); dot(ctx, p.x, p.y, 2, '#e5b276');
  }
  if (combat?.phase === 'active') for (const enemy of combat.enemies || []) {
    const p = project(enemy); if (!p?.inside || !(enemy.hp > 0)) continue;
    dot(ctx, p.x, p.y, 3.2, '#ef9a72', '#533c2e'); counts.enemies++;
  }

  // Three targets, and each is a different mark rather than a different colour: a filled gold
  // diamond for the muster road, the same diamond drawn hollow for the long road's next stop
  // (src/quest-markers.js, the open variant), and a green ring for a place the traveler pinned.
  const drawTarget = (target, optional, hollow = false) => {
    const p = project(target, { clampToRing: true, inset: 7 }); if (!p) return null;
    const color = optional ? '#8acfc2' : '#ffe0a0';
    ctx.lineWidth = 2;
    dot(ctx, p.x, p.y, optional ? 9 : 6.5, MINIMAP_PALETTE.targetRing);
    if (optional) dot(ctx, p.x, p.y, 7.5, null, color);
    else {
      const r = 4.5 + Math.sin((Number.isFinite(time) ? time : 0) * 3) * .55;
      ctx.beginPath(); ctx.moveTo(p.x, p.y - r); ctx.lineTo(p.x + r, p.y);
      ctx.lineTo(p.x, p.y + r); ctx.lineTo(p.x - r, p.y); ctx.closePath();
      if (hollow) { ctx.strokeStyle = color; ctx.lineWidth = 1.7; ctx.stroke(); ctx.lineWidth = 2; }
      else { ctx.fillStyle = color; ctx.fill(); }
    }
    if (p.clamped) {
      const dx = Math.sin(p.bearing), dy = -Math.cos(p.bearing);
      ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.beginPath();
      ctx.moveTo(p.x + dx * 7 - dy * 2.5, p.y + dy * 7 + dx * 2.5);
      ctx.lineTo(p.x + dx * 10, p.y + dy * 10);
      ctx.lineTo(p.x + dx * 7 + dy * 2.5, p.y + dy * 7 - dx * 2.5); ctx.stroke();
    }
    return { ...p, id: target.id || null };
  };
  result.optional = drawTarget(tracked, true);
  result.openGoal = drawTarget(openGoal, false, true);
  result.goal = drawTarget(goal, false);
  // The bird the traveler is watching, handed in by the host from src/bird-finder.js.
  // A pair of wings rather than a pin, because it is not a place and will not wait;
  // and the chart reaches 62 m while a bird can be seen at 18 to 30, so it is almost
  // always on the sheet - but an arrow at the ring carries the ones that are not.
  result.bird = null;
  if (finitePoint(bird)) {
    const p = project(bird, { clampToRing: true, inset: 6 });
    const wing = 4.2, lift = 2.2;
    dot(ctx, p.x, p.y, 5.6, MINIMAP_PALETTE.targetRing);
    ctx.strokeStyle = MINIMAP_PALETTE.bird; ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.moveTo(p.x - wing, p.y + 1.3);
    ctx.lineTo(p.x - wing / 2, p.y + 1.3 - lift);
    ctx.lineTo(p.x, p.y + .5);
    ctx.lineTo(p.x + wing / 2, p.y + 1.3 - lift);
    ctx.lineTo(p.x + wing, p.y + 1.3);
    ctx.stroke();
    if (p.clamped) {
      const dx = Math.sin(p.bearing), dy = -Math.cos(p.bearing);
      ctx.lineWidth = 1.6; ctx.beginPath();
      ctx.moveTo(p.x + dx * 7 - dy * 2.4, p.y + dy * 7 + dx * 2.4);
      ctx.lineTo(p.x + dx * 9.6, p.y + dy * 9.6);
      ctx.lineTo(p.x + dx * 7 + dy * 2.4, p.y + dy * 7 - dx * 2.4); ctx.stroke();
    }
    result.bird = { ...p, id: bird.id || null };
  }
  // Angle zero faces +Z, matching the actual character (south on this chart).
  const yaw = Number.isFinite(angle) ? angle : 0, dx = Math.sin(yaw), dy = Math.cos(yaw);
  const tip = { x: center + dx * 8, y: center + dy * 8 };
  ctx.lineWidth = 2; ctx.fillStyle = '#fff8dc'; ctx.strokeStyle = MINIMAP_PALETTE.ink;
  ctx.beginPath(); ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(center - dx * 5 - dy * 5, center - dy * 5 + dx * 5);
  ctx.lineTo(center - dx * 2, center - dy * 2);
  ctx.lineTo(center - dx * 5 + dy * 5, center - dy * 5 - dx * 5);
  ctx.closePath(); ctx.fill(); ctx.stroke(); result.player = { x: center, y: center, tip, angle: yaw };
  ctx.restore();
  return result;
}
