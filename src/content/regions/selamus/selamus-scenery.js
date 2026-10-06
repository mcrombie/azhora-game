import * as THREE from 'three';
import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';
import {finishBuild} from '../../../world/loading/build-steps.js';
import {SELAMUS,SELAMUS_BUILDINGS,SELAMUS_PLAZAS,SELAMUS_BRIDGES,SELAMUS_CANALS,selamusPoint,selamusCanalAt,selamusUrban} from './selamus-city.js';

const STONE='#e7dabc',OLD='#b5b49e',DARK='#27494c',GOLD='#c4a362',COPPER=['#527f77','#69968a','#789c89','#577f78'];
const PLASTER=['#cc8f78','#d9bd83','#d4c8aa','#c89c97','#b97d67','#99aaa0','#e0c78f'];
const TILE=['#a95e45','#bd7352','#a66b50','#c08058'];
const TAU=Math.PI*2;
const at=(b,x,z)=>({x:b.x+x*Math.cos(b.yaw)+z*Math.sin(b.yaw),z:b.z-x*Math.sin(b.yaw)+z*Math.cos(b.yaw)});

/** Pointed two-centred arches, with a real opening rather than a dark rectangle
 * on the ground floor. Upper window apertures use the same outline as a recess. */
function arch(s,x,y,z,width,rise,thick=.18,depth=.24,tint=STONE,pointed=true,recess=false){
  const r=width/2,n=recess?8:12,inner=[],outer=[];
  for(let i=0;i<=n;i++){
    const t=i/n,u=-1+2*t;
    const h=pointed?Math.sqrt(Math.max(0,4-(1+Math.abs(u))**2))/Math.sqrt(3):Math.sqrt(Math.max(0,1-u*u));
    inner.push([x+r*u,y+rise*h]);outer.push([x+(r+thick)*u,y+(rise+thick)*h]);
  }
  for(let i=1;i<=n;i++){
    const a=inner[i-1],b=inner[i],c=outer[i],d=outer[i-1];
    s.quad(tint,[a[0],a[1],z-depth/2],[d[0],d[1],z-depth/2],[c[0],c[1],z-depth/2],[b[0],b[1],z-depth/2]);
    if(!recess)s.quad(tint,[b[0],b[1],z+depth/2],[c[0],c[1],z+depth/2],[d[0],d[1],z+depth/2],[a[0],a[1],z+depth/2]);
    s.quad(OLD,[a[0],a[1],z-depth/2],[b[0],b[1],z-depth/2],[b[0],b[1],z+depth/2],[a[0],a[1],z+depth/2]);
  }
}
function aperture(s,x,y,z,width,height,tint=DARK){
  const spring=height-width*.55;
  s.quad(tint,[x-width/2,y,z],[x-width/2,y+spring,z],[x+width/2,y+spring,z],[x+width/2,y,z]);
  const n=8;
  for(let i=0;i<n;i++){
    const u=-1+2*i/n,v=-1+2*(i+1)/n,h=q=>width*.55*Math.sqrt(Math.max(0,4-(1+Math.abs(q))**2))/Math.sqrt(3);
    s.triangle(tint,[x,y+spring,z],[x+width*v/2,y+spring+h(v),z],[x+width*u/2,y+spring+h(u),z]);
  }
}
function column(s,x,y,z,h,r=.24,tint=STONE){
  s.cylinder(OLD,x,y,z,r*1.65,.18);s.cylinder(tint,x,y+.18,z,r,h-.5);
  s.box(tint,x,y+h-.22,z,r*3,.24,r*3);s.box(STONE,x,y+h-.06,z,r*3.6,.16,r*3.6);
}
function pointedWindow(s,x,y,z,width=1.05,h=2.2){
  aperture(s,x,y,z+.04,width,h);arch(s,x,y+h-width*.55,z,width,width*.55,.105,.16,STONE,true,true);
  for(const dx of [-width/2,width/2])s.box(STONE,x+dx,y+(h-width*.55)/2,z,.12,h-width*.55,.18);
  s.box(STONE,x,y-.05,z,width+.35,.16,.32);
  s.box('#5f8888',x,y+h*.4,z-.018,.065,h*.62,.035);
}
function balcony(s,x,y,z,width,metrics){
  s.box(STONE,x,y,z-.43,width,.18,1.05);
  for(const dx of [-width*.35,width*.35])s.beam(OLD,[x+dx,y-.7,z],[x+dx,y-.12,z-.8],.16,.2);
  s.box(STONE,x,y+.85,z-.88,width+.08,.14,.16);
  for(let i=0;i<=Math.ceil(width/.43);i++)s.cylinder(STONE,x-width/2+i*width/Math.ceil(width/.43),y+.07,z-.88,.065,.76,Math.PI/4,4);
  metrics.balconies++;
}
function dome(s,x,y,z,r,h,metrics){
  const rings=6,segments=20;
  const p=(i,j)=>{const a=i/segments*TAU,t=j/rings*Math.PI/2;return[x+r*Math.cos(t)*Math.cos(a),y+h*Math.sin(t),z+r*Math.cos(t)*Math.sin(a)];};
  for(let j=0;j<rings;j++)for(let i=0;i<segments;i++)s.quad(COPPER[i%4],p(i,j),p(i,j+1),p(i+1,j+1),p(i+1,j));
  s.cylinder(OLD,x,y-.25,z,r*1.04,.3);s.cylinder(GOLD,x,y+h,z,.12,.85);s.rock(GOLD,x,y+h+.9,z,.24,.24,.24);metrics.domes++;
}
function trident(s,x,y,z,h){
  s.cylinder(GOLD,x,y,z,.105,h);
  for(const dx of [-.72,0,.72]){if(dx)s.beam(GOLD,[x,y+h*.56,z],[x+dx,y+h*.7,z],.13);s.cylinder(GOLD,x+dx,y+h*.69,z,.095,h*.3);s.cone(GOLD,x+dx,y+h*.99,z,.19,.5);}
}
function waveFrieze(s,width,y,z){
  s.box('#47766e',0,y,z,width,.65,.13);
  for(let x=-width/2+.5;x<width/2-.3;x+=1.35)for(let j=0;j<6;j++){
    const a=j/6*Math.PI,b=(j+1)/6*Math.PI;
    s.beam(STONE,[x+j*.2,y+Math.sin(a)*.18-.05,z-.1],[x+(j+1)*.2,y+Math.sin(b)*.18-.05,z-.1],.06);
  }
}

