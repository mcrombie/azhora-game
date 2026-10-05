import { forEachBuild } from './build-each.js';
import { finishBuild } from './build-steps.js';
import * as THREE from 'three';
import { registerWorldTree, worldTreeId } from './tree-registry.js';
import { treeGroundingOffset } from './tree-grounding.js';
import { outerFeatures, outerWaterAt, OUTER_RIVERS } from './outer-regions-world.js';
import { outerWildlifeClear } from './outer-regions-wildlife.js';

const CHUNK = 110;
const makeGeometry = () => ({
  trunk: new THREE.CylinderGeometry(.7, 1, 1, 7),
  crown: new THREE.IcosahedronGeometry(1, 1),
  fir: new THREE.ConeGeometry(1, 1, 7),
  stone: new THREE.IcosahedronGeometry(1, 0),
  blade: new THREE.ConeGeometry(1, 1, 3),
});
const tones = {
  'white-oak':['#77674d','#6e864c'], 'common-hazel':['#7b7050','#78934f'], 'black-willow':['#807558','#7f9864'], 'holm-oak':['#746c58','#5b7454'], 'mahogany':['#776350','#4b7852'], 'kapok':['#8e927b','#517957'], 'strangler-fig':['#939883','#4e7052'], 'coconut-palm':['#928576','#719863'], 'red-mangrove':['#7a7566','#65845b'],
  beech: ['#8a8876','#719058'],
  'black-alder': ['#696248','#617d48'],
  'black-willow': ['#807558','#7f9864'],
  'silver-fir': ['#6e6553', '#385c50'],
  'stone-pine': ['#78624b', '#506956'],
  'silver-birch': ['#c3c4ae', '#82905b'],
  'common-juniper': ['#7a705b', '#5a705c'],
};

/** One stable, batched regional landscape. No artificial cliff collision hulls:
 * the visible heightfield supplies all ridges, passes and climbing surfaces. */
export function createOuterScenery(...args) { return finishBuild(createOuterScenerySteps(...args)); }

