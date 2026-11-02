import * as THREE from 'three';
import { finishBuild } from '../loading/build-steps.js';
import { registerWorldTree, getTreeRegistry } from './tree-registry.js';
import { treeSpecies } from '../life/tree-species.js';

// Metres per metre of mature height. These silhouettes deliberately use a small
// vocabulary of solids, but each species has its own branching habit and bark.
// Fictional Ibenwood trees keep their separately authored, much larger models.
const profile = (form, radius, trunk, bole, bark, leaves, detail, extra = {}) =>
  Object.freeze({ form, radius, trunk, bole, bark, leaves, detail, ...extra });
export const SPECIES_TREE_PROFILES = Object.freeze({
  'white-oak': profile('spreading', .47, .045, .51, '#918a7c', '#608043', 'scales', { lobes: 5, flat: .21, fork: .30 }),
  'red-oak': profile('rounded', .37, .034, .66, '#554c43', '#59783b', 'stripes', { lobes: 5, flat: .27, fork: .46 }),
  'holm-oak': profile('rounded', .41, .049, .47, '#716854', '#465f43', 'scales', { lobes: 6, flat: .22, fork: .27 }),
  'black-walnut': profile('open', .43, .038, .65, '#3e352e', '#7a944e', 'nuts', { lobes: 5, flat: .17, fork: .42 }),
  'sweet-chestnut': profile('spreading', .46, .052, .56, '#6b5843', '#719047', 'spiral', { lobes: 4, flat: .25, fork: .32 }),
  'beech': profile('rounded', .40, .040, .55, '#aaa89c', '#7f984e', 'smooth', { lobes: 6, flat: .26, fork: .31 }),
  'hickory': profile('column', .30, .030, .74, '#6e6253', '#6c8642', 'plates', { lobes: 5, flat: .24, fork: .55 }),
  'tulip-poplar': profile('column', .25, .027, .78, '#848279', '#7a9b4b', 'flowers', { lobes: 5, flat: .25, fork: .58 }),
  'red-maple': profile('rounded', .35, .031, .60, '#86847b', '#9c573e', 'smooth', { lobes: 4, flat: .26, fork: .41 }),
  'sweetgum': profile('column', .28, .033, .72, '#62574b', '#6f8941', 'seedballs', { lobes: 5, flat: .28, fork: .48 }),
  'sycamore': profile('spreading', .46, .047, .62, '#ded9c9', '#8ca65c', 'patches', { lobes: 5, flat: .23, fork: .36 }),
  'bald-cypress': profile('spire', .28, .050, .82, '#86664d', '#7e9256', 'knees', { tiers: 4 }),
  'loblolly-pine': profile('umbrella', .29, .028, .86, '#78553c', '#416546', 'plates', { lobes: 4, flat: .13, fork: .70 }),
  'red-cedar': profile('spire', .23, .032, .53, '#87563e', '#36553c', 'stripes', { tiers: 3, low: .12 }),
  'silver-fir': profile('layered', .30, .027, .90, '#8d8b7c', '#3e6255', 'smooth', { tiers: 5 }),
  'stone-pine': profile('umbrella', .48, .040, .81, '#875f49', '#536e50', 'plates', { lobes: 5, flat: .11, fork: .61 }),
  'common-juniper': profile('shrub', .48, .038, .54, '#776852', '#61785e', 'berries', { lobes: 4, flat: .29, fork: .10 }),
  'silver-birch': profile('open', .29, .022, .77, '#deddd0', '#93a46a', 'birch', { lobes: 5, flat: .22, fork: .48 }),
  'black-alder': profile('rounded', .32, .035, .67, '#60594b', '#5d7c45', 'cones', { lobes: 4, flat: .26, fork: .42 }),
  'black-willow': profile('willow', .46, .044, .60, '#786e50', '#8da36b', 'stripes', { lobes: 4, fork: .31 }),
  'white-poplar': profile('column', .30, .034, .78, '#cacbbd', '#9eaf80', 'patches', { lobes: 5, flat: .26, fork: .50 }),
  'black-poplar': profile('column', .23, .036, .81, '#645d50', '#7d9651', 'stripes', { lobes: 6, flat: .28, fork: .48 }),
  'common-hazel': profile('shrub', .45, .032, .49, '#8b7a5c', '#82a252', 'nuts', { lobes: 4, flat: .24, fork: .08 }),
  'olive': profile('open', .48, .065, .47, '#8b8269', '#a1a887', 'twist', { lobes: 4, flat: .18, fork: .21 }),
  'tamarisk': profile('spray', .48, .031, .54, '#97775f', '#a39c8a', 'flowers', { lobes: 6, flat: .14, fork: .18 }),
  'hawthorn': profile('spreading', .46, .047, .43, '#786752', '#74874c', 'haws', { lobes: 4, flat: .20, fork: .20 }),
  'apple': profile('rounded', .43, .045, .48, '#80634a', '#78914e', 'apples', { lobes: 4, flat: .23, fork: .26 }),
  'fig': profile('spreading', .48, .058, .43, '#a1987d', '#759251', 'figs', { lobes: 5, flat: .20, fork: .17 }),
  'sweet-orange': profile('rounded', .36, .033, .53, '#8c7960', '#426e3e', 'oranges', { lobes: 5, flat: .26, fork: .34 }),
  'pawpaw': profile('column', .26, .027, .66, '#a39a7d', '#83a05e', 'pawpaws', { lobes: 4, flat: .24, fork: .43 }),
  'holly': profile('spire', .31, .030, .59, '#99978a', '#2f5736', 'haws', { tiers: 3, low: .16 }),
  'dogwood': profile('layer-broad', .48, .034, .48, '#796b58', '#e8e5ce', 'smooth', { lobes: 5, flat: .09, fork: .22 }),
  'persimmon': profile('rounded', .36, .034, .59, '#403b31', '#748c4b', 'persimmons', { lobes: 4, flat: .26, fork: .37 }),
  'desert-thorn': profile('umbrella', .55, .040, .57, '#8f7e61', '#8f9562', 'thorns', { lobes: 4, flat: .12, fork: .21 }),
  'coconut-palm': profile('palm', .39, .029, .90, '#a2967d', '#7e9b60', 'rings'),
  'kapok': profile('emergent', .44, .051, .80, '#a2a38c', '#64875d', 'buttress', { lobes: 5, flat: .15, fork: .62 }),
  'strangler-fig': profile('spreading', .48, .062, .65, '#a3a38c', '#537650', 'aerial', { lobes: 6, flat: .22, fork: .35 }),
  'mahogany': profile('open', .39, .041, .75, '#7d6450', '#597c56', 'stripes', { lobes: 5, flat: .18, fork: .52 }),
  'red-mangrove': profile('rounded', .43, .038, .66, '#897b66', '#71905e', 'stilts', { lobes: 4, flat: .24, fork: .37 }),
  'english-oak': profile('spreading', .51, .055, .45, '#8b7c65', '#72864b', 'scales', { lobes: 5, flat: .23, fork: .24 }),
  'european-beech': profile('rounded', .44, .045, .60, '#b1afa2', '#7d944a', 'smooth', { lobes: 5, flat: .28, fork: .34 }),
  'wych-elm': profile('fan', .45, .045, .71, '#776954', '#5b7a48', 'stripes', { lobes: 5, flat: .24, fork: .35 }),
  'small-leaved-lime': profile('rounded', .38, .038, .58, '#8c8069', '#8b9d55', 'flowers', { lobes: 5, flat: .29, fork: .31 }),
  'date-palm': profile('palm', .36, .041, .88, '#9b8866', '#7c9475', 'plates', { fronds: 10 }),
  'mediterranean-cypress': profile('spire', .12, .025, .76, '#817058', '#3d5945', 'stripes', { tiers: 4, low: .10 }),
});

