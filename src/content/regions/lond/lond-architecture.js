/** Shared low-poly construction vocabulary: pale limestone, dark slate and oak.
 * Details are merged with their district, rather than individual draw calls. */
export const LOND_PALETTE=Object.freeze({stone:'#a8a797',trim:'#d3cfb6',dark:'#404e58',roof:'#475561',timber:'#62533e',plaster:'#c2b794',gold:'#bba46b',flag:'#324d71'});
export function londHouse(b,site,heightAt,{grand=false,colliders=[]}={}){
  const {x,z,w,d,height:h,yaw=0,seed=.5}=site,y=site.base??heightAt(x,z),p=LOND_PALETTE;
  b.frame(x,y,z,yaw,()=>{
    b.block('#848777',0,-4,0,w+.5,4.2,d+.5);
    b.block(seed>.6?'#b9b39d':p.plaster,0,0,0,w,h,d);
    b.block(p.stone,0,0,0,w+.2,.55,d+.2);
    const stories=Math.max(1,Math.floor(h/2.8));
    for(let level=1;level<=stories;level++){
      const wy=Math.min(h-.75,level*2.65-1.1);
      if(level<stories)b.block(grand?p.trim:p.timber,0,level*2.65-.18,0,w+.1,.22,d+.1);
      for(const side of [-1,1])for(let i=0;i<3;i++){
        const px=(i-1)*w*.28;
        b.block(p.dark,px,wy,side*(d/2+.015),.7,1.1,.12);
        b.block(p.trim,px,wy-.14,side*(d/2+.12),.96,.13,.24);
      }
    }
    for(const dx of [-w/2+.15,w/2-.15])for(const dz of [-d/2-.035,d/2+.035])b.block(grand?p.trim:p.timber,dx,0,dz,grand?.65:.24,h,.22);
    b.block('#493f30',0,0,d/2+.06,1.2,2.2,.13);
    b.roof(seed>.65?'#68706d':p.roof,0,h,0,w+.95,d+1.3,grand?10:2.5+w*.13,0,p.plaster);
    b.block(p.stone,w*.3,h,0,.7,4,.8);b.block(p.trim,w*.3,h+3.8,0,.96,.25,1);
    if(grand){for(const side of [-1,1])for(let i=-1;i<=1;i++)b.block(p.trim,side*(w/2+.25),0,i*d*.3,.7,h*.9,1);}
  });
  const hx=(w*Math.abs(Math.cos(yaw))+d*Math.abs(Math.sin(yaw)))/2+.2,hz=(d*Math.abs(Math.cos(yaw))+w*Math.abs(Math.sin(yaw)))/2+.2;
  colliders.push({x,z,hx,hz,minY:y-4,maxY:y+h,minX:x-hx,maxX:x+hx,minZ:z-hz,maxZ:z+hz,kind:'building'});
}
export function crown(b,x,y,z,r,{height=9,colliders=[]}={}){
  const p=LOND_PALETTE;b.cylinder(p.stone,x,y,z,r,height,0,8);b.cylinder(p.trim,x,y+height-1,z,r+1,1.1,0,8);
  for(let i=0;i<12;i++){const a=i*Math.PI/6;b.block(p.trim,x+Math.cos(a)*r,y+height,z+Math.sin(a)*r,.9,1.3,.9,a);}
  for(let i=0;i<8;i++){const a=i*Math.PI/4;b.block(p.dark,x+Math.sin(a)*(r+.025),y+3,z+Math.cos(a)*(r+.025),.38,2.2,.18,a);}
  b.cone(p.roof,x,y+height+.2,z,r*.83,6,Math.PI/8,8);
  b.cylinder(p.gold,x,y+height+6,z,.1,2);b.cone(p.gold,x,y+height+7.6,z,.35,.9);
  colliders.push({x,z,r,minY:y,maxY:y+height,kind:'wall'});
}