export function* createOuterScenerySteps({ parent, heightAt, renderedGroundHeight = heightAt, colliders, terrainRoot, profile }) {
  // A region owns its GPU resources; parking another region must not invalidate these batches.
  const geometry=makeGeometry();
  const regionName=profile.name, regionBounds=profile.bounds, regionLakes=profile.lakes??[];
  const owns=profile.owns, featuresAt=outerFeatures, waterAt=outerWaterAt;
  const isReserved=(x,z,r=0)=>outerWildlifeClear(x,z,r)||outerFeatures(x,z)?.pathDistance<5+r;
  let buildWork = 0;
  const root = new THREE.Group(); root.name = profile.name+' wilderness'; parent.add(root);
  const material = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .98, flatShading: true });
  const batches = new Map(), pendingTrees = [], dummy = new THREE.Object3D(), color = new THREE.Color();
  const metrics = { trees: 0, rocks: 0, tufts: 0, flowers: 0, shrubs: 0, reeds: 0, deadwood: 0, lakes: 0, batches: 0 };
  let seed = 970237 + profile.id * 193;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const range = (a, b) => a + random() * (b - a);
  function part(type, tint, x, y, z, sx, sy, sz, ry = 0, rz = 0) {
    const key = `${Math.floor(x / CHUNK)},${Math.floor(z / CHUNK)}:${type}`;
    if (!batches.has(key)) batches.set(key, { type, pieces: [] });
    dummy.position.set(x, y, z); dummy.scale.set(sx, sy, sz); dummy.rotation.set(0, ry, rz); dummy.updateMatrix();
    const p = { matrix: dummy.matrix.clone(), tint, x, z, radius: Math.max(sx, sz) }; batches.get(key).pieces.push(p); return p;
  }
  function tree(x, z, species, height) {
    const y = renderedGroundHeight(x, z), [bark, leaf] = tones[species], pieces = [];
    const r = height * (species === 'acor' ? .052 : species === 'silver-birch' ? .021 : .032), bole = height * .73;
    const trunk = part('trunk', bark, x, y + bole / 2, z, r, bole, r);
    const offset = treeGroundingOffset(trunk.matrix, renderedGroundHeight, { radius: 1, segments: 7, embed: .06 });
    trunk.matrix.elements[13] += offset; pieces.push(trunk);
    if(species==='coconut-palm'){
      for(let i=0;i<7;i++){const a=i*Math.PI*2/7;pieces.push(part('crown',leaf,x+Math.sin(a)*height*.12,y+offset+height*.87,z+Math.cos(a)*height*.12,height*.06,height*.035,height*.28,a));}
    } else if (species === 'silver-fir') {
      for (let i = 0; i < 4; i++) pieces.push(part('fir', leaf, x, y + offset + height * (.36 + i * .16), z,
        height * (.23 - i * .044), height * .38, height * (.23 - i * .044), range(0, 6)));
    } else {
      const pine = species === 'stone-pine', low = species === 'common-juniper', acor = species === 'acor', willow = species === 'black-willow';
      for (let i = 0; i < (acor?5:3); i++) {
        const a = i * Math.PI * 2 / (acor?5:3) + x * .019, spread = height * (acor ? .29 : pine ? .20 : .13);
        pieces.push(part('crown', leaf, x + Math.cos(a) * spread, y + offset + height * (low ? .63 : .76) + i * height * .055,
          z + Math.sin(a) * spread, height * (acor ? .31 : pine ? .25 : .21), height * (acor ? .16 : willow ? .29 : pine ? .13 : .24), height * (acor ? .27 : .21), a));
      }
      if (species === 'silver-birch') for (let i = 0; i < 3; i++) pieces.push(part('trunk', '#6e7466', x, y + offset + bole * (.2 + i * .23), z, r * .96, .09, r * .96));
    }
    // Consume the same random draws before omitting a whole tree, so reserving
    // a cottage does not move the surrounding woodland or shoreline erratics.
    if(['kapok','strangler-fig','red-mangrove'].includes(species)){for(let i=0;i<4;i++){const a=i*Math.PI/2;pieces.push(part('stone',bark,x+Math.cos(a)*r,y+offset+.8,z+Math.sin(a)*r,r*1.6,1.6,r*.65,a));}}
    const omitted = isReserved(x, z, height * .20);
    for (const piece of pieces) { piece.tree = true; piece.omitted = omitted; }
    if (omitted) return;
    const collider = { x, z, r, kind: 'tree' }; colliders.push(collider);
    pendingTrees.push({ descriptor: { id: worldTreeId('outer-country-'+profile.id, x, z), region: regionName,
      species, x, z, y, height, radius: r, base: { x, y: y + offset, z } }, pieces, collider });
  }

  const b = regionBounds;
  // Old broad crowns overlap above walkable trunks; gaps follow hollows and animal tracks.
  const spacing=['dark','jungle','boreal'].includes(profile.kind)?9:13;
  for(let z0=b.minZ+4;z0<b.maxZ;z0+=spacing)for(let x0=b.minX+4;x0<b.maxX;x0+=spacing){
    if(++buildWork%32===0)yield;
    const x=x0+range(-3.5,3.5),z=z0+range(-3.5,3.5);
    if(!owns(x,z)||waterAt(x,z)!==null)continue;
    const f=featuresAt(x,z);if(f.height<1||f.grade>.9||f.height>f.treeline||f.snow>.4||f.pathDistance<5||f.shoreDistance<2)continue;
    if(profile.kind==='plateau'&&f.shelter<.62)continue;
    const patch=.6+.4*Math.sin(x*.024+Math.sin(z*.011))*Math.cos(z*.017);
    const cover=Math.min(.97,profile.cover*(f.forest?1.18:.72));
    if(random()>cover*(.5+.5*patch)||!profile.trees.length)continue;
    let species=profile.trees[Math.floor(random()*profile.trees.length)];
    if(f.shoreDistance<15&&!['ice','plateau'].includes(profile.kind))species='black-alder';
    tree(x,z,species,profile.kind==='plateau'?range(2.0,species==='common-juniper'?2.7:4.8):profile.kind==='dark'?range(20,30):profile.kind==='jungle'?range(20,34):species==='common-juniper'?range(1.7,3.8):range(8,18));
  }

  for (let z0 = b.minZ + 2; z0 < b.maxZ; z0 += 8) { if (++buildWork % 32 === 0) yield; for (let x0 = b.minX + 2; x0 < b.maxX; x0 += 8) { if (++buildWork % 32 === 0) yield;
    const x = x0 + range(-3, 3), z = z0 + range(-3, 3);
    if (!owns(x, z) || waterAt(x, z) !== null) continue;
    const f = featuresAt(x, z), y = renderedGroundHeight(x, z);
    if (f.pathDistance < 3.5 || f.shoreDistance < 1.5 || f.height < .9) continue;
    const rockiness = Math.min(.72, .12 + f.rock * .42 + (f.shoreDistance < 14 ? .25 : 0));
    if (random() < rockiness && f.grade < 2.5) {
      const erratic = f.grade < .55 && random() < .035;
      const r = erratic ? range(1.7, 3.2) : range(.25, .95), h = erratic ? r * .8 : r * .48;
      // Buried, flattened scree chips stay walkable. Only substantial visible
      // boulders have small colliders, never invisible mountainside rectangles.
      const shale=['highland','island','warm-island','plateau'].includes(profile.kind),tint=f.snow>.55?'#d7dfd8':profile.stone;
      const stone = part('stone', tint, x, y + h * .23, z, shale&&!erratic?r*2.2:r, h, r * range(.65, 1.2), shale?.52:range(0,6), range(-.2, .2));
      if (erratic && !isReserved(x, z, stone.radius)) colliders.push({ x, z, r: r * .68, minY: y - .4, maxY: y + h, kind: 'rock' });
      metrics.rocks++;
    }
    if (f.grade > .9 || f.snow > .7 || random() > .64) continue;
    const grass=f.wet?'#647647':profile.kind==='dark'?'#42583b':f.forest?'#587452':profile.ground;
    for (let j = 0; j < (f.wet?7:3); j++) { if (++buildWork % 32 === 0) yield;
      const px = x + range(-.7, .7), pz = z + range(-.7, .7), h = f.wet?range(.5,1.25):range(.17, .55);
      part('blade', grass, px, renderedGroundHeight(px, pz) + h / 2 - .025, pz, f.wet?.17:.1, h, .085, range(0, 6), range(-.25, .25));
    }
    metrics.tufts++;
    if (!f.deep && random() < (profile.kind==='plateau'?.04:.20)) {
      part('stone', random() < .5 ? '#9f8cbb' : '#ddcf8e', x + .22, y + .25, z, .12, .09, .12); metrics.flowers++;
    } else if (random() < .14) {
      part('crown', ['tundra','heath','ice','plateau'].includes(profile.kind)?'#928d93':profile.kind==='dark'?'#3d5547':'#6e805f', x, y + .25, z, range(.4, .9), .4, .55, range(0, 6)); metrics.shrubs++;
    }
  } }
  for(const lake of regionLakes)for(let i=0;i<lake.shore.length;i++){
    const a=lake.shore[i],b=lake.shore[(i+1)%lake.shore.length],steps=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/1.7);
    for(let s=0;s<steps;s++){const p={x:a.x+(b.x-a.x)*s/steps,z:a.z+(b.z-a.z)*s/steps},dx=p.x-lake.centre.x,dz=p.z-lake.centre.z,len=Math.hypot(dx,dz);
    for(let j=0;j<5;j++){if(++buildWork%32===0)yield;const offset=range(-3.5,9),x=p.x+dx/len*offset+range(-.8,.8),z=p.z+dz/len*offset+range(-.8,.8);
      if(!owns(x,z)||isReserved(x,z,.3))continue;const y=renderedGroundHeight(x,z);if(y<lake.surface-1.5||y>lake.surface+1.4)continue;
      if(profile.kind==='plateau'){part('stone','#788478',x,y+.04,z,.55,.07,.38,range(0,6));metrics.shrubs++;continue;}
      const h=range(1.6,2.8);part('blade','#687d46',x,y+h/2,z,.13,h,.09,range(0,6),.12);part('trunk','#655334',x,y+h,z,.09,.30,.09);metrics.reeds++;
    }
    }
  }
  for(const cell of profile.cells){if(++buildWork%32===0)yield;
    if(!['forest','deep_forest'].includes(cell.terrain))continue;
    const x=cell.x+19,z=cell.z-17;if(waterAt(x,z)!==null||isReserved(x,z,4))continue;
    const y=renderedGroundHeight(x,z);part('trunk','#615b41',x,y+.35,z,.55,5,.55,.5,1.5);part('crown','#6c7848',x+1,y+.55,z,.8,.15,.6);metrics.deadwood++;
    if(profile.kind==='dark'){for(let i=0;i<4;i++)part('stone','#9f9982',x+i*.7,y+.45,z+.2,.32,.075,.24);part('trunk','#454d42',x+4,y+1.3,z-1,.7,3,.7,1,.85);}
  }
  for(const [i,cell] of profile.cells.entries()){
    if(++buildWork%32===0)yield;
    if(i%4!==0)continue;const x=cell.x+24,z=cell.z+18;
    if(!owns(x,z)||waterAt(x,z)!==null||isReserved(x,z,12))continue;
    const f=featuresAt(x,z),y=renderedGroundHeight(x,z);if(f.height<2||f.grade>.55)continue;
    if(profile.kind==='plateau'){
      for(let j=0;j<4;j++){const px=x+j*3.4,pz=z+j*.2,py=renderedGroundHeight(px,pz);if(!owns(px,pz)||isReserved(px,pz,4))continue;part('stone',profile.stone,px,py+.25,pz,3.5,.6,1.5,.04);metrics.rocks++;}
    }else if(profile.kind==='karst'){
      for(const dx of [-7,7]){const py=renderedGroundHeight(x+dx,z);part('stone',profile.stone,x+dx,py+5,z,3.5,7,4,.1);colliders.push({x:x+dx,z,r:2.4,minY:py,maxY:py+11,kind:'rock'});}
      part('stone',profile.stone,x,y+10,z,7.8,2.2,3.5,.05);
    }else if(['alpine','highland','heath','ice','island'].includes(profile.kind)){
      for(let j=0;j<3;j++){const px=x+j*2.5,py=renderedGroundHeight(px,z);part('stone',profile.stone,px,py+1.5+j*.3,z,2.5,2.8+j*.5,1.8,.4);colliders.push({x:px,z,r:1.6,minY:py,maxY:py+4+j,kind:'rock'});}
    }
  }
  for (const [key, batch] of batches) { if (++buildWork % 32 === 0) yield;
    batch.pieces = batch.pieces.filter(p => !p.omitted && (p.tree || !isReserved(p.x, p.z, p.radius)));
    if (!batch.pieces.length) continue;
    const mesh = new THREE.InstancedMesh(geometry[batch.type], material, batch.pieces.length);
    mesh.name = `${profile.name} ${key}`; mesh.castShadow = batch.type !== 'blade'; mesh.receiveShadow = true;
    yield* forEachBuild(batch.pieces, function* (p, index) { mesh.setMatrixAt(index, p.matrix); mesh.setColorAt(index, color.set(p.tint)); p.handle = { mesh, index }; });
    mesh.computeBoundingBox(); mesh.computeBoundingSphere(); root.add(mesh);
  }
  const trees = pendingTrees.map(t => registerWorldTree(colliders, t.descriptor, t.pieces.map(p => p.handle), t.collider));
  metrics.trees = trees.length; metrics.batches = batches.size;

  const waterRoot = new THREE.Group(); waterRoot.name = profile.name+' lakes and springs'; root.add(waterRoot);
  const waterMaterial = new THREE.ShaderMaterial({ side: THREE.DoubleSide, fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { time: { value: 0 } }]),
    vertexShader: `#include <fog_pars_vertex>
varying vec2 waterPoint;
void main(){waterPoint=position.xy;vec4 mvPosition=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mvPosition;
#include <fog_vertex>
}`,
    fragmentShader: `#include <fog_pars_fragment>
uniform float time;varying vec2 waterPoint;
void main(){float ripple=sin(waterPoint.x*.58+waterPoint.y*.83-time*.7)*sin(waterPoint.y*.49-waterPoint.x*.16+time*.4);
vec3 colour=vec3(.13,.34,.36)+vec3(.18,.22,.21)*pow(max(ripple,0.),12.);gl_FragColor=vec4(colour,1.);
#include <fog_fragment>
}`,
  });
  const waterMeshes = regionLakes.map(lake => {
    const shape = new THREE.Shape(lake.shore.map(p => new THREE.Vector2(p.x, -p.z)));
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), waterMaterial);
    mesh.name = lake.name; mesh.rotation.x = -Math.PI / 2; mesh.position.y = lake.surface;
    waterRoot.add(mesh); metrics.lakes++; return mesh;
  });
  // Ribbons share the ground query's width and sloping surface. Clip triangles
  // to the actual region so independent regional jobs do not duplicate rivers.
  const riverVertices=[];
  for(const river of OUTER_RIVERS)for(let i=1;i<river.points.length;i++){
    if(++buildWork%32===0)yield;
    const a=river.points[i-1],b=river.points[i],length=Math.hypot(b.x-a.x,b.z-a.z),steps=Math.max(1,Math.ceil(length/5)),nx=-(b.z-a.z)/length,nz=(b.x-a.x)/length;
    for(let j=0;j<steps;j++){
      const t=j/steps,u=(j+1)/steps,p={x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,y:a.y+(b.y-a.y)*t},q={x:a.x+(b.x-a.x)*u,z:a.z+(b.z-a.z)*u,y:a.y+(b.y-a.y)*u};
      for(const side of [-1,1]){
        const vertices=[[p.x,p.y,p.z],[q.x,q.y,q.z],[p.x+nx*river.width*.92*side,p.y,p.z+nz*river.width*.92*side],[q.x+nx*river.width*.92*side,q.y,q.z+nz*river.width*.92*side]];
        for(const tri of [[0,1,2],[1,3,2]]){const cx=tri.reduce((s,k)=>s+vertices[k][0],0)/3,cz=tri.reduce((s,k)=>s+vertices[k][2],0)/3;if(!owns(cx,cz))continue;for(const k of tri)riverVertices.push(...vertices[k]);}
      }
    }
  }
  // Round joins close the wedges between neighboring ribbon tangents. The
  // ground uses rounded segment ends too, so these never widen beyond the bed.
  for(const river of OUTER_RIVERS)for(const p of river.points){
    if(++buildWork%32===0)yield;
    const r=river.width*.92;
    for(let k=0;k<12;k++){const a=k*Math.PI/6,b=(k+1)*Math.PI/6,verts=[[p.x,p.y,p.z],[p.x+Math.cos(a)*r,p.y,p.z+Math.sin(a)*r],[p.x+Math.cos(b)*r,p.y,p.z+Math.sin(b)*r]];
      if(owns(verts.reduce((s,v)=>s+v[0],0)/3,verts.reduce((s,v)=>s+v[2],0)/3))for(const v of verts)riverVertices.push(...v);
    }
  }
  if(riverVertices.length){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(riverVertices,3));g.computeVertexNormals();const m=new THREE.Mesh(g,waterMaterial);m.name=profile.name+' mapped rivers';waterRoot.add(m);waterMeshes.push(m);metrics.riverTriangles=riverVertices.length/9;}
  const steam=[];
  for(const lake of regionLakes.filter(l=>l.thermal)){
    const mat=new THREE.MeshBasicMaterial({color:'#d9e7e0',transparent:true,opacity:.16,depthWrite:false});
    for(let i=0;i<7;i++){const puff=new THREE.Mesh(geometry.crown,mat);puff.position.set(lake.centre.x+Math.sin(i*2.4)*3,lake.surface+1+i*.8,lake.centre.z+Math.cos(i*2.4)*2);puff.scale.set(1.2+i*.18,.4+i*.12,1.2);waterRoot.add(puff);steam.push(puff);}
  }
  return { root, terrainRoot, waterRoot, waterMeshes, trees, metrics,
    renderedGroundHeight, update: time => { waterMaterial.uniforms.time.value = time;steam.forEach((p,i)=>{p.rotation.y=time*.12+i;p.position.y=regionLakes.find(l=>l.thermal).surface+1+(i*.8+time*.22)%6;}); } };
}