const modelId = species => treeSpecies(species)?.realSpeciesId ?? treeSpecies(species)?.id ?? species;

export function speciesTreeDimensions(species, height = 10) {
  const p = SPECIES_TREE_PROFILES[modelId(species)];
  if (!p) throw new Error(`No tree geometry profile for ${species}`);
  return { height, crownRadius: height * p.radius, trunkRadius: height * p.trunk };
}

// All source primitives are temporary. Merging vertex colours leaves only two
// indexed-free geometries per species, with no per-tree meshes or animation.
function makeShapes(species, detail = 'full') {
  const p = SPECIES_TREE_PROFILES[modelId(species)];
  if (!p) throw new Error(`No tree geometry profile for ${species}`);
  const cylinder = new THREE.CylinderGeometry(.70, 1, 1, 5), ball = detail==='forest'?new THREE.OctahedronGeometry(1,0):new THREE.IcosahedronGeometry(1, 0);
  const branch = new THREE.CylinderGeometry(.55, 1, 1, 4, 1, true), small = new THREE.OctahedronGeometry(1, 0);
  const cone = new THREE.ConeGeometry(1, 1, 6), slab = new THREE.BoxGeometry(1, 1, 1);
  const trunk = [], crown = [], PHI = 2.39996323;
  const part = (into, g, colour, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) => into.push([g, colour, [x,y,z], [sx,sy,sz], [rx,ry,rz]]);
  const limb = (into, a, b, radius, colour = p.bark) => {
    const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b), delta = to.clone().sub(from);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0), delta.clone().normalize());
    const e = new THREE.Euler().setFromQuaternion(q), mid = from.add(to).multiplyScalar(.5);
    part(into,branch,colour,mid.x,mid.y,mid.z,radius,delta.length(),radius,e.x,e.y,e.z);
  };
  const leaf = new THREE.Color(p.leaves), pale = leaf.clone().offsetHSL(0, -.035, .065);
  part(trunk,cylinder,p.bark,0,p.bole/2,0,1,p.bole,1);
  // Bark marks are physical shallow solids: broad birch lenticels, peeling
  // hickory/pine plates, sycamore patches, and long oak/poplar fissures.
  if (p.detail !== 'smooth') for (let i=0;i<3;i++) {
    const a = i*PHI, y = .075+i*p.bole*.24;
    const birch = p.detail==='birch', rings = p.detail==='rings';
    part(trunk,slab,birch?'#635f54':new THREE.Color(p.bark).multiplyScalar(.73),
      Math.sin(a)*.80,y,Math.cos(a)*.80,birch?.84:rings?1.25:.25,
      birch?.009:rings?.012:p.detail==='plates'?.105:.07,.12,0,a,p.detail==='spiral'?.28:0);
  }
  const branchCount = p.lobes ?? 4;
  if (p.form==='palm') {
    // Eight visibly feathered, downward-curving fronds; no broadleaf balls.
    const count=p.fronds??8;
    for(let i=0;i<count;i++) {
      const a=i*Math.PI*2/count, x=Math.sin(a), z=Math.cos(a);
      limb(crown,[0,.88,0],[x*.52,.99,z*.52],.018);
      limb(crown,[x*.52,.99,z*.52],[x*.91,.78,z*.91],.012,p.leaves);
      for(let j=0;j<3;j++) part(crown,small,j%2?pale:leaf,x*(.32+j*.24),.96-j*.07,z*(.32+j*.24),.18,.035,.33,0,a,.08);
    }
  } else if (p.form==='spire'||p.form==='layered') {
    for(let i=0;i<p.tiers;i++) {
      const t=i/(p.tiers-1), low=p.low??.28;
      part(crown,cone,i%2?pale:leaf,0,low+.27+t*.36,0,.89-t*.52,.56-t*.18,.89-t*.52);
      if(p.form==='layered') for(let j=0;j<3;j++) {
        const a=j*2.094+i*.7;limb(crown,[0,low+.03+t*.36,0],[Math.sin(a)*(.80-t*.5),low+.04+t*.36,Math.cos(a)*(.80-t*.5)],.016);
      }
    }
  } else {
    for(let i=0;i<branchCount;i++) {
      const a=i*PHI+.3, column=p.form==='column', open=p.form==='open';
      const reach=column?.30:open?.60:p.form==='fan'?.66:.52, x=Math.sin(a)*reach,z=Math.cos(a)*reach;
      const y=p.form==='layer-broad'?.56+(i%3)*.14:p.form==='umbrella'||p.form==='emergent'?.83+(i%2)*.045:
        column?.60+(i%3)*.105:p.form==='shrub'?.55+(i%3)*.08:.68+(i%3)*.07;
      limb(crown,[0,p.fork??.4,0],[x,y-.06,z],p.form==='spreading'?.045:.028);
      const sy=p.form==='willow'?.28:p.flat??.23, sx=column?.61:open?.40:.49;
      part(crown,ball,i%3===1?pale:leaf,x,y,z,sx,sy,sx*(i%2?.87:1));
      if(p.form==='willow') {
        const dx=Math.sin(a)*.77,dz=Math.cos(a)*.77;
        limb(crown,[x,y,z],[dx,y-.35,dz],.013);
        part(crown,small,pale,dx,y-.17,dz,.17,.32,.17);
      }
      if(p.form==='spray') part(crown,small,pale,x*1.3,y+.04,z*1.3,.31,.12,.31);
      if(p.form==='shrub') limb(crown,[Math.sin(a)*.12,.01,Math.cos(a)*.12],[x,y-.05,z],.029);
    }
  }
  // Features remain part of the same crown instance and its radius envelope.
  if(['knees','buttress','stilts','aerial'].includes(p.detail)) for(let i=0;i<4;i++) {
    const a=i*Math.PI/2+.3, x=Math.sin(a),z=Math.cos(a);
    if(p.detail==='knees') part(crown,cone,p.bark,x*.48,.055,z*.48,.065,.11,.065);
    else if(p.detail==='aerial') limb(crown,[x*.45,.68,z*.45],[x*.43,.02,z*.43],.018);
    else limb(crown,[0,p.detail==='stilts'?.28:.17,0],[x*.40,.005,z*.40],p.detail==='stilts'?.026:.075);
  }
  if(p.detail==='twist') for(let i=0;i<3;i++) limb(crown,[0,.02,0],[Math.sin(i*2.094)*.16,.47,Math.cos(i*2.094)*.16],.044);
  const fruitColours={nuts:'#a4a85b',seedballs:'#695a37',cones:'#5c4e38',berries:'#65768c',haws:'#b64f3c',apples:'#c17c46',figs:'#796a7d',oranges:'#e6a448',pawpaws:'#b4b963',persimmons:'#db8a36',flowers:'#d9c0a5'};
  if(fruitColours[p.detail]) for(let i=0;i<3;i++) {
    const a=i*PHI, r=p.form==='column'?.56:.79;
    part(crown,small,fruitColours[p.detail],Math.sin(a)*r,.61+(i%3)*.075,Math.cos(a)*r,.035,p.detail==='pawpaws'?.065:.035,.035);
  }
  const merge = pieces => {
    const positions=[],normals=[],colours=[],v=new THREE.Vector3(),n=new THREE.Vector3();
    const matrix=new THREE.Matrix4(),normalMatrix=new THREE.Matrix3(),q=new THREE.Quaternion(),e=new THREE.Euler();
    for(const [source,colour,pos,scale,rotation] of pieces) {
      const g=source.index?source.toNonIndexed():source, tint=new THREE.Color(colour);
      matrix.compose(new THREE.Vector3(...pos),q.setFromEuler(e.set(...rotation)),new THREE.Vector3(...scale));normalMatrix.getNormalMatrix(matrix);
      for(let i=0;i<g.attributes.position.count;i++) {
        v.fromBufferAttribute(g.attributes.position,i).applyMatrix4(matrix);positions.push(v.x,v.y,v.z);
        n.fromBufferAttribute(g.attributes.normal,i).applyMatrix3(normalMatrix).normalize();normals.push(n.x,n.y,n.z);colours.push(tint.r,tint.g,tint.b);
      }
      if(g!==source)g.dispose();
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colours,3));return g;
  };
  const shapes={trunk:merge(trunk),crown:merge(crown)};
  // Exact radial bounds matter to field edges, paths and riparian buffers.
  let top=p.bole;
  for(const g of Object.values(shapes))for(let i=0;i<g.attributes.position.count;i++)top=Math.max(top,g.attributes.position.getY(i));
  for(const [kind,g] of Object.entries(shapes)) {
    const pos=g.attributes.position;let radius=0;
    for(let i=0;i<pos.count;i++)radius=Math.max(radius,Math.hypot(pos.getX(i),pos.getZ(i)));
    for(let i=0;i<pos.count;i++)pos.setXYZ(i,pos.getX(i)/radius,Math.max(0,pos.getY(i))/top,pos.getZ(i)/radius);
    // Recompute after the nonuniform normalization, so sloping branches light correctly.
    g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();g.userData.species=species;g.userData.part=kind;
    if(kind==='trunk') {
      const feet=new Map();
      for(let i=0;i<pos.count;i++)if(pos.getY(i)<.000001)feet.set(`${pos.getX(i).toFixed(6)},${pos.getZ(i).toFixed(6)}`,[pos.getX(i),pos.getZ(i)]);
      g.userData.footprint=[...feet.values()];
    }
  }
  for(const g of [cylinder,branch,small,ball,cone,slab])g.dispose();
  return shapes;
}