/** Engine collision uses axis-aligned rectangles. Short horizontal slices cover
 * the rotated solid footprint without one broad AABB closing the alleys. */
function solidRect(colliders,b,cx,cz,width,depth,minY,maxY,suffix){
  const corners=[[-1,-1],[-1,1],[1,1],[1,-1]].map(([x,z])=>at(b,cx+x*width/2,cz+z*depth/2));
  const lo=Math.min(...corners.map(p=>p.z)),hi=Math.max(...corners.map(p=>p.z)),count=Math.ceil((hi-lo)/.8);
  function cut(z){const xs=[];for(let i=0;i<4;i++){const a=corners[i],c=corners[(i+1)%4];if(z>=Math.min(a.z,c.z)-1e-7&&z<=Math.max(a.z,c.z)+1e-7){if(Math.abs(c.z-a.z)<1e-8)xs.push(a.x,c.x);else xs.push(a.x+(c.x-a.x)*(z-a.z)/(c.z-a.z));}}return xs;}
  for(let i=0;i<count;i++){
    const a=lo+(hi-lo)*i/count,c=lo+(hi-lo)*(i+1)/count,xs=[...cut(a),...cut(c)];
    for(const p of corners)if(p.z>a&&p.z<c)xs.push(p.x);
    const left=Math.min(...xs),right=Math.max(...xs);if(right-left<.001)continue;
    colliders.push({id:`${b.id}:${suffix}:${i}`,kind:'building',x:(left+right)/2,z:(a+c)/2,hx:(right-left)/2,hz:(c-a)/2,minY,maxY});
  }
}
function transformed(b,flip=0){return{...b,yaw:b.yaw+flip};}

