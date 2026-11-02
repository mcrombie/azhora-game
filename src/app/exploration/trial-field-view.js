import * as THREE from 'three';

// Bounded encounter props: three webs, one ward, one seal, two delayed echoes.
export function createTrialFieldView(parent,world){
  const root=new THREE.Group();root.name='Trial field effects';parent.add(root);
  const resources=new Set(),make=(geometry,material)=>{resources.add(geometry);resources.add(material);return new THREE.Mesh(geometry,material);};
  const mat=(color,opacity=.75)=>new THREE.MeshBasicMaterial({color,transparent:true,opacity,side:THREE.DoubleSide,depthWrite:false});
  const silk=mat(0xdde6df,.8),violet=mat(0xba9bdf,.8),red=mat(0xb55b60,.68),pale=mat(0xa9dfe0,.5);
  function ring(parent,r,color,width=.04){const mesh=make(new THREE.RingGeometry(r-width,r,40),color);mesh.rotation.x=-Math.PI/2;parent.add(mesh);return mesh;}
  function web(){const group=new THREE.Group();group.name='Destructible web';for(const r of [.45,.95,1.5])ring(group,r,silk,.025);
    for(let i=0;i<8;i++){const line=make(new THREE.BoxGeometry(.025,.015,3),silk);line.rotation.y=i*Math.PI/8;group.add(line);}return group;}
  const webs=Array.from({length:3},web);
  const anchor=new THREE.Group();anchor.name='Ward anchor and boundary';ring(anchor,4.2,violet,.065);
  const rock=make(new THREE.CylinderGeometry(.24,.38,1.1,5),new THREE.MeshStandardMaterial({color:0x5c5869,roughness:.9,flatShading:true}));rock.position.y=.55;anchor.add(rock);
  for(let face=0;face<5;face++){
    const panel=new THREE.Group();panel.rotation.y=face*Math.PI*2/5;anchor.add(panel);
    for(let i=0;i<3;i++){const rune=make(new THREE.BoxGeometry(.026,.2,.035),violet);rune.position.set((i-1)*.08,.5+(i%2)*.15,.32);rune.rotation.z=(i-1)*.5;panel.add(rune);}
  }
  const tether=make(new THREE.BoxGeometry(.035,.025,1),violet);anchor.add(tether);
  const seal=new THREE.Group();seal.name='Nanvir blood seal';ring(seal,2.7,red,.06);ring(seal,2.45,red,.025);
  for(let i=0;i<6;i++){const stroke=make(new THREE.BoxGeometry(.045,.02,2.4),red);stroke.position.set(Math.sin(i*Math.PI/3)*1.25,0,Math.cos(i*Math.PI/3)*1.25);stroke.rotation.y=i*Math.PI/3+.5;seal.add(stroke);}
  const preview=new THREE.Group();preview.name='Incoming silk';ring(preview,1.5,pale,.06);
  const echoGeometries=new Map(),echoes=Array.from({length:2},()=>{
    const mesh=make(new THREE.RingGeometry(.2,1,40),mat(0xb9d9e7,.4)),edge=make(new THREE.RingGeometry(.94,1,40),mat(0x4f828d,.9));
    edge.position.z=.006;edge.name='Echo boundary';mesh.add(edge);mesh.rotation.x=-Math.PI/2;mesh.name='Spectral weapon echo';return mesh;
  });
  root.add(...webs,anchor,seal,preview,...echoes);
  function place(view,o){view.visible=!!o;if(o)view.position.set(o.x,world.heightAt(o.x,o.z)+.075,o.z);}
  return {draw(s,time){
    root.visible=!s.outcome;if(!root.visible)return;
    const objects=(s.trialObjects??[]).filter(o=>o.hp>0),silks=objects.filter(o=>o.kind==='web');
    webs.forEach((g,i)=>{place(g,silks[i]);if(silks[i])g.scale.setScalar(1);});
    const stone=objects.find(o=>o.kind==='anchor');place(anchor,stone);
    if(stone){const owner=s.guards.find(g=>g.id===stone.owner),dx=owner.x-stone.x,dz=owner.z-stone.z;tether.visible=owner.warded;tether.scale.z=Math.hypot(dx,dz);tether.position.set(dx/2,.025,dz/2);tether.rotation.y=Math.atan2(dx,dz);rock.rotation.y=.15;}
    place(seal,objects.find(o=>o.kind==='seal')??s.guards.find(g=>g.phase==='inscribe'));
    const spider=s.guards.find(g=>g.hp>0&&g.webTarget&&['windup','strike'].includes(g.phase));place(preview,spider?.webTarget);
    echoes.forEach((mesh,i)=>{const e=s.echoes?.[i];place(mesh,e);if(!e)return;
      const key=e.reach+':'+e.halfAngle;if(!echoGeometries.has(key)){
        const shape=[new THREE.RingGeometry(.2,e.reach,40,1,-e.halfAngle,e.halfAngle*2),new THREE.RingGeometry(e.reach-.065,e.reach,40,1,-e.halfAngle,e.halfAngle*2)];
        echoGeometries.set(key,shape);shape.forEach(g=>resources.add(g));
      }
      [mesh.geometry,mesh.children[0].geometry]=echoGeometries.get(key);mesh.rotation.z=e.heading-Math.PI/2;mesh.material.opacity=e.remaining>0?.2+.33*(1-e.remaining/.85):.85;
    });
  },dispose(){root.removeFromParent();for(const r of resources)r.dispose();}};
}
