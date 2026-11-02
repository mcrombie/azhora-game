import * as THREE from 'three';
import {batchRigidParts} from '../../content/characters/characters.js';

// Celder's horse-lords: mail, an open segmented helm, an oval shield and a
// winged lance. Fantasy rather than a reconstruction of a particular king.
// Shape references: Met strap helmet 42.50.1 (an earlier, 6th–7th c. example)
// https://www.metmuseum.org/art/collection/search/24685
// and the Royal Military Museum's Carolingian sword, inventory 12420:
// https://bruxellesmusee.be/en/carolingian-sword
export function createCelderKnight({envoy=false}={}){
  const group=new THREE.Group();group.name=envoy?'Celder knight / peace envoy':'Celder knight';
  Object.assign(group.userData,{creature:'human',culture:'celder',armour:'mail',envoy});
  const geometries=new Set(),materials=new Set(),pivots=[];
  const material=(color,metal=false)=>{const m=new THREE.MeshStandardMaterial({color,roughness:metal ? .47 : .9,metalness:metal ? .58 : 0,flatShading:true});materials.add(m);return m;};
  const wool=material(envoy?0x203a58:0x31475e),lining=material(0xd8c9a1),gold=material(0xc8a25b,true),goldShade=material(0x8d713d,true);
  const iron=material(0x535c61,true),bright=material(0x939c9b,true),leather=material(0x493a2c),skin=material(0xc69b78),faceShade=material(0xa57557);
  const hair=material(0x4a3428),dark=material(0x292a2b),eye=material(0xdad2bb),iris=material(0x3e5359);
  function joint(parent,name,x=0,y=0,z=0){const j=new THREE.Group();j.name=name;j.position.set(x,y,z);parent.add(j);pivots.push(j);return j;}
  function part(parent,name,geometry,mat,at=[0,0,0],scale=[1,1,1]){
    geometries.add(geometry);const mark=new THREE.Group();mark.name=name;parent.add(mark);
    const mesh=new THREE.Mesh(geometry,mat);mesh.position.set(...at);mesh.scale.set(...scale);mesh.castShadow=true;mesh.receiveShadow=true;mark.add(mesh);return mesh;
  }
  const box=(p,n,m,at,size)=>part(p,n,new THREE.BoxGeometry(...size),m,at);
  const ellipsoid=(p,n,m,at,size)=>part(p,n,new THREE.SphereGeometry(1,10,7),m,at,size);
  const cylinder=(p,n,m,at,top,bottom,height,sides=10)=>part(p,n,new THREE.CylinderGeometry(top,bottom,height,sides),m,at);
  function rod(p,n,m,a,b,r=.015){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);
    const mesh=cylinder(p,n,m,start.clone().add(end).multiplyScalar(.5).toArray(),r,r,delta.length(),6);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return mesh;}
  function panel(p,n,m,rows){
    const vertices=[],indices=[];for(const row of rows)for(const v of row)vertices.push(...v);
    for(let y=0;y<rows.length-1;y++)for(let x=0;x<rows[0].length-1;x++){const a=y*rows[0].length+x,b=a+1,c=a+rows[0].length,d=c+1;indices.push(a,b,c,b,d,c);}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();
    // Give the drapery real thickness, with a second inward-facing panel.
    const outer=part(p,n,geo,m),inner=geo.clone(),positions=inner.attributes.position;for(let i=0;i<positions.count;i++)positions.setZ(i,positions.getZ(i)+.012);
    inner.setIndex(indices.flatMap((_,i)=>i%3===0?[indices[i],indices[i+2],indices[i+1]]:[]));inner.computeVertexNormals();part(p,n+' / lining',inner,lining);return outer;
  }
  function rings(p,name,rows,cols,width,height,z,centerY){
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
      const x=(col-(cols-1)/2)*width/cols+(row%2?.008:-.008),y=centerY+(row-(rows-1)/2)*height/rows;
      const ring=part(p,name,new THREE.TorusGeometry(.014,.0035,3,6),bright,[x,y,z]);ring.rotation.z=row%2?.3:-.3;
    }
  }
  const body=joint(group,'Celder body'),chest=joint(body,'Chest',0,1.22,0),head=joint(chest,'Head',0,.45,.012);
  cylinder(chest,'Mail hauberk',iron,[0,0,0],.265,.205,.48).scale.z=.7;
  rings(chest,'Interlinked chest mail',8,10,.4,.36,.174,0);
  const skirt=cylinder(body,'Split mail skirt',iron,[0,.805,0],.21,.265,.36);skirt.scale.z=.69;
  rings(body,'Interlinked skirt mail',5,11,.46,.26,.186,.79);
  // The riding split is a dark narrow recess, with overlapping mail on either side.
  box(body,'Riding split',dark,[0,.664,.187],[.024,.085,.008]);
  cylinder(chest,'Wool neck',wool,[0,.282,0],.09,.11,.12);
  cylinder(chest,'Mail collar',iron,[0,.235,0],.12,.17,.105).scale.z=.83;
  box(body,'Broad leather sword belt',leather,[0,1.015,.014],[.445,.071,.312]);
  box(body,'Gilt belt buckle',gold,[.042,1.016,.179],[.071,.062,.022]);
  box(body,'Buckle inset',dark,[.042,1.016,.192],[.043,.036,.006]);
  box(body,'Hanging belt end',leather,[.105,.906,.18],[.039,.19,.021]);
  box(body,'Belt tip',gold,[.105,.814,.193],[.045,.035,.012]);
  for(const x of [-.16,-.09,.16])box(body,'Gilt belt mount',gold,[x,1.015,.177],[.019,.039,.014]);
  // A complete uncovered face remains readable below the brow and nasal.
  ellipsoid(head,'Face',skin,[0,0,0],[.128,.163,.116]);
  ellipsoid(head,'Jaw',skin,[0,-.085,.015],[.103,.084,.092]);
  for(const side of [-1,1]){
    ellipsoid(head,'Ear',faceShade,[side*.126,-.017,-.005],[.026,.041,.024]);
    ellipsoid(head,'Cheek plane',skin,[side*.075,-.026,.082],[.048,.045,.03]);
    ellipsoid(head,'Eye white',eye,[side*.049,.025,.107],[.028,.012,.008]);
    ellipsoid(head,'Eye iris',iris,[side*.048,.025,.114],[.011,.011,.004]);
    ellipsoid(head,'Eye pupil',dark,[side*.048,.025,.117],[.0045,.007,.002]);
    const brow=box(head,'Steady brow',hair,[side*.049,.046,.11],[.062,.014,.012]);brow.rotation.z=side*.12;
    ellipsoid(head,'Moustache',hair,[side*.029,-.06,.111],[.036,.018,.012]);
  }
  ellipsoid(head,'Nose bridge',skin,[0,.002,.117],[.024,.047,.025]);
  ellipsoid(head,'Nose tip',skin,[0,-.025,.137],[.03,.019,.018]);
  box(head,'Mouth',faceShade,[0,-.084,.106],[.055,.007,.006]);
  ellipsoid(head,'Short beard',hair,[0,-.118,.039],[.09,.052,.076]);
  const helm=joint(head,'Segmented conical helm',0,.097,0);
  part(helm,'Forged helmet shell',new THREE.LatheGeometry([new THREE.Vector2(.137,0),new THREE.Vector2(.148,.055),new THREE.Vector2(.124,.139),new THREE.Vector2(.073,.215),new THREE.Vector2(0,.25)],12),iron);
  cylinder(helm,'Embossed gold brow band',gold,[0,.012,0],.146,.146,.034,12);
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3;
    for(const [r1,y1,r2,y2] of [[.149,.028,.126,.14],[.126,.14,.072,.215],[.072,.215,0,.253]])
      rod(helm,'Radiating helmet strap',gold,[Math.sin(a)*r1,y1,Math.cos(a)*r1],[Math.sin(a)*r2,y2,Math.cos(a)*r2],.012);
    ellipsoid(helm,'Helmet rivet',bright,[Math.sin(a)*.15,.015,Math.cos(a)*.15],[.008,.008,.008]);
  }
  // A narrow nasal, not a full visor: eyes, cheekbones and mouth stay visible.
  box(helm,'Nasal guard',gold,[0,-.049,.139],[.019,.121,.013]);
  for(const side of [-1,1]){
    const cheek=box(helm,'Hinged cheek guard',iron,[side*.128,-.076,-.012],[.027,.152,.082]);cheek.rotation.z=side*.16;
    rod(helm,'Cheek guard rim',gold,[side*.139,-.012,.037],[side*.108,-.153,.037],.008);
  }
  part(head,'Mail neck curtain',new THREE.CylinderGeometry(.135,.16,.16,12,1,true,Math.PI/2,Math.PI),iron,[0,-.075,-.023]);
  const cloak=joint(chest,'Heavy wool cloak',0,.195,-.123);
  panel(cloak,'Blue mantle with deep folds',wool,[
    [[-.3,0,-.005],[-.15,.035,-.05],[0,.025,-.063],[.15,.035,-.05],[.3,0,-.005]],
    [[-.35,-.35,-.10],[-.18,-.35,-.18],[0,-.35,-.115],[.18,-.35,-.18],[.35,-.35,-.10]],
    [[-.40,-.74,-.15],[-.20,-.78,-.265],[0,-.73,-.19],[.20,-.78,-.265],[.40,-.74,-.15]],
    [[-.42,-1.02,-.18],[-.22,-1.05,-.285],[0,-1.01,-.21],[.22,-1.05,-.285],[.42,-1.02,-.18]],
  ]);
  for(const side of [-1,1]){
    rod(cloak,'Woven mantle border',goldShade,[side*.3,0,0],[side*.35,-.35,-.098],.012);
    rod(cloak,'Woven mantle border',goldShade,[side*.35,-.35,-.098],[side*.42,-1.02,-.175],.013);
    ellipsoid(chest,'Ivory shoulder fold',lining,[side*.235,.203,-.018],[.105,.065,.157]);
    const brooch=cylinder(chest,'Gold mantle brooch',gold,[side*.165,.19,.162],.034,.034,.016,10);brooch.rotation.x=Math.PI/2;
  }
  rod(chest,'Mantle clasp chain',gold,[-.165,.182,.172],[0,.13,.186],.007);rod(chest,'Mantle clasp chain',gold,[0,.13,.186],[.165,.182,.172],.007);
  const hips=[],knees=[],arms=[],elbows=[];
  for(const side of [-1,1]){
    const name=side<0?'Right':'Left',hip=joint(body,name+' Hip',side*.125,.91,0),knee=joint(hip,name+' Knee',0,-.365,0);
    cylinder(hip,'Wool hose',wool,[0,-.17,0],.088,.07,.34).scale.z=.94;
    cylinder(knee,'Bound leather boot',leather,[0,-.195,.005],.076,.061,.39);
    for(let j=0;j<3;j++)cylinder(knee,'Boot binding',goldShade,[0,-.09-j*.08,.006],.077-j*.004,.077-j*.004,.018,8);
    ellipsoid(knee,'Leather boot toe',leather,[0,-.455,.054],[.078,.069,.154]);
    const arm=joint(chest,name+' Shoulder',side*.29,.17,0),elbow=joint(arm,name+' Elbow',0,-.275,0);
    cylinder(arm,'Mail sleeve',iron,[0,-.129,0],.098,.076,.277).scale.z=.92;
    rings(arm,'Sleeve mail',5,4,.12,.21,.083,-.13);
    cylinder(elbow,'Wool forearm',wool,[0,-.12,0],.07,.054,.235);
    cylinder(elbow,'Leather wrist wrap',leather,[0,-.228,0],.058,.058,.051);
    ellipsoid(elbow,'Gloved hand',leather,[0,-.283,.006],[.054,.067,.044]);
    hips.push(hip);knees.push(knee);arms.push(arm);elbows.push(elbow);
  }
  const shield=joint(elbows[1],'Celder oval shield',.018,-.14,.105);
  const outline=new THREE.Shape();outline.absellipse(0,0,.278,.366,0,Math.PI*2,false);
  part(shield,'Blue oval shield board',new THREE.ExtrudeGeometry(outline,{depth:.032,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.008,bevelThickness:.006,curveSegments:16}),wool,[0,0,0]);
  part(shield,'Oval shield bronze rim',new THREE.TorusGeometry(1,.032,4,24),gold,[0,0,.034],[.284,.375,.36]);
  ellipsoid(shield,'Iron shield boss',iron,[0,0,.044],[.083,.083,.057]);
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4,r=.144;
    const ray=box(shield,'Eight-pointed Celder sun',gold,[Math.sin(a)*r,Math.cos(a)*r,.044],[.018,.077,.009]);ray.rotation.z=-a;
    ellipsoid(shield,'Shield rim stud',gold,[Math.sin(a)*.265,Math.cos(a)*.352,.046],[.01,.01,.007]);
  }
  const grip=joint(elbows[0],'Weapon hand',0,-.283,.026),spear=joint(grip,'Celder winged spear');
  cylinder(spear,'Ash lance shaft',leather,[0,.31,0],.016,.021,2.26,8);
  cylinder(spear,'Lance iron shoe',iron,[0,-.797,0],.022,.011,.09,8);
  cylinder(spear,'Winged lance socket',gold,[0,1.405,0],.028,.025,.14,8);
  rod(spear,'Spear wings',bright,[-.1,1.40,0],[.1,1.40,0],.012);
  const blade=new THREE.Shape();blade.moveTo(0,0);blade.lineTo(-.055,.13);blade.lineTo(0,.38);blade.lineTo(.055,.13);blade.closePath();
  part(spear,'Leaf-shaped spearhead',new THREE.ExtrudeGeometry(blade,{depth:.014,bevelEnabled:false}),bright,[0,1.43,-.007]);
  rod(spear,'Spearhead ridge',iron,[0,1.44,.012],[0,1.77,.012],.008);
  const sword=joint(body,'Carolingian sword in scabbard',-.242,1.005,-.005);sword.rotation.z=-.15;
  box(sword,'Leather sword sheath',leather,[0,-.325,0],[.063,.65,.035]);
  box(sword,'Gold scabbard chape',gold,[0,-.64,0],[.068,.07,.043]);
  box(sword,'Short sword crossguard',gold,[0,.015,0],[.175,.035,.045]);
  cylinder(sword,'Leather sword grip',dark,[0,.102,0],.022,.025,.145,8);
  for(const x of [-.032,0,.032])ellipsoid(sword,'Lobed sword pommel',gold,[x,.186,0],[.026,x===0?.035:.026,.026]);
  batchRigidParts(group,pivots);
  // Own the finishes as well as the geometry: this actor can be disposed by a
  // chapter without disposing the shared character batch-material cache.
  const retained=new Set(),clones=new Map();group.traverse(mesh=>{if(!mesh.isMesh)return;retained.add(mesh.geometry);
    if(!materials.has(mesh.material)){if(!clones.has(mesh.material))clones.set(mesh.material,mesh.material.clone());mesh.material=clones.get(mesh.material);}});
  for(const geometry of geometries)if(!retained.has(geometry))geometry.dispose();
  const used=new Set();group.traverse(o=>{if(o.isMesh)used.add(o.material);});for(const mat of materials)if(!used.has(mat))mat.dispose();
  let armed=true,shieldVisible=true;
  function animate(time,speed=0,grounded=true,pose={}){
    const pace=Math.min(1,Math.max(0,speed)/3.4),cycle=time*(speed>3?8:5.7),walk=Math.sin(cycle)*.42*pace;
    body.position.y=grounded?Math.abs(Math.sin(cycle))*.018*pace:0;chest.rotation.z=Math.sin(time*1.3)*.008*(1-pace);
    head.rotation.y=Math.sin(time*.43)*.07*(1-pace);head.rotation.x=Math.sin(time*.71)*.012;
    hips[0].rotation.x=walk;hips[1].rotation.x=-walk;knees[0].rotation.x=Math.max(0,-Math.sin(cycle))*.48*pace;knees[1].rotation.x=Math.max(0,Math.sin(cycle))*.48*pace;
    arms[0].rotation.set(-.04+walk*.15,0,-.13);arms[1].rotation.set(-.12-walk*.15,0,.10);
    elbows[0].rotation.x=-.18;elbows[1].rotation.x=-.22;
    cloak.rotation.x=.04+Math.sin(time*1.2)*.018+pace*.07;cloak.rotation.z=Math.sin(cycle)*pace*.014;
    spear.visible=armed&&pose.armed!==false;shield.visible=shieldVisible;
  }
  const actor={group,animate,setArmed(value){armed=!!value;},setShield(value){shieldVisible=!!value;},
    dispose(){group.removeFromParent();const gs=new Set(),ms=new Set();group.traverse(o=>{if(o.isMesh){gs.add(o.geometry);ms.add(o.material);}});for(const g of gs)g.dispose();for(const m of ms)m.dispose();}};
  animate(0);return actor;
}