function* palazzo(s,b,y,colliders,metrics){
  const face=transformed(b,b.v<0?Math.PI:0),w=b.width,d=b.depth,h=b.height,porch=Math.min(3,d*.24),spring=3.15;
  const tint=PLASTER[b.palette%PLASTER.length],roof=TILE[b.palette%TILE.length];
  s.frame(b.x,y,b.z,face.yaw,()=>{
    s.block(tint,0,0,porch/2,w,h,d-porch);
    s.block(tint,0,4.55,-d/2+porch/2,w,h-4.55,porch);
    s.box(OLD,0,.18,porch/2,w+.12,.4,d-porch+.12);
    s.box(STONE,0,4.45,0,w+.35,.3,d+.3);
    for(let fy=8.7;fy<h-.5;fy+=4.3)s.box(STONE,0,fy,0,w+.26,.18,d+.26);
    s.box(STONE,0,h-.13,0,w+.65,.35,d+.6);
    s.roof(roof,0,h,0,w+.7,d+.8,Math.min(2.6,w*.22),0,tint);
    s.beam('#d89b6c',[0,h+Math.min(2.6,w*.22)+.06,-d/2-.45],[0,h+Math.min(2.6,w*.22)+.06,d/2+.45],.2);
    const bays=Math.max(2,Math.floor(w/3.2)),span=(w-.8)/bays;
    for(let i=0;i<=bays;i++){const x=-w/2+.4+i*span;column(s,x,0,-d/2+.3,spring,.19);metrics.columns++;const q=at(face,x,-d/2+.3);colliders.push({id:`${b.id}:column:${i}`,x:q.x,z:q.z,r:.25,minY:y,maxY:y+spring,kind:'building-column'});}
    for(let i=0;i<bays;i++){arch(s,-w/2+.4+(i+.5)*span,spring,-d/2+.3,span-.4,1.1,.18,.48);metrics.arcades++;}
    aperture(s,0,.05,-d/2+porch-.035,1.6,2.9,'#42565a');
    for(const dx of [-w*.3,w*.27]){s.block('#bb8267',dx,h+.35,d*.18,.65,2.1,.75);s.box(STONE,dx,h+2.47,d*.18,.95,.2,1.0);metrics.chimneys++;}
  });
  solidRect(colliders,face,0,porch/2,w,d-porch,y-.2,y+h,'core');
  solidRect(colliders,face,0,-d/2+porch/2,w,porch,y+4.5,y+h,'upper');
  yield;
  const floors=Math.max(1,Math.floor((h-4.8)/3.6)),bays=Math.max(2,Math.floor((w-1)/4));
  for(let floor=0;floor<floors;floor++)for(let bay=0;bay<bays;bay++){
    const x=(bay-(bays-1)/2)*(w-1.8)/bays,fy=5.3+floor*3.6;
    s.frame(b.x,y,b.z,face.yaw,()=>{
      for(const side of [-1,1]){pointedWindow(s,x+side*.57,fy,-d/2-.06,.92,2.25);metrics.windows++;}
      s.cylinder(STONE,x,fy,-d/2-.12,.08,1.75);
      if(floor===0||b.kind==='palazzo'&&floor===1)balcony(s,x,fy-.2,-d/2-.12,2.4,metrics);
    });
    if((floor*bays+bay)%3===0)yield;
  }
  for(const side of [{x:w/2,z:0,yaw:-Math.PI/2,span:d},{x:-w/2,z:0,yaw:Math.PI/2,span:d},{x:0,z:d/2,yaw:Math.PI,span:w}])for(let floor=0;floor<floors;floor++){
    s.frame(b.x,y,b.z,face.yaw,()=>s.frame(side.x,0,side.z,side.yaw,()=>{
      for(let x=-side.span*.3;x<=side.span*.31;x+=3.8){pointedWindow(s,x,5.3+floor*3.6,-.06,.85,2.05);metrics.windows++;}
    }));yield;
  }
  s.frame(b.x,y,b.z,face.yaw,()=>{
    if(b.kind==='exchange'){
      s.box(STONE,0,h+.4,-d/2,12,.8,1.2);waveFrieze(s,10,h+1,-d/2-.65);
      dome(s,0,h+1.2,0,3.5,3.6,metrics);
      for(const x of [-w*.37,w*.37])s.cone(GOLD,x,h+1.4,-d/2,.4,1.2);
    }else if(b.kind==='archive'){
      s.box(STONE,0,h+.35,0,w*.58,.65,d*.55);dome(s,0,h+.7,0,4.5,4.6,metrics);
      s.box(GOLD,0,4,-d/2-.4,3,.2,.2);
    }else if(b.kind==='arsenal'){
      s.roof('#62877b',0,h+.25,0,w*.55,d+.9,4.2,0,STONE);
      for(const x of [-w*.31,w*.31]){aperture(s,x,.1,-d/2+porch-.05,4,3.4,'#4b554c');s.beam(GOLD,[x-1.3,1,-d/2+.15],[x+1.3,3.4,-d/2+.15],.12);s.beam(GOLD,[x+1.3,1,-d/2+.15],[x-1.3,3.4,-d/2+.15],.12);}
    }
  });yield;
}

