import * as THREE from 'three';
import { REGIONAL_PLACES, REGIONAL_NPC_POSITIONS, REGIONAL_ACTIVITY_SITES, REGIONAL_PATHS, regionalFeatureClear, createRegionalPlaces } from './regional-places.js';
import { regions, regionAt, regionNpcPositions, journeySites, regionFirePits, regionRepairBenches, northernRoad, regionLandmarks } from './regions.js';
import { forestPlaceDefinitions, forestPlacePaths, forestWoodcutter, forestFeatureClear, tintForestGround, createForestPlaces } from './forest-places.js';
import { FOREST_HIDEOUT, forestHideoutClear, tintForestHideoutGround, createForestHideout } from './forest-hideout-world.js';

// Eastreena is built entirely from small, shared meshes. Coordinates are in metres;
// north is -Z and the arrival pier reaches into the southern sea.
export function createWorld(scene, { spatialBatches = true } = {}) {
  let seed = 341937;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const range = (a, b) => a + random() * (b - a);
  const clamp = THREE.MathUtils.clamp;
  const smooth = (a, b, x) => { const v = clamp((x - a) / (b - a), 0, 1); return v * v * (3 - 2 * v); };
  const colliders = [];
  const training = { x: 3, z: -12 };
  const repairBench = { x: 6, z: -6.4, name: 'Village repair bench' };
  const doomsayer = { x: -9.3, z: 2.2 }, pondFisher = { x: 20.4, z: -82 };
  const pond = { x: 27, z: -77, radius: 5.4, surfaceY: 0,
    fishingSpot: { x: 20.4, z: -77 }, castPoint: { x: 24.8, y: 0, z: -77.2 } };
  const firePits = [
    { id: 'village-fire', x: -9.2, z: -2.3, fireX: -10.5, fireZ: -2.3 },
    { id: 'pond-fire', x: 17.8, z: -72, fireX: 17.8, fireZ: -70.7 },
  ];
  const pondPaths = [
    [{ x: 0, z: -74 }, { x: 8, z: -74.7 }, { x: 15, z: -76.7 }, pond.fishingSpot],
    [{ x: 16.1, z: -77 }, { x: 18, z: -80 }, pondFisher],
    [{ x: 12.7, z: -76 }, { x: 15, z: -73 }, firePits[1]],
  ];
  function pondPathDistance(x, z) {
    let distance = Infinity;
    for (const path of pondPaths) for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i], dx = b.x - a.x, dz = b.z - a.z;
      const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz), 0, 1);
      distance = Math.min(distance, Math.hypot(x - a.x - dx * t, z - a.z - dz * t));
    }
    return distance;
  }
  const featureClear = (x, z, tree = false) => Math.hypot(x - pond.x, z - pond.z) < pond.radius + (tree ? 2.8 : .1)
    || pondPathDistance(x, z) < (tree ? 2.35 : 1.45)
    || [doomsayer, pondFisher, ...firePits].some(p => Math.hypot(x - p.x, z - p.z) < (tree ? 2.1 : 1.0))
    || firePits.some(p => Math.hypot(x - p.fireX, z - p.fireZ) < (tree ? 2.1 : 1.25))
    || forestFeatureClear(x, z, tree) || forestHideoutClear(x, z, tree);
  const encounter = { x: 0, z: -34, radius: 8 };
  const northTrail = { x: -5, z: -108, name: 'Fernway Rest' };
  const border = { x: 0, z: -156, name: 'Eastreena Boundary', barrierZ: -162, regionName: 'Sunmeadow Plain', open: true };
  const routeNorth = [
    { x: 0, z: -72 }, { x: -11, z: -86 }, { x: -5, z: -108 },
    { x: 8, z: -128 }, { x: 3, z: -143 }, { x: border.x, z: border.z },
  ];
  const inLessonSpace = (x, z, margin = 0) => Math.hypot(x - training.x, z - training.z) < 2.5 + margin
    || Math.hypot(x - encounter.x, z - encounter.z) < encounter.radius + margin;
  const world = new THREE.Group();
  world.name = 'Eastreena coast';
  scene.add(world);
  const materials = {};
  const material = (color, extra = {}) => {
    const key = `${color}:${JSON.stringify(extra)}`;
    return materials[key] ||= new THREE.MeshStandardMaterial({ color, roughness: 0.93, ...extra });
  };
  const wood = material('#71523a');
  const woodLight = material('#ab7950');
  const darkWood = material('#59432e');
  const cream = material('#eee0ac');
  const rockMat = material('#85998a');
  const windowMat = material('#ffe4a0', { emissive: '#ffd287', emissiveIntensity: 0.52, roughness: 0.35 });
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 7);
  const round = new THREE.IcosahedronGeometry(1, 0);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  function mesh(geometry, mat, x, y, z, sx = 1, sy = 1, sz = 1, parent = world) {
    const item = new THREE.Mesh(geometry, mat);
    item.position.set(x, y, z);
    item.scale.set(sx, sy, sz);
    item.castShadow = true;
    item.receiveShadow = true;
    parent.add(item);
    return item;
  }
  const box = (mat, x, y, z, sx, sy, sz, parent = world) => mesh(cube, mat, x, y, z, sx, sy, sz, parent);
  const post = (mat, x, y, z, radius, height, parent = world) => mesh(cylinder, mat, x, y, z, radius, height, radius, parent);
  const pebble = (mat, x, y, z, sx, sy, sz, parent = world) => mesh(round, mat, x, y, z, sx, sy, sz, parent);

  function baseGroundHeight(x, z) {
    const shoreline = 27.5 + Math.sin(x * 0.055) * 2.8 + Math.cos(x * 0.15) * 0.65;
    const inland = 1.35 + Math.sin(x * 0.07) * Math.sin(z * 0.055) * 0.72;
    const north = smooth(-17, -103, z); // smooth is also well defined for reversed endpoints.
    const hills = north * (2.9 + Math.sin(x * 0.045 + z * 0.05) * 1.7 + Math.cos(x * 0.085) * 0.85);
    const outer = smooth(53, 108, Math.abs(x)) * (5.2 + Math.sin(z * 0.055) * 3.8);
    // The woodland folds gently down into open country. A low northern horizon
    // makes the next region visible from the last stretch of Eastreena's trail.
    const plain = 3.4 + Math.sin(x * .012) * .65 + Math.sin(z * .011) * .8
      + Math.cos(x * .018 + z * .020) * .5
      + smooth(168, 255, -z) * (3.3 + Math.sin(x * .024 + z * .014) * 1.6 + Math.cos(x * .014 - z * .015) * .9);
    let y = THREE.MathUtils.lerp(inland + hills + outer, plain, smooth(94, 155, -z));
    // Preserve the original forest exactly. Beyond it, open fields sink into
    // the Reedwater hollow before rising to the local stone country.
    if (z < -162) {
      const riverPlain = 3.6 + Math.sin(x * .034) * .42 + Math.sin(z * .025) * .35;
      y = THREE.MathUtils.lerp(y, riverPlain, smooth(320, 355, -z));
      const rise = 12 + Math.sin(z * .022) * 2.4 + Math.sin(x * .034) * .7
        + smooth(24, 83, Math.abs(x)) * (7 + Math.sin(z * .068) * 3);
      y = THREE.MathUtils.lerp(y, rise, smooth(480, 555, -z));
    }
    // A gentle beach below the village gives the water a real shallow edge.
    y -= smooth(shoreline - 4.5, shoreline + 13, z) * 7;
    return y;
  }
  pond.surfaceY = baseGroundHeight(pond.x, pond.z) - .55;
  pond.castPoint.y = pond.surfaceY + .035;
  const fishingSpots = [
    { id: 'willowmere', name: 'Willowmere Pond', ...pond },
    { id: 'reedwater', name: 'Reedwater fishing bank', x: 16, z: -410, surfaceY: 2.45,
      fishingSpot: { x: 16, z: -398 }, castPoint: { x: 16, y: 2.49, z: -410 } },
  ];
  let activeFishingSpot = fishingSpots[0];
  function groundHeight(x, z) {
    const original = baseGroundHeight(x, z), distance = Math.hypot(x - pond.x, z - pond.z);
    if (z < -390 && z > -433) {
      const riverZ = -412 + Math.sin(x * .035) * 5;
      const bankDistance = Math.abs(z - riverZ);
      if (bankDistance < 13) {
        const riverBed = THREE.MathUtils.lerp(1.55, original, smooth(6.3, 13, bankDistance));
        // The timber bridge, not an artificial terrain dam, crosses the water.
        // heightAt supplies the deck's collision height above this river bed.
        return riverBed;
      }
    }
    if (distance < pond.radius) return pond.surfaceY - .85 * (1 - smooth(pond.radius - 1.5, pond.radius, distance));
    if (distance < pond.radius + 2.4) return THREE.MathUtils.lerp(pond.surfaceY, original, smooth(pond.radius, pond.radius + 2.4, distance));
    return original;
  }
  function heightAt(x, z) {
    if (Math.abs(x) < 2.2 && z >= 22 && z <= 48) return 1.8;
    if (Math.abs(x) < 2.8 && z > -425 && z < -398) return 3.64;
    return groundHeight(x, z);
  }

  // The broad terrain extends behind the playable area, so the horizon stays natural.
  const terrain = new THREE.PlaneGeometry(360, 320, 180, 160);
  terrain.rotateX(-Math.PI / 2);
  terrain.translate(0, 0, -70);
  const vertices = terrain.attributes.position;
  const terrainColors = new Float32Array(vertices.count * 3);
  const grassColors = ['#86a859', '#80a452', '#92ac5e', '#75994f', '#83a45b'];
  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i), z = vertices.getZ(i);
    const h = groundHeight(x, z);
    vertices.setY(i, h);
    color.set(grassColors[Math.floor(random() * grassColors.length)]);
    const meadow = smooth(132, 171, -z);
    const meadowTint = new THREE.Color().setHSL(.198 + Math.sin(x * .034 + z * .012) * .023, .31, .49, THREE.SRGBColorSpace);
    color.lerp(meadowTint, meadow);
    const beach = smooth(18.5, 29, z - Math.sin(x * .055) * 2.5);
    color.lerp(new THREE.Color('#d5c99a'), beach);
    color.multiplyScalar(range(0.94, 1.05));
    tintForestGround(color, x, z);
    tintForestHideoutGround(color, x, z);
    terrainColors.set([color.r, color.g, color.b], i * 3);
  }
  terrain.setAttribute('color', new THREE.BufferAttribute(terrainColors, 3));
  terrain.computeVertexNormals();
  const terrainMesh = new THREE.Mesh(terrain, material('#ffffff', { vertexColors: true, flatShading: true }));
  terrainMesh.receiveShadow = true;
  world.add(terrainMesh);

  // A second terrain tile continues seamlessly into three playable districts.
  // Keeping the original southern tile preserves all woodland scatter IDs.
  const plainGeometry = new THREE.PlaneGeometry(360, 480, 180, 240);
  plainGeometry.rotateX(-Math.PI / 2);
  plainGeometry.translate(0, 0, -470);
  const plainVertices = plainGeometry.attributes.position;
  const plainColors = new Float32Array(plainVertices.count * 3);
  for (let i = 0; i < plainVertices.count; i++) {
    const x = plainVertices.getX(i), z = plainVertices.getZ(i);
    plainVertices.setY(i, groundHeight(x, z));
    color.setHSL(.198 + Math.sin(x * .026 + z * .018) * .023, .30, .49 + Math.cos(x * .013 - z * .027) * .033, THREE.SRGBColorSpace);
    color.lerp(new THREE.Color('#6d8871'), smooth(325, 357, -z) * (1 - smooth(484, 518, -z)));
    color.lerp(new THREE.Color('#9b9d83'), smooth(491, 537, -z));
    const groundMottle = Math.sin(x*.19+z*.043)*Math.cos(z*.22-x*.039);
    color.multiplyScalar(1 + groundMottle*.048);
    plainColors.set([color.r, color.g, color.b], i * 3);
  }
  plainGeometry.setAttribute('color', new THREE.BufferAttribute(plainColors, 3));
  plainGeometry.computeVertexNormals();
  const plainMesh = new THREE.Mesh(plainGeometry, material('#ffffff', { vertexColors: true, flatShading: true }));
  plainMesh.name = 'The northern districts';
  plainMesh.receiveShadow = true;
  if (!spatialBatches) world.add(plainMesh);
  else {
    // Share the original position/color/normal buffers between terrain tiles.
    // Only their index ranges and bounds differ; no mesh resolution, heights,
    // colors, or edge vertices change. This lets a north-facing camera discard
    // fields and river terrain behind it instead of drawing all 86,400 faces.
    const tileRoot=new THREE.Group();tileRoot.name='The northern districts';world.add(tileRoot);
    const rowWidth=181,columnsPerTile=45,rowsPerTile=60,sourceIndices=plainGeometry.index;
    for(let tileZ=0;tileZ<4;tileZ++)for(let tileX=0;tileX<4;tileX++) {
      const firstX=tileX*columnsPerTile,firstZ=tileZ*rowsPerTile,indices=[];
      const bounds=new THREE.Box3(),point=new THREE.Vector3();
      for(let z=firstZ;z<=firstZ+rowsPerTile;z++)for(let x=firstX;x<=firstX+columnsPerTile;x++)
        bounds.expandByPoint(point.fromBufferAttribute(plainVertices,z*rowWidth+x));
      for(let z=firstZ;z<firstZ+rowsPerTile;z++)for(let x=firstX;x<firstX+columnsPerTile;x++) {
        const start=(z*180+x)*6;for(let i=0;i<6;i++)indices.push(sourceIndices.getX(start+i));
      }
      const geometry=new THREE.BufferGeometry();
      for(const [name,attribute]of Object.entries(plainGeometry.attributes))geometry.setAttribute(name,attribute);
      geometry.setIndex(indices);geometry.boundingBox=bounds;geometry.boundingSphere=bounds.getBoundingSphere(new THREE.Sphere());
      const tile=new THREE.Mesh(geometry,plainMesh.material);tile.name=`Northern terrain ${tileX}:${tileZ}`;tile.receiveShadow=true;tileRoot.add(tile);
    }
  }

  const trailPoints = [new THREE.Vector2(0, 25), new THREE.Vector2(0, 9), new THREE.Vector2(0, -5),
    new THREE.Vector2(-1.6, -20), new THREE.Vector2(1.7, -34), new THREE.Vector2(0, -47),
    new THREE.Vector2(-1.5, -60), ...routeNorth.map(p => new THREE.Vector2(p.x, p.z)),
    ...northernRoad.map(p => new THREE.Vector2(p.x, p.z))];
  const paths = [trailPoints,
    [new THREE.Vector2(-21, 13), new THREE.Vector2(-10, 8), new THREE.Vector2(0, 7), new THREE.Vector2(14, 7), new THREE.Vector2(27, 9)],
    [new THREE.Vector2(-24, -12), new THREE.Vector2(-11, -8), new THREE.Vector2(0, -9), new THREE.Vector2(12, -9), new THREE.Vector2(25, -17)],
    [new THREE.Vector2(0, -40), new THREE.Vector2(12, -43), new THREE.Vector2(24, -53), new THREE.Vector2(32, -60)]];
  const segments = [];
  function addPath(points, width) {
    const curve = new THREE.CatmullRomCurve3(points.map(v => new THREE.Vector3(v.x, 0, v.y)));
    const samples = curve.getPoints(Math.ceil(curve.getLength() / 0.65));
    const positions = [], indices = [];
    for (let i = 0; i < samples.length; i++) {
      const p = samples[i];
      const direction = samples[Math.min(i + 1, samples.length - 1)].clone().sub(samples[Math.max(0, i - 1)]).normalize();
      const left = new THREE.Vector3(-direction.z, 0, direction.x).multiplyScalar(width / 2 * (1 + Math.sin(i * .61) * .025));
      for (const sign of [-1, 1]) {
        const x = p.x + left.x * sign, z = p.z + left.z * sign;
        positions.push(x, groundHeight(x, z) + .045, z);
      }
      if (i) {
        const j = i * 2;
        indices.push(j - 2, j, j - 1, j - 1, j, j + 1);
        segments.push({ ax: samples[i - 1].x, az: samples[i - 1].z, bx: p.x, bz: p.z, width });
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const path = new THREE.Mesh(geometry, material('#c6b384', { side: THREE.DoubleSide }));
    path.receiveShadow = true;
    world.add(path);
  }
  paths.forEach((p, i) => addPath(p, i === 0 ? 4.2 : 2.6));
  function distanceToPath(x, z) {
    let min = Infinity;
    for (const s of z > -162 ? originalScatterSegments : segments) {
      const dx = s.bx - s.ax, dz = s.bz - s.az;
      const t = clamp(((x - s.ax) * dx + (z - s.az) * dz) / (dx * dx + dz * dz), 0, 1);
      min = Math.min(min, Math.hypot(x - s.ax - t * dx, z - s.az - t * dz) - s.width / 2);
    }
    return min;
  }
  // Woodland vegetation uses the exact original road sampling. Extending the
  // curve must not reshuffle old tree IDs, acorns, sticks, or squirrel homes.
  const originalScatterSegments = [];
  const oldTrail = [...trailPoints.slice(0, 13), new THREE.Vector2(0, -162), new THREE.Vector2(1, -184),
    new THREE.Vector2(-9, -220), new THREE.Vector2(-25, -267), new THREE.Vector2(-19, -330)];
  for (const [pathIndex, points] of [oldTrail, ...paths.slice(1)].entries()) {
    const curve = new THREE.CatmullRomCurve3(points.map(v => new THREE.Vector3(v.x, 0, v.y)));
    const samples = curve.getPoints(Math.ceil(curve.getLength() / .65));
    for (let i = 1; i < samples.length; i++) originalScatterSegments.push({ ax: samples[i-1].x, az: samples[i-1].z,
      bx: samples[i].x, bz: samples[i].z, width: pathIndex === 0 ? 4.2 : 2.6 });
  }
  // A generous, slightly irregular village green.
  const square = new THREE.CircleGeometry(6.8, 32);
  square.rotateX(-Math.PI / 2);
  const sqv = square.attributes.position;
  for (let i = 0; i < sqv.count; i++) {
    const x = sqv.getX(i), z = sqv.getZ(i) + 5;
    sqv.setXYZ(i, x, groundHeight(x, z) + .06, z);
  }
  square.computeVertexNormals();
  const plaza = new THREE.Mesh(square, material('#cabb8b')); plaza.receiveShadow = true; world.add(plaza);

  // Worn ground marks places to practice without enclosing the forest with walls.
  function wornPatch(x, z, radius, tint, edgeScale = 1) {
    const geometry = new THREE.CircleGeometry(radius, 32);
    geometry.rotateX(-Math.PI / 2);
    const p = geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const localX = p.getX(i), localZ = p.getZ(i);
      const irregular = i ? 1 + Math.sin(i * 2.1) * .045 : 1;
      const px = x + localX * irregular, pz = z + localZ * irregular * edgeScale;
      p.setXYZ(i, px, groundHeight(px, pz) + .028, pz);
    }
    geometry.computeVertexNormals();
    const patch = new THREE.Mesh(geometry, material(tint));
    patch.receiveShadow = true;
    world.add(patch);
  }
  wornPatch(training.x, training.z, 2.2, '#b9aa7b', .88);
  wornPatch(encounter.x, encounter.z, 7.4, '#9ba967', 1.03);

  // Shallow, gently animated turquoise water, with a soft foam line.
  const waterGeometry = new THREE.PlaneGeometry(700, 440, 95, 65);
  waterGeometry.rotateX(-Math.PI / 2);
  const waterMaterial = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, shallow: { value: new THREE.Color('#65bdba') }, deep: { value: new THREE.Color('#328e9c') } },
    vertexShader: `uniform float time; varying vec3 vWorld; varying float vWave;
      void main() { vec3 p=position; float w=sin(p.x*.12+time*.65)*.10+sin(p.z*.19+p.x*.035+time*.8)*.055;
      p.y+=w; vWave=w; vec4 world=modelMatrix*vec4(p,1.); vWorld=world.xyz; gl_Position=projectionMatrix*viewMatrix*world; }`,
    fragmentShader: `uniform float time; uniform vec3 shallow; uniform vec3 deep; varying vec3 vWorld; varying float vWave;
      void main() { float band=sin(vWorld.x*.26+vWorld.z*.47+time*.7)*sin(vWorld.x*.45-vWorld.z*.1+time*.21);
      vec3 col=mix(shallow,deep,smoothstep(28.,115.,vWorld.z)); col+=vWave*.32;
      float sparkle=pow(max(0.,band),22.); col+=vec3(.21,.25,.20)*sparkle;
      gl_FragColor=vec4(col,1.); }`,
  });
  const water = new THREE.Mesh(waterGeometry, waterMaterial);
  water.position.set(0, .06, 214); world.add(water);
  const shorePositions = [];
  for (let x = -170; x <= 170; x += 1.5) {
    const z = 31 + Math.sin(x * .055) * 2.8 + Math.cos(x * .15) * .65;
    shorePositions.push(x, .11, z, x, .115, z + .24 + Math.sin(x * .2) * .09);
  }
  const shoreIndices = [];
  for (let i = 2; i < shorePositions.length / 3; i += 2) shoreIndices.push(i - 2, i, i - 1, i - 1, i, i + 1);
  const shoreGeometry = new THREE.BufferGeometry();
  shoreGeometry.setAttribute('position', new THREE.Float32BufferAttribute(shorePositions, 3)); shoreGeometry.setIndex(shoreIndices);
  const shoreFoam = new THREE.Mesh(shoreGeometry, new THREE.MeshBasicMaterial({ color: '#ddf2d9', transparent: true, opacity: .38, side: THREE.DoubleSide }));
  world.add(shoreFoam);

  const pondGeometry = new THREE.CircleGeometry(pond.radius, 72);
  pondGeometry.rotateX(-Math.PI / 2);
  const pondMaterial = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: `varying vec3 p; void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform float time;varying vec3 p;void main(){
      float wave=sin(p.x*2.4+p.z*.8+time*.7)*sin(p.z*1.7-p.x*.5-time*.45);
      float edge=smoothstep(2.8,5.4,length(p.xz));
      vec3 color=mix(vec3(.105,.285,.255),vec3(.25,.44,.31),edge);
      color+=vec3(.11,.17,.13)*pow(max(0.,wave),12.);
      gl_FragColor=vec4(color,1.);}`,
  });
  const pondWater = new THREE.Mesh(pondGeometry, pondMaterial);
  pondWater.name = 'Willowmere forest pond'; pondWater.position.set(pond.x, pond.surfaceY + .027, pond.z); world.add(pondWater);
  colliders.push({ x: pond.x, z: pond.z, r: pond.radius - .04, kind: 'pond-water' });

  // Pier: individually laid boards, worn posts, and gently sagging hemp ropes.
  const boardCount = 35;
  const dockBoards = new THREE.InstancedMesh(cube, material('#b48d61'), boardCount);
  for (let i = 0; i < boardCount; i++) {
    dummy.position.set(0, 1.67, 22 + i * .75);
    dummy.rotation.set(0, range(-.009, .009), 0); dummy.scale.set(4.3, .26, .72); dummy.updateMatrix();
    dockBoards.setMatrixAt(i, dummy.matrix); dockBoards.setColorAt(i, color.setHSL(.092, .30, range(.43, .55)));
  }
  dockBoards.castShadow = true; dockBoards.receiveShadow = true; world.add(dockBoards);
  box(darkWood, -1.65, 1.32, 34.8, .25, .4, 26.5); box(darkWood, 1.65, 1.32, 34.8, .25, .4, 26.5);
  function rope(points, radius = .033, mat = material('#d7c198'), parent = world) {
    const geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), Math.max(6, points.length * 6), radius, 4, false);
    return mesh(geometry, mat, 0, 0, 0, 1, 1, 1, parent);
  }
  for (const side of [-1, 1]) {
    let previous = null;
    for (let z = 24; z <= 48; z += 4) {
      post(wood, side * 2.1, 1.2, z, .16, 4.2);
      post(woodLight, side * 2.1, 3.31, z, .19, .11);
      if (previous !== null) {
        // Leave the last berth open so the arrival boat reads as accessible.
        if (!(side === -1 && z === 44)) rope([new THREE.Vector3(side * 2.1, 2.88, previous), new THREE.Vector3(side * 2.1, 2.52, z - 2), new THREE.Vector3(side * 2.1, 2.88, z)]);
      }
      previous = z;
    }
  }
  // Arrival ramp joins the raised timber deck to the beach path.
  const ramp = new THREE.BufferGeometry();
  ramp.setAttribute('position', new THREE.Float32BufferAttribute([-2.15,1.8,22, 2.15,1.8,22, -2.15,groundHeight(-2.15,19)+.035,19, 2.15,groundHeight(2.15,19)+.035,19], 3));
  ramp.setIndex([0,1,2,1,3,2]); ramp.computeVertexNormals();
  const rampMesh = new THREE.Mesh(ramp, woodLight); rampMesh.receiveShadow = true; world.add(rampMesh);

  function boat(x, z, scale = 1, rotation = 0, sail = false) {
    const group = new THREE.Group(); group.position.set(x, .38, z); group.rotation.y = rotation; group.scale.setScalar(scale); world.add(group);
    const outline = [[0,-3.2], [1.1,-2.1], [1.3,.9], [.82,2.55], [0,3.1], [-.82,2.55], [-1.3,.9], [-1.1,-2.1]];
    const bp = [], bi = [];
    for (const [bx,bz] of outline) { bp.push(bx,.67,bz, bx*.53,-.35,bz*.78); }
    for (let i = 0; i < outline.length; i++) { const a=i*2,b=((i+1)%outline.length)*2; bi.push(a,b,a+1,b,b+1,a+1); }
    const hull = new THREE.BufferGeometry(); hull.setAttribute('position',new THREE.Float32BufferAttribute(bp,3)); hull.setIndex(bi); hull.computeVertexNormals();
    mesh(hull, material('#497c80', { side: THREE.DoubleSide }), 0,0,0,1,1,1,group);
    box(woodLight,0,-.08,0,1.5,.16,4.4,group);
    [-1.6,-.1,1.45].forEach(bz => box(woodLight,0,.53,bz,2.07,.16,.32,group));
    const rail = outline.map(([bx,bz])=>new THREE.Vector3(bx,.72,bz)); rail.push(rail[0]); rope(rail,.09,woodLight,group);
    if (sail) {
      post(wood,0,2.7,-.45,.085,5.8,group);
      const sailGeometry = new THREE.BufferGeometry();
      sailGeometry.setAttribute('position',new THREE.Float32BufferAttribute([.1,5.5,-.45, .1,1.3,-.45, 2.8,1.55,-.3],3)); sailGeometry.computeVertexNormals();
      mesh(sailGeometry,material('#f2e6bd',{side:THREE.DoubleSide}),0,0,0,1,1,1,group);
      rope([new THREE.Vector3(0,5.5,-.45),new THREE.Vector3(0,.72,2.9)],.018,material('#e7d1a3'),group);
      const flag = box(material('#e4ac59'),0,5.62,-.45,.85,.32,.028,group); flag.position.x=.41;
    } else {
      const oar=box(woodLight,.65,.85,.4,.09,.09,4.3,group);oar.rotation.y=.45;
      const blade=box(woodLight,1.51,.85,2.17,.33,.08,.65,group);blade.rotation.y=.45;
    }
    return group;
  }
  const arrivalBoat = boat(-5.0,43,1,-.12,true);
  // A boarding plank lets the opening traveler actually leave the boat.
  const gangplank = box(woodLight,-3.25,1.36,43,3.25,.12,.95);
  gangplank.rotation.z=.25;
  rope([new THREE.Vector3(-2.1,2.6,44),new THREE.Vector3(-3.1,1.55,44.2),new THREE.Vector3(-3.8,1.1,44.5)],.038);
  const fishingBoat = boat(-18,31,.72,1.05,false);
  boat(28,33,.62,-.8,false);
  boat(-56,97,.6,1.1,true);
  boat(66,118,.74,-.65,true);

  // Houses have proper gables, thick roof eaves, framing, flower boxes and chimneys.
  const houseLocations = [];
  const smokeSources = [];
  function roofGeometry(width, depth, rise) {
    const w=width/2,d=depth/2;
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute([-w,0,-d,w,0,-d,0,rise,-d, -w,0,d,w,0,d,0,rise,d],3));
    geometry.setIndex([0,2,1,3,4,5,0,3,5,0,5,2,1,2,5,1,5,4,0,1,4,0,4,3]);geometry.computeVertexNormals();return geometry;
  }
  function cottage(x,z,width,depth,height,roofColor,wallColor,angle=0) {
    const y=groundHeight(x,z);
    const group=new THREE.Group();group.position.set(x,y,z);group.rotation.y=angle;world.add(group);
    houseLocations.push({x,z,r:Math.max(width,depth)*.72});
    colliders.push({x,z,r:Math.max(width,depth)*.62,kind:'house',width,depth,angle});
    box(material('#929580'),0,.2,0,width+.35,.7,depth+.3,group);
    box(material(wallColor),0,height/2+.38,0,width,height,depth,group);
    box(darkWood,0,.59,depth/2+.035,width,.19,.13,group);
    box(darkWood,0,height+.28,depth/2+.035,width,.17,.14,group);
    for(const sx of [-1,1])for(const sz of [-1,1])box(wood,sx*(width/2-.06),height/2+.35,sz*(depth/2+.02),.18,height+.14,.18,group);
    const roofBase=height+.33;
    mesh(roofGeometry(width+.95,depth+1.05,1.85),material(roofColor),0,roofBase,0,1,1,1,group);
    box(material('#d4a66f'),0,roofBase+1.85,0,.18,.15,depth+1.14,group);
    for(const side of [-1,1]){
      const trim=box(darkWood,side*(width+.95)/4,roofBase+.92,depth/2+.55,Math.hypot((width+.95)/2,1.85),.15,.16,group);
      trim.rotation.z=-side*Math.atan2(1.85,(width+.95)/2);
    }
    box(darkWood,0,1.32,depth/2+.09,1.12,2.02,.17,group);
    box(material('#997348'),0,1.32,depth/2+.19,.89,1.88,.10,group);
    for(let k=-1;k<=1;k++)box(wood,k*.23,1.32,depth/2+.26,.028,1.87,.025,group);
    pebble(material('#d4b465'),.3,1.25,depth/2+.3,.055,.055,.035,group);
    box(rockMat,0,.26,depth/2+.52,1.55,.3,.8,group);
    for(const side of [-1,1]) {
      const wx=side*width*.31;
      box(darkWood,wx,2.03,depth/2+.075,1.08,1.18,.15,group);
      box(windowMat,wx,2.03,depth/2+.17,.86,.94,.04,group);
      box(wood,wx,2.03,depth/2+.21,.075,1.0,.05,group);
      box(wood,wx,2.03,depth/2+.215,.91,.075,.055,group);
      for(const shutter of [-1,1])box(material(roofColor),wx+shutter*.65,2.03,depth/2+.14,.26,1.13,.08,group);
      box(woodLight,wx,1.34,depth/2+.35,1.19,.27,.43,group);
      for(let f=0;f<5;f++)pebble(material(f%2?'#eeb679':'#d78082'),wx-.42+f*.21,1.62,depth/2+.38,.13,.17,.13,group);
    }
    // One side window catches the afternoon light from the approach.
    box(darkWood,width/2+.075,2.05,0,.14,1.1,1.05,group);
    box(windowMat,width/2+.155,2.05,0,.035,.87,.84,group);
    box(wood,width/2+.19,2.05,0,.05,.92,.07,group);
    const chimneyX=-width*.27,chimneyZ=-depth*.21;
    box(material('#b38e77'),chimneyX,roofBase+1.45,chimneyZ,.61,2.1,.65,group);
    box(material('#cbb19a'),chimneyX,roofBase+2.48,chimneyZ,.8,.16,.81,group);
    const source=new THREE.Vector3(chimneyX,roofBase+2.64,chimneyZ).applyAxisAngle(new THREE.Vector3(0,1,0),angle).add(group.position);
    smokeSources.push(source);
    return group;
  }
  cottage(-11,12,5.2,4.7,3.15,'#bf785e','#e9dbad',.64);
  cottage(12,13,6.0,5.3,3.8,'#547f7b','#efdb9f',-.61);
  cottage(-16,0,6.0,5.0,3.45,'#87905a','#eeddb4',1.19);
  cottage(16,-2,6.3,5.5,3.15,'#d19b55','#e8d1a0',-1.20);
  cottage(-10,-13,5.6,4.8,3.5,'#6d8895','#efe0b9',.44);
  cottage(11,-21,5.9,5.3,3.45,'#bd8062','#e9d4a8',-.37);
  cottage(-25,-12,6.2,5.2,3.25,'#ae8564','#e8d4a6',.85);
  cottage(29,8,5.5,5.1,3.0,'#73876b','#eadcb9',-1.38);
  cottage(27,-20,5.6,4.6,3.15,'#648d90','#eddfb5',-.75);

  function barrel(x,z,scale=1,parent=world,y=groundHeight(x,z)) {
    const barrelGeo=new THREE.CylinderGeometry(.38,.35,.95,9);
    mesh(barrelGeo,woodLight,x,y+.48*scale,z,scale,scale,scale,parent);
    const hoop=material('#59605a');
    [.18,.75].forEach(h=>post(hoop,x,y+h*scale,z,.391*scale,.06*scale,parent));
    post(wood,x,y+.975*scale,z,.33*scale,.028,parent);
  }
  function crate(x,z,size=.8,y=groundHeight(x,z),parent=world) {
    box(woodLight,x,y+size/2,z,size,size,size,parent);
    for(const dx of [-1,1])for(const dz of [-1,1])box(wood,x+dx*size*.43,y+size*.5,z+dz*size*.5,size*.095,size,size*.09,parent);
    const diagonal=box(wood,x,y+size*.5,z+size*.512,size*1.14,size*.095,size*.045,parent);diagonal.rotation.z=Math.PI/4;
  }
  barrel(2.95,19,.95);barrel(3.76,18.6,.78);crate(5.0,18.7,.88);crate(5.05,18.7,.57,groundHeight(5.05,18.7)+.89);
  crate(-1.15,37.2,.68,1.8);barrel(-1.24,35.9,.62,world,1.8);
  barrel(-15.0,19.6,.85);crate(-16.0,20.2,.75);barrel(19,2,.85);crate(-19,-2,.84);
  // The western cottage belongs to Tidehaven's acorn cook. Her outdoor work
  // table puts a little everyday life beside the village green.
  const acornCook = { x: -5.6, z: 9.1 };
  const cookTable = { x: -7.5, z: 9.9 }, cookY = groundHeight(cookTable.x, cookTable.z);
  box(woodLight, cookTable.x, cookY + .82, cookTable.z, 1.65, .12, .85);
  for (const dx of [-.66, .66]) for (const dz of [-.28, .28])
    box(wood, cookTable.x + dx, cookY + .40, cookTable.z + dz, .12, .80, .12);
  colliders.push({ x: cookTable.x, z: cookTable.z, hx: .84, hz: .44, kind: 'cook-table' });
  // A shallow woven basket, a leaching bowl, a wooden spoon, and drying nuts.
  const basketMat = material('#aa7c49'), nutMat = material('#915630'), capMat = material('#654a32');
  post(basketMat, cookTable.x - .41, cookY + 1.0, cookTable.z, .27, .24);
  const basketRim = new THREE.TorusGeometry(.255, .031, 4, 10); basketRim.rotateX(Math.PI / 2);
  mesh(basketRim, woodLight, cookTable.x - .41, cookY + 1.13, cookTable.z);
  for (let i = 0; i < 8; i++) {
    const a = i * 2.4, nx = cookTable.x - .41 + Math.cos(a) * .16, nz = cookTable.z + Math.sin(a) * .14;
    pebble(nutMat, nx, cookY + 1.12 + (i % 2) * .035, nz, .065, .075, .061);
    pebble(capMat, nx, cookY + 1.17 + (i % 2) * .035, nz, .07, .03, .065);
  }
  post(material('#b98e69'), cookTable.x + .35, cookY + .98, cookTable.z, .25, .18);
  post(material('#74999b'), cookTable.x + .35, cookY + 1.077, cookTable.z, .205, .009);
  const spoon = box(wood, cookTable.x + .62, cookY + .92, cookTable.z + .23, .06, .025, .42);
  spoon.rotation.y = .5;
  pebble(woodLight, cookTable.x + .52, cookY + .92, cookTable.z + .05, .09, .018, .11);
  // Fishing racks and a fine rope net on the sandy western edge.
  for(const x of [-17.4,-13.2])post(wood,x,groundHeight(x,22)+1.35,22,.095,2.7);
  const netTop=groundHeight(-15.3,22)+2.5;
  rope([new THREE.Vector3(-17.4,netTop,22),new THREE.Vector3(-15.3,netTop-.3,22),new THREE.Vector3(-13.2,netTop,22)],.035);
  const netPositions=[];
  for(let i=0;i<=10;i++){const x=-17.4+i*.42;netPositions.push(x,netTop-.1,22,x,netTop-1.55,22.05);}
  for(let i=0;i<6;i++)netPositions.push(-17.4,netTop-.15-i*.27,22,-13.2,netTop-.15-i*.27,22);
  const netGeo=new THREE.BufferGeometry();netGeo.setAttribute('position',new THREE.Float32BufferAttribute(netPositions,3));
  const net=new THREE.LineSegments(netGeo,new THREE.LineBasicMaterial({color:'#c5b394',transparent:true,opacity:.75}));world.add(net);
  for(let i=0;i<6;i++){
    const fish=pebble(material(i%2?'#a9c3c0':'#789b9e'),-17+i*.6,netTop-.45-i%2*.2,22.12,.105,.31,.065);fish.rotation.z=.15;
  }

  function fence(x,z,length,rotation=0) {
    const group=new THREE.Group();group.position.set(x,groundHeight(x,z),z);group.rotation.y=rotation;world.add(group);
    for(let f=-length/2;f<=length/2+.1;f+=1.35)box(woodLight,f,.67,0,.11,1.3,.12,group);
    box(woodLight,0,.51,0,length,.12,.10,group);box(woodLight,0,1.04,0,length,.11,.10,group);
  }
  fence(-23,5,6,-.12);fence(-26.5,1,7,.12+Math.PI/2);fence(23,-9,6,-.08);fence(34,4,5,Math.PI/2);
  fence(-18,-23,7,.1);fence(18,-29,6,-.08);
  // Modest herb gardens, their rows visible between cottages.
  for(const [gx,gz] of [[-24,1],[23,-10],[-18,-21]]) {
    box(material('#887553'),gx,groundHeight(gx,gz)+.045,gz,4.5,.09,2.4);
    for(let i=0;i<12;i++){
      const px=gx-1.8+(i%6)*.7,pz=gz-.65+Math.floor(i/6)*1.25;
      pebble(material('#5f9150'),px,groundHeight(px,pz)+.25,pz,.3,.27,.32);
    }
  }
  // Village notice shelter and a quiet well, away from the through path.
  const wellX=-5.7,wellZ=1.5,wellY=groundHeight(wellX,wellZ);
  const wellRing=new THREE.TorusGeometry(1,.26,5,12);wellRing.rotateX(Math.PI/2);
  mesh(wellRing,material('#a8a18a'),wellX,wellY+.6,wellZ);
  post(material('#4b6e6b'),wellX,wellY+.2,wellZ,.83,.07);
  [-1,1].forEach(s=>box(wood,wellX+s*1.1,wellY+1.6,wellZ,.15,3.2,.16));
  mesh(roofGeometry(2.85,2.5,.72),material('#849273'),wellX,wellY+3.15,wellZ);
  box(woodLight,wellX,wellY+2.35,wellZ,2.25,.13,.13);
  rope([new THREE.Vector3(wellX,wellY+2.35,wellZ),new THREE.Vector3(wellX,wellY+.55,wellZ)],.027);
  colliders.push({x:wellX,z:wellZ,r:1.3});
  const signY=groundHeight(4.4,15.1);
  post(wood,4.4,signY+1.25,15.1,.11,2.5);
  box(woodLight,4.4,signY+2.23,15.1,1.72,.65,.12);
  // Road signs are icon-like shapes; labels and lore are supplied by the game HUD.
  const arrowGeo=new THREE.Shape();arrowGeo.moveTo(-.55,-.09);arrowGeo.lineTo(.15,-.09);arrowGeo.lineTo(.15,-.23);arrowGeo.lineTo(.53,0);arrowGeo.lineTo(.15,.23);arrowGeo.lineTo(.15,.09);arrowGeo.lineTo(-.55,.09);
  mesh(new THREE.ShapeGeometry(arrowGeo),material('#f0dfb4',{side:THREE.DoubleSide}),4.4,signY+2.23,15.18);
  // Warm lanterns establish a welcoming arrival, including in shadowed lanes.
  function lantern(x,z,h=3.2) {
    const y=heightAt(x,z);
    post(wood,x,y+h/2,z,.075,h);box(darkWood,x+.27,y+h-.12,z,.64,.075,.075);
    box(windowMat,x+.5,y+h-.45,z,.25,.43,.25);
    box(darkWood,x+.5,y+h-.71,z,.33,.09,.33);box(darkWood,x+.5,y+h-.2,z,.36,.09,.36);
    for(const dx of [-.13,.13])for(const dz of [-.13,.13])box(darkWood,x+.5+dx,y+h-.45,z+dz,.027,.45,.027);
  }
  lantern(2.15,26,2.9);lantern(-3.6,16.0);lantern(5.3,-5);lantern(-9,-29);

  // The village's practice post is a padded sack on a work stand, not a person.
  // Only the sack moves when struck; timber and foot braces join the scenery batches.
  const trainingY = groundHeight(training.x, training.z);
  const trainingStand = new THREE.Group();
  trainingStand.name = 'Village practice post';
  trainingStand.position.set(training.x, trainingY, training.z);
  world.add(trainingStand);
  post(wood, 0, 1.05, 0, .105, 2.1, trainingStand);
  box(woodLight, 0, 1.57, 0, 1.45, .15, .18, trainingStand);
  const footA = box(darkWood, 0, .12, 0, .95, .16, .18, trainingStand);
  footA.rotation.y = .56;
  const footB = box(wood, 0, .12, 0, .95, .16, .18, trainingStand);
  footB.rotation.y = -.56;
  const sack = new THREE.Group();
  sack.name = 'Straw practice sack';
  sack.position.set(0, 1.85, 0);
  trainingStand.add(sack);
  const straw = material('#c7ad70');
  const binding = material('#8d754d');
  mesh(cylinder, straw, 0, -.51, .07, .43, 1.00, .29, sack);
  pebble(straw, 0, -.07, .07, .38, .17, .27, sack);
  pebble(straw, 0, -.98, .07, .36, .14, .25, sack);
  [-.22, -.78].forEach(y => mesh(cylinder, binding, 0, y, .07, .444, .065, .304, sack));
  // A short seam and rough straw ends make the silhouette read as a stuffed bag.
  box(binding, .12, -.51, .365, .028, .90, .026, sack);
  for (let i = 0; i < 5; i++) {
    const tuft = box(cream, -.16 + i * .08, .055 + (i % 2) * .035, .04, .026, .16, .025, sack);
    tuft.rotation.z = (i - 2) * .17;
  }
  colliders.push({ x: training.x, z: training.z, r: .5, kind: 'training' });
  training.object = sack;
  training.y = trainingY;

  // A shared village grindstone stands beside the crossroads. Its clear west
  // approach is the interaction point, leaving both the road and practice sack
  // unobstructed. The little sword sign identifies its purpose from the lane.
  const repairX = repairBench.x + 1.5, repairZ = repairBench.z;
  const repairY = groundHeight(repairX, repairZ);
  const repairProps = new THREE.Group(); repairProps.name = repairBench.name;
  repairProps.position.set(repairX, repairY, repairZ); world.add(repairProps);
  box(woodLight, 0, .77, 0, 1.7, .15, .94, repairProps);
  for (const dx of [-.66, .66]) for (const dz of [-.32, .32])
    box(wood, dx, .36, dz, .15, .72, .15, repairProps);
  box(darkWood, 0, .25, 0, 1.48, .12, .58, repairProps);
  const iron = material('#737872', { metalness: .35, roughness: .8 });
  const wheel = mesh(new THREE.CylinderGeometry(.43, .43, .18, 16),
    material('#a09e8c'), .14, 1.2, -.06, 1, 1, 1, repairProps);
  wheel.rotation.x = Math.PI / 2;
  for (const z of [-.25, .15]) box(darkWood, .14, 1.0, z, .14, .44, .12, repairProps);
  const axle = post(iron, .14, 1.2, .02, .055, .72, repairProps); axle.rotation.x = Math.PI / 2;
  box(woodLight, .14, 1.07, .4, .095, .30, .095, repairProps);
  const crank = post(wood, .14, .94, .48, .057, .20, repairProps); crank.rotation.x = Math.PI / 2;
  box(material('#c5c3a7'), -.56, .88, .16, .35, .08, .16, repairProps);
  post(material('#98704a'), -.53, .91, -.27, .10, .16, repairProps);
  post(darkWood, .67, 1.41, -.36, .055, 1.35, repairProps);
  box(woodLight, .67, 1.91, -.36, .52, .62, .10, repairProps);
  const signMetal = material('#e0d2a8');
  box(signMetal, .67, 2.0, -.299, .053, .29, .017, repairProps);
  box(signMetal, .67, 1.835, -.294, .25, .046, .023, repairProps);
  box(darkWood, .67, 1.76, -.29, .057, .11, .029, repairProps);
  colliders.push({ x: repairX, z: repairZ, hx: .87, hz: .49, kind: 'repair-bench' });

  // The warning bell sits beside the path where the village becomes woodland.
  const bellX = 4, bellZ = -25, bellY = groundHeight(bellX, bellZ);
  const bellFrame = new THREE.Group();
  bellFrame.name = 'Greenway warning bell';
  bellFrame.position.set(bellX, bellY, bellZ);
  world.add(bellFrame);
  for (const side of [-1, 1]) {
    post(wood, side * .58, 1.6, 0, .10, 3.2, bellFrame);
    colliders.push({ x: bellX + side * .58, z: bellZ, r: .14 });
  }
  box(woodLight, 0, 3.19, 0, 1.42, .17, .22, bellFrame);
  const bellSwing = new THREE.Group();
  bellSwing.position.y = 3.1;
  bellFrame.add(bellSwing);
  const bellMetal = material('#ac975c', { metalness: .45, roughness: .52 });
  mesh(new THREE.CylinderGeometry(.15, .39, .48, 10, 1, true), bellMetal, 0, -.35, 0, 1, 1, 1, bellSwing);
  const bellRim = new THREE.TorusGeometry(.36, .038, 4, 10);
  bellRim.rotateX(Math.PI / 2);
  mesh(bellRim, bellMetal, 0, -.59, 0, 1, 1, 1, bellSwing);
  post(darkWood, 0, -.1, 0, .05, .2, bellSwing);
  const bellTongue = new THREE.Group();
  bellTongue.position.y = -.17;
  bellSwing.add(bellTongue);
  post(darkWood, 0, -.27, 0, .025, .54, bellTongue);
  pebble(bellMetal, 0, -.53, 0, .071, .09, .071, bellTongue);
  rope([new THREE.Vector3(.37, 2.86, .03), new THREE.Vector3(.4, 1.37, .06)], .023, cream, bellFrame);
  let bellStarted = -Infinity;
  let worldTime = 0;
  const buntingA=new THREE.Vector3(-8,5.8,7),buntingB=new THREE.Vector3(7,5.6,7);
  rope([buntingA,new THREE.Vector3(0,4.9,7),buntingB],.022);
  for(let i=0;i<13;i++){
    const t=(i+.5)/13,x=THREE.MathUtils.lerp(-8,7,t),y=5.8-.2*t-.75*Math.sin(t*Math.PI);
    const flagGeo=new THREE.BufferGeometry();flagGeo.setAttribute('position',new THREE.Float32BufferAttribute([-.28,0,0,.28,0,0,0,-.55,.03],3));flagGeo.computeVertexNormals();
    mesh(flagGeo,material(['#dba168','#749b95','#ddba70','#c88b7c'][i%4],{side:THREE.DoubleSide}),x,y,7);
  }

  // Woodland waystation, the first destination beyond the settlement.
  const wy=groundHeight(0,-66);
  const archMat=material('#756245');
  [-3.9,3.9].forEach(x=>{post(archMat,x,groundHeight(x,-66)+2.4,-66,.26,4.8);colliders.push({x,z:-66,r:.36});});
  const arch=box(woodLight,0,wy+4.72,-66,8.4,.32,.36);arch.rotation.z=-.015;
  box(wood,0,wy+4.02,-66,2.35,.75,.15);
  // A leaf emblem over the woodland gate.
  const leaf=pebble(material('#c9d3a0'),0,wy+4.04,-65.9,.20,.31,.055);leaf.rotation.z=-.5;
  cottage(-10,-68,4.9,4.0,2.8,'#748770','#dfd6b3',.83);
  const benchX=5.6,benchZ=-63,benchY=groundHeight(benchX,benchZ);
  box(woodLight,benchX,benchY+.62,benchZ,2.7,.14,.65);
  [-1,1].forEach(s=>box(wood,benchX+s*.95,benchY+.3,benchZ,.15,.6,.49));
  box(woodLight,benchX,benchY+1.15,benchZ-.32,2.7,.5,.12);
  colliders.push({x:benchX,z:benchZ,r:1.15});
  const markerX=31,markerZ=-59,markerY=groundHeight(markerX,markerZ);
  const standingStone=pebble(material('#899b8f'),markerX,markerY+1.7,markerZ,1.3,2.1,.8);standingStone.rotation.z=-.1;
  colliders.push({x:markerX,z:markerZ,r:1.25});
  // A small ancient turquoise inset is a visual hint of the larger world.
  const inset=box(material('#96c5b1',{emissive:'#569e89',emissiveIntensity:.24}),markerX,markerY+1.9,markerZ+.68,.13,.76,.08);inset.rotation.z=.42;

  // Small, repeated trail signs carry the same pale arrow through the northern
  // woodland. They sit beside the road, leaving its full width available.
  const roadSigns = [];
  const roadSignLabels = ['Sunmeadow Plain', 'Windmill & farms', 'Reedwater Crossing', 'Reedwater Bridge',
    'Reedcutters’ Camp', 'Threefold Rise', 'The Waymarkers', 'North Relay', 'Quiet fishing bank', 'Eastreena', 'Return to bridge',
    ...forestPlaceDefinitions.map(site => site.name), 'Village road'];
  const signRowHeight = 56;
  const signAtlas = (() => {
    // A single small code-drawn atlas serves every named road sign. Headless
    // physics tests use a one-pixel fallback; the game draws the actual type.
    if (typeof document === 'undefined') {
      const texture = new THREE.DataTexture(new Uint8Array([171,121,80,255]),1,1);
      texture.needsUpdate = true; return texture;
    }
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ab7950'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '600 40px Georgia, serif';
    roadSignLabels.forEach((label,index) => {
      ctx.fillStyle = '#513c2c'; ctx.fillText(label,256,index*signRowHeight+signRowHeight/2+2,490);
      ctx.fillStyle = '#fff0c9'; ctx.fillText(label,256,index*signRowHeight+signRowHeight/2,490);
    });
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4; return texture;
  })();
  const signLettering = new THREE.MeshStandardMaterial({ color: '#ffffff', map: signAtlas, roughness: 1 });
  function signFace(label, z, rotation, parent) {
    const row = Math.max(0,roadSignLabels.indexOf(label)), geometry = new THREE.PlaneGeometry(2.23,.43);
    const uv = geometry.attributes.uv;
    for(let i=0;i<uv.count;i++)uv.setY(i,(1024-(row+1)*signRowHeight+uv.getY(i)*signRowHeight)/1024);
    const face = mesh(geometry,signLettering,.22,0,z,1,1,1,parent); face.rotation.y = rotation;
    if(rotation)face.position.x=-.22;
    face.castShadow=false;
  }
  function trailSign(x, z, direction = 1, label = '', signYaw = 0, returnLabel = label === 'Quiet fishing bank' ? 'Return to bridge' : 'Eastreena') {
    const y = groundHeight(x, z);
    // Named boards sit on top of their support. A full-height round post would
    // protrude through both thin faces and obscure the middle of the lettering.
    post(wood, x, y + (label ? .825 : 1.13), z, .095, label ? 1.65 : 2.26);
    if(label) {
      const head = new THREE.Group(); head.name=`Road sign: ${label}`; head.position.set(x,y+1.94,z);head.rotation.set(0,signYaw,.035*direction);world.add(head);
      box(woodLight,0,0,0,3.15,.70,.12,head);
      signFace(label,.073,0,head);signFace(returnLabel,-.073,Math.PI,head);
      for(const side of[-1,1]) {
        const arrow=mesh(new THREE.ShapeGeometry(arrowGeo),cream,side*1.30,0,-side*.079,.49,.49,1,head);
        arrow.rotation.set(0,side===1?Math.PI:0,Math.PI/2);
      }
      roadSigns.push({x,z,label,returnLabel,yaw:signYaw});
      colliders.push({x,z,r:.17});return;
    }
    const plank = box(woodLight, x, y + 1.94, z, 1.65, .48, .12);
    plank.rotation.z = .035 * direction;
    const arrow = mesh(new THREE.ShapeGeometry(arrowGeo), cream, x, y + 1.94, z + .074, .86, .86, 1);
    arrow.rotation.z = Math.PI / 2;
    colliders.push({ x, z, r: .17 });
  }
  trailSign(-6, -86);
  trailSign(-10.7, -105);
  trailSign(12.9, -129);

  wornPatch(northTrail.x, northTrail.z, 6.7, '#aaa87d', .82);
  const restX = northTrail.x + 4.9, restZ = northTrail.z + 1.2;
  const restY = groundHeight(restX, restZ);
  box(woodLight, restX, restY + .58, restZ, 2.5, .16, .72);
  box(woodLight, restX, restY + 1.08, restZ - .34, 2.5, .45, .12);
  for (const s of [-1, 1]) box(wood, restX + s * .87, restY + .26, restZ, .18, .52, .61);
  colliders.push({ x: restX, z: restZ, r: 1.1 });
  // Three weathered stones and a small lantern make an unmistakable place to stop.
  const cairnX = northTrail.x - 4.8, cairnZ = northTrail.z - 1.7, cairnY = groundHeight(cairnX, cairnZ);
  pebble(rockMat, cairnX, cairnY + .24, cairnZ, .68, .37, .56);
  pebble(rockMat, cairnX + .08, cairnY + .67, cairnZ, .48, .26, .41);
  pebble(rockMat, cairnX - .03, cairnY + 1.00, cairnZ + .05, .29, .17, .25);
  colliders.push({ x: cairnX, z: cairnZ, r: .65 });
  lantern(restX + 1.6, restZ - .2, 2.8);

  // The field gate now stands open. Its posts mark a district, not a loading wall.
  wornPatch(border.x, border.z, 7.6, '#b5b387', .83);
  const gateY = groundHeight(0, border.barrierZ);
  const gateHalfWidth = 3.8;
  for (const side of [-1, 1]) {
    const x = side * gateHalfWidth, y = groundHeight(x, border.barrierZ);
    box(rockMat, x, y + .31, border.barrierZ, .72, .62, .7);
    post(wood, x, y + 1.25, border.barrierZ, .19, 2.5);
    post(woodLight, x, y + 2.54, border.barrierZ, .23, .13);
    // A rope runs along the actual region edge, so wandering beside the gate
    // encounters a visible boundary rather than an unexplained invisible wall.
    let previousX = x;
    for (let distance = 8.8; distance <= 94; distance += 5) {
      const nextX = side * Math.min(distance, 94);
      const nextY = groundHeight(nextX, border.barrierZ);
      post(wood, nextX, nextY + .76, border.barrierZ, .09, 1.52);
      rope([
        new THREE.Vector3(previousX, groundHeight(previousX, border.barrierZ) + 1.13, border.barrierZ),
        new THREE.Vector3((previousX + nextX) / 2, groundHeight((previousX + nextX) / 2, border.barrierZ) + .94, border.barrierZ),
        new THREE.Vector3(nextX, nextY + 1.13, border.barrierZ),
      ], .035);
      previousX = nextX;
    }
  }
  for (const side of [-1, 1]) {
    for (const y of [.53, 1.22]) box(woodLight, side * gateHalfWidth, gateY + y, border.barrierZ - 1.8, .15, .16, 3.6);
    colliders.push({ x: side * gateHalfWidth, z: border.barrierZ, r: .35 });
  }
  const boundaryX = -4.8, boundaryZ = border.z + 1.0, boundaryY = groundHeight(boundaryX, boundaryZ);
  box(rockMat, boundaryX, boundaryY + .79, boundaryZ, .84, 1.58, .68);
  box(cream, boundaryX, boundaryY + .95, boundaryZ + .35, .48, .51, .04);
  // An engraved horizon line is the visual counterpart to the forest's leaf emblem.
  box(wood, boundaryX, boundaryY + .91, boundaryZ + .378, .36, .055, .025);
  const horizonSun = new THREE.CircleGeometry(.105, 12);
  mesh(horizonSun, material('#d4b465'), boundaryX, boundaryY + 1.06, boundaryZ + .379);
  colliders.push({ x: boundaryX, z: boundaryZ, r: .52 });

  // Forest placement respects each trail, cottage, NPC and small discovery clearing.
  const specialClearings=[{x:0,z:5,r:9},{x:0,z:-64,r:7.5},{x:31,z:-59,r:5.7},{x:-10,z:-68,r:5.5},
    {x:training.x,z:training.z,r:2.5},{x:encounter.x,z:encounter.z,r:encounter.radius}, {x:bellX,z:bellZ,r:1.4},
    {x:northTrail.x,z:northTrail.z,r:7.7},{x:border.x,z:border.z,r:11}];
  function canPlant(x,z,margin=0) {
    if(z>19 || Math.abs(x)<5 && z>12)return false;
    if(z < -153 + Math.cos(x * .073) * 3)return false;
    if(z < -126 && random() < smooth(126,154,-z) * .86)return false;
    if(distanceToPath(x,z)<2.0+margin)return false;
    if(houseLocations.some(h=>Math.hypot(x-h.x,z-h.z)<h.r+2.5+margin))return false;
    if(specialClearings.some(h=>Math.hypot(x-h.x,z-h.z)<h.r+margin))return false;
    if(Math.abs(x)<30 && z>-28 && random()<.83)return false;
    return true;
  }
  const trees=[];
  // A few deliberate silhouettes frame the bay and welcome the player up the pier.
  [[-25,17,1.35],[25,20,1.4],[-34,7,1.2],[37,5,1.5],[-11,-30,1.2],[10,-36,1.3]].forEach(([x,z,s])=>trees.push({x,z,s,pine:false,h:range(8.1,10.5),rot:range(0,6.28)}));
  let attempts=0;
  while(trees.length<610 && attempts++<18000){
    const x=range(-105,105),z=range(-157,22);
    if(!canPlant(x,z,.7)||trees.some(t=>Math.hypot(x-t.x,z-t.z)<3.0))continue;
    trees.push({x,z,s:range(.74,1.25),pine:z<-70?random()<.56:random()<.28,h:range(7,11),rot:range(0,Math.PI*2)});
  }
  const trunkMesh=new THREE.InstancedMesh(new THREE.CylinderGeometry(.21,.38,1,7),material('#795e41'),trees.length);
  const broadTrees=trees.filter(t=>!t.pine),pineTrees=trees.filter(t=>t.pine);
  const canopyMesh=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),material('#ffffff',{flatShading:true}),broadTrees.length*4);
  const pineMesh=new THREE.InstancedMesh(new THREE.ConeGeometry(1,1,7),material('#ffffff',{flatShading:true}),pineTrees.length*3);
  let broadIndex=0,pineIndex=0;
  trees.forEach((tree,i)=>{
    const {x,z,s,h,rot}=tree,y=groundHeight(x,z),th=h*s;
    // Retain the deterministic scatter and stable oak IDs. New clearings hide
    // only intersecting trees, without re-rolling the rest of Eastreena.
    tree.hidden=featureClear(x,z,true) || forestFeatureClear(x,z,true,th*.52) || forestHideoutClear(x,z,true,th*.52);
    dummy.position.set(x,y+th*.41,z);dummy.rotation.set(range(-.025,.025),rot,range(-.025,.025));dummy.scale.set(s,th*.82,s);if(tree.hidden)dummy.scale.setScalar(0);dummy.updateMatrix();trunkMesh.setMatrixAt(i,dummy.matrix);
    const axis = new THREE.Vector3(0, 1, 0).applyEuler(dummy.rotation);
    tree.trunk = { axis: axis.toArray(), base: { x: x - axis.x * th * .41, y: y + th * .41 - axis.y * th * .41, z: z - axis.z * th * .41 } };
    if(!tree.hidden&&x>-95&&x<95&&z>border.barrierZ)colliders.push({x,z,r:.52*s});
    if(tree.pine){
      for(let c=0;c<3;c++){
        dummy.position.set(x,y+th*(.48+c*.19),z);dummy.rotation.set(0,rot+c*.35,0);dummy.scale.set(th*(.29-c*.051),th*.49,th*(.29-c*.051));if(tree.hidden)dummy.scale.setScalar(0);dummy.updateMatrix();pineMesh.setMatrixAt(pineIndex,dummy.matrix);
        pineMesh.setColorAt(pineIndex++,color.setHSL(range(.25,.31),range(.28,.40),range(.28,.41)+c*.025));
      }
    }else{
      for(let c=0;c<4;c++){
        const a=rot+c*2.1,spread=c===3?0:th*.15;
        dummy.position.set(x+Math.sin(a)*spread,y+th*(c===3?.96:.77)+Math.sin(c*3)*.18,z+Math.cos(a)*spread);
        dummy.rotation.set(range(-.2,.2),a,range(-.18,.18));dummy.scale.set(th*(c===3?.28:.32),th*(c===3?.25:.31),th*(c===3?.27:.31));if(tree.hidden)dummy.scale.setScalar(0);dummy.updateMatrix();canopyMesh.setMatrixAt(broadIndex,dummy.matrix);
        canopyMesh.setColorAt(broadIndex++,color.setHSL(range(.215,.29),range(.32,.47),range(.37,.52)+(c===3?.025:0)));
      }
    }
  });
  [trunkMesh,canopyMesh,pineMesh].forEach(m=>{m.castShadow=true;m.receiveShadow=true;world.add(m);});

  // Ground cover uses one tiny shared crossed-blade mesh for thousands of tufts.
  const grassPositions=[],grassNormals=[];
  for(let b=0;b<5;b++){
    const a=b*2.4,bx=Math.cos(a)*.16,bz=Math.sin(a)*.16,w=.055,h=.24+(b%3)*.085;
    const cx=Math.cos(a+Math.PI/2)*w,cz=Math.sin(a+Math.PI/2)*w;
    grassPositions.push(bx-cx,0,bz-cz,bx+cx,0,bz+cz,bx+Math.cos(a)*.09,h,bz+Math.sin(a)*.09);
    for(let j=0;j<3;j++)grassNormals.push(0,1,0);
  }
  const grassGeometry=new THREE.BufferGeometry();grassGeometry.setAttribute('position',new THREE.Float32BufferAttribute(grassPositions,3));grassGeometry.setAttribute('normal',new THREE.Float32BufferAttribute(grassNormals,3));
  const grass=new THREE.InstancedMesh(grassGeometry,material('#ffffff',{side:THREE.DoubleSide}),4300);
  let grassIndex=0,grassAttempts=0;
  while(grassIndex<4300&&grassAttempts++<18000){
    const x=range(-88,88),z=range(-166,24);
    if(distanceToPath(x,z)<.15 || houseLocations.some(h=>Math.hypot(x-h.x,z-h.z)<h.r+.2)||specialClearings.some(h=>Math.hypot(x-h.x,z-h.z)<h.r*.58))continue;
    if(inLessonSpace(x,z) && random()<.76)continue;
    const y=groundHeight(x,z);if(y<.65)continue;
    dummy.position.set(x,y+.02,z);dummy.rotation.set(0,range(0,6.28),0);const s=range(.7,1.65)*(inLessonSpace(x,z)?.45:1);dummy.scale.set(s,s,s);dummy.updateMatrix();grass.setMatrixAt(grassIndex,dummy.matrix);
    grass.setColorAt(grassIndex++,color.setHSL(z < -140 ? range(.15,.22) : range(.20,.28),range(.35,.49),range(.34,.52)));
  }
  grass.count=grassIndex;grass.receiveShadow=true;world.add(grass);
  // Low flowering shrubs and a scattering of pale meadow blossoms.
  const bushCount=210,bushes=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),material('#ffffff'),bushCount);
  let bidx=0;
  for(let i=0;i<1800&&bidx<bushCount;i++){
    const x=range(-80,80),z=range(-149,19);
    if(distanceToPath(x,z)<1.4||houseLocations.some(h=>Math.hypot(x-h.x,z-h.z)<h.r+1)||inLessonSpace(x,z,1.2)||Math.hypot(x-bellX,z-bellZ)<2||specialClearings.some(h=>Math.hypot(x-h.x,z-h.z)<h.r*.7))continue;
    const s=range(.45,1.2);dummy.position.set(x,groundHeight(x,z)+s*.42,z);dummy.rotation.set(0,range(0,6.28),0);dummy.scale.set(s,s*.7,s*.85);dummy.updateMatrix();bushes.setMatrixAt(bidx,dummy.matrix);bushes.setColorAt(bidx++,color.setHSL(range(.22,.31),.34,range(.33,.46)));
  }
  bushes.count=bidx;bushes.castShadow=true;bushes.receiveShadow=true;world.add(bushes);
  const flowers=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),material('#ffffff'),600);
  let findex=0;
  const flowerColors=['#efe4b1','#eac780','#b8b9db','#e7a2a0','#e6e5c5'];
  for(let i=0;i<1800&&findex<600;i++){
    const x=range(-45,45),z=range(-158,22),d=distanceToPath(x,z);
    if(d<.28||d>9||houseLocations.some(h=>Math.hypot(x-h.x,z-h.z)<h.r+.6)||inLessonSpace(x,z,.5))continue;
    const count=Math.min(3,600-findex),fc=flowerColors[Math.floor(random()*flowerColors.length)];
    for(let f=0;f<count;f++){
      const fx=x+range(-.5,.5),fz=z+range(-.5,.5),s=range(.07,.13);
      dummy.position.set(fx,groundHeight(fx,fz)+range(.2,.38),fz);dummy.rotation.set(0,range(0,6.28),0);dummy.scale.set(s,s*.48,s);dummy.updateMatrix();flowers.setMatrixAt(findex,dummy.matrix);flowers.setColorAt(findex++,color.set(fc));
    }
  }
  flowers.count=findex;world.add(flowers);
  const rocks=new THREE.InstancedMesh(round,rockMat,145);
  for(let i=0;i<145;i++){
    let x,z;
    do {
      if(i<75){x=range(-95,95);z=range(23,31);}else{x=range(-100,100);z=range(-157,19);}
    } while(distanceToPath(x,z)<1.6||houseLocations.some(h=>Math.hypot(x-h.x,z-h.z)<h.r+1.3)||inLessonSpace(x,z,1.4)||Math.hypot(x-bellX,z-bellZ)<2||specialClearings.some(h=>Math.hypot(x-h.x,z-h.z)<h.r*.8));
    const s=range(.3,1.25),y=groundHeight(x,z);
    dummy.position.set(x,y+s*.21,z);dummy.rotation.set(range(-.2,.2),range(0,6.28),range(-.2,.2));dummy.scale.set(s,s*range(.35,.75),s*range(.7,1.3));dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);rocks.setColorAt(i,color.setHSL(.17,.10,range(.44,.61)));
    if(s>.85&&y>.4)colliders.push({x,z,r:s*.76});
  }
  rocks.castShadow=true;rocks.receiveShadow=true;world.add(rocks);

  // A few loose islands of meadow grass give the open plain scale without
  // building another forest. All of this distant vegetation remains scenery.
  const meadowGrass = new THREE.InstancedMesh(grassGeometry, material('#ffffff', { side: THREE.DoubleSide }), 1400);
  meadowGrass.name = 'Northern meadow grass clumps';
  let meadowGrassIndex = 0;
  for (let cluster = 0; cluster < 170 && meadowGrassIndex < 1400; cluster++) {
    const cx = range(-132, 132), cz = range(-295, -168);
    if (distanceToPath(cx, cz) < 3.5) continue;
    for (let blade = 0; blade < 10 && meadowGrassIndex < 1400; blade++) {
      const x = cx + range(-1.7, 1.7), z = cz + range(-1.7, 1.7);
      if (distanceToPath(x, z) < 1.5) continue;
      const size = range(1.3, 2.65);
      dummy.position.set(x, groundHeight(x, z) + .015, z);
      dummy.rotation.set(0, range(0, 6.28), 0);
      dummy.scale.set(size, size, size);
      dummy.updateMatrix();
      meadowGrass.setMatrixAt(meadowGrassIndex, dummy.matrix);
      meadowGrass.setColorAt(meadowGrassIndex++, color.setHSL(range(.16, .23), range(.29, .43), range(.30, .47), THREE.SRGBColorSpace));
    }
  }
  meadowGrass.count = meadowGrassIndex;
  meadowGrass.receiveShadow = true;
  world.add(meadowGrass);
  const meadowShrubs = new THREE.InstancedMesh(round, material('#ffffff'), 72);
  meadowShrubs.name = 'Sparse meadow shrubs and stones';
  let meadowShrubIndex = 0;
  for (let attempt = 0; attempt < 200 && meadowShrubIndex < 72; attempt++) {
    const x = range(-137, 137), z = range(-301, -173);
    if (distanceToPath(x, z) < 4.3) continue;
    const stone = meadowShrubIndex % 5 === 0, size = range(.55, 1.45);
    dummy.position.set(x, groundHeight(x, z) + size * .22, z);
    dummy.rotation.set(0, range(0, 6.28), stone ? range(-.16, .16) : 0);
    dummy.scale.set(size, size * (stone ? .38 : .47), size * .77);
    dummy.updateMatrix();
    meadowShrubs.setMatrixAt(meadowShrubIndex, dummy.matrix);
    meadowShrubs.setColorAt(meadowShrubIndex++, stone
      ? color.set('#7e8c79')
      : color.setHSL(range(.22, .28), .30, range(.29, .40), THREE.SRGBColorSpace));
  }
  meadowShrubs.count = meadowShrubIndex;
  meadowShrubs.receiveShadow = true;
  world.add(meadowShrubs);

  // Low, distant ridges sit at the far sides of the plain; its centre stays open.
  // Three neighboring districts use the same materials and batching pipeline,
  // but distinct silhouettes: open farms, a low river crossing, then stone hills.
  const journeyVisuals = new Map(), northernMovingGroups = [];
  const journeyState = Object.fromEntries(Object.keys(journeySites).map(id => [id, false]));
  let northSeed = 826413;
  const nrand = () => { northSeed = (Math.imul(northSeed, 1664525) + 1013904223) >>> 0; return northSeed / 4294967296; };
  const nrange = (a, b) => a + nrand() * (b - a);
  const northClear = (x, z, margin = 3.6) => distanceToPath(x, z) < margin
    || [...Object.values(journeySites), ...Object.values(regionNpcPositions), ...regionFirePits, ...regionRepairBenches]
      .some(p => Math.hypot(x - p.x, z - p.z) < margin + 1.1)
    || fishingSpots.some(p => Math.hypot(x - p.fishingSpot.x,z - p.fishingSpot.z) < margin+1.5)
    || Math.hypot(x - 15, z + 233) < 12;
  const northPath = (points, width = 2.25) => {
    const vectors = points.map(p => new THREE.Vector2(p.x, p.z)); paths.push(vectors); addPath(vectors, width);
  };
  northPath([{ x: 1, z: -214 }, { x: 15, z: -218 }, { x: 21, z: -229 }, { x: 8, z: -244 }, { x: 4, z: -249 }]);
  northPath([{ x: -10, z: -281 }, { x: -18, z: -276 }]);
  northPath([{ x: -2, z: -355 }, { x: -9, z: -352 }, { x: -13, z: -358 }]);
  northPath([{ x: -4, z: -450 }, { x: -11, z: -451 }]);
  northPath([{ x: 0, z: -388 }, { x: 9, z: -393 }, fishingSpots[1].fishingSpot], 1.8);
  northPath([{ x: -3, z: -552 }, journeySites['beacon-west']]);
  northPath([{ x: 4, z: -583 }, journeySites['beacon-east']]);
  northPath([{ x: 0, z: -612 }, journeySites['beacon-north']]);
  for (const p of Object.values(regionNpcPositions)) wornPatch(p.x, p.z, 4.7, '#b2a881');
  for (const p of Object.values(journeySites)) wornPatch(p.x, p.z, p.type === 'beacon' ? 3.0 : 1.25, '#b5a582');
  for (const [initialX, z, label] of [[4,-178,'Sunmeadow Plain'],[-7,-206,'Windmill & farms'],[0,-258,'Windmill & farms'],[-5,-317,'Reedwater Crossing'],[5,-344,'Reedwater Bridge'],[4,-385,'Reedwater Bridge'],[-7,-455,'Reedcutters’ Camp'],[4,-493,'Threefold Rise'],[-5,-521,'The Waymarkers'],[6,-572,'North Relay'],[-5,-638,'North Relay']]) {
    let x=initialX;
    while(distanceToPath(x,z)<1.5)x += initialX<0?-1:1;
    trailSign(x,z,1,label);
  }

  // Sunmeadow: farm plots, a canvas field camp, a loaded handcart, and a windmill.
  cottage(-19, -198, 5.2, 4.4, 2.9, '#9c7753', '#d8c59c', .35);
  cottage(26, -274, 5.9, 4.8, 3.2, '#9a684b', '#dbcb9b', -.3);
  function leanTo(x, z, tint = '#b29b70', angle = 0) {
    const shelter = new THREE.Group(); shelter.position.set(x, groundHeight(x, z), z); shelter.rotation.y = angle; world.add(shelter);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) post(wood, sx * 2.2, 1.45, sz * 1.55, .11, 2.9, shelter);
    mesh(roofGeometry(5.2, 4.0, 1.25), material(tint), 0, 2.85, 0, 1, 1, 1, shelter);
    box(woodLight, -1.3, .42, -.7, 1.6, .1, .65, shelter);
    for (const x0 of [-1.85, -.75]) box(wood, x0, .2, -.7, .14, .4, .55, shelter);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) colliders.push({
      x: x + sx * 2.2 * Math.cos(angle) + sz * 1.55 * Math.sin(angle),
      z: z - sx * 2.2 * Math.sin(angle) + sz * 1.55 * Math.cos(angle), r: .17, kind: 'shelter-post' });
    return shelter;
  }
  leanTo(-9, -185, '#c3aa72');
  barrel(-13, -187, .9); crate(-12.4, -185.7, .7);
  for (const [fx, fz, width, depth] of [[-33,-230,20,27],[29,-299,22,32],[-32,-296,20,23]]) {
    wornPatch(fx, fz, width * .6, '#9f8d57', depth / width);
    for (let x = -width / 2; x < width / 2; x += 2.4) {
      const points = [{ x: fx + x, z: fz - depth / 2 }, { x: fx + x, z: fz + depth / 2 }];
      northPath(points, .48);
      for (let z = -depth / 2; z < depth / 2; z += 1.6) {
        const px = fx + x + .6, pz = fz + z;
        post(material('#bfa860'), px, groundHeight(px, pz) + .35, pz, .04, .7);
        const ear = pebble(material('#c8b66d'), px, groundHeight(px,pz) + .78, pz, .14, .27, .11); ear.rotation.z = .12;
      }
    }
    fence(fx, fz + depth / 2 + 1, width + 2);
    for (const sx of [-1, 1]) {
      const hay = mesh(new THREE.CylinderGeometry(1,1,1,9), material('#bba266'), fx + sx * (width / 2 + 2), groundHeight(fx + sx * (width / 2 + 2), fz) + .8, fz, .82, 1.3, .82);
      hay.rotation.z = Math.PI / 2;
    }
  }
  const windmill = { x: -24, z: -280 }, millY = groundHeight(windmill.x, windmill.z);
  mesh(new THREE.CylinderGeometry(1.7, 2.6, 8.2, 10), material('#bcb59a'), windmill.x, millY + 4.1, windmill.z);
  mesh(new THREE.ConeGeometry(2.8, 2.4, 10), material('#746858'), windmill.x, millY + 9.3, windmill.z);
  box(darkWood, windmill.x, millY + 1.2, windmill.z + 2.35, 1.15, 2.3, .12);
  colliders.push({ x: windmill.x, z: windmill.z, r: 2.65, kind: 'windmill' });
  const millSails = new THREE.Group(); millSails.name = 'Sunmeadow windmill sails'; millSails.position.set(windmill.x, millY + 7.3, windmill.z + 2.75); world.add(millSails); northernMovingGroups.push(millSails);
  for (let i = 0; i < 4; i++) {
    const sail = new THREE.Group(); sail.rotation.z = i * Math.PI / 2; millSails.add(sail);
    box(wood, 0, 2.8, 0, .16, 5.6, .15, sail);
    box(material('#d3c69e'), .48, 3.5, .03, .95, 3.2, .04, sail);
    for (let r = 2; r <= 5; r += .75) box(woodLight, .43, r, .07, 1.12, .055, .065, sail);
  }
  pebble(darkWood, 0, 0, .04, .35, .35, .2, millSails);
  const cart = new THREE.Group(); cart.name = 'Tumbled courier cart'; cart.position.set(25, groundHeight(25,-223) + .75, -223); cart.rotation.set(.14, -.6, -.16); world.add(cart);
  box(woodLight, 0, 0, 0, 2.4, .2, 3.1, cart);
  for (const side of [-1,1]) {
    box(wood, side*1.17, .45, 0, .12, .9, 3.15, cart);
    const wheel = mesh(new THREE.TorusGeometry(.75,.12,5,12), darkWood, side*1.45, -.05, .35, 1,1,1, cart); wheel.rotation.y = Math.PI/2;
    for (let k = 0; k < 4; k++) { const spoke = box(wood,side*1.45,-.05,.35,.1,.1,1.45,cart); spoke.rotation.x=k*Math.PI/4; }
    box(wood,side*.7,-.05,2.8,.11,.13,2.5,cart);
  }
  crate(0,-.5,.8,.13,cart); barrel(-.65,.6,.65,cart,.15);
  colliders.push({x:25,z:-223,r:2.3,kind:'cart'});

  // Reedwater: the banks dip below a visible, animated river. Collision follows
  // the wet channel; the original eastern bridge deck remains a safe crossing.
  const riverVertices = [], riverIndices = [];
  for (let i = 0; i <= 110; i++) {
    const x = -110 + i * 2, z = -412 + Math.sin(x*.035)*5;
    riverVertices.push(x,2.45,z-7.4,x,2.45,z+7.4);
    if(i) { const v=i*2; riverIndices.push(v-2,v,v-1,v-1,v,v+1); }
  }
  const riverGeo = new THREE.BufferGeometry(); riverGeo.setAttribute('position',new THREE.Float32BufferAttribute(riverVertices,3));riverGeo.setIndex(riverIndices);riverGeo.computeVertexNormals();
  const riverMaterial = new THREE.ShaderMaterial({
    uniforms:{time:{value:0}},side:THREE.DoubleSide,
    vertexShader:'varying vec3 p; void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform float time; varying vec3 p; void main(){float w=sin(p.x*.65-time*1.2+p.z*1.7)*sin(p.x*.13+p.z*2.0);vec3 c=vec3(.17,.38,.37)+vec3(.12,.17,.13)*pow(max(w,0.),8.);gl_FragColor=vec4(c,1.);}',
  });
  const riverMesh = new THREE.Mesh(riverGeo,riverMaterial);riverMesh.name='Reedwater river';world.add(riverMesh);
  for (let x=-91; x<=91; x+=4) {
    if(Math.abs(x)<5)continue;
    colliders.push({x,z:-412+Math.sin(x*.035)*5,hx:2.05,hz:6.7,kind:'river-water'});
  }
  // Close the short gaps beside the bridge left by the wider river sampling.
  // The bridge lane alone is walkable; its outside edges remain actual water.
  colliders.push({x:-4,z:-412.6,hx:1.05,hz:7.1,kind:'river-water'},
    {x:4,z:-411.4,hx:1.05,hz:7.1,kind:'river-water'});
  for (let z=-400;z>=-424;z-=.7) box(woodLight,.8,3.55,z,3.9,.18,.64);
  for(const side of[-1,1]) {
    box(darkWood,side*2.55,3.15,-412,.25,.5,26);
    for(let z=-400;z>=-424;z-=4)post(wood,side*2.6,3.72,z,.12,1.6);
    box(wood,side*2.6,4.26,-412,.1,.1,25.0);
    colliders.push({x:side*2.8,z:-412,hx:.11,hz:12.1,kind:'bridge-rail'});
  }
  const repairedDeck = new THREE.Group(); repairedDeck.name='Reedwater repaired western deck';world.add(repairedDeck); northernMovingGroups.push(repairedDeck);
  for(let z=-400;z>=-424;z-=.7) box(woodLight,-1.58,3.55,z,1.2,.18,.64,repairedDeck);
  repairedDeck.visible=false;journeyVisuals.set('bridge-repair',{complete:repairedDeck});
  // A visible cord closes only the damaged western strip, leaving a full lane.
  const brokenCord = new THREE.Group(); brokenCord.name='Bridge repair cord';world.add(brokenCord);northernMovingGroups.push(brokenCord);
  rope([new THREE.Vector3(-2.45,4.14,-400),new THREE.Vector3(-1.8,3.99,-400),new THREE.Vector3(-1.08,4.14,-400)],.045,material('#cfaf6b'),brokenCord);
  journeyVisuals.get('bridge-repair').incomplete=brokenCord;
  const damagedBridgeCollider={x:-1.9,z:-412,hx:.58,hz:12.2,kind:'bridge-damage'};colliders.push(damagedBridgeCollider);
  journeyVisuals.get('bridge-repair').collider=damagedBridgeCollider;
  leanTo(-16,-346,'#7e9780',.2);crate(-19,-348,.78);barrel(-17.5,-349,.8);
  leanTo(-13,-451,'#82917c');
  for (const [x,z] of [[-20,-365],[17,-443],[-18,-471]]) {
    const y=groundHeight(x,z);
    post(wood,x-1.5,y+1.25,z,.085,2.5);post(wood,x+1.5,y+1.25,z,.085,2.5);
    box(wood,x,y+2.3,z,3.2,.11,.13);
    for(let i=0;i<10;i++)post(material('#b19c60'),x-1.3+i*.29,y+1.35,z,.04,1.8);
  }
  for(let i=0;i<130;i++) {
    const x=nrange(-88,88),z=-412+Math.sin(x*.035)*5+(i%2?1:-1)*nrange(8.8,13.4);
    if(Math.abs(x)<5)continue;
    const y=groundHeight(x,z),h=nrange(.7,1.55);
    post(material('#7d8756'),x,y+h/2,z,.028,h);post(material('#756049'),x,y+h,z,.06,.27);
  }
  for(let cluster=0;cluster<42;cluster++) {
    const x=nrange(-80,80),z=-412+Math.sin(x*.035)*5+(cluster%2?1:-1)*nrange(8.5,11.0);
    if(Math.abs(x)<5||Math.hypot(x-16,z+398)<3)continue;
    for(let reed=0;reed<5;reed++) {
      const rx=x+Math.sin(reed*2.3)*.35,rz=z+Math.cos(reed*2.3)*.35,y=groundHeight(rx,rz),h=.8+(reed%3)*.3;
      post(material('#6a8058'),rx,y+h/2,rz,.025,h);
      const leaf=box(material('#8a9b62'),rx+.08,y+h*.4,rz,.08,h*.8,.023);leaf.rotation.z=-.24;
      if(reed%2)post(material('#7f6548'),rx,y+h,rz,.052,.25);
    }
    if(cluster%3===0)pebble(material('#7b9084'),x+.45,groundHeight(x+.45,z)+.12,z,.45,.24,.36);
  }
  // The bank reuses the learned fishing skill; a low stool and rod rest make
  // the casting spot visible from the bridge approach without blocking it.
  const riverBank=fishingSpots[1].fishingSpot,bankStool={x:riverBank.x+2,z:riverBank.z+1.0};
  const stoolY=groundHeight(bankStool.x,bankStool.z);
  box(woodLight,bankStool.x,stoolY+.47,bankStool.z,.7,.12,.58);
  for(const dx of[-.25,.25])for(const dz of[-.2,.2])post(wood,bankStool.x+dx,stoolY+.22,bankStool.z+dz,.055,.44);
  colliders.push({x:bankStool.x,z:bankStool.z,r:.43,kind:'fishing-stool'});
  const rodRestX=riverBank.x+1.1,rodRestZ=riverBank.z-1.1,rodRestY=groundHeight(rodRestX,rodRestZ);
  post(wood,rodRestX,rodRestY+.5,rodRestZ,.055,1);
  for(const side of[-1,1]){const fork=post(woodLight,rodRestX+side*.12,rodRestY+1.0,rodRestZ,.035,.35);fork.rotation.z=-side*.6;}
  wornPatch(riverBank.x,riverBank.z,1.25,'#afa883');
  trailSign(11.5,-394.5,1,'Quiet fishing bank',-Math.PI/3);
  for(const side of[-1,1]) for(let i=0;i<8;i++) {
    const x=side*nrange(17,77),z=nrange(-364,-478);if(northClear(x,z))continue;
    const y=groundHeight(x,z),h=nrange(5.5,8);
    if(regionalFeatureClear(x,z,3.5))continue;
    post(material('#69755b'),x,y+h*.45,z,.26,h*.9);
    for(let c=0;c<3;c++)pebble(material('#789573'),x+Math.sin(c*2.1)*1.3,y+h-c*.6,z+Math.cos(c*2.1)*1.3,2.8,1.7,2.5);
    colliders.push({x,z,r:.48,kind:'river-tree'});
  }

  // Threefold Rise: exposed stone, small cairns, road stones and a roofed relay.
  leanTo(14,-531,'#a69b84');crate(18,-532,.8);
  cottage(-13,-662,6.7,5.1,3.0,'#6d7875','#c7c4ac',.15);
  leanTo(7,-658,'#aaa48a');barrel(10,-660,.9);crate(8,-661,.9);
  for(let i=0;i<54;i++) {
    const x=nrange(-85,85),z=nrange(-513,-673);if(northClear(x,z,4.2))continue;
    const size=nrange(.7,3.0),y=groundHeight(x,z);
    const angle=nrange(0,6.3);
    if(regionalFeatureClear(x,z,size*.8))continue;
    const stone=pebble(material(i%3?'#8b9187':'#b2afa0'),x,y+size*.35,z,size,size*.7,size*.8);stone.rotation.set(.1,angle,.12);
    if(size>1.35)colliders.push({x,z,r:size*.68,kind:'ridge-rock'});
  }
  // A roofless waystation gives the rise a recognizable ruin beyond the road.
  const ruinX=-27,ruinZ=-579,ruinY=groundHeight(ruinX,ruinZ);
  wornPatch(ruinX,ruinZ,4.1,'#b1ae96');
  for(const side of[-1,1]) {
    const x=ruinX+side*2.4;
    box(material('#b0afa0'),x,ruinY+1.65,ruinZ,.95,3.3,1.2);
    box(material('#919688'),x,ruinY+.25,ruinZ,1.45,.5,1.55);
    colliders.push({x,z:ruinZ,r:.7,kind:'ruin-pillar'});
    const arch=box(material('#a6a99a'),ruinX+side*1.15,ruinY+3.47,ruinZ,2.9,.65,1.2);arch.rotation.z=-side*.14;
  }
  for(let i=0;i<5;i++)box(material('#a9aa99'),ruinX-1.6+i*.8,ruinY+.055,ruinZ+2.0,.65,.11,1.0);
  northPath([{x:1,z:-575},{x:-12,z:-576},{x:ruinX,z:ruinZ+2}],1.65);
  // Ground cover becomes reeds and short wiry grass rather than another forest.
  const northernGrass=new THREE.InstancedMesh(grassGeometry,material('#ffffff',{side:THREE.DoubleSide}),1900);
  northernGrass.name='Riverbank and ridge ground cover';let northGrassIndex=0;
  for(let attempt=0;attempt<6000&&northGrassIndex<1900;attempt++) {
    const x=nrange(-91,91),z=nrange(-338,-672);if(northClear(x,z,1.4)||(z<-389&&z>-434))continue;
    const scale=nrange(.55,1.25),wet=z>-500;
    dummy.position.set(x,groundHeight(x,z)+.018,z);dummy.rotation.set(0,nrange(0,6.28),0);dummy.scale.set(scale,scale*(wet?1.3:.72),scale);dummy.updateMatrix();
    northernGrass.setMatrixAt(northGrassIndex,dummy.matrix);northernGrass.setColorAt(northGrassIndex++,color.set(wet?(attempt%3?'#768d5b':'#a6ad71'):(attempt%3?'#969c69':'#b0ad78')));
  }
  northernGrass.count=northGrassIndex;northernGrass.receiveShadow=true;world.add(northernGrass);
  for(const site of Object.values(journeySites)) {
    const group=new THREE.Group();group.name=`Journey site ${site.id}`;world.add(group);northernMovingGroups.push(group);
    const y=groundHeight(site.x,site.z);
    if(site.type==='parcel') {
      box(material(site.id.endsWith('2')?'#849b8e':'#c4b384'),site.x,y+.24,site.z,.62,.43,.47,group);
      box(cream,site.x,y+.465,site.z,.075,.016,.49,group);box(cream,site.x,y+.466,site.z,.65,.016,.07,group);
      pebble(material('#b17150'),site.x,y+.48,site.z,.075,.025,.065,group);
      journeyVisuals.set(site.id,{incomplete:group});
    } else if(site.type==='sticks') {
      for(let i=0;i<3;i++){const branch=post(woodLight,site.x+(i-1)*.15,y+.10,site.z,.065,1.15,group);branch.rotation.set(Math.PI/2,0,(i-1)*.22);}
      journeyVisuals.set(site.id,{incomplete:group});
    } else if(site.type==='fruit') {
      for(let i=0;i<3;i++)pebble(material('#b5b66c'),site.x+(i-1)*.22,y+.13,site.z+(i%2)*.22,.15,.13,.26,group);
      journeyVisuals.set(site.id,{incomplete:group});
      // A small broad-leaved fruit tree identifies a useful sheltered patch.
      const tx=site.x+2.9,tz=site.z+.7,ty=groundHeight(tx,tz);
      post(wood,tx,ty+1.45,tz,.13,2.9);pebble(material('#799757'),tx,ty+3.0,tz,1.65,1.2,1.45);
      colliders.push({x:tx,z:tz,r:.25,kind:'fruit-tree'});
    } else if(site.type==='beacon') {
      const bx=site.x+(site.x<0?-2.1:2.1),bz=site.z,by=groundHeight(bx,bz);
      post(material('#a6a596'),bx,by+.30,bz,.77,.6);
      const lean=site.x<0?.24:-.24;
      group.position.set(bx,by+.35,bz);group.rotation.z=lean;
      pebble(material('#91998c'),0,1.0,0,.55,1.18,.45,group);
      box(material('#897a51'),0,1.21,.40,.18,.78,.05,group);
      const arrowInset=mesh(new THREE.ShapeGeometry(arrowGeo),material('#8f8963'),0,1.59,.43,.34,.34,1,group);arrowInset.rotation.z=Math.PI/2;
      colliders.push({x:bx,z:bz,r:.85,kind:'waymarker'});
      const flame=new THREE.Group();flame.name=`${site.id} light`;flame.position.set(0,1.21,.445);group.add(flame);
      box(material('#f6d690',{emissive:'#d9b661',emissiveIntensity:.7}),0,0,0,.18,.78,.025,flame);
      const polishedArrow=mesh(new THREE.ShapeGeometry(arrowGeo),material('#fae2a3',{emissive:'#d9b661',emissiveIntensity:.5}),0,.38,.012,.34,.34,1,flame);polishedArrow.rotation.z=Math.PI/2;
      flame.visible=false;
      journeyVisuals.set(site.id,{complete:flame,pivot:group,lean});
    }
  }
  // Repair places accompany every district's camp; interaction points stay
  // on the path side of the physical bench so F is never hidden by its collider.
  for(const bench of regionRepairBenches) {
    const x=bench.x+(bench.x<0?-1.65:1.65),z=bench.z,y=groundHeight(x,z);
    wornPatch(bench.x,bench.z,2.5,'#aaa182');
    box(woodLight,x,y+.78,z,1.5,.15,.75);
    for(const dx of[-.57,.57])for(const dz of[-.25,.25])box(wood,x+dx,y+.38,z+dz,.13,.76,.13);
    pebble(material('#96988e'),x,y+.96,z,.4,.11,.25);box(darkWood,x+.43,y+.92,z+.17,.4,.07,.08);
    colliders.push({x,z,hx:.78,hz:.4,kind:'repair-bench'});
  }
  firePits.push(...regionFirePits.map(fire=>({...fire})));
  // The playable road ends at a marked relay overlook, with country beyond it.
  const frontier={x:0,z:-674,name:'North Relay Overlook',regionName:'The road toward the Lauvel'};
  wornPatch(0,-672,7.0,'#aca990');
  for(let x=-92;x<=92;x+=4) {
    post(wood,x,groundHeight(x,-678)+.64,-678,.085,1.28);
    if(x<92)rope([new THREE.Vector3(x,groundHeight(x,-678)+1.0,-678),new THREE.Vector3(x+2,groundHeight(x+2,-678)+.8,-678),new THREE.Vector3(x+4,groundHeight(x+4,-678)+1.0,-678)],.03);
  }
  colliders.push({x:0,z:-678,hx:94,hz:.08,kind:'frontier'});
  const horizonGeo=new THREE.PlaneGeometry(900,420,90,42);horizonGeo.rotateX(-Math.PI/2);horizonGeo.translate(0,0,-920);
  const hp=horizonGeo.attributes.position;for(let i=0;i<hp.count;i++)hp.setY(i,baseGroundHeight(hp.getX(i),hp.getZ(i)));
  horizonGeo.computeVertexNormals();const horizon=new THREE.Mesh(horizonGeo,material('#929983',{flatShading:true}));horizon.receiveShadow=true;horizon.name='The inland horizon';world.add(horizon);

  // The Three Presences form a distant, separated silhouette beyond the relay.
  // These quiet rocky summits belong to the low Luscian Hills, not the far snowy
  // mountain barrier. They are scenery only: 105 triangles and no colliders.
  const summitMaterial=material('#7c8b83',{flatShading:true});
  const distantSummits=[
    {x:-65,z:-811,topY:44,width:24,depth:21,lean:-3,phase:.2},
    {x:-18,z:-846,topY:51,width:27,depth:23,lean:2,phase:1.1},
    {x:34,z:-823,topY:43,width:22,depth:19,lean:-1.5,phase:2.4},
  ];
  for(const [index,summit]of distantSummits.entries()) {
    const baseY=baseGroundHeight(summit.x,summit.z)-2,height=summit.topY-baseY,positions=[],indices=[];
    for(let ring=0;ring<3;ring++)for(let i=0;i<7;i++) {
      const angle=i*Math.PI*2/7+summit.phase,radius=[1,.70,.29][ring]*(1+Math.sin(i*1.83+summit.phase)*.13);
      const localY=height*[0,.43,.77][ring]+(ring?Math.sin(i*2.2+summit.phase)*height*.045:0);
      positions.push(Math.cos(angle)*summit.width*radius+summit.lean*ring*.28,localY,Math.sin(angle)*summit.depth*radius);
    }
    positions.push(summit.lean,height,-1.5);
    for(let ring=0;ring<2;ring++)for(let i=0;i<7;i++) {
      const a=ring*7+i,b=ring*7+(i+1)%7,c=a+7,d=b+7;
      indices.push(a,c,b,b,c,d);
    }
    for(let i=0;i<7;i++)indices.push(14+i,21,14+(i+1)%7);
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
    const peak=mesh(geometry,summitMaterial,summit.x,baseY,summit.z);peak.name=`Three Presences summit ${index+1}`;peak.castShadow=false;
  }

  const mountainMat=material('#849b83');
  for(let i=0;i<10;i++){
    const side=i<5?-1:1,x=side*(177+(i%5)*36),z=-337+Math.sin(i*1.7)*28;
    const mountain=mesh(new THREE.ConeGeometry(1,1,7),mountainMat,x,4,z,range(28,46),range(11,24),range(28,48));mountain.rotation.y=range(0,6.28);mountain.castShadow=false;
  }

  const smoke=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),new THREE.MeshBasicMaterial({color:'#ecebd4',transparent:true,opacity:.13,depthWrite:false}),smokeSources.length*4);
  world.add(smoke);
  // A handful of birds, each represented by two dark, animated wings.
  const birds=[];
  const wingGeo=new THREE.BufferGeometry();wingGeo.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,.66,.06,.13,.22,0,-.13],3));wingGeo.computeVertexNormals();
  const birdMat=material('#f4ecce',{side:THREE.DoubleSide});
  for(let i=0;i<9;i++){
    const group=new THREE.Group();world.add(group);
    const l=mesh(wingGeo,birdMat,0,0,0,1,1,1,group),r=mesh(wingGeo,birdMat,0,0,0,-1,1,1,group);
    l.castShadow=false;r.castShadow=false;birds.push({group,l,r,phase:range(0,6.28),radius:range(13,36),height:range(12,22),speed:range(.06,.13)});
  }
  const butterflies=[];
  const butterflyMat=material('#e8cd83',{side:THREE.DoubleSide,emissive:'#cfb45f',emissiveIntensity:.1});
  for(let i=0;i<12;i++){
    const bx=range(-13,13),bz=range(-55,6);if(distanceToPath(bx,bz)<1)continue;
    const group=new THREE.Group();world.add(group);
    const l=pebble(butterflyMat,.065,0,0,.105,.018,.095,group),r=pebble(butterflyMat,-.065,0,0,.105,.018,.095,group);
    l.castShadow=false;r.castShadow=false;butterflies.push({group,l,r,x:bx,z:bz,phase:range(0,6.28)});
  }

  // Add the pond spur after the original deterministic scenery scatter. Old
  // oak IDs and collectible positions remain stable as this glade opens up.
  for (const path of pondPaths) {
    const points = path.map(p => new THREE.Vector2(p.x, p.z));
    paths.push(points); addPath(points, 2.1);
  }
  // Authored woodland spurs are added after the original random placement, so
  // new destinations never reshuffle the rest of the world's scenery seed.
  for (const path of [...forestPlacePaths, FOREST_HIDEOUT.trail, ...REGIONAL_PATHS]) {
    const points = path.map(p => new THREE.Vector2(p.x, p.z));
    paths.push(points); addPath(points, 1.85);
  }
  const clearingMatrix = new THREE.Matrix4(), clearingPosition = new THREE.Vector3();
  for (const cover of [grass, bushes, flowers, rocks]) {
    for (let i = 0; i < cover.count; i++) {
      cover.getMatrixAt(i, clearingMatrix); clearingPosition.setFromMatrixPosition(clearingMatrix);
      if (!featureClear(clearingPosition.x, clearingPosition.z, cover === rocks)) continue;
      clearingMatrix.makeScale(0, 0, 0); cover.setMatrixAt(i, clearingMatrix);
    }
    cover.instanceMatrix.needsUpdate = true;
  }
  for (let i = colliders.length - 1; i >= 0; i--)
    if (!colliders[i].kind && featureClear(colliders[i].x, colliders[i].z, true)) colliders.splice(i, 1);
  const forestSignPositions = [[-5,-43.5,Math.PI/2], [19,-43,-Math.PI/2], [14.3,-81,.6],
    [-14,-89,Math.PI/2], [-10,-109.7,Math.PI/2], [-27,13,Math.PI/2]];
  forestPlaceDefinitions.forEach((site,index) => {
    const [x,z,angle] = forestSignPositions[index];
    trailSign(x,z,1,site.name,angle,'Village road');
  });
  const forestPlaces = createForestPlaces(world, { heightAt, colliders });
  const forestHideout = createForestHideout(world, { heightAt, colliders });
  // Retain the original seeded scatter, clearing only the new working yards
  // and their approaches. Crops, the mill, bridge, and ruin stay in place.
  for(const cover of [meadowGrass,meadowShrubs,northernGrass]){
    for(let i=0;i<cover.count;i++){
      cover.getMatrixAt(i,clearingMatrix);clearingPosition.setFromMatrixPosition(clearingMatrix);
      if(!regionalFeatureClear(clearingPosition.x,clearingPosition.z,.65))continue;
      clearingMatrix.makeScale(0,0,0);cover.setMatrixAt(i,clearingMatrix);
    }
    cover.instanceMatrix.needsUpdate=true;
  }
  const regionalPlaces=createRegionalPlaces(world,{heightAt,colliders});
  // Reeds and mossy bank stones leave the western fishing ledge unobstructed.
  const reedMat = material('#758249'), reedHead = material('#705637');
  for (let i = 0; i < 25; i++) {
    const angle = i * .247 + .3, r = pond.radius + .2 + Math.sin(i * 1.7) * .18;
    const x = pond.x + Math.sin(angle) * r, z = pond.z + Math.cos(angle) * r;
    if (Math.hypot(x - pond.fishingSpot.x, z - pond.fishingSpot.z) < 3.8) continue;
    const y = groundHeight(x, z);
    if (i % 3 === 0) pebble(rockMat, x, y + .10, z, .38, .22, .28);
    for (let j = 0; j < 3; j++) {
      const rx = x + Math.sin(j * 2.1) * .17, rz = z + Math.cos(j * 2.1) * .17, h = .55 + (i % 4) * .11 + j * .06;
      post(reedMat, rx, groundHeight(rx, rz) + h / 2, rz, .018, h);
      const leaf = box(reedMat, rx + .09, groundHeight(rx, rz) + h * .46, rz, .04, h * .66, .019);
      leaf.rotation.z = -.35;
      if (j === 0) post(reedHead, rx, groundHeight(rx, rz) + h * .96, rz, .043, .19);
    }
  }
  wornPatch(pond.fishingSpot.x, pond.fishingSpot.z, 1.1, '#b7aa7b', .8);
  const fishingBucket = { x: pondFisher.x - 1.0, z: pondFisher.z - 1.3 };
  post(woodLight, fishingBucket.x, groundHeight(fishingBucket.x, fishingBucket.z) + .23, fishingBucket.z, .28, .43);
  post(darkWood, fishingBucket.x, groundHeight(fishingBucket.x, fishingBucket.z) + .455, fishingBucket.z, .23, .012);
  const bucketHandle = new THREE.TorusGeometry(.24, .024, 4, 12, Math.PI);
  mesh(bucketHandle, darkWood, fishingBucket.x, groundHeight(fishingBucket.x, fishingBucket.z) + .42, fishingBucket.z);
  // Small flame clusters and local warm light are independently switched for
  // each usable firepit. Nothing burns before the player lights the kindling.
  const campfires = new Map();
  const flameMat = new THREE.MeshBasicMaterial({ color: '#ee9a3f' });
  const flameCoreMat = new THREE.MeshBasicMaterial({ color: '#ffe6a4' });
  for (const fire of firePits) {
    const x = fire.fireX, z = fire.fireZ, y = groundHeight(x, z);
    wornPatch(x, z, 1.02, '#8c8166');
    for (let i = 0; i < 9; i++) {
      const a = i * Math.PI * 2 / 9;
      pebble(rockMat, x + Math.sin(a) * .68, y + .13, z + Math.cos(a) * .68, .22, .17, .19);
    }
    for (const angle of [-.65, .7]) {
      const log = post(darkWood, x, y + .17, z, .13, .91); log.rotation.set(Math.PI / 2, 0, angle);
    }
    colliders.push({ x, z, r: .62, kind: 'firepit' });
    const flames = new THREE.Group(); flames.name = `${fire.id} flames`; flames.position.set(x, y + .2, z); world.add(flames);
    const flameBatch = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 6), flameMat, 3);
    for (let i = 0; i < 3; i++) {
      dummy.position.set((i - 1) * .17, .21 + (i % 2) * .14, (i % 2) * .10);
      dummy.rotation.set(.08, i * 2, (i - 1) * -.15); dummy.scale.set(.20, .60 + (i % 2) * .27, .17); dummy.updateMatrix();
      flameBatch.setMatrixAt(i, dummy.matrix);
    }
    flames.add(flameBatch);
    const flameCore = new THREE.Mesh(new THREE.ConeGeometry(.15, .48, 5), flameCoreMat); flameCore.position.y = .15; flames.add(flameCore);
    const glow = new THREE.PointLight('#ffc675', 2.4, 4.5, 2); glow.position.y = .52; flames.add(glow);
    flames.visible = false; fire.lit = false; campfires.set(fire.id, { fire, flames, glow });
  }
  // A light line, buoy, and widening ring convey waiting versus a nibble.
  let fishingPhase = 'idle';
  const fishingVisual = new THREE.Group(); fishingVisual.name = 'Pond fishing line and float'; world.add(fishingVisual);
  const bobber = new THREE.Group(); bobber.position.set(pond.castPoint.x, pond.castPoint.y, pond.castPoint.z); fishingVisual.add(bobber);
  pebble(material('#d9794e'), 0, .035, 0, .095, .12, .095, bobber);
  pebble(cream, 0, -.02, 0, .103, .065, .103, bobber);
  const rippleGeometry = new THREE.RingGeometry(.25, .28, 32); rippleGeometry.rotateX(-Math.PI / 2);
  const fishingRipple = new THREE.Mesh(rippleGeometry, new THREE.MeshBasicMaterial({ color: '#e4e8bd', transparent: true, opacity: .6, depthWrite: false }));
  fishingRipple.position.set(pond.castPoint.x, pond.surfaceY + .048, pond.castPoint.z); fishingVisual.add(fishingRipple);
  const lineStart = new THREE.Vector3(pond.fishingSpot.x + 1.45, groundHeight(pond.fishingSpot.x, pond.fishingSpot.z) + 1.65, pond.fishingSpot.z);
  const lineEnd = new THREE.Vector3(pond.castPoint.x, pond.castPoint.y + .08, pond.castPoint.z);
  const fishingLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
    lineStart, lineStart.clone().lerp(lineEnd, .5).add(new THREE.Vector3(0, -.23, 0)), lineEnd,
  ]), new THREE.LineBasicMaterial({ color: '#d7c89b', transparent: true, opacity: .85 }));
  const fishingMidpoint = new THREE.Vector3();
  function setFishingOrigin(position) {
    if (!position || ![position.x, position.y, position.z].every(Number.isFinite)) return false;
    lineStart.copy(position); lineEnd.copy(bobber.position); lineEnd.y += .08;
    fishingMidpoint.copy(lineStart).lerp(lineEnd, .5); fishingMidpoint.y -= .23;
    const vertices = fishingLine.geometry.attributes.position;
    vertices.setXYZ(0, lineStart.x, lineStart.y, lineStart.z);
    vertices.setXYZ(1, fishingMidpoint.x, fishingMidpoint.y, fishingMidpoint.z);
    vertices.setXYZ(2, lineEnd.x, lineEnd.y, lineEnd.z);
    vertices.needsUpdate = true; fishingLine.geometry.computeBoundingSphere(); return true;
  }
  fishingVisual.add(fishingLine); fishingVisual.visible = false;
  function setFishingSpot(id) {
    const next = fishingSpots.find(spot => spot.id === id);
    if (!next || (fishingPhase !== 'idle' && next !== activeFishingSpot)) return false;
    activeFishingSpot = next;
    bobber.position.set(next.castPoint.x,next.castPoint.y,next.castPoint.z);
    fishingRipple.position.set(next.castPoint.x,next.surfaceY+.048,next.castPoint.z);
    lineEnd.set(next.castPoint.x,next.castPoint.y+.08,next.castPoint.z);
    setFishingOrigin(lineStart); return true;
  }

  // Share materials, but keep a district's still scenery in its own batches.
  // One giant 720 m bounding sphere otherwise submits distant village houses
  // and northern props even when the camera faces away from those districts.
  // Eastreena keeps its original single set of material batches.
  const movingGroups=new Set([arrivalBoat,fishingBoat,sack,bellSwing,fishingVisual,...northernMovingGroups,...[...campfires.values()].map(f=>f.flames),...birds.map(b=>b.group),...butterflies.map(b=>b.group)]);
  const batches=new Map(),batchCenter=new THREE.Vector3();
  world.updateMatrixWorld(true);
  world.traverse(object=>{
    if(!object.isMesh||object.isInstancedMesh||object.material.isShaderMaterial||object.material.transparent||object.geometry.attributes.color)return;
    for(let parent=object;parent&&parent!==world;parent=parent.parent)if(movingGroups.has(parent))return;
    if(!object.geometry.attributes.normal)return;
    if(!object.geometry.boundingSphere)object.geometry.computeBoundingSphere();
    batchCenter.copy(object.geometry.boundingSphere.center).applyMatrix4(object.matrixWorld);
    const district=spatialBatches&&batchCenter.z<=-162?regionAt(batchCenter.x,batchCenter.z).id:1;
    if(!batches.has(object.material))batches.set(object.material,new Map());
    const districtBatches=batches.get(object.material);
    if(!districtBatches.has(district))districtBatches.set(district,[]);
    districtBatches.get(district).push(object);
  });
  // Small shared details are cheaper as one draw than several tiny district
  // draws. Split only material groups with enough geometry to repay the calls.
  for(const [mat,districtBatches]of batches)if(districtBatches.size>1) {
    const objects=[...districtBatches.values()].flat();
    const triangles=objects.reduce((sum,object)=>sum+(object.geometry.index?.count||object.geometry.attributes.position.count)/3,0);
    if(triangles<2400)batches.set(mat,new Map([[1,objects]]));
  }
  const positionVector=new THREE.Vector3(),normalVector=new THREE.Vector3(),normalMatrix=new THREE.Matrix3();
  for(const [mat,districtBatches] of batches)for(const [district,objects]of districtBatches){
    if(objects.length<2)continue;
    let vertexCount=0,indexCount=0;
    for(const object of objects){vertexCount+=object.geometry.attributes.position.count;indexCount+=object.geometry.index?.count||object.geometry.attributes.position.count;}
    const positions=new Float32Array(vertexCount*3),normals=new Float32Array(vertexCount*3),indices=new Uint32Array(indexCount),uvs=mat.map?new Float32Array(vertexCount*2):null;
    let vertexOffset=0,indexOffset=0;
    for(const object of objects){
      const geometry=object.geometry,p=geometry.attributes.position,n=geometry.attributes.normal;
      normalMatrix.getNormalMatrix(object.matrixWorld);
      for(let i=0;i<p.count;i++){
        positionVector.fromBufferAttribute(p,i).applyMatrix4(object.matrixWorld);positionVector.toArray(positions,(vertexOffset+i)*3);
        normalVector.fromBufferAttribute(n,i).applyMatrix3(normalMatrix).normalize();normalVector.toArray(normals,(vertexOffset+i)*3);
        if(uvs&&geometry.attributes.uv){uvs[(vertexOffset+i)*2]=geometry.attributes.uv.getX(i);uvs[(vertexOffset+i)*2+1]=geometry.attributes.uv.getY(i);}
      }
      if(geometry.index){for(let i=0;i<geometry.index.count;i++)indices[indexOffset++]=vertexOffset+geometry.index.getX(i);}
      else{for(let i=0;i<p.count;i++)indices[indexOffset++]=vertexOffset+i;}
      vertexOffset+=p.count;
      object.removeFromParent();
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.BufferAttribute(normals,3));geometry.setIndex(new THREE.BufferAttribute(indices,1));
    if(uvs)geometry.setAttribute('uv',new THREE.BufferAttribute(uvs,2));
    geometry.computeBoundingSphere();
    const batch=new THREE.Mesh(geometry,mat);batch.castShadow=objects.some(o=>o.castShadow);batch.receiveShadow=true;batch.name='Static scenery batch';batch.userData.district=district;world.add(batch);
  }

  // Read-only chart geometry comes from the same authored water vertices. The
  // coastal boundary follows the visible foam line; the river follows both
  // actual mesh banks, including the water beneath the bridge.
  const mapPoint = (x, z) => Object.freeze({ x, z });
  const mapShore = [], mapRiverNorth = [], mapRiverSouth = [];
  for (let i = 0; i < shorePositions.length; i += 6) mapShore.push(mapPoint(shorePositions[i], shorePositions[i + 2]));
  for (let i = 0; i < riverVertices.length; i += 6) {
    mapRiverNorth.push(mapPoint(riverVertices[i], riverVertices[i + 2]));
    mapRiverSouth.push(mapPoint(riverVertices[i + 3], riverVertices[i + 5]));
  }
  const seaSouth = water.position.z + waterGeometry.parameters.height / 2;
  const mapWaters = Object.freeze([
    Object.freeze({ id: 'coast-water', kind: 'polygon', points: Object.freeze([...mapShore,
      mapPoint(mapShore.at(-1).x, seaSouth), mapPoint(mapShore[0].x, seaSouth)]) }),
    Object.freeze({ id: 'willowmere-water', kind: 'circle', x: pond.x, z: pond.z, radius: pond.radius }),
    Object.freeze({ id: 'reedwater-water', kind: 'polygon', points: Object.freeze([...mapRiverNorth, ...mapRiverSouth.reverse()]) }),
  ]);

  return {
    heightAt,
    mapWaters,
    colliders,
    training,
    repairBench,
    repairBenches: [repairBench, ...regionRepairBenches],
    regions,
    regionAt,
    journeySites,
    routeJourney: northernRoad,
    roadSigns,
    frontier,
    distantSummits,
    forestPlaces: forestPlaceDefinitions,
    forestPlaceMetrics: forestPlaces.metrics,
    setForestPlaceState: forestPlaces.setState,
    regionalPlaces: REGIONAL_PLACES,
    regionalActivitySites: REGIONAL_ACTIVITY_SITES,
    regionalPlaceMetrics: regionalPlaces.metrics,
    setRegionalPlaceState: regionalPlaces.setState,
    regionalPlaceState: regionalPlaces.state,
    updateRegionalPlaces: regionalPlaces.update,
    forestPlaceState: forestPlaces.state,
    forestHideout: FOREST_HIDEOUT,
    forestHideoutMetrics: forestHideout.metrics,
    setForestHideoutState: forestHideout.setState,
    forestHideoutState: forestHideout.state,
    setJourneySiteState(id, completed) {
      if (!(id in journeyState)) return false;
      journeyState[id] = Boolean(completed);
      const visual = journeyVisuals.get(id);
      if (visual?.incomplete) visual.incomplete.visible = !completed;
      if (visual?.complete) visual.complete.visible = Boolean(completed);
      if (visual?.pivot) visual.pivot.rotation.z = completed ? 0 : visual.lean;
      if (visual?.collider) {
        const index = colliders.indexOf(visual.collider);
        if (completed && index !== -1) colliders.splice(index, 1);
        if (!completed && index === -1) colliders.push(visual.collider);
      }
      return true;
    },
    journeySiteState: () => ({ ...journeyState }),
    pond,
    fishingSpots,
    setFishingSpot,
    activeFishingSpot: () => activeFishingSpot,
    firePits,
    setCampfireLit(id, lit) {
      const camp = campfires.get(id); if (!camp) return false;
      camp.fire.lit = Boolean(lit); camp.flames.visible = camp.fire.lit; return true;
    },
    setFishingState(phase) {
      if (!['idle', 'waiting', 'bite'].includes(phase)) return false;
      fishingPhase = phase; fishingVisual.visible = phase !== 'idle'; return true;
    },
    setFishingOrigin,
    encounter,
    northTrail,
    border,
    routeNorth,
    broadleafTrees: broadTrees.flatMap((tree, i) => tree.hidden ? [] : [{ id: `oak-${i}`, x: tree.x, z: tree.z,
      y: groundHeight(tree.x, tree.z), height: tree.h * tree.s, radius: .38 * tree.s,
      trunkHeight: tree.h * tree.s * .82, trunkTopRadius: .21 * tree.s, ...tree.trunk }]),
    ringBell(time = worldTime) { bellStarted = time; },
    spawn: { x: 0, z: 43 },
    boatStart: { x: -4.8, z: 43, y: 1.0 },
    bounds: { minX: -94, maxX: 94, minZ: -680, maxZ: 48 },
    npcPositions: { harbormaster: { x: 4, z: 20 }, fisher: { x: -15, z: 22 }, warden: { x: 0, z: -65 }, 'acorn-cook': acornCook,
      doomsayer, 'pond-fisher': pondFisher, 'forest-woodcutter': forestWoodcutter, ...regionNpcPositions, ...REGIONAL_NPC_POSITIONS },
    landmarks: [
      { id: 'harbor', name: 'Tidehaven Landing', x: 0, z: 29, description: 'Small fishing boats cross the Stills to this sheltered corner of Drent’s coast.' },
      { id: 'village', name: 'Tidehaven Village', x: 0, z: 5, description: 'Salt on the breeze. Smoke above the rooftops. A quiet place to begin.' },
      { id: 'woodland', name: 'The Greenway', x: 0, z: -36, description: 'An old footpath winds north beneath the welcoming forest canopy.' },
      { id: 'waystone', name: 'Mosslight Waystone', x: 31, z: -59, description: 'A weathered marker remembers a road older than the village.' },
      { id: 'watch', name: 'Greenway Watch', x: 0, z: -66, description: 'The woodland warden watches the route to the greater regions of Azhora.' },
      { id: 'pond', name: 'Willowmere Pond', x: pond.fishingSpot.x, z: pond.fishingSpot.z, description: 'A quiet forest pool, a fishing ledge, and an old stone firepit beside the water.' },
      { id: 'northTrail', name: northTrail.name, x: northTrail.x, z: northTrail.z, description: 'A shaded bench and an old cairn mark the last rest beneath the forest canopy.' },
      { id: 'border', name: border.name, x: border.x, z: border.z, description: 'The open field gate marks the end of Eastreena’s forest and the beginning of Sunmeadow Plain.' },
      ...forestPlaceDefinitions,
      { ...FOREST_HIDEOUT, description: 'A half-hidden goblin shelter beside a trail of stolen village supplies.' },
      ...regionLandmarks,
      ...REGIONAL_PLACES,
    ],
    paths: paths.map(p=>p.map(v=>({x:v.x,z:v.y}))),
    update(time, dt) {
      worldTime = time;
      const bellAge = Number.isFinite(bellStarted) ? Math.max(0, time - bellStarted) : 6;
      const bellEnvelope = bellAge < 6 ? Math.exp(-bellAge * .7) : 0;
      bellSwing.rotation.z = Math.sin(bellAge * 10) * .43 * bellEnvelope;
      bellTongue.rotation.z = Math.sin(bellAge * 10 - .9) * .5 * bellEnvelope;
      waterMaterial.uniforms.time.value=time;
      pondMaterial.uniforms.time.value=time;
      riverMaterial.uniforms.time.value=time;
      millSails.rotation.z = time * .115;
      for (const [i, camp] of [...campfires.values()].entries()) if (camp.fire.lit) {
        camp.flames.scale.set(1 + Math.sin(time * 8 + i) * .04, .94 + Math.sin(time * 11 + i) * .10, 1);
        camp.glow.intensity = 2.3 + Math.sin(time * 9 + i) * .24;
      }
      if (fishingPhase !== 'idle') {
        bobber.position.y = activeFishingSpot.castPoint.y + Math.sin(time * (fishingPhase === 'bite' ? 12 : 2.5)) * (fishingPhase === 'bite' ? .13 : .026);
        bobber.rotation.z = Math.sin(time * 6) * (fishingPhase === 'bite' ? .36 : .06);
        fishingRipple.scale.setScalar(.8 + (time * (fishingPhase === 'bite' ? 1.7 : .6) % 1) * 2.4);
        fishingRipple.material.opacity = fishingPhase === 'bite' ? .77 : .38;
      }
      shoreFoam.material.opacity=.31+Math.sin(time*.55)*.09;
      arrivalBoat.position.y=.38+Math.sin(time*.72)*.085;arrivalBoat.rotation.z=Math.sin(time*.62)*.018;
      fishingBoat.position.y=.38+Math.sin(time*.82+2)*.065;fishingBoat.rotation.z=Math.sin(time*.77)*.026;
      let si=0;
      for(let i=0;i<smokeSources.length;i++)for(let j=0;j<4;j++){
        const age=(time*.11+j*.25+i*.073)%1,source=smokeSources[i];
        dummy.position.set(source.x+age*1.65+Math.sin(time*.25+j)*age*.28,source.y+age*4.4,source.z+age*.6);
        dummy.rotation.set(age,age*2,0);const s=.19+age*.56;dummy.scale.set(s,s*.85,s);dummy.updateMatrix();smoke.setMatrixAt(si++,dummy.matrix);
      }
      smoke.instanceMatrix.needsUpdate=true;
      birds.forEach((bird,i)=>{
        const a=time*bird.speed+bird.phase;
        bird.group.position.set(Math.cos(a)*bird.radius+8,bird.height+Math.sin(a*3)*1.0,41+Math.sin(a)*bird.radius*.7);
        bird.group.rotation.y=-a;
        const flap=Math.sin(time*3.4+i)*.3;
        bird.l.rotation.z=flap;bird.r.rotation.z=-flap;
      });
      butterflies.forEach((butterfly,i)=>{
        const a=time*.42+butterfly.phase;
        const x=butterfly.x+Math.sin(a)*1.3,z=butterfly.z+Math.cos(a*.8)*1.0;
        butterfly.group.position.set(x,groundHeight(x,z)+1.1+Math.sin(time*1.25+i)*.26,z);
        butterfly.group.rotation.y=a;
        butterfly.l.rotation.z=Math.sin(time*13+i)*.95;butterfly.r.rotation.z=-Math.sin(time*13+i)*.95;
      });
    },
  };
}