/** Share this library across several blocks belonging to the same scenery owner. */
export function createSpeciesTreeLibrary({detail='full'}={}) {
  const geometries=new Map(),material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.94,flatShading:true});
  return { material, shapes(species) { const id=modelId(species);if(!geometries.has(id))geometries.set(id,makeShapes(id,detail));return geometries.get(id); },
    dispose() { for(const shapes of geometries.values())for(const g of Object.values(shapes))g.dispose();geometries.clear();material.dispose(); } };
}

export function createSpeciesTrees(options) { return finishBuild(createSpeciesTreesSteps(options)); }

/** Coordinates are in the parent's existing world-aligned scenery frame. The
 * optional y is its centre terrain sample, not permission to leave a trunk
 * floating on a slope. Metadata and stable ids survive unchanged. */
export function* createSpeciesTreesSteps({parent,colliders,trees,heightAt,chunkSize=160,name='Species trees',library=null}) {
  const owned=!library;library??=createSpeciesTreeLibrary();
  const root=new THREE.Group();root.name=name;parent.add(root);
  const groups=new Map(),result=[],dummy=new THREE.Object3D();let work=0,vertices=0,batches=0;
  for(const tree of trees) {
    if(++work%32===0)yield;
    const dimensions=speciesTreeDimensions(tree.species,tree.height??10);
    const crownRadius=tree.crownRadius??dimensions.crownRadius,trunkRadius=tree.trunkRadius??tree.radius??dimensions.trunkRadius;
    if(!tree.id||![tree.x,tree.z,dimensions.height,crownRadius,trunkRadius].every(Number.isFinite)||Math.min(dimensions.height,crownRadius,trunkRadius)<=0)
      throw new Error(`Invalid tree geometry descriptor: ${tree.id}`);
    if(trunkRadius>crownRadius)throw new Error(`Trunk exceeds tree footprint: ${tree.id}`);
    const y=tree.y??heightAt?.(tree.x,tree.z)??0;let baseY=y;
    if(!Number.isFinite(y))throw new Error(`Invalid tree ground height: ${tree.id}`);
    if(heightAt) {
      const yaw=tree.rotation??tree.yaw??0,sin=Math.sin(yaw),cos=Math.cos(yaw);
      for(const [dx,dz] of library.shapes(tree.species).trunk.userData.footprint)
        baseY=Math.min(baseY,heightAt(tree.x+(dx*cos+dz*sin)*trunkRadius,tree.z+(-dx*sin+dz*cos)*trunkRadius));
    }
    baseY-=.03;
    const descriptor={...tree,y,height:dimensions.height,crownRadius,trunkRadius,radius:trunkRadius,realSpeciesId:modelId(tree.species),base:{x:tree.x,y:baseY,z:tree.z}};
    const key=`${modelId(tree.species)}:${Math.floor(tree.x/chunkSize)},${Math.floor(tree.z/chunkSize)}`;
    if(!groups.has(key))groups.set(key,[]);groups.get(key).push(descriptor);
  }
  for(const [key,members] of groups) {
    yield;
    const shapes=library.shapes(members[0].species),handles=members.map(()=>[]);
    for(const tree of members){tree.trunkHeight??=shapes.trunk.boundingBox.max.y*tree.height;tree.trunkTopRadius??=tree.trunkRadius*.7;tree.axis??=[0,1,0];}
    for(const [kind,geometry] of Object.entries(shapes)) {
      const mesh=new THREE.InstancedMesh(geometry,library.material,members.length);mesh.name=`${key} ${kind}`;
      mesh.userData.species=members[0].species;mesh.userData.treePart=kind;mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
      for(let index=0;index<members.length;index++) {
        if(++work%32===0)yield;
        const tree=members[index],radius=kind==='trunk'?tree.trunkRadius:tree.crownRadius;
        const height=kind==='trunk'&&tree.trunkHeight?tree.trunkHeight/geometry.boundingBox.max.y:tree.height;
        dummy.position.set(tree.x,tree.base.y,tree.z);dummy.rotation.set(0,tree.rotation??tree.yaw??0,0);dummy.scale.set(radius,height,radius);dummy.updateMatrix();
        mesh.setMatrixAt(index,dummy.matrix);handles[index].push({mesh,index});
      }
      mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();batches++;vertices+=geometry.attributes.position.count*members.length;
    }
    for(let index=0;index<members.length;index++) {
      if(++work%32===0)yield;
      const tree=members[index],collider={x:tree.x,z:tree.z,r:tree.collisionRadius??tree.trunkRadius,minY:tree.collisionMinY??tree.base.y,maxY:tree.collisionMaxY??tree.base.y+tree.height,kind:tree.colliderKind??'tree'};
      const {additionalHandles=[],...descriptor}=tree;
      colliders.push(collider);result.push(registerWorldTree(colliders,descriptor,[...handles[index],...additionalHandles],collider));
    }
  }
  let disposed=false;
  return {root,trees:result,batches,vertices,metrics:{trees:result.length,batches,vertices,triangles:vertices/3},
    dispose(){if(disposed)return;disposed=true;for(const tree of result)getTreeRegistry(colliders).remove(tree.id);root.removeFromParent();if(owned)library.dispose();} };
}