function* temple(s,b,y,colliders,metrics){
  const w=b.width,d=b.depth;
  s.frame(b.x,y,b.z,b.yaw,()=>{
    s.block(OLD,0,-.2,3,w-10,10.8,d-6);
    for(let fy=1;fy<10;fy+=1.5)s.box('#c8c3aa',0,fy,3,w-9.7,.1,d-5.7);
    s.box(STONE,0,10.8,0,w+1.2,.65,d+1.1);
    s.block('#dbc8a6',0,11.1,1,w-5,9.4,d-4);
    s.box(STONE,0,20.6,1,w-4,.6,d-3);
    s.block('#d4c4a4',0,21,2,18,2,17);
    dome(s,0,23,2,8.8,7.6,metrics);trident(s,0,31.8,2,3.5);
    for(const x of [-15,15])for(const z of [-8.5,10]){s.cylinder(STONE,x,20.9,z,3.6,.6);dome(s,x,21.5,z,3.55,3.8,metrics);}
    for(const x of [-17.8,-12.7,-7.6,-2.55,2.55,7.6,12.7,17.8]){column(s,x,0,-d/2+1,10.4,.52);metrics.columns++;const p=at(b,x,-d/2+1);colliders.push({id:`${b.id}:column:${x}`,kind:'building-column',...p,r:.65,minY:y,maxY:y+10.4});}
    waveFrieze(s,w-1,9.7,-d/2-.05);
    // A surviving classical stone pediment under the younger palace loggia.
    s.triangle(STONE,[-13,11.2,-d/2-.45],[0,15.2,-d/2-.45],[13,11.2,-d/2-.45]);
    s.triangle('#457d76',[-10.6,11.6,-d/2-.48],[0,14.7,-d/2-.48],[10.6,11.6,-d/2-.48]);
    trident(s,0,11.9,-d/2-.6,2.0);
    aperture(s,0,.05,-d/2+6-.05,5.2,7.8,'#346966');
    for(let i=0;i<11;i++){const a=i/10*Math.PI;s.beam(GOLD,[0,6,-d/2+5.8],[Math.cos(a)*3.2,6+Math.sin(a)*3.2,-d/2+5.8],.13);}
  });
  solidRect(colliders,b,0,3,w-10,d-6,y-.2,y+11,'ancient-base');
  solidRect(colliders,b,0,1,w-5,d-4,y+11,y+21,'upper-palace');yield;
  for(let i=0;i<8;i++){
    const x=(i-3.5)*4.35;s.frame(b.x,y,b.z,b.yaw,()=>{
      column(s,x,11.3,-d/2-1,7.2,.19);metrics.columns++;
      if(i<7){arch(s,x+2.175,18.5,-d/2-1,3.8,1.4,.16,.3);metrics.arcades++;}
      if(i>0&&i<7)pointedWindow(s,x,13.5,-d/2+2.96,1.65,3.15);
    });yield;
  }
  s.frame(b.x,y,b.z,b.yaw,()=>{
    balcony(s,0,11.2,-d/2-1,35,metrics);
    for(const side of [-1,1])for(let j=0;j<5;j++){const x=side*(w/2-.6),z=-9+j*4.3;column(s,x,0,z,10.4,.4);metrics.columns++;const p=at(b,x,z);colliders.push({id:`${b.id}:side-column:${side}:${j}`,kind:'building-column',...p,r:.52,minY:y,maxY:y+10.4});}
  });yield;
}

