import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {sourceModule} from './module-loader.js';
import {regionalBirdSize} from '../src/world/life/bird-dimensions.js';
const {createCorrisWeatherwise}=await sourceModule('../src/content/regions/minora-frontier/corris-weatherwise.js');
const {createCourierPigeon}=await sourceModule('../src/content/regions/minora-frontier/courier-pigeon.js');
const {createBirdShapes,BIRD_FORMS,birdPartMatrices}=await sourceModule('../src/content/regions/drent/drent-birds.js');
const bounds=root=>new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
const between=(n,min,max,label)=>assert(n>=min&&n<=max,`${label}: ${n} outside ${min}..${max} metres`);

test('Corris and the ordinary pigeons retain adult bird size while standing and flying',()=>{
  const scene=new THREE.Group(),raven=createCorrisWeatherwise(scene),dove=createCourierPigeon(scene);
  raven.animate(0);dove.idle(0);const r=bounds(raven.root),d=bounds(dove.root);
  between(r.z,.56,.69,'raven bill-to-tail');between(r.y,.3,.45,'raven standing height');
  between(r.x,.13,.25,'raven folded wings');between(d.z,.30,.36,'pigeon bill-to-tail');
  const left=new THREE.Box3().setFromObject(raven.root.getObjectByName('Raven left wing')),right=new THREE.Box3().setFromObject(raven.root.getObjectByName('Raven right wing'));
  assert(Math.abs(left.min.y-right.min.y)<.002&&Math.abs(left.max.y-right.max.y)<.002,'both folded wings lie against the flanks');
  raven.animate(0,{flying:true});dove.flap(-Math.asin(.5)/18,true);
  between(bounds(raven.root).x,1.15,1.22,'raven wingspan');between(bounds(dove.root).x,.50,.67,'pigeon wingspan');
  raven.dispose();dove.dispose();assert.equal(scene.children.length,0);
});

test('birding rigs have species-sized bodies and extended flight wings with intact joints',()=>{
  const shapes=createBirdShapes();
  const ranges={
    'cardinal-male':[.20,.24,.25,.31],wren:[.12,.15,.27,.31],titmouse:[.14,.18,.20,.27],
    crow:[.43,.53,.85,1],hummingbird:[.07,.09,.08,.11],robin:[.23,.28,.31,.41],
    chickadee:[.12,.15,.16,.21],mockingbird:[.21,.27,.31,.36],'mourning-dove':[.23,.34,.42,.47],
    'blue-jay':[.25,.30,.34,.43],goldfinch:[.11,.14,.19,.23],catbird:[.20,.24,.22,.30],
    'downy-woodpecker':[.14,.18,.25,.31],'red-bellied-woodpecker':[.22,.27,.38,.46],
    'pileated-woodpecker':[.40,.49,.66,.76],nuthatch:[.13,.16,.20,.28],
    'wood-thrush':[.18,.22,.30,.35],bluebird:[.16,.21,.25,.33],
    'red-winged-blackbird':[.17,.24,.31,.40],kingfisher:[.28,.35,.48,.59],
    'mallard-drake':[.50,.65,.82,.98],gull:[.38,.44,1,1.12],'turkey-vulture':[.64,.81,1.65,1.83],
  };
  for(const [id,f]of Object.entries(BIRD_FORMS)){
    const s=shapes[id],body=new THREE.Box3().setFromBufferAttribute(s.body.attributes.position);
    body.union(new THREE.Box3().setFromBufferAttribute(s.head.attributes.position).translate(new THREE.Vector3(...f.neck)));
    const wing=new THREE.Box3().setFromBufferAttribute(s.wing.attributes.position),r=ranges[id];
    if(r){between((body.max.z-body.min.z)*f.scale,r[0],r[1],id+' body');between(2*(wing.max.x*f.flightWingScale+f.shoulder[0])*f.scale,r[2],r[3],id+' wings');}
    for(const action of ['look','peck','flight']){
      const m=birdPartMatrices({x:0,y:0,z:0,yaw:0,lift:0,clock:0,species:id,action},f);
      for(const p of [m.body,m.head,...m.wings])assert(p.elements.every(Number.isFinite));
      // Every wing remains attached at its original scaled shoulder.
      for(const [i,w]of m.wings.entries()){
        const actual=new THREE.Vector3().setFromMatrixPosition(w),expected=new THREE.Vector3((i?-1:1)*f.shoulder[0],f.shoulder[1],f.shoulder[2]).applyMatrix4(m.body);
        assert(actual.distanceTo(expected)<1e-8,id+' shoulder');
      }
    }
  }
  for(const shape of Object.values(shapes))for(const g of Object.values(shape))g.dispose();
});

test('regional birds use natural body proportions and species spans; fantasy anatomy stays authored',async()=>{
  const {modelFactories}=await sourceModule('../src/content/regions/western-regions/west-regions-life.js'),factories=modelFactories();
  for(const [id,shoulder,length,span]of [['gull',.08,.42,1.06],['duck',.075,.57,.90],['goose',.11,.85,1.60],['turkey-vulture',.06,.70,1.75],['harrier',.06,.50,1.15],['plateau-hawk',.06,.57,1.30]]){
    const s=factories[id](),b=new THREE.Box3().setFromBufferAttribute(s.body.attributes.position),w=new THREE.Box3().setFromBufferAttribute(s.wing.attributes.position),fit=regionalBirdSize(id,w.max.x,shoulder);
    between((b.max.z-b.min.z)*fit.scale,length-.025,length+.025,id+' length');
    between(2*(shoulder+w.max.x*fit.wingScale)*fit.scale,span-.01,span+.01,id+' span');
    Object.values(s).forEach(g=>g.dispose());
  }
  assert.equal(regionalBirdSize('babon-canopy-hornbill',1,.06).scale,1);
});
