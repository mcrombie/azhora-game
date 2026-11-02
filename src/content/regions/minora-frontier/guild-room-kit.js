import * as THREE from 'three';
import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';

// Common craft vocabulary, with static details merged per chamber. Only the
// handful of objects which actually move have separate transforms.
export function guildRoomKit({parent,palette:p,solid,finish}){
  const b=createSceneryBuilder('Guild chamber: crafted furnishings'),animations=[],demonstrations=new Map(),objects={};
  let now=0,lastAction=null;
  function table(x,z,w=4,d=2,y=1.15){
    b.block(p.wood,x,y,z,w,.16,d);b.block(p.gold,x,y+.16,z,w-.12,.025,d-.12);
    for(const dx of [-1,1])for(const dz of [-1,1])b.block(p.wood,x+dx*(w/2-.22),0,z+dz*(d/2-.18),.16,y,.16);
    solid(x,0,z,w,y+.2,d);
  }
  function cabinet(x,z,w=3,h=4){
    b.block(p.wood,x,0,z,w,h,.65);b.block(p.shade,x,.25,z+.34,w-.3,h-.5,.035);
    for(let row=0;row<4;row++){
      b.block(p.trim,x,.4+row*(h-.8)/4,z+.45,w-.2,.07,.86);
      for(let j=0;j<Math.floor(w*3);j++){
        const xx=x-w/2+.3+j*.30;
        b.block([p.cloth,'#957452','#668279','#baa576'][j%4],xx,.48+row*(h-.8)/4,z+.51,.20,.42+(j%3)*.1,.34);
        b.block(p.gold,xx,.6+row*(h-.8)/4,z+.69,.20,.035,.015);
      }
    }
    solid(x,0,z,w,h,1.1);
  }
  function stool(x,z){b.cylinder(p.cloth,x,.65,z,.47,.15);for(const dx of [-.28,.28])for(const dz of [-.28,.28])b.block(p.wood,x+dx,0,z+dz,.1,.66,.1);solid(x,0,z,.9,.8,.9);}
  function plant(x,y,z,size=1,flowers=true,builder=b){
    builder.cylinder('#8f6e50',x,y,z,.30*size,.45*size);builder.cylinder(p.trim,x,y+.36*size,z,.33*size,.1*size);
    for(let i=0;i<5;i++){
      const a=i*2.4,xx=x+Math.sin(a)*.36*size,zz=z+Math.cos(a)*.36*size,h=(.75+(i%3)*.22)*size;
      builder.beam('#527454',[x,y+.4*size,z],[xx,y+h,zz],.045*size);
      builder.rock(i%2?'#537b48':'#799954',xx,y+h*.8,zz,.26*size,.10*size,.20*size,a);
      if(flowers)for(let j=0;j<5;j++)builder.rock(['#cf997f','#d3bd70','#ac93c1'][i%3],xx+Math.sin(j*1.26)*.10*size,y+h,zz+Math.cos(j*1.26)*.10*size,.10*size,.055*size,.10*size);
    }
  }
  function lamp(x,z,y=2.7){
    b.cylinder(p.gold,x,0,z,.32,.12);b.cylinder(p.gold,x,.12,z,.055,y);
    b.rock(p.lamp??'#e6d8a1',x,y,z,.23,.36,.23);b.cone(p.trim,x,y+.25,z,.31,.28);
  }
  function ring(builder,x,y,z,r,color=p.gold){for(let i=0;i<32;i++){const a=i*Math.PI/16,c=(i+1)*Math.PI/16;builder.beam(color,[x+Math.sin(a)*r,y,z+Math.cos(a)*r],[x+Math.sin(c)*r,y,z+Math.cos(c)*r],.055);}}
  function moving(id,x,y,z,build){
    const g=new THREE.Group();g.name=id;g.position.set(x,y,z);parent.add(g);
    const part=createSceneryBuilder(id);build(part);const mesh=finish(part,g);if(/light|water|flame|plasma|signal|Whisper/i.test(id)){mesh.material.emissive.set('#769b98');mesh.material.emissiveIntensity=.28;}objects[id]=g;return g;
  }
  function label(text,x,y,z,{width=3.6,height=.7,yaw=0}={}){
    if(typeof document==='undefined')return;
    const canvas=document.createElement('canvas');canvas.width=768;canvas.height=144;
    const c=canvas.getContext('2d');c.fillStyle='#243b3c';c.fillRect(0,0,768,144);c.strokeStyle=p.gold;c.lineWidth=5;c.strokeRect(4,4,760,136);
    c.fillStyle='#f4e3b6';c.textAlign='center';c.textBaseline='middle';c.font='38px Georgia';c.fillText(text,384,72,730);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const material=new THREE.MeshBasicMaterial({map:texture}),mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),material);
    mesh.position.set(x,y,z);mesh.rotation.y=yaw;parent.add(mesh);
  }
  function action(id,run){demonstrations.set(id,run);}
  return {b,p,table,cabinet,stool,plant,lamp,ring,moving,label,objects,animate:fn=>animations.push(fn),action,
    seal(){finish(b,parent);},
    update(time,player){now=time;for(const fn of animations)fn(time,player);},
    demonstrate(id){const fn=demonstrations.get(id);if(!fn)return false;lastAction=id;fn(now);return true;},
    state:()=>({lastAction,objects:Object.fromEntries(Object.entries(objects).map(([id,g])=>[id,{position:g.position.toArray(),rotation:g.rotation.toArray().slice(0,3),scale:g.scale.toArray(),visible:g.visible}]))}),
    dispose(){},
  };
}