function* beacon(s,b,y,colliders,metrics){
  s.frame(b.x,y,b.z,b.yaw,()=>{
    s.block('#bd9476',0,0,0,9,34,9);s.block(STONE,0,0,0,10,.7,10);
    for(let fy=4;fy<33;fy+=4.8)s.box(STONE,0,fy,0,9.2,.22,9.2);
    for(const x of [-4.05,4.05])for(const z of [-4.05,4.05])s.block(STONE,x,.6,z,.5,33,.5);
    s.box(STONE,0,34.1,0,11,.75,11);
    for(const x of [-4.1,4.1])for(const z of [-4.1,4.1])column(s,x,34.5,z,6,.34);
    s.box(STONE,0,40.6,0,11.4,.65,11.4);s.cone('#5d897e',0,40.95,0,7.6,7.4,Math.PI/4,4);s.cylinder(GOLD,0,48.3,0,.13,1.2);
    s.rock('#705d40',0,37.2,0,1.4,1.6,1.4);
  });solidRect(colliders,b,0,0,9,9,y-.2,y+34,'shaft');yield;
  for(let side=0;side<4;side++){
    s.frame(b.x,y,b.z,b.yaw,()=>s.frame(0,0,0,side*Math.PI/2,()=>{
      arch(s,0,38.1,-4.15,7.45,2.1,.3,.4,STONE,false);
      for(let h=9;h<29;h+=7)pointedWindow(s,0,h,-4.56,1.2,3.2);
      s.rock(STONE,0,30.5,-4.55,1.7,1.7,.12);s.rock('#507879',0,30.5,-4.68,1.37,1.37,.09);
      s.beam(GOLD,[0,30.5,-4.8],[.9,31.1,-4.8],.11);s.beam(GOLD,[0,30.5,-4.8],[-.3,31.5,-4.8],.11);
    }));yield;
  }
}

function* bridgeScenery(b,heightAt,colliders,walkSurfaces,root,metrics){
  const s=createSceneryBuilder(`Selemis bridge ${b.id}`),dx=b.b.x-b.a.x,dz=b.b.z-b.a.z,length=Math.hypot(dx,dz),nx=-dz/length,nz=dx/length;
  const ya=heightAt(b.a.x,b.a.z)+.035,yb=heightAt(b.b.x,b.b.z)+.035;
  const rise=Math.min(b.rise,Math.max(0,(.295-Math.abs(yb-ya)/length)*length/Math.PI));
  const count=24,point=t=>({x:b.a.x+dx*t,z:b.a.z+dz*t,y:ya+(yb-ya)*t+rise*Math.sin(Math.PI*t)});
  const p=(q,side,y=q.y)=>[q.x+nx*b.width/2*side,y,q.z+nz*b.width/2*side];
  for(let i=0;i<count;i++){
    const a=point(i/count),c=point((i+1)/count),lower=(q,t)=>q.y-2.8+2.15*Math.sin(Math.PI*t);
    const ab=lower(a,i/count),cb=lower(c,(i+1)/count);
    s.quad(i%3?'#d6c9ae':'#e2d4b8',p(a,1),p(c,1),p(c,-1),p(a,-1));
    s.quad(OLD,p(a,-1,ab),p(c,-1,cb),p(c,1,cb),p(a,1,ab));
    for(const side of [-1,1]){
      s.sheet(i%2?'#beab8f':'#cbbb9e',p(a,side,ab),p(c,side,cb),p(c,side),p(a,side));
      s.beam(STONE,p(a,side,a.y+1.0),p(c,side,c.y+1.0),.18,.2);
      s.beam(STONE,p(a,side,a.y+.15),p(c,side,c.y+.15),.17,.2);
      const q=p(a,side);s.cylinder(STONE,q[0],a.y+.13,q[2],.10,.87,Math.PI/4,4);
      const sections=Math.ceil(length/count/.5);for(let j=0;j<sections;j++){
        const t=(i+(j+.5)/sections)/count,q=point(t),x=q.x+nx*b.width/2*side,z=q.z+nz*b.width/2*side;
        colliders.push({id:`${b.id}:rail:${side}:${i}:${j}`,kind:'bridge-rail',x,z,hx:Math.abs(dx/count/sections)/2+.08,hz:Math.abs(dz/count/sections)/2+.08,minY:q.y+.08,maxY:q.y+1.12});
      }
    }
    walkSurfaces.push({id:`${b.id}:${i}`,kind:Math.abs(c.y-a.y)<1e-6?'deck':'ramp',a,b:c,width:b.width-.22});
    if(i%4===0)yield;
  }
  const mesh=yield* s.finishSteps(root);mesh.userData.selamusBridge=b.id;metrics.bridges++;metrics.batches++;metrics.vertices+=s.vertexCount;
}

