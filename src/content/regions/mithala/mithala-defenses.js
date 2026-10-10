/** One outer circuit embraces the whole city. Roads pass through its three
 * land gates; the river channels pass through broad open masonry arches. */
import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';
import {cityMedallion} from '../../../world/scenery/city-detail.js';
import {MITHALA_CITY,MITHALA_CURTAIN,MITHALA_GATES,MITHALA_STREETS,MITHALA_BUILDINGS,mithalaSegmentDistance,mithalaCityWaterClearance} from './mithala-city.js';
import {westWaterSurface} from '../western-regions/west-ground.js';
import {drum,quadToward} from './mithala-city-parts.js';

const T=2.4,P=MITHALA_CITY.platform,TOP=P+10.5;
const STONE='#939790',LIGHT='#c0beaa',DARK='#69726c',BRICK='#8b6a51';
const streets=MITHALA_STREETS.flatMap(s=>s.points.slice(1).map((c,i)=>({a:s.points[i],c,half:s.width/2,id:s.id})));
const wayGap=(x,z)=>Math.min(...streets.map(s=>mithalaSegmentDistance(x,z,s.a,s.c)-s.half));
const point=(e,s)=>({x:e.a.x+e.ux*s,z:e.a.z+e.uz*s});

export function mithalaDefensePlan(){
  const edges=MITHALA_CURTAIN.map((a,i)=>{
    const c=MITHALA_CURTAIN[(i+1)%MITHALA_CURTAIN.length],len=Math.hypot(c.x-a.x,c.z-a.z),ux=(c.x-a.x)/len,uz=(c.z-a.z)/len;
    return {i,a,c,len,ux,uz,yaw:Math.atan2(-uz,ux)};
  });
  const gates=MITHALA_GATES.map(g=>{
    const e=edges[g.edge],road=streets.filter(s=>s.id===g.street).sort((a,b)=>mithalaSegmentDistance(g.x,g.z,a.a,a.c)-mithalaSegmentDistance(g.x,g.z,b.a,b.c))[0];
    const l=Math.hypot(road.c.x-road.a.x,road.c.z-road.a.z),sx=(road.c.x-road.a.x)/l,sz=(road.c.z-road.a.z)/l;
    const sin=Math.max(.2,Math.abs(e.ux*sz-e.uz*sx)),cos=Math.abs(e.ux*sx+e.uz*sz);
    return {...g,e,half:(road.half+1.05+T/2*cos)/sin+.2,s:Math.hypot(g.x-e.a.x,g.z-e.a.z)};
  });
  const runs=[],waterways=[];
  for(const e of edges){
    const n=Math.ceil(e.len/.4),step=e.len/n;
    let start=null;
    for(let i=0;i<=n;i++){
      const p=point(e,i*step),wet=mithalaCityWaterClearance(p.x,p.z)<6;
      if(wet&&start===null)start=Math.max(0,(i-1)*step);
      if(start!==null&&(!wet||i===n)){
        waterways.push({e,from:start,to:i*step,id:`mithala-river-arch-${e.i}-${waterways.length}`});start=null;
      }
    }
  }
  for(const e of edges){
    const cuts=[...gates.filter(g=>g.edge===e.i).map(g=>[Math.max(0,g.s-g.half),Math.min(e.len,g.s+g.half)]),
      ...waterways.filter(w=>w.e===e).map(w=>[w.from,w.to])].sort((a,b)=>a[0]-b[0]);
    let start=0;
    for(const [lo,hi] of [...cuts,[e.len,e.len]]){
      let from=start,to=lo;
      // Also trim the neighbour of a gate at a corner. Its square cap must
      // clear the entire road, not merely the point at which it crosses.
      while(to-from>.25&&wayGap(point(e,from).x,point(e,from).z)<T/2+.8)from+=.2;
      while(to-from>.25&&wayGap(point(e,to).x,point(e,to).z)<T/2+.8)to-=.2;
      if(to-from>.25)runs.push({e,from,to});
      start=Math.max(start,hi);
    }
  }
  return {edges,gates,runs,waterways};
}

