import * as THREE from 'three';
import { createSceneryBuilder } from '../../../world/scenery/scenery-builder.js';
import { finishBuild } from '../../../world/loading/build-steps.js';
import { NETHER_DESERT_CELLS, NETHER_DESERT_PANS, NETHER_DESERT_LANDMARKS, NETHER_DESERT_ARRIVAL, NETHER_DESERT_TRAILS,
  netherDesertCellAt, netherDesertFeatures, netherDesertOwns } from './nether-desert-world.js';
import { NETHER_DESERT_WILDLIFE_ZONES } from './nether-desert-wildlife.js';

const TAU=Math.PI*2;
const stone=['#8a8373','#a8a08a','#b3a98d','#767362'];
const seeds=['#8b9269','#979b74','#777e5c'];
const sheltered=[NETHER_DESERT_ARRIVAL,...NETHER_DESERT_LANDMARKS,
  ...NETHER_DESERT_WILDLIFE_ZONES.flatMap(zone=>zone.sites.map(([x,z])=>({x,z})))];
const reserved=(x,z,r=0)=>sheltered.some(p=>Math.hypot(x-p.x,z-p.z)<4+r)||NETHER_DESERT_TRAILS.some(path=>{
  const [a,b]=path.points,dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)));
  return Math.hypot(x-a.x-t*dx,z-a.z-t*dz)<2+r;
});

export const createNetherDesertScenery=(...args)=>finishBuild(createNetherDesertScenerySteps(...args));
/** Per-hex merged meshes keep distant rock chips cheap. No invisible terrain
 * hulls: the modest ridge and wash relief is the actual walking heightfield. */
