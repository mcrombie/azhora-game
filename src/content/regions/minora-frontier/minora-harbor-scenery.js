import * as THREE from 'three';
import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';
import {MINORA_HARBOR as H,minoraHarborHeight} from './minora-harbor.js';
import {LIZEEM_BERTHS} from './river-navigation.js';

const WOOD='#73543b',EDGE='#a98955',PLANK='#b6a17d',TEAL='#356560',CREAM='#d5cba5',IRON='#3d4e4c';
export function createPassengerBoat(parent,{x,z,y,yaw=0,canopy=true}){
  const root=new THREE.Group();root.name='Lizeem passage boat';root.position.set(x,y,z);root.rotation.y=yaw;parent.add(root);
  const b=createSceneryBuilder('Riverboat hull, sheltered benches and oars');
  const stations=[[-5.8,.04],[-4.5,1.15],[-2.7,1.75],[2.7,1.75],[4.5,1.15],[5.8,.04]];
  for(let i=1;i<stations.length;i++){
    const [a,w]=stations[i-1],[c,v]=stations[i];
    for(const s of [-1,1]){
      b.sheet(WOOD,[s*w,.65,a],[s*v,.65,c],[s*v*.6,-.65,c],[s*w*.6,-.65,a]);
      b.beam(EDGE,[s*w,.7,a],[s*v,.7,c],.17);
    }
    b.quad(PLANK,[w,.55,a],[-w,.55,a],[-v,.55,c],[v,.55,c]);
    b.quad(WOOD,[-w*.6,-.65,a],[w*.6,-.65,a],[v*.6,-.65,c],[-v*.6,-.65,c]);
  }
  for(const q of [-3.6,-2.3,2.3,3.6])b.box(EDGE,0,.8,q,2.5,.2,.5);
  if(canopy)for(const x of [-1.4,1.4])for(const z of [-2.7,2.7])b.cylinder(WOOD,x,.55,z,.07,2.1);
  for(let i=0;i<(canopy?6:0);i++){
    const z=-2.95+i*.98,c=i%2?CREAM:TEAL;
    b.sheet(c,[-1.6,2.5,z],[0,2.9,z],[0,2.9,z+.98],[-1.6,2.5,z+.98]);
    b.sheet(c,[0,2.9,z],[1.6,2.5,z],[1.6,2.5,z+.98],[0,2.9,z+.98]);
  }
  if(!canopy)b.box(CREAM,1.2,.85,0,.35,.3,4.8); // Canvas furled for the low river bridges.
  // Spare sweep lies along the rail; underway crews use separate working oars.
  b.beam(WOOD,[-1.43,.84,-2],[-1.43,.84,2],.09);b.box(EDGE,-1.43,.84,1.7,.24,.08,.65);
  b.cylinder(IRON,0,.58,5,.06,1.3);b.box(TEAL,0,1.6,5,.65,.45,.03);
  b.finish(root);return root;
}

export function createMinoraHarbor(parent,colliders){
  const root=new THREE.Group();root.name='Minora / White Bridge harbor';parent.add(root);
  const b=createSceneryBuilder('White Bridge landing'),r=H.ramp;
  const rail=(id,a,c)=>{
    b.beam(EDGE,a,c,.13);const dx=c[0]-a[0],dz=c[2]-a[2];
    colliders.push({id:'harbor-'+id,kind:'bridge-rail',x:(a[0]+c[0])/2,z:(a[2]+c[2])/2,hx:Math.abs(dx)/2+.08,hz:Math.abs(dz)/2+.08,minY:Math.min(a[1],c[1])-1.1,maxY:Math.max(a[1],c[1])+.15});
  };
  function planks(x,z,w,len,height){
    const n=Math.ceil(len/.45),step=len/n;
    for(let i=0;i<n;i++){
      const a=z-len/2+i*step,c=a+step;
      b.quad(i%3?PLANK:'#a79370',[x+w/2,height(a),a],[x-w/2,height(a),a],[x-w/2,height(c),c],[x+w/2,height(c),c]);
    }
    for(const s of [-1,1])b.beam(WOOD,[x+s*w/2,height(z-len/2)-.15,z-len/2],[x+s*w/2,height(z+len/2)-.15,z+len/2],.3);
  }
  planks(H.x,H.z,H.width,H.length,()=>H.y);
  planks(r.x,(r.start+r.end)/2,r.width,r.end-r.start,z=>minoraHarborHeight(r.x,z));
  for(const s of [-1,1]){
    rail('ramp-'+s,[r.x+s*r.width/2,r.top+1,r.start],[r.x+s*r.width/2,r.bottom+1,r.end]);
    for(let z=r.start;z<=r.end;z+=3.4){const y=minoraHarborHeight(r.x,z);b.cylinder(WOOD,r.x+s*r.width/2,y-.4,z,.12,1.5);}
    for(const z of [156,162,168]){b.cylinder(WOOD,H.x+s*4.85,12,z,.21,6.4);b.cylinder(EDGE,H.x+s*4.85,18.2,z,.27,.12);}
  }
  rail('west',[H.x-5,H.y+1,156],[H.x-5,H.y+1,168]);
  rail('south',[H.x-5,H.y+1,168],[H.x+5,H.y+1,168]);
  for(const [a,c] of [[-5,-2.6],[2.6,5]])rail('north-'+a,[H.x+a,H.y+1,156],[H.x+c,H.y+1,156]);
  for(const [a,c] of [[156,159.5],[164.5,168]])rail('east-'+a,[H.x+5,H.y+1,a],[H.x+5,H.y+1,c]);
  // A little canopy and working cargo give this landing a purpose and scale.
  for(const x of [-2236,-2232])for(const z of [164,167])b.cylinder(WOOD,x,H.y,z,.09,2.7);
  b.sheet(TEAL,[-2236.5,19.8,163.6],[-2231.5,20.3,163.6],[-2231.5,20.3,167.4],[-2236.5,19.8,167.4]);
  for(const [x,z] of [[-2235.4,166],[-2234.2,166.3]]){
    b.block(WOOD,x,H.y,z,.85,.85,.85);b.box(EDGE,x,H.y+.85,z,.9,.06,.9);
    colliders.push({id:'harbor-cargo-'+x,kind:'building',x,z,hx:.45,hz:.45,minY:H.y,maxY:H.y+.9});
  }
  for(const z of [160,164])b.beam(CREAM,[-2227,17.65,z],[-2225.6,17.15,z],.045);
  // A carved oar on its post replaces a floating or UI-like sign.
  b.cylinder(WOOD,-2235.9,21.3,140.7,.09,2.3);b.beam(EDGE,[-2235.9,22,140.7],[-2235.9,23.7,140.7],.08);b.box(PLANK,-2235.9,23.55,140.7,.4,.65,.1);
  b.finish(root);const berth=LIZEEM_BERTHS.minora,mooredBoat=createPassengerBoat(root,berth);
  mooredBoat.userData.mooredPassengerPort='minora';mooredBoat.userData.passageActivity='moored';
  colliders.push({id:'minora-passenger-boat',kind:'boat',x:berth.x,z:berth.z,hx:1.75,hz:5.8,minY:berth.y-.65,maxY:berth.y+2.9});
  return root;
}