export function* createMithalaOuterDefenses({root,colliders,groundHeight,metrics}){
  const push=c=>{colliders.push(c);metrics.colliders++;};
  const footOf=(e,from,to)=>{
    let foot=P-1;
    const n=Math.max(1,Math.ceil((to-from)/1.5));
    for(let i=0;i<=n;i++)for(const side of [-1,1]){
      const p=point(e,from+(to-from)*i/n);
      foot=Math.min(foot,groundHeight(p.x-e.uz*side*(T/2+.3),p.z+e.ux*side*(T/2+.3))-.8);
    }
    return foot;
  };
  {
    const b=createSceneryBuilder('Mithala - shared outer city wall'),plan=mithalaDefensePlan();
    for(const [index,run] of plan.runs.entries()){
      yield;
      const {e,from,to}=run,L=to-from,c=point(e,(from+to)/2),foot=footOf(e,from,to);
      b.frame(c.x,0,c.z,e.yaw,()=>{
        b.block(DARK,0,foot,0,L+.08,TOP-foot,T);
        for(let row=0;row<10;row++)for(const side of [-1,1]){
          const y=P+row*1.02;
          for(let x=-L/2;x<L/2-.05;x+=2.7){
            const end=Math.min(x+2.66,L/2),tint=[STONE,'#a1a397','#878e88'][((row+Math.floor(x+L))%3+3)%3];
            const z=side*(T/2+.025);
            quadToward(b,tint,[x,y+.02,z],[end,y+.02,z],[end,y+.97,z],[x,y+.97,z],[0,0,side]);
          }
        }
        b.box(BRICK,0,P+2.2,0,L+.1,.4,T+.12);
        b.box(LIGHT,0,TOP-.4,0,L+.12,.36,T+.3);
        b.box(LIGHT,0,TOP+.05,0,L+.15,.22,T+.2);
        const count=Math.max(1,Math.round(L/2.6));
        for(let i=0;i<count;i++)for(const s of [-1,1])b.block(STONE,-L/2+(i+.5)*L/count,TOP+.16,s*(T/2-.22),1.25,1.05,.5);
        for(let x=-L/2+3;x<L/2-2;x+=7.5)for(const s of [-1,1]){
          b.box('#394942',x,P+7.1,s*(T/2+.05),.16,1.4,.06);
          b.box(LIGHT,x,P+6.3,s*(T/2+.12),.54,.13,.22);
        }
      });
      // Densely overlapping discs are bounded by the same visible run ends.
      const r=T/2,n=Math.max(1,Math.ceil(Math.max(0,L-2*r)/.8));
      for(let i=0;i<=n;i++){
        const p=point(e,L<=2*r?(from+to)/2:from+r+(L-2*r)*i/n);
        push({...p,r:Math.min(r,L/2),minY:foot,maxY:TOP+1.3,id:`mithala-outer-curtain-${index}-${i}`,kind:'mithala-curtain'});
      }
      metrics.wallSegments++;
    }
    // Compact octagonal watches at the corners, on dry bank ground only.
    for(const [i,e] of plan.edges.entries()){
      const {x,z}=e.a,r=2.25;
      if(wayGap(x,z)<r+1||mithalaCityWaterClearance(x,z)<r+2||MITHALA_BUILDINGS.some(h=>Math.hypot(Math.max(0,Math.abs(h.x-x)-h.width/2),Math.max(0,Math.abs(h.z-z)-h.depth/2))<r+.8))continue;
      const foot=Math.min(P-1,groundHeight(x,z)-.5),top=TOP+3.5;
      drum(b,DARK,x,foot,z,r+.3,P+2,r,12);
      for(let j=0;j<8;j++)drum(b,j%2?STONE:'#a0a093',x,P+2+j*1.5,z,r,P+3.5+j*1.5,r,12);
      drum(b,LIGHT,x,top-.3,z,r+.3,top+.05,r+.3,12,0,{cap:DARK});
      for(let j=0;j<6;j++){
        const a=j*Math.PI/3;
        b.box(STONE,x+Math.cos(a)*r,top+.6,z+Math.sin(a)*r,.7,1.1,1.2,-a);
        b.box('#34433e',x+Math.cos(a)*(r+.02),top-3,z+Math.sin(a)*(r+.02),.08,1.3,.26,-a);
      }
      push({x,z,r:r+.3,minY:foot,maxY:top+1.2,kind:'city-tower',id:`mithala-outer-watch-${i}`});metrics.towers++;
    }
    for(const g of plan.gates){
      yield;
      const y=groundHeight(g.x,g.z),head=Math.max(y+6.5,P+6.5),half=g.half,top=TOP+1.8;
      const jambFeet=new Map([-1,1].map(side=>{
        const samples=[];
        for(const dx of [-.4,0,.4])for(const depth of [-1.6,-.8,0,.8,1.6]){
          const along=side*(half+.38)+dx;
          samples.push(groundHeight(g.x+g.e.ux*along-g.e.uz*depth,g.z+g.e.uz*along+g.e.ux*depth));
        }
        return [side,Math.min(...samples)-.8];
      }));
      b.frame(g.x,0,g.z,g.e.yaw,()=>{
        // A high lintel and dressed arch over the oblique street. Nothing
        // narrows the approach: the full gate width includes its skew.
        b.block(STONE,0,head,0,half*2+.4,top-head,T+.7);
        b.box(LIGHT,0,top,0,half*2+1,.4,T+1);
        for(const side of [-1,1]){
          b.block(LIGHT,side*(half+.38),jambFeet.get(side),0,.72,top-jambFeet.get(side),T+.75);
          for(const face of [-1,1]){
            const radius=half-.2;
            if(side===1)for(let i=0;i<10;i++){
              const a=i*Math.PI/10,c=(i+1)*Math.PI/10;
              // Fill the spandrel down to the arch, so its voussoirs carry
              // masonry rather than hanging below a rectangular lintel.
              const ax=Math.cos(a)*radius,ay=head-1.25+Math.sin(a)*1.5;
              const cx=Math.cos(c)*radius,cy=head-1.25+Math.sin(c)*1.5,z=face*(T/2+.35);
              quadToward(b,STONE,[ax,ay,z],[cx,cy,z],[cx,head+.35,z],[ax,head+.35,z],[0,0,face]);
              b.beam(LIGHT,[Math.cos(a)*radius,head-1.25+Math.sin(a)*1.5,face*(T/2+.42)],
                [Math.cos(c)*radius,head-1.25+Math.sin(c)*1.5,face*(T/2+.42)],.35);
              if(face===1)b.sheet(DARK,[ax,ay,-T/2-.35],[cx,cy,-T/2-.35],[cx,cy,T/2+.35],[ax,ay,T/2+.35]);
            }
            b.box('#744c3f',side*(half+.42),P+6.5,face*(T/2+.45),.65,3.5,.08);
          }
        }
        cityMedallion(b,{metal:'#a28d59',trim:LIGHT},0,top-.9,T/2+.5,.6,'reed');
        for(let x=-half+.2;x<half;x+=1.8)b.block(STONE,x,top+.2,0,.9,1,T+.8);
      });
      // Jambs are subdivided across the depth so rotated rectangles do not
      // overblock the road with a large axis-aligned bounding box.
      for(const s of [-1,1])for(const depth of [-1.15,-.55,0,.55,1.15]){
        const x=g.x+g.e.ux*s*(half+.38)-g.e.uz*depth,z=g.z+g.e.uz*s*(half+.38)+g.e.ux*depth;
        push({x,z,r:.38,minY:jambFeet.get(s),maxY:top+1.2,kind:'mithala-curtain',id:`${g.id}-jamb-${s}-${depth}`});
      }
      push({x:g.x,z:g.z,r:half,minY:head-1.6,maxY:top+1.2,kind:'gate-arch',id:`${g.id}-arch`});
      metrics.gates++;
    }
    // The wall continues overhead at each river entrance, with abutments
    // entirely on dry banks. The original water and bed remain untouched.
    for(const w of plan.waterways){
      yield;
      const {e,from,to}=w,L=to-from,half=L/2,c=point(e,(from+to)/2);
      let water=12;
      for(let s=from;s<=to;s+=.5){const p=point(e,s);water=Math.max(water,westWaterSurface(p.x,p.z)??0);}
      const spring=water+4.5,rise=Math.min(4,TOP-spring-.6),n=Math.max(16,Math.ceil(L/2));
      w.clearance=4.5;w.spring=spring;
      b.frame(c.x,0,c.z,e.yaw,()=>{
        for(let i=0;i<n;i++){
          const x0=-half+L*i/n,x1=-half+L*(i+1)/n;
          const y=x=>spring+rise*Math.sqrt(Math.max(0,1-(x/half)**2)),y0=y(x0),y1=y(x1);
          for(const side of [-1,1]){
            const z=side*T/2;
            quadToward(b,i%3?STONE:'#a1a397',[x0,y0,z],[x1,y1,z],[x1,TOP,z],[x0,TOP,z],[0,0,side]);
            b.beam(LIGHT,[x0,y0+.15,side*(T/2+.06)],[x1,y1+.15,side*(T/2+.06)],.45,.5);
          }
          b.sheet(DARK,[x0,y0,-T/2],[x1,y1,-T/2],[x1,y1,T/2],[x0,y0,T/2]);
          const p=point(e,from+L*(i+.5)/n);
          push({...p,r:Math.hypot(L/n,T)/2,minY:Math.min(y0,y1)-.3,maxY:TOP+1.4,kind:'river-arch',id:`${w.id}-${i}`});
        }
        b.box(LIGHT,0,TOP,0,L+.15,.32,T+.25);
        for(let x=-half+.7;x<half;x+=2.6)for(const side of [-1,1])b.block(STONE,x,TOP+.16,side*(T/2-.22),1.25,1.05,.5);
      });
      metrics.riverArches=(metrics.riverArches??0)+1;
    }
    metrics.vertices+=b.vertexCount;yield* b.finishSteps(root);metrics.batches++;
    metrics.defenseCircuits=1;
    return plan;
  }
}