function* squareFurnishings(plaza,heightAt,colliders,root,metrics){
  const s=createSceneryBuilder(`Selemis square furnishings ${plaza.id}`),contacts=[];
  if(plaza.id==='selamus-tide-square'){
    for(const side of [-1,1]){
      const p=selamusPoint(plaza.u+side*20,plaza.v),y=heightAt(p.x,p.z)-.055;
      s.frame(p.x,y,p.z,SELAMUS.yaw,()=>{
        s.cylinder(OLD,0,0,0,.85,.22);s.cylinder(STONE,0,.22,0,.52,.32);
        const rings=[[.54,.48],[.75,.68],[1.35,.88],[1.58,.78]],n=12;
        for(let j=1;j<rings.length;j++)for(let i=0;i<n;i++){
          const a=i/n*TAU,b=(i+1)/n*TAU,[lo,lr]=rings[j-1],[hi,hr]=rings[j];
          s.quad(COPPER[i%4],[lr*Math.cos(a),lo,lr*Math.sin(a)],[hr*Math.cos(a),hi,hr*Math.sin(a)],[hr*Math.cos(b),hi,hr*Math.sin(b)],[lr*Math.cos(b),lo,lr*Math.sin(b)]);
        }
        s.cylinder('#394a42',0,1.47,0,.72,.025);trident(s,0,1.5,0,1.3);
        for(const dx of [-.4,.4])s.rock('#d8c7a1',dx,1.55,0,.2,.12,.28);
      });
      colliders.push({id:`${plaza.id}:offering:${side}`,kind:'sea-offering',...p,r:.87,minY:y,maxY:y+1.6});
      contacts.push({...p,y});metrics.offerings++;yield;
    }
  }else{
    for(const [index,side,v] of [[0,-1,-5],[1,-1,5],[2,1,0]]){
      const p=selamusPoint(plaza.u+side*(plaza.width/2-1.35),plaza.v+v),y=heightAt(p.x,p.z);
      const b={...p,id:`${plaza.id}:stall:${index}`,yaw:SELAMUS.yaw+side*Math.PI/2},cloth=index%2?'#b87952':'#537f78';
      s.frame(p.x,y,p.z,b.yaw,()=>{
        // Four feet sample their own paving; the counter and canopy stay level.
        for(const x of [-1.7,1.7])for(const z of [-.85,.85]){
          const foot=at(b,x,z),bottom=heightAt(foot.x,foot.z)-y+.01;
          s.cylinder('#756049',x,bottom,z,.07,2.9-bottom,0,5);contacts.push({...foot,y:y+bottom});
        }
        s.box('#937052',0,.98,0,3.5,.16,1.05);
        s.box('#b0966a',0,.57,.3,3.2,.73,.46);
        for(let i=0;i<8;i++){
          const x=-1.95+i*3.9/8,next=x+3.9/8;
          s.sheet(i%2?STONE:cloth,[x,2.4,-1.18],[next,2.4,-1.18],[next,2.94,1.05],[x,2.94,1.05]);
          s.sheet(i%2?STONE:cloth,[x,2.18,-1.18],[next,2.18,-1.18],[next,2.4,-1.18],[x,2.4,-1.18]);
        }
        s.beam('#756049',[-1.98,2.4,-1.18],[1.98,2.4,-1.18],.09);
        s.beam('#756049',[-1.98,2.94,1.05],[1.98,2.94,1.05],.09);
        for(let i=0;i<3;i++){
          const x=-1.1+i*.78;
          s.box(i===1?'#a26f48':'#9d805d',x,1.16,.13,.63,.23,.65);
          for(let j=0;j<3;j++)s.rock(['#c8a253','#bb7553','#9eaa78'][index],x-.2+j*.2,1.34,.13,.12,.13,.19);
        }
        // Sealed cargo is tucked under the counter, away from the walking aisle.
        s.cylinder('#89684e',1.24,.04,.61,.26,.67,0,8);
        for(const fy of [.15,.52])s.cylinder('#b6aa82',1.24,fy,.61,.273,.045,0,8);
        s.sheet(cloth,[1.58,2.7,-.62],[1.58,2.7,.05],[1.58,1.7,.05],[1.58,1.84,-.62]);
        s.beam(GOLD,[1.58,2.75,-.7],[1.58,2.75,.15],.06);
      });
      solidRect(colliders,b,0,.12,3.5,1.05,y,y+1.08,'counter');
      for(const x of [-1.7,1.7])for(const z of [-.85,.85]){
        const q=at(b,x,z);colliders.push({id:`${b.id}:post:${x}:${z}`,kind:'market-post',...q,r:.085,minY:heightAt(q.x,q.z),maxY:y+2.94});
      }
      metrics.stalls++;yield;
    }
  }
  if(s.vertexCount){const mesh=yield* s.finishSteps(root);mesh.userData.selamusFurnishings=plaza.id;mesh.userData.contacts=contacts;metrics.batches++;metrics.vertices+=s.vertexCount;}
}

