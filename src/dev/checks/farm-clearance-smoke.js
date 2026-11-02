import {prepareWarExterior} from './tower-smoke.js';
import {lizeemAgricultureReserved} from '../../content/regions/minora-frontier/lizeem-agriculture-reservations.js';
import {LIZEEM_BRIDGES} from '../../content/regions/minora-frontier/lizeem-crossings.js';
const frames=async()=>{for(let i=0;i<5;i++)await new Promise(requestAnimationFrame);};
const assert=(ok,label)=>{if(!ok)throw Error(label);return label;};

export async function prepare(a){
  await prepareWarExterior(a);
  for(let i=0;i<100&&document.getElementById('stable-lesson')?.hidden;i++)a.step(.04);
  if(!document.getElementById('stable-lesson')?.hidden)document.getElementById('stable-next').click();
  a.war.pause();
  let scene=a.testHero.group;while(scene.parent)scene=scene.parent;
  let meshes=0,vertices=0;
  scene.traverse(o=>{
    if(!o.geometry||!(o.geometry.attributes.cropGround||o.name.endsWith(' / fields')))return;
    meshes++;const p=o.geometry.attributes.position;vertices+=p.count;
    for(let i=0;i<p.count;i++)if(lizeemAgricultureReserved(p.getX(i),p.getZ(i)))throw Error('Farm geometry on infrastructure: '+o.name+' / '+p.getX(i)+', '+p.getZ(i));
    for(let i=0;i<p.count;i+=3){
      const x=(p.getX(i)+p.getX(i+1)+p.getX(i+2))/3,z=(p.getZ(i)+p.getZ(i+1)+p.getZ(i+2))/3;
      if(lizeemAgricultureReserved(x,z))throw Error('Field triangle spans infrastructure: '+o.name);
    }
  });
  return {checks:[assert(meshes>=30,'Checks actual crop and soil meshes across the five loaded regions'),assert(vertices>100000,'Surrounding farmland remains populated')],meshes,vertices};
}
async function view(a,x,z,{distance=16,pitch=.5,mount='horse'}={}){
  await a.visit({x,z});a.selectMount(mount);a.war.pause();a.look({yaw:-Math.PI/2,pitch,distance});await frames();
  return {checks:[assert(a.groundProbe(x,z).clear,'Bridge arrival remains walkable'),assert(!a.state().frameErrors.length,'No rendering errors')],position:a.state().position,render:a.renderStats()};
}
export const whiteBridge=a=>view(a,-2172,135);
export const whiteApproach=a=>view(a,-2158,135,{distance:42,pitch:.78,mount:'foot'});
export const upper=a=>view(a,LIZEEM_BRIDGES[0].x+LIZEEM_BRIDGES[0].length/2-10,LIZEEM_BRIDGES[0].z,{distance:35});
export const lower=a=>view(a,LIZEEM_BRIDGES[1].x+LIZEEM_BRIDGES[1].length/2-10,LIZEEM_BRIDGES[1].z,{distance:35});