export function* createNetherDesertScenerySteps({parent,heightAt:logicalHeight,renderedGroundHeight=logicalHeight,colliders}) {
  const heightAt=renderedGroundHeight;
  const root=new THREE.Group();root.name='Nether Desert — stone, scrub and empty pans';parent.add(root);
  const metrics={cells:0,rocks:0,ledges:0,shrubs:0,tufts:0,pans:0,cracks:0,batches:0,vertices:0,colliders:0};
  const placements=[];
  let seed=580931,work=0;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const range=(a,b)=>a+random()*(b-a);
  function shrub(g,x,z,species) {
    const y=heightAt(x,z),tall=species==='rockrose'?.58:.42,tint=seeds[Math.floor(random()*seeds.length)];
    // Low woody branches stay rooted; a pale, small crown leaves open ground
    // between individual plants instead of creating a continuous grass carpet.
    for(let j=0;j<4;j++) {
      const a=j*TAU/4+range(-.2,.2),px=x+Math.cos(a)*.28,pz=z+Math.sin(a)*.28;
      g.beam('#82715b',[x,y-.055,z],[px,y+tall*.75,pz],.045);
      g.rock(tint,px,y+tall*.75,pz,.26,.17,.23,a);
    }
    if(species==='rockrose'&&random()<.26)for(let j=0;j<3;j++) {
      const a=j*TAU/3;g.rock('#d1c49c',x+Math.cos(a)*.31,y+tall*.95,z+Math.sin(a)*.31,.052,.027,.052);
    }
    metrics.shrubs++;placements.push({x,z,y,kind:'shrub',species});
  }
  for(const cell of NETHER_DESERT_CELLS) {
    const g=createSceneryBuilder(`Nether Desert ${cell.q},${cell.r}`);
    // A rotated, jittered scatter per authored cell; the shared rock bearing
    // creates fractured sheets, never repeating hex-shaped piles.
    for(let i=0;i<112;i++) {
      if(++work%24===0)yield;
      const a=range(0,TAU),r=53*Math.sqrt(random()),x=cell.x+Math.cos(a)*r,z=cell.z+Math.sin(a)*r;
      const owner=netherDesertCellAt(x,z);if(owner?.q!==cell.q||owner?.r!==cell.r)continue;
      const f=netherDesertFeatures(x,z);
      if(f.riverDistance<12||f.inset<3||f.pan>.62||f.height<1)continue;
      const y=heightAt(x,z),chance=random();
      if(chance<.58) {
        const shelf=f.shelf>.28&&f.grade<.35&&i%7===0&&!reserved(x,z,2),rx=shelf?range(1.4,2.5):range(.18,.7);
        const ry=shelf?range(.43,.78):range(.08,.24),rz=rx*range(.46,.8),yaw=.3+range(-.3,.3);
        const foot=Math.min(y,heightAt(x+rx,z),heightAt(x-rx,z),heightAt(x,z+rz),heightAt(x,z-rz))-.05;
        g.rock(stone[Math.floor(random()*stone.length)],x,foot+ry*.64,z,rx,ry,rz,yaw);
        placements.push({x,z,y:foot,kind:'rock',radius:rx});metrics.rocks++;
        if(shelf){metrics.ledges++;
          // Only visible substantial slabs collide, and only their low inner
          // core; small chips remain comfortable to walk over.
          if(foot+ry*1.45>y+.2) {
            colliders.push({x,z,r:Math.min(rx,rz)*.67,minY:foot,maxY:foot+ry*1.45,kind:'rock'});metrics.colliders++;
          }
        }
        if(f.gravel>.43)for(let j=0;j<3;j++) {
          const px=x+range(-1.5,1.5),pz=z+range(-1.5,1.5);
          if(!netherDesertOwns(px,pz))continue;
          const sx=range(.06,.14),sz=range(.05,.1),top=[px,heightAt(px,pz)+.067,pz];
          const rim=[[px-sx,pz],[px,pz+sz],[px+sx,pz],[px,pz-sz]].map(([x,z])=>[x,heightAt(x,z)+.018,z]);
          for(let k=0;k<4;k++)g.triangle(stone[(i+j)%stone.length],top,rim[k],rim[(k+1)%4]);
          metrics.rocks++;
        }
      }
      if(f.grade<.65&&random()<.055+f.scrub*.66)shrub(g,x+range(-.3,.3),z+range(-.3,.3),i%3===0?'rockrose':'wormwood');
      if(f.grade<.6&&random()<.07+f.scrub*.33) {
        for(let j=0;j<3;j++) {
          const px=x+range(-.3,.3),pz=z+range(-.3,.3),py=heightAt(px,pz),h=range(.18,.43),w=.048;
          g.sheet('#b4aa7c',[px-w,py-.015,pz],[px+w,py-.015,pz],[px+w*.3+.1,py+h,pz+.05],[px-w*.3+.1,py+h,pz+.05]);
        }
        placements.push({x,z,y,kind:'tuft'});metrics.tufts++;
      }
    }
    const mesh=yield* g.finishSteps(root);
    if(mesh){metrics.batches++;metrics.vertices+=mesh.geometry.attributes.position.count;}
    metrics.cells++;yield;
  }
  // The dry pans have pale exposed silt, fine branching shrinkage cracks and
  // scattered rim chips. Each vertex uses the walking surface, never a flat
  // decal hovering over a depression or an invented permanent pond.
  for(const p of NETHER_DESERT_PANS) {
    const g=createSceneryBuilder(`Nether Desert — ${p.id}`),segments=26;
    const centre=[p.x,heightAt(p.x,p.z)+.045,p.z];
    for(let ring=0;ring<6;ring++)for(let j=0;j<segments;j++) {
      const a=j*TAU/segments,b=(j+1)*TAU/segments;
      const edge=(t,r)=>{const x=p.x+Math.cos(t)*p.rx*.76*r/6,z=p.z+Math.sin(t)*p.rz*.76*r/6;return [x,heightAt(x,z)+.045,z];};
      // Fine rings follow the rendered triangulation without spanning the
      // whole bowl in a single plane. Increasing x/z angle faces downward.
      const tint=j%4===0?'#b5ac95':'#bdb49b';
      if(!ring)g.triangle(tint,centre,edge(b,1),edge(a,1));
      else g.quad(tint,edge(a,ring),edge(b,ring),edge(b,ring+1),edge(a,ring+1));
    }
    for(let j=0;j<20;j++) {
      if(++work%24===0)yield;
      const a=range(0,TAU),r=Math.sqrt(random())*.57,x=p.x+Math.cos(a)*p.rx*r,z=p.z+Math.sin(a)*p.rz*r;
      const direction=range(0,TAU),len=range(.7,2.2);
      const endX=x+Math.cos(direction)*len,endZ=z+Math.sin(direction)*len;
      const y=heightAt(x,z)+.058,ey=heightAt(endX,endZ)+.058;
      g.beam('#8d866f',[x,y,z],[endX,ey,endZ],.046,.017);metrics.cracks++;
      if(j%2===0)g.beam('#938a73',[endX,ey,endZ],[endX+Math.cos(direction+.9)*len*.55,heightAt(endX+Math.cos(direction+.9)*len*.55,endZ+Math.sin(direction+.9)*len*.55)+.058,endZ+Math.sin(direction+.9)*len*.55],.025,.014);
    }
    const mesh=yield* g.finishSteps(root);metrics.batches++;metrics.vertices+=mesh.geometry.attributes.position.count;metrics.pans++;yield;
  }
  root.userData.metrics=metrics;
  return {root,metrics,placements};
}
