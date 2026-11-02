import {cityLantern,cityMedallion,flowerBox,stripedAwning} from '../../../world/scenery/city-detail.js';
import {groundPatch} from '../../../world/scenery/ground-face.js';

const common={dark:'#303b39',metal:'#484c47',gold:'#b59863',leaf:'#527149',leafLight:'#78935a',flower:'#d8c58b',pot:'#997053'};
export const SETTLEMENT_PALETTES=Object.freeze({
  nethereum:{...common,stone:'#a59e87',trim:'#b1a17c',wood:'#796346',timber:'#594a35',shutter:'#8b7855',cloth:'#a89b74',roof:'#82734f'},
  nesdor:{...common,stone:'#a99e87',trim:'#e1d2ae',wood:'#66503c',timber:'#51402f',shutter:'#627c82',cloth:'#627c82',roof:'#646c69'},
  ovesos:{...common,stone:'#b29e7d',trim:'#e4d5b0',wood:'#755b40',timber:'#6b5038',shutter:'#537975',cloth:'#a56848',roof:'#9c895a'},
  isareos:{...common,stone:'#aca78c',trim:'#d1c6a5',wood:'#766245',timber:'#5d513c',shutter:'#968362',cloth:'#c4b99b',roof:'#7d7a5b'},
});
const faces=[{yaw:0,nx:0,nz:1},{yaw:Math.PI/2,nx:1,nz:0},{yaw:Math.PI,nx:0,nz:-1},{yaw:-Math.PI/2,nx:-1,nz:0}];
// Hardware and recessed glass only expose one face. Keep full geometry for
// projecting frames, sills, plants and roof details; omit buried box faces.
const face=(b,c,x,y,z,w,h)=>b.quad(c,[x-w/2,y,z],[x+w/2,y,z],[x+w/2,y+h,z],[x-w/2,y+h,z]);

/** Detail lives on existing building solids and in their existing merged batch.
 * Dimensions are local to yaw; the doorway itself and its clearance are retained. */
