import {groundFace} from './ground-face.js';

/** Shared mitered edges keep a path joined through bends, on the rendered ground. */
export function* groundRibbon(builder,line,width,tint,heightAt,surface,lift=.06){
  if(line.length<2)return;
  const normal=(a,b)=>{const d=Math.hypot(b.x-a.x,b.z-a.z)||1;return {x:-(b.z-a.z)/d,z:(b.x-a.x)/d};};
  const sections=line.map((p,i)=>{
    const n=normal(line[Math.max(0,i-1)],line[i===0?1:i]);
    const m=i===line.length-1?n:normal(p,line[i+1]),k=width/2/Math.max(.5,1+n.x*m.x+n.z*m.z);
    return [-1,1].map(side=>({x:p.x+side*(n.x+m.x)*k,z:p.z+side*(n.z+m.z)*k}));
  });
  const between=(a,b,t)=>({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});
  for(let i=1;i<line.length;i++){
    const n=Math.max(1,Math.ceil(Math.hypot(line[i].x-line[i-1].x,line[i].z-line[i-1].z)/3));
    for(let j=0;j<n;j++){
      yield;
      yield* groundFace(builder,tint,[between(sections[i-1][0],sections[i][0],j/n),
        between(sections[i-1][1],sections[i][1],j/n),between(sections[i-1][1],sections[i][1],(j+1)/n),
        between(sections[i-1][0],sections[i][0],(j+1)/n)],heightAt,surface,lift);
    }
  }
}
