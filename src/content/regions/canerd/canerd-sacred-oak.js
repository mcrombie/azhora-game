import * as THREE from 'three';
import { createSceneryBuilder } from '../../../world/scenery/scenery-builder.js';
import { registerWorldTree, getTreeRegistry } from '../../../world/scenery/tree-registry.js';
import { CANERD_GARDEN, CANERD } from './canerd-world.js';

const BARK='#796b51', PALE='#9b8a68', DARK='#514632', MOSS='#596a43', TAU=Math.PI*2;

/** A living English oak: the familiar spreading crown and deeply furrowed bark
 * remain readable around its fantastical face. The face belongs only to this
 * authored individual; ordinary English oaks keep their shared species model. */
export function createCanerdSacredOak({parent,heightAt,colliders}) {
  const tree=CANERD_GARDEN.oak,y=heightAt(tree.x,tree.z),root=new THREE.Group();
  root.name='Canerd sacred English oak';root.position.set(tree.x,y-.045,tree.z);root.rotation.y=tree.yaw;parent.add(root);
  const b=createSceneryBuilder('Canerd sacred oak - ancient living limbs');
  const point=new THREE.Vector3(),matrix=new THREE.Matrix4(),quaternion=new THREE.Quaternion();
  function solid(source,tint,position,scale,rotation=[0,0,0]) {
    const geometry=source.index?source.toNonIndexed():source;
    matrix.compose(new THREE.Vector3(...position),quaternion.setFromEuler(new THREE.Euler(...rotation)),new THREE.Vector3(...scale));
    const vertices=geometry.attributes.position;
    for(let i=0;i<vertices.count;i+=3) {
      const triangle=[];
      for(let j=0;j<3;j++){point.fromBufferAttribute(vertices,i+j).applyMatrix4(matrix);triangle.push([point.x,point.y,point.z]);}
      b.triangle(tint,...triangle);
    }
    if(geometry!==source)geometry.dispose();
  }
  function limb(points,radii,{sides=9,tint=BARK,grooved=false}={}) {
    const centres=points.map(p=>new THREE.Vector3(...p)),rings=[];
    for(let j=0;j<centres.length;j++) {
      const tangent=centres[Math.min(j+1,centres.length-1)].clone().sub(centres[Math.max(0,j-1)]).normalize();
      const across=new THREE.Vector3().crossVectors(tangent,Math.abs(tangent.z)>.9?new THREE.Vector3(1,0,0):new THREE.Vector3(0,0,1)).normalize();
      const around=new THREE.Vector3().crossVectors(tangent,across).normalize();
      rings.push(Array.from({length:sides},(_,i)=>{
        const a=i*TAU/sides,r=radii[j]*(1+.055*Math.sin(i*2.1+j*.8));
        const p=centres[j].clone().addScaledVector(across,Math.cos(a)*r).addScaledVector(around,Math.sin(a)*r);
        return[p.x,p.y,p.z];
      }));
    }
    for(let j=1;j<rings.length;j++)for(let i=0;i<sides;i++) {
      const next=(i+1)%sides;
      b.quad(grooved&&i%3===1?DARK:i%4===0?PALE:tint,rings[j-1][i],rings[j-1][next],rings[j][next],rings[j][i]);
    }
  }
  limb([[0,-.18,0],[.10,1.2,0],[.18,3.6,.02],[-.05,6.4,.10],[.35,9.2,-.12],[.05,12.5,.12],[-.35,15.0,0],[.10,18.7,-.15],[.10,21.3,0]],
    [2.35,2.03,1.85,1.63,1.40,.88,.48,.24,.065],{sides:15,grooved:true});
  // Broad roots belong to the tree's mesh. Keep its western conversational
  // approach (local +Z) free of tall buttress toes.
  for(let i=0;i<8;i++) {
    const a=i*TAU/8+.35;if(Math.cos(a)>.83)continue;
    const x=Math.sin(a),z=Math.cos(a),length=3.1+(i%3)*.35;
    limb([[x*.7,1.4,z*.7],[x*1.7,.55,z*1.7],[x*length,.02,z*length],[x*(length+.5),-.12,z*(length+.5)]],
      [.57,.42,.17,.025],{sides:7,tint:i%2?BARK:DARK});
    b.rock(MOSS,x*2.3,.16,z*2.3,.65,.12,.46,a);
  }
  const leaf=new THREE.IcosahedronGeometry(1,1),knot=new THREE.IcosahedronGeometry(1,1);
  for(let i=0;i<8;i++) {
    const a=i*TAU/8+.24,x=Math.sin(a),z=Math.cos(a),h=8.0+(i%3),reach=5.7+(i%2)*.65;
    const outerY=17.5+(i%3),innerY=20.2+(i%2)*.7;
    // Mature oak boughs spread almost horizontally before rising. Each final
    // taper enters its own foliage volume instead of ending beneath the crown.
    limb([[.1,h,0],[x*2.0,h+.55,z*2.0],[x*3.5,h+2.4,z*3.5],[x*4.9,outerY-3.6,z*4.9],[x*reach,outerY-1.4,z*reach]],
      [1.06,.80,.50,.24,.10],{sides:9,grooved:true});
    const fork=a+.15;
    limb([[x*4.9,outerY-3.6,z*4.9],[Math.sin(fork)*4.1,innerY-3.8,Math.cos(fork)*4.1],[x*3.4,innerY-1.4,z*3.4]],
      [.43,.27,.06],{sides:7});
    solid(leaf,['#527342','#63834b','#6d8950','#47683d'][i%4],[x*reach,outerY,z*reach],
      [3.2+(i%2)*.3,2.20+(i%3)*.14,2.95],[.10*(i%2),a,.10]);
    solid(leaf,i%2?'#718d54':'#5d7e48',[x*3.4,innerY,z*3.4],[3.25,2.65,3.15],[0,a,.08]);
  }
  solid(leaf,'#6b8950',[.1,21.35,0],[3.1,2.65,3.0]);
  // Bark shelves, burrs and a small old hollow make a veteran trunk rather than
  // an enlarged sapling. Marks are shallow, with no painted or glowing symbols.
  for(let i=0;i<15;i++) {
    const a=i*2.39996,level=.8+(i%5)*1.30;
    if(Math.cos(a)>.5&&level>2&&level<5)continue;
    solid(knot,i%3?BARK:PALE,[Math.sin(a)*1.82,level,Math.cos(a)*1.82],[.26,.52,.18],[0,a,.12]);
  }
  for(const side of [-1,1]) {
    limb([[side*.22,4.48,1.63],[side*.58,4.61,1.76],[side*1.02,4.39,1.58]], [.16,.21,.12],{sides:7,tint:PALE});
    limb([[side*.38,3.14,1.76],[side*.91,3.04,1.59],[side*1.23,3.38,1.40]], [.075,.10,.04],{sides:6,tint:DARK});
  }
  solid(knot,BARK,[.08,3.69,1.85],[.30,.66,.35]);
  solid(knot,PALE,[.10,3.41,2.03],[.35,.22,.20]);
  leaf.dispose();knot.dispose();
  const body=b.finish(root);body.userData.sacredOakBody=true;
  const faceMeshes=[],ownedGeometry=[body.geometry],colour=new THREE.Color();
  function faceMesh(geometry,tint,position,scale) {
    colour.set(tint);const count=geometry.attributes.position.count,colors=new Float32Array(count*3);
    for(let i=0;i<count;i++)colors.set([colour.r,colour.g,colour.b],i*3);
    geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.computeBoundingSphere();
    const mesh=new THREE.Mesh(geometry,body.material);mesh.position.set(...position);mesh.scale.set(...scale);mesh.castShadow=true;mesh.receiveShadow=true;
    root.add(mesh);faceMeshes.push(mesh);ownedGeometry.push(geometry);return mesh;
  }
  const eyes=[-1,1].map(side=>{
    const socket=faceMesh(new THREE.SphereGeometry(1,12,7),'#302b1e',[side*.67,4.12,1.72],[.47,.018,.12]);
    const iris=faceMesh(new THREE.SphereGeometry(1,10,6),'#b29a56',[side*.67,4.12,1.85],[.18,.18,.065]);
    const pupil=faceMesh(new THREE.SphereGeometry(1,8,5),'#292b1b',[side*.67,4.12,1.91],[.068,.13,.026]);
    const lid=faceMesh(new THREE.TorusGeometry(.41,.105,5,12,Math.PI),PALE,[side*.67,4.12,1.76],[1,.18,1]);
    return{socket,iris,pupil,lid};
  });
  const mouth=faceMesh(new THREE.SphereGeometry(1,12,6),'#3a3224',[.04,2.84,1.81],[.55,.022,.10]);
  let awake=false,open=0,speaking=false,clock=0,disposed=false;
  function pose() {
    for(const eye of eyes) {
      eye.socket.scale.y=.018+open*.26;eye.iris.visible=open>.02;eye.pupil.visible=open>.02;
      eye.iris.scale.y=.18*open;eye.pupil.scale.y=.13*open;
      eye.lid.position.y=4.12+open*.25;eye.lid.scale.y=.18+open*.34;
    }
    mouth.scale.y=.022+(speaking?(.035+.038*(.5+.5*Math.sin(clock*5.3)))*open:open*.018);
  }
  pose();
  const collider={x:tree.x,z:tree.z,r:2.45,minY:y-.1,maxY:y+tree.height,kind:'canerd-sacred-oak'};
  colliders.push(collider);
  const descriptor=registerWorldTree(colliders,{id:tree.id,species:tree.species,name:'Canerd sacred oak',
    x:tree.x,y,z:tree.z,height:tree.height,radius:collider.r,region:CANERD.region,locationName:'Canerd sacred garden',
    habitat:'Protected castle garden',harvestable:false,reason:'The living oak is sacred to this court. Its branches are not timber.'},
    [body,...faceMeshes].map(mesh=>({mesh})),collider);
  const state=()=>({id:tree.id,species:tree.species,awake,open,speaking,disposed,
    eyes:eyes.map(eye=>({socketScaleY:eye.socket.scale.y,irisVisible:eye.iris.visible,pupilVisible:eye.pupil.visible,lidY:eye.lid.position.y})),
    mouthScaleY:mouth.scale.y});
  return {root,body,eyes,mouth,tree:descriptor,collider,metrics:{meshes:1+faceMeshes.length,vertices:ownedGeometry.reduce((n,g)=>n+g.attributes.position.count,0)},
    setAwake(value){awake=!!value;},
    update(dt,options={}) {
      if(disposed||!Number.isFinite(dt)||dt<=0)return;
      for(let owner=root;owner;owner=owner.parent)if(!owner.visible)return;
      if(options.observer&&Math.hypot(options.observer.x-tree.x,options.observer.z-tree.z)>160)return;
      const step=Math.min(dt,.1),wasSpeaking=speaking;speaking=!!options.speaking&&awake;clock+=step;
      const next=awake?Math.min(1,open+step/1.3):Math.max(0,open-step/1.8);
      if(next===open&&!speaking&&!wasSpeaking)return;
      open=next;pose();
    },state,
    dispose(){if(disposed)return;disposed=true;getTreeRegistry(colliders).remove(tree.id);root.removeFromParent();for(const geometry of ownedGeometry)geometry.dispose();},
  };
}
