import { finishBuild } from '../../../world/loading/build-steps.js';
import * as THREE from 'three';
import { createSceneryBuilder } from '../../../world/scenery/scenery-builder.js';
import { MENORA, MENORA_OUTLINE, MENORA_GATES, MENORA_BUILDINGS, MENORA_PATHS,
  MENORA_BRIDGES, MENORA_GARDENS, MENORA_CAMP, menoraRiverClearance, menoraDeckHeight } from './menora-city.js';

const WHITE='#e2e2d2', IVORY='#eee9d4', SHADE='#b9c4bd', DARK='#385052', GOLD='#c6ad6b';
const WOOD='#726052', PAVING='#c4c2ac', WATER='#548985', RED='#713e45';
/** The pale frontier city is built as small merged districts: its fine masonry,
 * windows and slender tower ribs do not become individual render objects. */
export function createMenoraScenery(...args) { return finishBuild(createMenoraScenerySteps(...args)); }

export function* createMenoraScenerySteps({parent,heightAt,colliders}) {
  let buildWork = 0;
  const root=new THREE.Group();root.name='Minora — white walls at the river fork';parent.add(root);
  const metrics={buildings:0,towers:0,wallSegments:0,bridges:0,gardens:0,tents:0,batches:0,vertices:0,colliders:0};
  const push=c=>{colliders.push(c);metrics.colliders++;return c;};
  const finish=function* (b) {metrics.vertices+=b.vertexCount;if((yield* b.finishSteps(root)))metrics.batches++;};
  const ground=(x,z)=>menoraDeckHeight(x,z)??heightAt(x,z);
  function collider(x,z,hx,hz,id,kind='building',y=heightAt(x,z),h=20) {push({x,z,hx,hz,id,kind,minY:y-.5,maxY:y+h});}
  function flag(b,x,y,z,tint=RED,scale=1) {
    b.cylinder(WOOD,x,y,z,.07*scale,4.4*scale);
    b.sheet(tint,[x,y+4.2*scale,z],[x+1.2*scale,y+4.05*scale,z],[x+1.1*scale,y+2.4*scale,z],[x,y+2.5*scale,z]);
    b.box(GOLD,x+.6*scale,y+3.3*scale,z+.02,.14*scale,.6*scale,.035);
  }
  function window(b,x,y,z,w=1.2,h=2.3) {
    b.box(SHADE,x,y,z,w+.36,h+.36,.15);b.box(DARK,x,y,z+.09,w,h,.1);
    b.box('#a9c3b7',x,y,z+.15,w*.64,h*.82,.035);b.box(IVORY,x,y,z+.18,.09,h,.06);
  }
  function pointedWindow(b,x,y,z,w,h) {
    b.box(DARK,x,y,z,w,h,.13);
    b.triangle(DARK,[x-w/2,y+h/2,z+.01],[x+w/2,y+h/2,z+.01],[x,y+h/2+w*.8,z+.01]);
    b.box(GOLD,x,y,z+.11,.1,h,.05);
  }

  // Paved lanes follow the sampled ground and cross streams on physical decks.
  const streets=createSceneryBuilder('Minora paving, plazas and quiet courts');
  for(const p of MENORA_PATHS){ if (++buildWork % 8 === 0) yield; for(let i=1;i<p.points.length;i++) { if (++buildWork % 8 === 0) yield;
    const a=p.points[i-1],c=p.points[i],dx=c.x-a.x,dz=c.z-a.z,len=Math.hypot(dx,dz);
    (yield* streets.patchSteps(PAVING,ground,(a.x+c.x)/2,(a.z+c.z)/2,p.width,len,Math.atan2(dx,dz),.045,Math.max(2,Math.ceil(len/4))));
  } }
  (yield* streets.patchSteps('#d4d1b9',ground,-2338,137,34,28,0,.06,8));
  (yield* streets.patchSteps('#b8b8a2',ground,-2370,152,24,13,0,.04,6));
  (yield* streets.patchSteps('#bfbea6',ground,-2414,60,25,13,0,.04,5));
  (yield* finish(streets));

  // Each bridge spans the existing water. Side parapets leave a genuinely open
  // ten-metre deck, and the footbridges carry the garden stream across town.
  for(const bridge of MENORA_BRIDGES) { if (++buildWork % 8 === 0) yield;
    const b=createSceneryBuilder(bridge.name),len=bridge.end-bridge.start,small=bridge.id.includes('footbridge');
    const cx=bridge.axis==='x'?(bridge.start+bridge.end)/2:bridge.x;
    const cz=bridge.axis==='z'?(bridge.start+bridge.end)/2:bridge.z;
    const yaw=bridge.axis==='x'?Math.PI/2:0,y=bridge.deck,railInset=bridge.railInsetStart??0;
    b.frame(cx,y,cz,yaw,()=>{
      b.box(SHADE,0,-.6,0,bridge.width,1.2,len);
      b.box(IVORY,0,-.06,0,bridge.width,.12,len);
      for(const side of [-1,1]) {
        b.block(WHITE,side*(bridge.width/2-.3),0,railInset/2,.6,small?.85:1.25,len-railInset);
        b.box(IVORY,side*(bridge.width/2-.3),small?.92:1.32,railInset/2,.85,.16,len-railInset+.3);
      }
      const spans=Math.max(2,Math.floor(len/12)),step=len/spans;
      for(let i=0;i<=spans;i++) {
        const q=-len/2+i*step;
        if(!small)b.block(SHADE,0,-9,q,bridge.width-1,8.5,2.1);
        if(!small)for(const side of [-1,1]) {
          b.block(WHITE,side*(bridge.width/2-.3),0,q,.95,1.6,.95);
          b.cone(GOLD,side*(bridge.width/2-.3),1.6,q,.38,.55,0,4);
        }
      }
      if(!small)for(let i=0;i<spans;i++) {
        const q=-len/2+(i+.5)*step;
        for(const side of [-1,1])for(let j=0;j<8;j++) {
          const angle=(j+.5)*Math.PI/8,xx=side*(bridge.width/2-.5);
          b.box(WHITE,xx,-5.5+Math.sin(angle)*4.6,q+Math.cos(angle)*(step/2-1),.8,1.1,1.8,0,angle-Math.PI/2);
        }
      }
    });
    for(const side of [-1,1]){ if (++buildWork % 8 === 0) yield;
      const x=cx+(bridge.axis==='z'?side*(bridge.width/2-.3):railInset/2),z=cz+(bridge.axis==='x'?side*(bridge.width/2-.3):railInset/2);
      collider(x,z,bridge.axis==='x'?(len-railInset)/2:.3,bridge.axis==='z'?(len-railInset)/2:.3,`${bridge.id}-rail-${side}`,'bridge-rail',y,small?1:1.6);
    }
    (yield* finish(b));metrics.bridges++;
  }

  // Tall white curtains are stepped finely along the bank. A stream opening
  // stays open below an overhead arch instead of being silently filled in.
  for(let e=0;e<MENORA_OUTLINE.length;e++) { if (++buildWork % 8 === 0) yield;
    const a=MENORA_OUTLINE[e],c=MENORA_OUTLINE[(e+1)%MENORA_OUTLINE.length],dx=c.x-a.x,dz=c.z-a.z,len=Math.hypot(dx,dz),yaw=Math.atan2(dx,dz);
    const b=createSceneryBuilder(`Minora white curtain ${e}`),steps=Math.ceil(len/3),step=len/steps;
    const gate=MENORA_GATES.find(g=>g.edge===e);
    for(let i=0;i<steps;i++) { if (++buildWork % 8 === 0) yield;
      const t=(i+.5)/steps,x=a.x+dx*t,z=a.z+dz*t;
      if(gate&&Math.hypot(x-gate.x,z-gate.z)<gate.width/2+.3)continue;
      const y=heightAt(x,z),water=menoraRiverClearance(x,z)<3;
      b.frame(x,y,z,yaw,()=>{
        b.block(SHADE,0,water?8:-.5,0,3.6,water?9.5:18.5,step+.08);
        b.block(WHITE,0,water?9:1,0,3.25,water?9:17,step+.09);
        b.box(IVORY,0,18,0,4,.45,step+.15);
        if(i%2===0)for(const side of [-1,1])b.block(WHITE,side*1.5,18.2,0,.75,1.45,1.25);
        for(const h of [5.8,11.5])b.box('#ced4c6',0,h,0,3.29,.18,step+.1);
      });
      if(!water)push({x,z,r:1.6,minY:y-.5,maxY:y+19.5,kind:'city-wall',id:`menora-wall-${e}-${i}`});
      metrics.wallSegments++;
    }
    (yield* finish(b));
  }
  function* turret(x,z,r=5.3,h=26,name='Minora curtain tower') {
    const b=createSceneryBuilder(name),y=heightAt(x,z);
    b.cylinder(SHADE,x,y-.5,z,r+1,h*.18);
    b.cylinder(WHITE,x,y+1,z,r,h-1);
    b.cylinder(IVORY,x,y+h-1,z,r+.7,.75);
    for(let i=0;i<8;i++){const t=i*Math.PI/4; b.block(WHITE,x+Math.cos(t)*r,y+h-.2,z+Math.sin(t)*r,1.25,1.7,1.25,t);}
    for(const h0 of [5,13,20]) for(let i=0;i<4;i++) {
      const t=i*Math.PI/2;
      b.frame(x,y,z,t,()=>pointedWindow(b,0,h0,r+.02,.55,2.2));
    }
    b.cone('#768387',x,y+h-.1,z,r*.72,4.5);
    flag(b,x,y+h+4,z,RED,.7);
    push({x,z,r:r+.35,minY:y-.5,maxY:y+h+5,kind:'city-tower'});(yield* finish(b));metrics.towers++;
  }
  for(const p of MENORA_OUTLINE){ if (++buildWork % 8 === 0) yield; if(menoraRiverClearance(p.x,p.z)>7)(yield* turret(p.x,p.z)); }
  for(const g of MENORA_GATES) { if (++buildWork % 8 === 0) yield;
    const a=MENORA_OUTLINE[g.edge],c=MENORA_OUTLINE[(g.edge+1)%MENORA_OUTLINE.length],len=Math.hypot(c.x-a.x,c.z-a.z),dx=(c.x-a.x)/len,dz=(c.z-a.z)/len;
    for(const side of [-1,1]){ if (++buildWork % 8 === 0) yield; (yield* turret(g.x+dx*side*11,g.z+dz*side*11,4.2,29,`${g.name} flank`)); }
    const b=createSceneryBuilder(g.name),y=heightAt(g.x,g.z),yaw=Math.atan2(dx,dz);
    b.frame(g.x,y,g.z,yaw,()=>{
      b.box(WHITE,0,17,0,5.3,8,14.3);b.box(IVORY,0,21.2,0,5.7,.6,15);
      // Portcullises are visibly raised: no door collider across a city gate.
      for(let k=-6;k<=6;k+=1.2)b.box(DARK,0,12,k,.18,3.5,.16);
      for(const side of [-1,1])flag(b,side*3,20,0,RED,1.1);
    });
    (yield* finish(b));
  }

  for(const home of MENORA_BUILDINGS) { if (++buildWork % 8 === 0) yield;
    const b=createSceneryBuilder(home.name),w=home.width,d=home.depth,h=home.height,y=heightAt(home.x,home.z);
    const foot=Math.min(y,...[-w/2,w/2].flatMap(dx=>[-d/2,d/2].map(dz=>heightAt(home.x+dx,home.z+dz))))-.6;
    b.frame(home.x,y,home.z,0,()=>{
      b.block(SHADE,0,foot-y,0,w+.5,y-foot+.4,d+.5);
      if(home.kind==='sorcerers-tower') {
        // A tapering octagonal needle with four open crown fins and diagonal
        // flying ribs gives the guild its own silhouette rather than a replica.
        const levels=[[0,16,11.7],[16,23,9.7],[39,27,8.2],[66,22,6.8],[88,18,5.6]];
        for(const [base,tall,r] of levels) {
          b.cylinder(base%2?IVORY:WHITE,0,base,0,r,tall,Math.PI/8);
          b.cylinder(SHADE,0,base+tall-.5,0,r+.45,.8,Math.PI/8);
          for(let i=0;i<4;i++)b.frame(0,0,0,i*Math.PI/2,()=>{
            b.block('#b2c5c1',0,base,r+.02,.8,tall,1.4);
            for(let k=1;k<4;k++)pointedWindow(b,0,base+k*tall/4,r+.18,1,2.5);
          });
        }
        for(let i=0;i<4;i++)b.frame(0,0,0,i*Math.PI/2,()=>{
          b.beam(SHADE,[-7.8,5,7.8],[-3.9,95,3.9],2.2);
          b.beam(IVORY,[-3.9,94,3.9],[-6.8,118,6.8],1.2);
          b.cone(IVORY,-6.8,117,6.8,1.15,11,Math.PI/4,4);
        });
        b.cylinder(GOLD,0,106,0,6.8,1.1);b.cone('#90a6a1',0,107,0,5,12);
        b.cone(GOLD,0,119,0,1,6);b.rock('#c8e6d3',0,127,0,1.2,1.2,1.2);
        b.box(DARK,0,4.5,d/2+.2,4,9,.4);b.box(GOLD,0,4.5,d/2+.43,3.4,8.4,.09);
        for(const side of [-1,1])b.block(IVORY,side*3,0,d/2+.3,.9,11,1.2);
      } else if(home.kind==='temple') {
        b.block(WHITE,0,0,0,w,18,d);
        b.block(SHADE,0,17,0,w+1,1,d+1);b.roof(home.roof,0,18,0,w+2,d+2,13,0,IVORY);
        // High clerestory, rose window and two slender unequal bells frame the
        // sanctuary. The court remains open for Cedric and later story work.
        for(const side of [-1,1])for(let q=-d/2+5;q<d/2;q+=7) {
          b.block(IVORY,side*(w/2+.5),0,q,1.4,16,1.8);
          b.frame(0,0,q,side*Math.PI/2,()=>pointedWindow(b,0,11,w/2+.12,2.3,6));
        }
        b.box(DARK,0,5,d/2+.1,5,10,.2);
        b.box(WOOD,0,4.9,d/2+.25,4.6,9.5,.15);
        b.rock(GOLD,0,15.8,d/2+.25,2.8,2.8,.16);
        b.rock('#718f91',0,15.8,d/2+.42,2.35,2.35,.12);
        for(let i=0;i<8;i++){const t=i*Math.PI/4;b.beam(IVORY,[0,15.8,d/2+.56],[Math.cos(t)*2.3,15.8+Math.sin(t)*2.3,d/2+.56],.14);}
        for(const side of [-1,1]){
          const xx=side*(w/2-3.6),bell=side<0?42:35;
          b.block(WHITE,xx,0,d/2-3,5.8,bell,6);
          b.box(SHADE,xx,bell-6,d/2+.08,3.4,6,.14);
          b.cone(home.roof,xx,bell,d/2-3,4.3,8,Math.PI/4,4);
          b.cone(GOLD,xx,bell+8,d/2-3,.7,3,0,4);
          for(const yy of [7,16,25])pointedWindow(b,xx,yy,d/2+.14,1.1,3.2);
        }
        for(const xx of [-8,8]){
          b.cylinder(IVORY,xx,0,d/2+5,.65,10.3);
          b.box(SHADE,xx,10.4,d/2+5,1.6,.65,1.6);
          push({x:home.x+xx,z:home.z+d/2+5,r:.7,minY:y,maxY:y+11,kind:'temple-column'});
        }
        b.roof(IVORY,0,10.4,d/2+2.8,19,8,5,0,WHITE);
      } else {
        b.block(home.kind==='house'?'#d4d7c6':WHITE,0,0,0,w,h,d);
        for(const side of [-1,1])b.block(IVORY,side*(w/2-.2),0,d/2+.06,.65,h,.4);
        b.box(SHADE,0,h-.25,d/2+.07,w,.5,.3);
        b.roof(home.roof,0,h,0,w+1.1,d+1.1,Math.min(5,w*.3),0,WHITE);
        const floors=h>9?[3.2,7.3]:[3.2];
        for(const yy of floors)for(let x=-w/2+2;x<w/2-1;x+=3.4)if(Math.abs(x)>1.8||yy>5)window(b,x,yy,d/2+.16,1.2,2.1);
        b.box(DARK,0,1.7,d/2+.16,2.15,3.4,.2);b.box(WOOD,0,1.65,d/2+.28,1.8,3.2,.13);
        b.block(SHADE,-w*.29,h-.4,-d*.2,1.2,3.1,1.35);
        b.box(IVORY,-w*.29,h+2.8,-d*.2,1.6,.25,1.7);
        if(home.kind==='guild')for(const side of [-1,1])flag(b,side*(w/2-2),h+1,d/2, '#6b577e',.9);
      }
    });
    collider(home.x,home.z,w/2+.1,d/2+.1,home.id,'house',foot,h+12);
    (yield* finish(b));metrics.buildings++;
  }

  // Formal flowers and low shrubs make the sanctuary cared for without
  // inventing residents or adding unregistered decorative tree species.
  const gardens=createSceneryBuilder('Minora temple gardens and fountains');
  for(const g of MENORA_GARDENS) { if (++buildWork % 8 === 0) yield;
    (yield* gardens.patchSteps('#758667',ground,g.x,g.z,g.width,g.depth,0,.06,6));
    for(const sx of [-1,1]){ if (++buildWork % 8 === 0) yield; gardens.box(SHADE,g.x+sx*g.width/2,ground(g.x+sx*g.width/2,g.z)+.2,g.z,.4,.4,g.depth); }
    for(let x=g.x-g.width/2+1.5;x<g.x+g.width/2;x+=2.7){ if (++buildWork % 8 === 0) yield; for(let z=g.z-g.depth/2+1.2;z<g.z+g.depth/2;z+=2.5) { if (++buildWork % 8 === 0) yield;
      const y=ground(x,z);gardens.rock('#537759',x,y+.5,z,.65,.65,.65);
      for(let j=0;j<3;j++){ if (++buildWork % 8 === 0) yield;const a=j*2.1;gardens.rock(j%2?'#ddc479':'#b691bc',x+Math.cos(a)*.35,y+1,z+Math.sin(a)*.35,.19,.2,.2);}
    } }
    metrics.gardens++;
  }
  for(const [x,z] of [[-2354,138],[-2320,61]]) { if (++buildWork % 8 === 0) yield;
    const y=ground(x,z);gardens.cylinder(SHADE,x,y,z,2.4,.65);gardens.cylinder(WATER,x,y+.6,z,2.08,.08);
    gardens.cylinder(IVORY,x,y+.6,z,.4,2);gardens.cone(GOLD,x,y+2.6,z,.55,.8);
    push({x,z,r:2.45,minY:y,maxY:y+3.5,kind:'fountain'});
  }
  for(const [x,z] of [[-2328,129],[-2348,129],[-2418,150],[-2408,156],[-2354,179]]) { if (++buildWork % 8 === 0) yield;
    const y=ground(x,z);gardens.box(WOOD,x,y+.55,z,2.8,.23,.7);for(const s of [-1,1]){ if (++buildWork % 8 === 0) yield; gardens.block(SHADE,x+s*.95,y,z,.35,.5,.55); }
  }
  (yield* finish(gardens));

  const camp=createSceneryBuilder('The Blood Prince’s field army muster');
  (yield* camp.patchSteps('#b2ab86',ground,MENORA_CAMP.x,MENORA_CAMP.z,MENORA_CAMP.width,MENORA_CAMP.depth,0,.03,14));
  for(const t of MENORA_CAMP.tents) { if (++buildWork % 8 === 0) yield;
    const y=ground(t.x,t.z);camp.tent(t.id.endsWith('2')?'#743c47':'#9a7266',t.x,y,t.z,t.width,t.depth,t.height);
    for(const side of [-1,1]){ if (++buildWork % 8 === 0) yield; camp.beam(WOOD,[t.x,y+t.height,t.z],[t.x+side*(t.width/2+2),y+.1,t.z],.08); }
    collider(t.x,t.z,t.width/2,t.depth/2,t.id,'tent',y,t.height);metrics.tents++;
  }
  for(const [x,z] of [[-2453,57],[-2498,63]]){ if (++buildWork % 8 === 0) yield; flag(camp,x,ground(x,z),z,'#852f3b',1.7); }
  for(let i=0;i<5;i++) { if (++buildWork % 8 === 0) yield;
    const x=-2453,z=84+i*3,y=ground(x,z);
    camp.cylinder(WOOD,x,y,z,.85,1.3);camp.cylinder(DARK,x,y+.17,z,.88,.13);camp.cylinder(DARK,x,y+1.08,z,.88,.13);
    push({x,z,r:.9,minY:y,maxY:y+1.4,kind:'barrel'});
  }
  (yield* finish(camp));
  const mapFeatures=MENORA_BUILDINGS.map(b=>({id:b.id,name:b.name,x:b.x,z:b.z,width:b.width,depth:b.depth,kind:b.kind}));
  return {root,metrics,mapFeatures,bridges:MENORA_BRIDGES};
}
