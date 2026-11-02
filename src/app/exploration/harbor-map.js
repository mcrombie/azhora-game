import {miniMapProjection} from '../../ui/map/minimap.js';

export function drawHarborMinimap(ctx,ports,position,radius,northOffset){
  const view=miniMapProjection({position,radius,size:300});
  for(const port of ports){
    const p=view.project(port.keeper);if(!p?.inside)continue;
    const dx=p.x-150,dz=p.y-150;
    ctx.save();ctx.translate(150+dx*Math.cos(northOffset)-dz*Math.sin(northOffset),150+dx*Math.sin(northOffset)+dz*Math.cos(northOffset));
    ctx.beginPath();ctx.arc(0,0,9,0,Math.PI*2);ctx.fillStyle='#eadcb4';ctx.fill();ctx.strokeStyle='#315c61';ctx.lineWidth=1.8;ctx.stroke();
    ctx.beginPath();ctx.arc(0,-4,1.5,0,Math.PI*2);ctx.moveTo(0,-2.5);ctx.lineTo(0,5);ctx.moveTo(-3,-1);ctx.lineTo(3,-1);ctx.moveTo(-5,1);ctx.quadraticCurveTo(-3,8,0,5);ctx.quadraticCurveTo(3,8,5,1);ctx.stroke();ctx.restore();
  }
}