export function settlementFacade(b,house,floor,{region,rise,door='south',yaw=0,ridgeAlongX=true,storeys=1,doorWidth=1.25,doorHeight=2.1,porch=false}){
  const p=SETTLEMENT_PALETTES[region],{w,d,h,kind}=house;
  const working=['barn','byre','smokehouse','mill','fulling-mill'].includes(kind),rustic=region==='nethereum';
  const doorAngle={south:0,east:Math.PI/2,north:Math.PI,west:-Math.PI/2}[door];
  const doorW=doorWidth,doorH=doorHeight;
  b.frame(house.x,floor,house.z,yaw,()=>{
    // Real corner pieces rather than full-depth slabs, which shimmer at distance.
    if(!rustic)for(const sx of [-1,1])for(const sz of [-1,1])for(let y=.18;y<h-.25;y+=.62)
      b.block(y%1.24<.7?p.trim:p.stone,sx*(w/2-.13),y,sz*(d/2-.13),.38,.42,.38);
    for(const f of faces){
      const span=f.nx?d:w,front=f.yaw===doorAngle;
      b.frame(f.nx*(w/2+.095),0,f.nz*(d/2+.095),f.yaw,()=>{
        b.block(rustic?p.wood:p.trim,0,h-.2,0,span+.34,.17,.25);
        b.block(p.stone,0,.05,0,span+.12,.25,.16);
        if(!working)for(let row=0;row<storeys;row++)for(const side of [-1,1]){
          const x=side*span*.29,y=Math.min(1.02,h-1.27)+row*2.5;
          if(front&&Math.abs(x)<doorW/2+1)continue;
          b.block(p.trim,x,y-.13,.025,1.18,1.24,.12);
          face(b,p.dark,x,y,.145,.86,.97);
          if(!rustic)face(b,'#95aaa1',x,y+.06,.17,.68,.8);
          face(b,p.wood,x,y,.225,.07,.95);
          face(b,p.wood,x,y+.45,.225,.86,.065);
          b.block(p.stone,x,y-.18,.1,1.39,.14,.34);
          for(const s of [-1,1]){
            face(b,p.shutter,x+s*.79,y-.015,.115,.4,1.02);
            for(const yy of [.13,.8])face(b,p.timber,x+s*.79,y+yy,.155,.36,.06);
          }
          if(front&&row===0&&region!=='ovesos'){
            if(rustic){
              b.block(p.wood,x,y-.48,.25,1.06,.3,.42);
              for(const dx of [-.32,0,.32])b.rock(p.leaf,x+dx,y-.09,.25,.24,.2,.25);
            }else flowerBox(b,p,x,y-.48,.25,1.06);
          }
        }
        if(working&&!front){
          // Wide ventilated openings make barns and mills readable as workplaces.
          b.block(p.trim,0,h-1.3,.025,1.8,1.1,.1);
          face(b,p.dark,0,h-1.18,.115,1.48,.86);
          for(let n=0;n<5;n++)b.block(p.wood,0,h-1.14+n*.17,.14,1.52,.075,.11);
        }
        if(front){
          for(const s of [-1,1])b.block(p.trim,s*(doorW/2+.12),0,.05,.18,doorH+.2,.25);
          b.block(p.trim,0,doorH+.08,.05,doorW+.48,.22,.25);
          for(let n=0;n<5;n++)face(b,p.wood,(n-2)*doorW/5,.06,.155,doorW/5-.025,doorH-.08);
          for(const y of [.45,doorH-.4])face(b,p.metal,0,y,.2,doorW,.07);
          b.block(p.gold,doorW*.31,1.06,.21,.07,.14,.07);
          if(!porch&&h>=2.5){
            if(region==='ovesos'||kind==='inn')stripedAwning(b,p,0,Math.min(h-.1,doorH+.65),.03,doorW+1.35,1.15);
            else{
              b.sheet(p.roof,[-doorW*.85,doorH+.57,-.03],[doorW*.85,doorH+.57,-.03],[doorW*.85,doorH+.39,.88],[-doorW*.85,doorH+.39,.88]);
              for(const s of [-1,1])b.beam(p.wood,[s*doorW*.7,doorH+.03,0],[s*doorW*.7,doorH+.4,.8],.07);
            }
          }
          if(span>6&&h>2.5)cityLantern(b,p,-doorW/2-.56,1.65,.25,.46);
          if(kind==='register'||kind==='inn')cityMedallion(b,p,0,h-.8,.15,.38,kind==='register'?'reed':'sun');
        }
        // Gables keep the roof's real orientation, even on rotated cottages.
        const gable=ridgeAlongX?!!f.nx:!!f.nz;
        if(gable){
          // The roof's gable projects beyond the wall; keep fittings on its
          // exposed face rather than burying them inside the closed roof.
          const end=region==='nethereum'?.55:region==='isareos'?.4:region==='ovesos'?.5:.45;
          const eave=region==='nethereum'?.65:region==='isareos'?.5:region==='ovesos'?.6:.55;
          b.frame(0,0,end-.07,0,()=>{
          b.beam(p.wood,[-span/2-eave,h,.025],[0,h+rise,.025],.13);
          b.beam(p.wood,[0,h+rise,.025],[span/2+eave,h,.025],.13);
          b.beam(p.wood,[0,h,.025],[0,h+rise-.1,.025],.1);
          if(rise>1.6){
            face(b,p.dark,0,h+.32,.083,.72,.6);
            for(let n=0;n<4;n++)b.block(p.wood,0,h+.35+n*.14,.11,.81,.065,.075);
          }
          });
        }
        if(region==='ovesos'&&h>3)for(let x=-span/2+.6;x<span/2-.4;x+=.65)
          face(b,p.shutter,x,h-.48,.08,.3,.12);
      });
    }
    // Ridge lashings and caps provide a distant silhouette at very low cost.
    const length=ridgeAlongX?w:d;
    for(let u=-length/2+.5;u<length/2;u+=1.35)
      b.box(rustic?p.trim:p.stone,ridgeAlongX?u:0,h+rise+.12,ridgeAlongX?0:u,ridgeAlongX?.24:.55,.12,ridgeAlongX?.55:.24);
  });
}

/** Inlaid borders stay flush: the common remains open for fights and riding. */
export function* settlementCourt(earth,surface,heightAt,{x,z,w,d,region}){
  const p=SETTLEMENT_PALETTES[region],base=region==='nethereum'?'#a29a79':region==='ovesos'?'#b9aa88':'#b3a78b';
  yield* groundPatch(earth,surface,base,heightAt,x,z,w,d,0,.075,5);
  for(const side of [-1,1]){
    yield* groundPatch(earth,surface,p.stone,heightAt,x+side*(w/2-.24),z,.48,d,0,.084,5);
    yield* groundPatch(earth,surface,p.stone,heightAt,x,z+side*(d/2-.24),w,.48,0,.084,5);
  }
  // A broad worn central strip ties the yard to its routes without tiled clutter.
  yield* groundPatch(earth,surface,region==='ovesos'?'#c8b995':'#beb291',heightAt,x,z,Math.min(3,w/4),d-.9,0,.087,5);
}