export function createSelamusScenery(options){return finishBuild(createSelamusScenerySteps(options));}
export function* createSelamusScenerySteps({parent,heightAt,colliders}){
  const root=new THREE.Group();root.name='Selemis — palazzi, canals and Palace of the Tides';parent.add(root);
  const metrics={buildings:0,landmarks:0,arcades:0,windows:0,columns:0,balconies:0,domes:0,chimneys:0,bridges:0,quaySections:0,plazas:0,stalls:0,offerings:0,batches:0,vertices:0};
  const walkSurfaces=[],mapFeatures=[];
  for(const b of SELAMUS_BUILDINGS){
    const s=createSceneryBuilder(`Selemis ${b.name} ${b.id}`),y=heightAt(b.x,b.z);
    if(b.kind==='temple')yield* temple(s,b,y,colliders,metrics);else if(b.kind==='campanile')yield* beacon(s,b,y,colliders,metrics);else yield* palazzo(s,b,y,colliders,metrics);
    const mesh=yield* s.finishSteps(root);mesh.userData.selamusBuilding=b.id;mesh.userData.kind=b.kind;
    metrics.buildings++;metrics.batches++;metrics.vertices+=s.vertexCount;if(!['house','palazzo','warehouse'].includes(b.kind))metrics.landmarks++;
    mapFeatures.push({id:b.id,name:b.name,kind:'building',x:b.x,z:b.z,width:b.width,depth:b.depth,angle:b.yaw});yield;
  }
  for(const plaza of SELAMUS_PLAZAS){
    const s=createSceneryBuilder(`Selemis paving ${plaza.name}`);
    yield* s.patchSteps('#d3c5a7',heightAt,plaza.x,plaza.z,plaza.width,plaza.depth,SELAMUS.yaw,.035,12);
    // Compass pavement stays flat and leaves the full central walking axis open.
    const y=heightAt(plaza.x,plaza.z)+.049;
    s.frame(plaza.x,y,plaza.z,SELAMUS.yaw,()=>{
      for(let i=0;i<16;i++){const a=i*Math.PI/8,c=(i+1)*Math.PI/8,r=i%2?2.4:5;
        s.triangle(i%2?STONE:'#637d76',[0,0,0],[Math.sin(a)*r,0,Math.cos(a)*r],[Math.sin(c)*2.4,0,Math.cos(c)*2.4]);}
    });
    yield* s.finishSteps(root,{castShadow:false});metrics.plazas++;metrics.batches++;metrics.vertices+=s.vertexCount;
    mapFeatures.push({id:plaza.id,name:plaza.name,kind:'plaza',x:plaza.x,z:plaza.z,width:plaza.width,depth:plaza.depth});
    yield* squareFurnishings(plaza,heightAt,colliders,root,metrics);
  }
  const canalSegments=SELAMUS_CANALS.flatMap(c=>c.points.slice(1).map((b,i)=>({id:c.id,a:c.points[i],b,half:c.width/2})));
  const crossChannel=(x,z,id)=>canalSegments.some(c=>{
    if(c.id===id)return false;
    const dx=c.b.x-c.a.x,dz=c.b.z-c.a.z,t=Math.max(0,Math.min(1,((x-c.a.x)*dx+(z-c.a.z)*dz)/(dx*dx+dz*dz)));
    return Math.hypot(x-c.a.x-dx*t,z-c.a.z-dz*t)<c.half+1.3;
  });
  for(const canal of SELAMUS_CANALS){
    const s=createSceneryBuilder(`Selemis quays ${canal.id}`);
    for(let i=1;i<canal.points.length;i++){
      const a=canal.points[i-1],b=canal.points[i],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz),nx=-dz/length,nz=dx/length,n=Math.ceil(length/2.7);
      for(let j=0;j<n;j++)for(const side of [-1,1]){
        const point=(t,offset)=>({x:a.x+dx*t+nx*(canal.width/2+offset)*side,z:a.z+dz*t+nz*(canal.width/2+offset)*side});
        const mid=point((j+.5)/n,1.75);
        if(!selamusUrban(mid.x,mid.z,5))continue;
        // Thick dressed masonry masks the entire cut, not just the dry lip.
        // A short overlap at polyline corners prevents wedge-shaped open joints.
        const t0=j/n-(j===0?.24/length:0),t1=(j+1)/n+(j===n-1?.24/length:0);
        const aIn=point(t0,-1.05),bIn=point(t1,-1.05),aOut=point(t0,1.55),bOut=point(t1,1.55);
        if([aIn,bIn,aOut,bOut,point((j+.5)/n,-1.05),mid].some(p=>crossChannel(p.x,p.z,canal.id)))continue;
        const bankA=point(t0,1.75),bankB=point(t1,1.75),ya=heightAt(bankA.x,bankA.z)+.06,yb=heightAt(bankB.x,bankB.z)+.06,foot=SELAMUS.waterline-.7;
        if(Math.min(ya,yb)<SELAMUS.waterline+.3)continue;
        const p=(q,y)=>[q.x,y,q.z],tone=j%3?'#b8b49e':'#c8bea5';
        s.sheet(tone,p(aIn,foot),p(bIn,foot),p(bIn,yb-.12),p(aIn,ya-.12));
        s.sheet(tone,p(aIn,foot),p(aIn,ya-.12),p(aOut,ya-.12),p(aOut,foot));
        s.sheet(tone,p(bOut,foot),p(bOut,yb-.12),p(bIn,yb-.12),p(bIn,foot));
        s.sheet(STONE,p(aIn,ya-.12),p(bIn,yb-.12),p(bIn,yb),p(aIn,ya));
        const top=side===1?[p(aOut,ya),p(bOut,yb),p(bIn,yb),p(aIn,ya)]:[p(aIn,ya),p(bIn,yb),p(bOut,yb),p(aOut,ya)];
        s.quad(STONE,...top);
        for(const d of [.8,1.6,2.4])if(Math.min(ya,yb)-d>foot+.2)s.beam('#928f7d',p(aIn,ya-d),p(bIn,yb-d),.035,.045);
        const ca=point(t0,.25),cb=point(t1,.25);
        walkSurfaces.push({id:`${canal.id}:quay:${i}:${j}:${side}`,kind:Math.abs(ya-yb)<1e-6?'deck':'ramp',a:{...ca,y:ya},b:{...cb,y:yb},width:2.6});
        if(j%6===1){const mooring=point((j+.5)/n,1.25);s.cylinder('#5c6558',mooring.x,(ya+yb)/2,mooring.z,.15,.65);}
        metrics.quaySections++;if(metrics.quaySections%18===0)yield;
      }
    }
    if(s.vertexCount){const mesh=yield* s.finishSteps(root);mesh.userData.selamusQuay=canal.id;metrics.batches++;metrics.vertices+=s.vertexCount;}
  }
  for(const b of SELAMUS_BRIDGES)yield* bridgeScenery(b,heightAt,colliders,walkSurfaces,root,metrics);
  return{root,metrics,mapFeatures,walkSurfaces};
}
