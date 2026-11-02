import {createPlanarMirror} from '../../../world/scenery/planar-mirror.js';

export function buildNerisMirror(kit,options){
  const {b,p,label}=kit;
  // A substantial standing frame, silver bevel and dark rear cabinet. Nothing
  // painted on the glass: the viewer and furnishings supply its only image.
  b.block(p.wood,8,.22,6.02,4.16,4.94,.30);
  for(const x of [6.02,9.98]){
    b.block(p.gold,x,.18,5.82,.24,5,.22);
    b.block('#dddace',x+(x<8?.14:-.14),.40,5.77,.08,4.5,.08);
    b.block('#574a45',x,.06,6.02,.65,.17,1.15);
    b.rock(p.gold,x,5.25,5.9,.22,.25,.16);
  }
  for(const y of [.24,4.98]){
    b.block(p.gold,8,y,5.83,4.15,.22,.25);
    b.block('#ece5d5',8,y+(y<1?.15:-.06),5.76,3.68,.07,.08);
  }
  for(const side of [-1,1]){
    b.beam('#bdbeb9',[8+side*1.85,.48,5.74],[8+side*1.85,4.82,5.74],.045);
    b.beam(p.gold,[8+side*.7,5.23,5.86],[8+side*.22,5.47,5.86],.10);
  }
  b.rock('#ced6d5',8,5.4,5.83,.18,.25,.08);
  options.solid(8,0,6,4.3,5.6,.7);
  label('BORROWED FACES',8,5.98,5.84,{yaw:Math.PI,width:3.6});
  const mirror=createPlanarMirror(options.parent);
  const originalState=kit.state,originalDispose=kit.dispose;
  kit.render=(renderer,camera)=>mirror.render(renderer,camera);
  kit.state=()=>({...originalState(),mirror:mirror.state()});
  kit.dispose=()=>{mirror.dispose();originalDispose();};
}
