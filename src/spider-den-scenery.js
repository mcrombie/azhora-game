import * as THREE from 'three';
import { SPIDER_DEN } from './spider-quest.js';
import { createSceneryBuilder } from './scenery-builder.js';

/** Permanent brambles surround a cart-sized hollow, opening toward Ben's clearing. */
export function createSpiderDenScenery({ root, groundHeight }) {
  const hide = SPIDER_DEN.enemies[0], mouth = { x: hide.x + 6, z: hide.z + 1 };
  const group = new THREE.Group(); group.name = 'Spider thorn thicket'; root.add(group);
  const build = createSceneryBuilder('Twisted thorn canes and sparse leaves');
  const bark = [0x504732, 0x66543a, 0x736044, 0x493e31];
  const leaves = [0x52643b, 0x6a7444, 0x798152, 0x455837];
  let seed = 18431, canes = 0, thorns = 0;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const range = (a, b) => a + random() * (b - a);
  const at = (x, z, y) => new THREE.Vector3(x, groundHeight(x, z) + y, z);
  const array = v => [v.x, v.y, v.z];
  const vertical = new THREE.Vector3(0, 1, 0);
  // The five-metre mouth is open at spider height. Stems arch over it, not across it.
  const inMouth = p => p.x > hide.x + 2 && Math.abs(p.z - mouth.z) < 2.5;

  function thorn(base, tangent, length, turn) {
    const normal = new THREE.Vector3().crossVectors(tangent, vertical);
    if (normal.lengthSq() < .01) normal.set(1, 0, 0);
    normal.normalize().applyAxisAngle(tangent, turn);
    const side = new THREE.Vector3().crossVectors(tangent, normal).normalize();
    const radius = length * .19, tip = base.clone().addScaledVector(normal, length).addScaledVector(tangent, -.08);
    const a = base.clone().addScaledVector(tangent, radius), b = base.clone().addScaledVector(side, radius),
      c = base.clone().addScaledVector(tangent, -radius).addScaledVector(side, -radius * .65);
    for (const [one, two] of [[a, b], [b, c], [c, a]]) build.triangle(0x8f7950, array(one), array(two), array(tip));
    thorns++;
  }

  function leaf(point, turn, size) {
    const along = new THREE.Vector3(Math.cos(turn) * size, size * .23, Math.sin(turn) * size);
    const across = new THREE.Vector3(-Math.sin(turn) * size * .42, size * .12, Math.cos(turn) * size * .42);
    const tint = leaves[Math.floor(random() * leaves.length)];
    build.sheet(tint, array(point.clone().sub(along)), array(point.clone().add(across)),
      array(point.clone().add(along)), array(point.clone().sub(across)));
  }

  function cane(points, width, tint, leafy = true) {
    canes++;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i], direction = b.clone().sub(a), length = direction.length();
      if (length < .05) continue;
      const tangent = direction.clone().normalize();
      build.beam(tint, array(a), array(b), width * (1 - i / points.length * .63));
      for (let j = 0; j < 3; j++) {
        const p = a.clone().lerp(b, (j + .35) / 3), turn = i * 1.7 + j * 2.5;
        thorn(p, tangent, range(.16, .34), turn);
        if (leafy && random() < .32) leaf(p, turn, range(.16, .29));
      }
    }
  }

  // Gnarled crowns form a horseshoe with a deep, dark chamber behind the east opening.
  const crowns = [[-4.6,-2.8],[-4.9,.1],[-4.2,3.0],[-2.1,-4.1],[-2.0,4.8],
    [.4,-4.0],[.5,4.9],[2.8,-3.6],[3.0,4.5],[4.5,-2.9],[4.7,4.1]];
  for (const [index, [dx, dz]] of crowns.entries()) {
    const x = hide.x + dx, z = hide.z + dz, height = range(2.15, 3.2);
    // Old, layered leaf masses are kept small: the woody, thorn-covered lattice stays legible.
    for (let l = 0; l < 3; l++) {
      const lx = x + range(-.5, .5), lz = z + range(-.5, .5), ly = range(.9, 1.8);
      if (!inMouth({ x: lx, z: lz })) build.rock(leaves[(index + l) % leaves.length], lx, groundHeight(lx,lz)+ly,
        lz, range(.55,.85), range(.38,.62), range(.5,.8), range(0,Math.PI));
    }
    for (let stem = 0; stem < 5; stem++) {
      const turn = stem * 2.399 + index * .8, reach = range(1.0, 2.1), points = [];
      for (let node = 0; node < 7; node++) {
        const t = node / 6, curl = turn + t * range(.65,1.15);
        const px = x + Math.cos(curl) * reach * t, pz = z + Math.sin(curl) * reach * t;
        let y = Math.sin(t * Math.PI * .85) * height + .04;
        if (inMouth({ x:px, z:pz }) && y < 2.35) break;
        points.push(at(px,pz,y));
      }
      cane(points, range(.095,.17), bark[(index+stem)%bark.length]);
    }
  }

  // Old canes cross at odd angles and grow over one another, rather than forming
  // matching arches. Their tips double back or trail into the leafy back of the den.
  for (let i = 0; i < 23; i++) {
    const ax=hide.x+range(-4.7,.8), az=hide.z+range(-4.3,4.2),
      bx=hide.x+range(-3.4,3.1), bz=hide.z+range(-3.8,4.1),
      lowA=range(1.1,2.5), lowB=range(1.3,2.7), rise=range(.25,1.1), sway=range(-.8,.8),points=[];
    for (let j=0;j<7;j++) {
      const t=j/6, wave=Math.sin(t*Math.PI),
        x=ax+(bx-ax)*t+wave*sway,
        z=az+(bz-az)*t+Math.sin(t*Math.PI*2+i)*.34,
        y=Math.max(2.4,lowA+(lowB-lowA)*t+wave*rise);
      points.push(at(x,z,y));
    }
    cane(points,range(.065,.13),bark[i%bark.length],true);
  }
  // A compact, irregular tangle hides the waiting body from the raised southeast
  // approach. The east lip is high and ragged, leaving room to crawl underneath.
  // Overlapping leaf sprays have dark inner faces and woody canes poking through.
  for(let i=0;i<52;i++){
    const angle=range(0,Math.PI*2), radius=Math.sqrt(random()),
      x=hide.x-1+Math.cos(angle)*radius*3.5,
      z=hide.z+Math.sin(angle)*radius*3.6,
      y=range(2.65,3.22), size=range(.65,1.18);
    build.rock(leaves[i%leaves.length],x,groundHeight(x,z)+y,z,size,range(.39,.67),size*range(.7,1.1),angle);
    if(i%2===0)leaf(at(x,z,y+.4),angle,.34);
  }
  // Close the back and broken side walls with growth, not a bright tunnel through
  // the bush. This is soft scenery; the creature's mouth and combat floor stay open.
  for(let i=0;i<31;i++){
    const angle=Math.PI*.54+i/30*Math.PI*.97,
      x=hide.x+Math.cos(angle)*range(3.2,4.25),z=hide.z+Math.sin(angle)*range(3.3,4.1),
      y=range(.65,2.4),size=range(.65,1.08);
    build.rock(leaves[(i+2)%leaves.length],x,groundHeight(x,z)+y,z,size,range(.6,.95),size*range(.8,1.1),angle);
  }
  // Shallow litter gives the hollow a lived-in floor without a rectangular clearing.
  const center=at(hide.x-1,hide.z,.035);
  for(let i=0;i<18;i++){
    const a=i/18*Math.PI*2,b=(i+1)/18*Math.PI*2;
    build.triangle(i%2?0x615c3f:0x6d6647,array(center),
      array(at(hide.x-1+Math.cos(b)*4.4,hide.z+Math.sin(b)*3.7,.035)),
      array(at(hide.x-1+Math.cos(a)*4.4,hide.z+Math.sin(a)*3.7,.035)));
  }
  const mesh=build.finish(group);

  // A few broken sheets of silk, tucked into the high branches rather than a bright net curtain.
  const silk=[];
  const strand=(a,b)=>silk.push(...array(a),...array(b));
  for(const [x,z,size]of[[hide.x+4.5,hide.z-2.5,.9],[hide.x+2.5,hide.z+3.6,1.0],[hide.x-1.3,hide.z-.4,1.35]]){
    const center=at(x,z,2.2),ends=[];
    for(let i=0;i<6;i++){
      const angle=i*Math.PI/3,p=at(x+Math.cos(angle)*.23,z+Math.cos(angle)*size,2.2+Math.sin(angle)*size*.64);
      ends.push(p);strand(center,p);
    }
    for(const scale of [.42,.76])for(let i=0;i<6;i++)strand(center.clone().lerp(ends[i],scale),center.clone().lerp(ends[(i+1)%6],scale));
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(silk,3));
  const webs=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:0xc5c9b4,transparent:true,opacity:.35,depthWrite:false}));
  webs.name='Old silk among the thorns';group.add(webs);
  group.userData={passable:true,hide:{x:hide.x,z:hide.z},mouth:{...mouth,width:5},canes,thorns,
    drawCalls:2,vertices:mesh.geometry.attributes.position.count+silk.length/3};
  return group;
}
