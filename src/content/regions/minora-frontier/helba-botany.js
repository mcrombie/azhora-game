// Small, recognisable botanical shapes, all emitted into the chamber's static
// vertex-colour batch. No individual plant objects, textures or update loops.
const TAU=Math.PI*2;
export function gardenBotany(b){
  function leaf(x,y,z,length,width,yaw,lift=.3,color='#648456',simple=false){
    b.frame(x,y,z,yaw,()=>{
      const root=[0,0,0],tip=[0,lift,length],ridge=[0,lift*.7+.04,length*.46];
      if(simple){b.sheet(color,root,[-width,lift*.36,length*.4],tip,[width,lift*.36,length*.4]);return;}
      const edge=[root,[-width*.72,lift*.23,length*.22],[-width,lift*.64,length*.60],tip,
        [width,lift*.64,length*.60],[width*.72,lift*.23,length*.22]];
      for(let i=0;i<edge.length;i++){
        const tint=i<3?color:'#7d9962',next=edge[(i+1)%edge.length];
        b.triangle(tint,ridge,edge[i],next);b.triangle(tint,ridge,next,edge[i]);
      }
    });
  }
  function fern(x,y,z,s=1,seed=0){
    for(let j=0;j<5;j++)b.frame(x,y,z,j*TAU/5+seed,()=>{
      const reach=s*(.75+(j%3)*.13);
      for(let i=0;i<4;i++){
        const t=i/4,u=(i+1)/4,curve=v=>s*(Math.sin(v*Math.PI*.7)*.7+.08);
        b.sheet('#6d8751',[-.011*s,curve(t),reach*t],[.011*s,curve(t),reach*t],[.011*s,curve(u),reach*u],[-.011*s,curve(u),reach*u]);
        for(const side of [-1,1])leaf(0,curve(u),reach*u,s*(.43-u*.26),s*.11,side*1.15,.08*s,j%2?'#466d4b':'#628b53',true);
      }
    });
  }
  function broadleaf(x,y,z,s=1,seed=0){
    for(let i=0;i<7;i++){
      const a=i*2.4+seed,h=s*(.18+(i%3)*.19);
      b.beam('#506b42',[x,y,z],[x,y+h,z],.045*s);
      leaf(x,y+h,z,s*(.75+(i%3)*.15),s*.32,a,s*.3,i%2?'#55764e':'#789555');
    }
  }
  function flower(x,y,z,s=1,color='#d6ad82',seed=0){
    for(let i=0;i<3;i++){
      const a=seed+i*2.4,h=s*(.85+i*.18),xx=x+Math.sin(a)*s*.2,zz=z+Math.cos(a)*s*.2;
      b.beam('#658052',[x,y,z],[xx,y+h,zz],.028*s);
      leaf(x,y+h*.38,z,s*.38,s*.1,a,.1*s);leaf(x,y+h*.65,z,s*.27,s*.085,a+2,.08*s);
      for(let j=0;j<6;j++)b.frame(xx,y+h,zz,j*TAU/6,()=>{
        b.sheet(color,[0,0,0],[-s*.12,s*.07,s*.18],[0,s*.035,s*.34],[s*.12,s*.07,s*.18]);
      });
      b.rock('#c7a350',xx,y+h+.035*s,zz,s*.09,s*.055,s*.09);
    }
  }
  function mushroom(x,y,z,s=1,color='#b77e57'){
    b.cylinder('#d7cbb0',x,y,z,.085*s,.66*s);
    const rings=[[.32,.58],[.43,.65],[.31,.83],[.08,.92],[0,.93]],n=10;
    for(let j=0;j<rings.length-1;j++)for(let i=0;i<n;i++){
      const point=(row,a)=>[x+Math.cos(a)*rings[row][0]*s,y+rings[row][1]*s,z+Math.sin(a)*rings[row][0]*s];
      const a=i*TAU/n,c=(i+1)*TAU/n;
      b.quad(j===0?'#d1b79a':color,point(j,a),point(j+1,a),point(j+1,c),point(j,c));
      if(j===0)b.triangle('#baa98c',[x,y+.58*s,z],point(0,a),point(0,c));
    }
    for(let i=0;i<3;i++){
      const xx=x+Math.cos(i*2.4)*s*.21,zz=z+Math.sin(i*2.4)*s*.21,yy=y+.883*s;
      b.quad('#e5d6b6',[xx-s*.045,yy,zz],[xx,yy,zz+s*.04],[xx+s*.045,yy,zz],[xx,yy,zz-s*.04]);
    }
  }
  function pitcher(x,y,z,s=1,yaw=0){
    broadleaf(x,y,z,s*.7,yaw);
    for(let j=0;j<3;j++)b.frame(x+Math.sin(j*2.4)*s*.3,y,z+Math.cos(j*2.4)*s*.3,yaw+j,()=>{
      const h=s*(.95+j*.19),rings=[[.07,0],[.21,h*.4],[.16,h*.86],[.25,h]],n=8;
      for(let k=0;k<3;k++)for(let i=0;i<n;i++){
        const p=(row,a)=>[Math.cos(a)*rings[row][0]*s,rings[row][1],Math.sin(a)*rings[row][0]*s],a=i*TAU/n,c=(i+1)*TAU/n;
        b.quad(i%2?'#8e6657':'#a67c65',p(k,a),p(k+1,a),p(k+1,c),p(k,c));
      }
      for(let i=0;i<n;i++){
        const a=i*TAU/n,c=(i+1)*TAU/n,pt=(r,t)=>[Math.cos(t)*r*s,h,Math.sin(t)*r*s];
        b.quad('#b4b276',pt(.25,a),pt(.19,a),pt(.19,c),pt(.25,c));
        b.triangle('#3a4432',[0,h-.20*s,0],pt(.19,c),pt(.19,a));
      }
      leaf(0,h,-.22*s,.5*s,.23*s,0,.23*s,'#a3ac69');
    });
  }
  function vine(points,seed=0,scale=1){
    for(let i=1;i<points.length;i++){
      b.beam('#586546',points[i-1],points[i],.035*scale);
      const [x,y,z]=points[i];leaf(x,y,z,scale*(.4+i%3*.09),scale*.17,seed+i*2.4,scale*-.18,i%2?'#497351':'#6b8652');
    }
  }
  function soil(x,y,z,rx,rz,seed=0){
    const count=18,edge=i=>{const a=i*TAU/count,r=.93+Math.sin(i*2.8+seed)*.055;return [x+Math.cos(a)*rx*r,y,z+Math.sin(a)*rz*r];};
    for(let i=0;i<count;i++){
      const a=edge(i),c=edge((i+1)%count);
      b.triangle(i%3?'#5d5f40':'#70734a',[x,y,z],c,a);
      b.quad('#625b45',[a[0],.025,a[2]],a,c,[c[0],.025,c[2]]);
      b.rock(i%3?'#92917a':'#a6a68d',a[0],y-.04,a[2],rx*.16,.20,rz*.17,i*.7);
      if(i%2===0)b.rock('#748450',a[0],y+.10,a[2],rx*.13,.06,rz*.12,i*.7);
    }
  }
  return {leaf,fern,broadleaf,flower,mushroom,pitcher,vine,soil};
}
