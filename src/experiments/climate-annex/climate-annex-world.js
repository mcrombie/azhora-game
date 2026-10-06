import * as THREE from 'three';

/** One temporary annex, in metres. Every local resource is owned by this scene. */
export function buildClimateAnnex(scene){
  const root=new THREE.Group();root.name='climate-annex';scene.add(root);
  const colliders=[],solids=[],roofs=[],frontCutaway=[],ownedMaterials=new Set(),ownedGeometry=new Set(),textures=new Set();
  const mat=(color,other={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.85,flatShading:true,...other});ownedMaterials.add(m);return m;};
  const stone=mat(0x696e68),wood=mat(0x53473b),lime=mat(0xa7a68e),brass=mat(0xa07b45,{metalness:.55}),felt=mat(0x393e35),tile=mat(0x81523c),ice=mat(0xb8e8ec,{roughness:.3}),green=mat(0x61817b),water=mat(0x527a79,{metalness:.3,roughness:.2}),dark=mat(0x242e2c),paper=mat(0xddd0a5);
  function mesh(geometry,material,x,y,z,parent=root){ownedGeometry.add(geometry);const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  function box(x,y,z,w,h,d,m=stone,{solid=false,parent=root}={}){
    const o=mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z,parent);
    if(solid){colliders.push({x,z,hx:w/2,hz:d/2,minY:y-h/2,maxY:y+h/2});solids.push(o);}return o;
  }
  function pipe(a,b,r,m=brass,parent=root){const v=new THREE.Vector3(...b).sub(new THREE.Vector3(...a)),o=mesh(new THREE.CylinderGeometry(r,r,v.length(),8),m,...a,parent);o.position.addScaledVector(v,.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return o;}
  function label(text,x,y,z,w=3){const c=document.createElement('canvas');c.width=768;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#283d37';ctx.fillRect(0,0,768,128);ctx.strokeStyle='#c4a368';ctx.lineWidth=6;ctx.strokeRect(8,8,752,112);ctx.fillStyle='#f2e0b4';ctx.font='36px Georgia';ctx.textAlign='center';ctx.fillText(text,384,78);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;textures.add(t);const m=new THREE.MeshBasicMaterial({map:t,toneMapped:false});ownedMaterials.add(m);return mesh(new THREE.PlaneGeometry(w,w/6),m,x,y,z);}
  box(0,.7,0,64,.6,64,mat(0x7d8968));box(0,1,13,5,.035,27,mat(0xb2a582));
  // A deliberately interrupted road edge: the annex sits on stone shoes, not a new atlas town.
  const slate=mat(0x495d5b),mortar=mat(0x73796b),lining=mat(0x544b3c),wetStone=mat(0x3d5553,{roughness:.35});
  box(0,1,-1.5,22,.08,15,mortar);
  // Broad worn flags and a dry central route break the pale exhibition-floor effect.
  for(let row=0;row<7;row++)for(let col=0;col<10;col++){
    const x=-9.8+col*2.17,z=-7.8+row*2.08;
    box(x,1.045,z,2.12,.035,2.02,(row+col*3)%5===0?stone:mortar);
  }
  box(.1,1.074,2.35,2.4,.025,6.5,mat(0x797b61));
  for(const x of [-1.14,1.34])box(x,1.088,2.35,.07,.02,6.5,wood);
  for(const x of [-10.5,10.5])box(x,3.5,-1.5,.65,5,15,lime,{solid:true});
  box(0,3.5,-9,22,5,.65,lime,{solid:true});
  for(const x of [-7,7])frontCutaway.push(box(x,3.2,6,8,4.4,.65,lime,{solid:true}));
  frontCutaway.push(box(0,5.4,6,6,.8,.8,wood,{solid:true}));
  for(const x of [-7,7]){
    frontCutaway.push(box(x,2.9,6.36,2.8,1.3,.12,green));
    for(let i=0;i<6;i++)frontCutaway.push(box(x-1.25+i*.5,2.9,6.47,.13,1.45,.13,wood));
    frontCutaway.push(box(x,1.35,6.36,7.7,.5,.24,stone));
    for(const dx of [-3.4,3.4])frontCutaway.push(box(x+dx,3,6.4,.38,4,.3,stone));
  }
  // Open, visibly thick entrance leaves; doors form insulating baffles beside the threshold.
  for(const x of [-2.9,2.9]){box(x,2.8,5.3,.45,3.6,2,wood,{solid:true});box(x,2.8,5.3,.53,3.15,1.6,felt);}
  frontCutaway.push(label('A WAITING ROOM FOR CLIMATES',0,4.9,6.44,7));
  frontCutaway.push(label('RECEIVING ANNEX',0,6.2,6.5,4));
  for(const x of [-7,7])for(const z of [-8,5])box(x,1.25,z,2,.5,2,stone);
  // Three different roof volumes follow the accommodations underneath.
  for(const [x,z,w,d,h] of [[-5.3,-2.8,11,12,2.5],[5.3,-5.2,11,8,1.5],[6,2.1,10,8,2.1]]){
    const r=mesh(new THREE.ConeGeometry(1,1,4),mat(x<0?0x5b5147:0x537574),x,6.3,z);r.scale.set(w*.72,h,d*.72);r.rotation.y=Math.PI/4;roofs.push(r);
  }
  box(-8,7.1,-6,1.1,4,1.1,stone);box(-8,9.15,-6,1.7,.35,1.7,wood);
  pipe([7,5,2],[7,8.6,2],.35);pipe([7,8.6,2],[8.3,8.6,2],.35);
  box(7,8.8,2,1.6,.15,1.5,brass);
  // Thick, low-lined hot pocket. The service screen seals between two fixed jambs.
  box(-5.5,1.08,-5.5,9,.09,6.3,tile);
  box(-5.15,2.2,-8.53,9.7,2.4,.32,tile);
  box(-6.3,4.03,-8.3,7,.88,.42,felt);
  box(-9.64,2.73,-5.55,.7,3.4,6.1,tile,{solid:true});
  box(-6.35,4.7,-6.82,7.15,.38,3.3,lining); // permanent low canopy: real shelter remains in cutaway
  box(-6.35,4.43,-5.15,7.2,.37,.26,wood);
  for(const x of [-9.72,-3.08])box(x,3.0,-5.2,.38,3.7,.4,wood,{solid:true});
  for(const x of [-9.27,-3.53])box(x,3.66,-5.22,.64,1.34,.12,felt);
  box(-9,2.3,-6.3,1.5,2.6,2.3,tile,{solid:true});
  const glow=mat(0xef8231,{emissive:0xd05e17,emissiveIntensity:.8});
  box(-8.21,2,-6.3,.04,1,1.3,glow);
  for(let z=-6.8;z<-5.8;z+=.2)box(-8.16,2,z,.06,1,.055,dark);
  pipe([-9,3.6,-6.3],[-9,5.8,-6.3],.25,dark);
  box(-6.1,1.3,-6.5,3,.6,1.2,wood,{solid:true});
  box(-6.1,1.63,-6.5,2.8,.08,1.07,felt);
  label('WARM RECEIVING',-6.1,3.9,-8.03,3);
  box(0,2.65,-7.05,.65,3.3,3.35,lining,{solid:true});
  for(const z of [-5.32,-2.3]){
    box(0,2.62,z,.72,3.24,.3,wood,{solid:true});
    box(.01,2.62,z,.76,3,.11,felt);
  }
  // Narrow rails, visible sockets and rollers explain the panel's correct position.
  box(-1.25,4.4,-3.8,3.6,.13,3.5,wood);
  for(const z of [-5.15,-2.42])box(-1.2,1.15,z,3.9,.08,.12,brass);
  for(const z of [-5.15,-2.42])box(0,1.18,z,.28,.09,.23,dark);
  const partition=new THREE.Group();root.add(partition);
  box(0,2.65,-3.8,.42,3.1,2.74,wood,{parent:partition});
  box(0,2.65,-3.8,.48,2.85,2.45,felt,{parent:partition});
  for(const z of [-5.1,-2.5])box(0,2.65,z,.57,3.1,.12,brass,{parent:partition});
  for(const z of [-5,-2.6]){const roller=mesh(new THREE.CylinderGeometry(.13,.13,.54,8),dark,0,1.17,z,partition);roller.rotation.z=Math.PI/2;}
  pipe([.36,2,-2.33],[.36,2.85,-2.33],.065,brass,partition);
  const panelCollider={x:-2.4,z:-3.8,hx:.3,hz:1.37,minY:1,maxY:4.2};colliders.push(panelCollider);
  partition.position.x=-2.4;partition.traverse(o=>{if(o.isMesh)solids.push(o);});
  // Deep cold seat, tucked into dark masonry with a projecting shaded brow.
  box(6,2.8,-8.49,7.25,3.6,.36,slate);
  box(6,1.11,-6.7,7,.16,3.8,slate);
  for(const x of [2.75,9.23])box(x,2.63,-7.18,.7,3.25,2.85,slate,{solid:true});
  box(6,4.33,-7.25,7.4,.48,3.15,stone);
  box(6,4.08,-5.65,7.4,.28,.32,slate);
  // Angular shoulders make the recess read as built masonry, not a labelled plinth.
  for(const x of [3.45,8.55]){const shoulder=box(x,3.72,-7.1,1,.7,2.45,stone);shoulder.rotation.z=x<6?-.55:.55;}
  box(6,1.5,-7.3,5,1,1.4,stone,{solid:true});
  box(6,2.07,-7.3,5.1,.12,1.5,ice);
  label('FROST / SEAT RESERVED',6,3.31,-8.27,3.15);
  for(let i=0;i<9;i++){const shard=mesh(new THREE.ConeGeometry(.14,.48+(i%3)*.2,5),ice,3.45+i*.63,3.82,-7.95);shard.rotation.z=Math.PI;}
  for(const x of [3.6,8.4])box(x,1.8,-7.3,.3,1.55,1.8,ice);
  const frost=[];for(let i=0;i<15;i++){const o=mesh(new THREE.ConeGeometry(.1,.3+(i%3)*.13,5),ice,3.5+i*.35,1.85,-6.51);o.rotation.z=Math.PI;frost.push(o);}
  // This left-hand patch is the one hit by the escaping heat, and the one restored.
  const thaw=box(4.25,2.144,-6.91,1.45,.035,.66,wetStone);
  const frostSkin=box(4.25,2.169,-6.91,1.47,.025,.68,ice);frostSkin.scale.setScalar(.02);
  box(5.7,1.13,-6.1,5.5,.18,.56,dark);
  box(5.7,1.232,-6.1,5.2,.025,.33,water);
  box(7.1,1.4,-3,3.9,.8,.55,stone,{solid:true}); // low offset windbreak leaves the route open
  // Meltwater joins the humid bay's drain, crossing the improvised clerk's platform.
  for(const x of [2.34,2.69])box(x,1.1,-1.1,.12,.12,10.3,stone);
  box(2.515,1.07,-1.1,.23,.04,10.3,water);
  box(3.65,1.08,-6.12,2.1,.04,.25,water);
  const puddle=mesh(new THREE.CircleGeometry(.7,9),water,4.12,1.215,-6.05);puddle.rotation.x=-Math.PI/2;puddle.scale.set(1.8,.57,1);
  // Humidity stays in a screened chamber: opaque lower panels, misted upper panes,
  // a fixed half-hood, condensation tracking to the sill and an explicit outflow.
  box(7,1.08,1.8,5,.08,5,water);
  for(let i=0;i<13;i++)box(4.6+i*.38,1.16,1.8,.23,.1,4.8,wood);
  const glazing=mat(0x8aa99b,{transparent:true,opacity:.28,roughness:.28,depthWrite:false});
  for(const x of [4.3,9.6]){
    box(x,1.66,.8,.21,1.25,3.1,green,{solid:true});
    box(x,3.14,.8,.07,1.55,3.1,glazing);
    for(const z of [-.75,2.35])box(x,2.85,z,.15,3.55,.15,wood,{solid:true});
    box(x,4.57,.8,.22,.16,3.6,wood);
    box(x,2.33,.8,.31,.12,3.3,brass);
  }
  box(7,1.8,-.76,5.5,1.6,.2,green,{solid:true});
  box(7,3.22,-.76,5.4,1.25,.06,glazing);
  box(7,4.52,.1,5.7,.24,2.4,green);
  for(let i=0;i<7;i++)pipe([5+i*.65,4.1,-.2],[5+i*.65,4.1,2.9],.045,green);
  for(const x of [4.3,9.6])pipe([x,2.3,2.35],[x,1.16,3.9],.07,brass);
  const condensation=[];
  for(let i=0;i<12;i++){
    const streak=box(i%2?4.25:9.54,2.8+(i%3)*.22,-.4+(i%6)*.46,.016,.18,.025,ice);
    condensation.push(streak);
  }
  label('HUMID WAITING',7,3.78,-.59,2.5);
  for(const z of [3.7,4.1])box(-.5,1.14,z,14,.14,.12,stone);
  box(-.5,1.05,3.9,14,.08,.3,water);
  for(let i=0;i<5;i++)box(-1+i*.3,1.24,3.9,.25,.14,1.05,wood);
  // Dry clerk's perch over the runoff. A covered ledger tray shelters the forms;
  // the desk is offset so the original conversation approach stays unobstructed.
  for(let i=0;i<10;i++)box(-4.85+i*.37,1.18,3.9,.34,.28,3.0,wood);
  box(-4.1,1.11,2.13,1.25,.18,.42,wood);
  box(-2.48,2.13,3.15,1.78,.16,1.55,wood,{solid:true});
  for(const x of [-3.18,-1.77])box(x,1.65,3.15,.16,.95,1.25,wood);
  for(const z of [2.46,3.84])box(-2.48,2.37,z,1.8,.36,.12,wood);
  box(-1.74,2.5,3.15,.16,.66,1.55,wood);
  const paperHood=box(-2.26,2.99,3.15,1.42,.14,1.75,green);paperHood.rotation.z=-.12;
  box(-2.88,2.24,3.17,.6,.06,.72,paper); // the working form, tucked just outside its cover
  for(let i=0;i<4;i++)box(-2.88,2.279,2.94+i*.13,.4,.009,.013,wood);
  for(let i=0;i<4;i++)box(-2.25,2.29+i*.045,3.23,.47,.045,.68,paper);
  box(-6,3.25,5.6,1.4,.18,.65,wood);box(-6,3.45,5.6,.8,.25,.4,paper);
  label('PLEASE KEEP YOUR WEATHER WITH YOU',-6.7,4.25,5.61,5);
  for(const x of [-6.45,-5.55])pipe([x,3.17,5.25],[x,2.84,5.88],.05,brass);
  const lampGlow=mat(0xf4d298,{emissive:0xc98a37,emissiveIntensity:.6});
  box(-2.06,2.7,3.68,.25,.43,.25,brass);
  box(-2.06,2.7,3.53,.17,.25,.02,lampGlow);
  const deskLight=new THREE.PointLight(0xffd098,3.5,3.5,2);deskLight.position.set(-2.15,2.76,3.35);root.add(deskLight);
  // Author-requested provisional goblin, not a named manuscript character.
  // Hatless, unarmed, and occupied: a bent reading posture and one stamping action.
  const attendant={group:new THREE.Group()};root.add(attendant.group);
  attendant.group.name='Provisional annex attendant';attendant.group.position.set(-3.8,1.32,3.1);attendant.group.rotation.y=Math.PI/2;
  const skin=mat(0x86916c),inkCloth=mat(0x3e5252),sleeve=mat(0xaea588),eye=mat(0xe2d6ab);
  const torso=new THREE.Group();torso.position.set(0,.92,0);torso.rotation.x=.18;attendant.group.add(torso);
  mesh(new THREE.IcosahedronGeometry(1,1),inkCloth,0,.13,0,torso).scale.set(.31,.42,.22);
  for(const x of [-.19,.19]){box(x,.35,0,.19,.58,.23,inkCloth,{parent:attendant.group});box(x,.09,.13,.24,.17,.41,wood,{parent:attendant.group});}
  const clerkHead=new THREE.Group();clerkHead.position.set(0,.57,.11);torso.add(clerkHead);
  mesh(new THREE.IcosahedronGeometry(1,1),skin,0,.1,0,clerkHead).scale.set(.3,.29,.24);
  mesh(new THREE.IcosahedronGeometry(1,0),skin,0,.07,.25,clerkHead).scale.set(.15,.1,.16);
  for(const side of [-1,1]){
    const ear=mesh(new THREE.ConeGeometry(.12,.48,4),skin,side*.37,.16,-.015,clerkHead);ear.rotation.z=-side*1.08;
    box(side*.112,.14,.215,.1,.055,.025,eye,{parent:clerkHead});box(side*.1,.135,.237,.03,.045,.01,dark,{parent:clerkHead});
    box(side*.112,.199,.207,.13,.045,.04,skin,{parent:clerkHead});
  }
  box(0,-.04,.212,.19,.019,.028,dark,{parent:clerkHead});
  pipe([-.27,.27,.02],[-.34,.03,.22],.094,sleeve,torso);
  pipe([-.34,.03,.22],[-.29,.06,.55],.075,skin,torso);
  const stampArm=new THREE.Group();stampArm.position.set(.23,.405,.02);torso.add(stampArm);
  pipe([0,0,0],[-.03,-.17,.21],.095,sleeve,stampArm);
  pipe([-.03,-.17,.21],[-.04,-.08,.67],.07,skin,stampArm);
  box(-.04,-.1,.67,.15,.12,.16,skin,{parent:stampArm});
  pipe([-.04,-.12,.67],[-.04,-.26,.67],.045,wood,stampArm);
  box(-.04,-.28,.67,.2,.08,.19,brass,{parent:stampArm});
  colliders.push({x:-3.8,z:3.1,r:.38});
  // Fully enclosed, reptilian silhouette; only amber eyes breach the heat-retaining suit.
  const emissary=new THREE.Group();emissary.position.set(-6.1,1,-5.4);root.add(emissary);
  const armor=mat(0x514634,{metalness:.55,roughness:.45}),seam=mat(0x1c2422),amber=mat(0xe8ae3e,{emissive:0xaa6715,emissiveIntensity:.45});
  mesh(new THREE.SphereGeometry(1,10,7),armor,0,1.3,0,emissary).scale.set(.61,.85,.38);
  for(let i=0;i<4;i++)box(0,.85+i*.28,.31,1.04-i*.07,.19,.12,brass,{parent:emissary});
  for(const x of [-.33,.33]){box(x,.45,0,.43,.9,.5,armor,{parent:emissary});box(x,.13,.19,.46,.25,.9,armor,{parent:emissary});}
  const head=new THREE.Group();head.position.y=2.23;emissary.add(head);
  mesh(new THREE.SphereGeometry(1,8,6),armor,0,0,.04,head).scale.set(.43,.35,.64);
  box(0,-.07,.6,.49,.24,.51,armor,{parent:head});box(0,-.13,.87,.38,.035,.035,seam,{parent:head});
  for(const x of [-.35,.35]){mesh(new THREE.SphereGeometry(.065,8,6),amber,x,.07,.41,head);box(x,.07,.466,.018,.09,.012,seam,{parent:head});box(x,.155,.4,.2,.075,.17,armor,{parent:head});}
  const arms=[];for(const x of [-.75,.75]){const a=new THREE.Group();a.position.set(x,1.55,0);emissary.add(a);mesh(new THREE.SphereGeometry(.33,8,6),armor,0,.1,0,a);box(0,-.38,.1,.31,.7,.34,armor,{parent:a});box(0,-.76,.19,.33,.2,.4,armor,{parent:a});arms.push(a);}
  // A segmented covered tail reads as anatomy without inventing exposed scales.
  for(let i=0;i<6;i++)mesh(new THREE.SphereGeometry(.23-i*.025,7,5),armor,0,.6-i*.06,-.35-i*.27,emissary);
  colliders.push({x:-6.1,z:-5.4,r:.6});
  const heatLight=new THREE.PointLight(0xffaa60,44,11,2);heatLight.position.set(-6.7,2.9,-5.7);root.add(heatLight);
  const frostLight=new THREE.PointLight(0x95c9ed,22,9,2);frostLight.position.set(6,2.9,-7.2);root.add(frostLight);
  const draftLight=new THREE.SpotLight(0xffa454,18,9,.32,.8,1.5);draftLight.position.set(-.7,3,-4.4);draftLight.target.position.set(4.2,1.9,-6.7);root.add(draftLight,draftLight.target);
  const steamMat=mat(0xbbd7cc,{transparent:true,opacity:.22,depthWrite:false});
  const heatMat=mat(0xedb978,{transparent:true,opacity:.23,depthWrite:false});
  const droplets=[],steam=[],heat=[];
  for(let i=0;i<16;i++){droplets.push(mesh(new THREE.SphereGeometry(.035,4,3),ice,3.6+i*.29,1.6,-6.49));steam.push(mesh(new THREE.IcosahedronGeometry(.28,0),steamMat,5+i%4,2,0));heat.push(mesh(new THREE.IcosahedronGeometry(.11,0),heatMat,0,2,-4));}
  // One authored draft, slipping around the parked screen's back edge, through
  // its empty seat, and down onto the exposed left edge of the cold bench.
  const draft=new THREE.CatmullRomCurve3([
    new THREE.Vector3(-5.1,2.8,-5.75),new THREE.Vector3(-2.4,2.8,-5.65),
    new THREE.Vector3(-.55,2.7,-4.55),new THREE.Vector3(1.5,2.55,-4.65),new THREE.Vector3(4.1,2.16,-6.48)
  ]);
  const retained=new THREE.CatmullRomCurve3([new THREE.Vector3(-8,2.35,-6.15),new THREE.Vector3(-7.3,3.1,-6),new THREE.Vector3(-6.4,3.7,-6.2)]);
  // Dense but bounded woodland surrounds the road; individual purposeful trunks frame the facade.
  const leaves=mat(0x3e6952),trunk=mat(0x584b38);
  for(let i=0;i<38;i++){const angle=i*2.399,r=19+(i%5)*2.1,x=Math.cos(angle)*r,z=Math.sin(angle)*r;if(z>6&&Math.abs(x)<6)continue;
    pipe([x,1,z],[x,7+i%3,z],.28,trunk);colliders.push({x,z,r:.3});
    const crown=mesh(new THREE.IcosahedronGeometry(2.8+i%2,1),leaves,x,7+i%3,z);crown.scale.y=.8;
  }
  label('WOODLAND ROAD',3.9,2.45,14.1,2.7);for(const x of [2.9,4.9])box(x,1.7,14.15,.13,1.4,.13,wood,{solid:true});
  function update(t,p,progress,cameraYaw=0){
    const smooth=progress*progress*(3-2*progress);partition.position.x=-2.4*(1-smooth);panelCollider.x=partition.position.x;
    const inside=Math.abs(p.x)<10.5&&p.z<6.7&&p.z>-9.3;roofs.forEach(r=>r.visible=!inside);frontCutaway.forEach(r=>r.visible=!(inside&&Math.cos(cameraYaw)>.2));
    droplets.forEach((o,i)=>{o.visible=progress<.92;o.position.y=1.93-((t*1.4+i*.17)%1)*.78;});
    steam.forEach((o,i)=>{o.position.set(5+(i%4)*1.1,1.5+(t*.36+i*.18)%2.5,.1+Math.floor(i/4)*.65);o.scale.setScalar(.48+((t+i)%2)*.27);});
    condensation.forEach((o,i)=>{o.position.y=3.75-(t*.24+i*.14)%1.35;});
    heat.forEach((o,i)=>{const a=(t*.24+i/16)%1;o.visible=progress<.96||i<5;o.position.copy((progress<.96?draft:retained).getPoint(a));o.scale.set(2.1,.65,.7);});
    heatMat.opacity=.19*(progress<.96?1-smooth:.65);draftLight.intensity=18*(1-smooth);
    frost.forEach((o,i)=>o.scale.y=i<6?.24+progress*.76:.78+progress*.22);frostSkin.scale.set(1,1,.02+smooth*.98);thaw.visible=progress<.99;puddle.scale.set(1.8*(1-smooth*.75),.57*(1-smooth*.65),1);heatLight.intensity=38+smooth*14;
    arms.forEach((a,i)=>a.rotation.x=progress*.12+(1-progress)*(.28+Math.sin(t*9+i)*.016));
    emissary.rotation.z=(1-progress)*Math.sin(t*8)*.006;
    // Lift, press, linger on the page. Deliberately just one mundane work gesture.
    const cycle=(t%4)/4,lift=cycle<.22?Math.sin(cycle/.22*Math.PI):0;
    stampArm.position.y=.405+lift*.22;clerkHead.rotation.x=.08+lift*.08;
  }
  const world={bounds:{minX:-31,maxX:31,minZ:-31,maxZ:31},colliders,heightAt:(x,z)=>x>-5.02&&x<-1.35&&z>2.4&&z<5.4?1.32:x>-4.73&&x<-3.47&&z>1.92&&z<=2.4?1.2:1};
  return {root,world,partition,emissary,attendant,solids,update,
    visualState:()=>({dripping:droplets.filter(o=>o.visible).length,draftLight:draftLight.intensity,frostCoverage:frostSkin.scale.z,stampHeight:stampArm.position.y}),
    dispose(){scene.remove(root);root.traverse(o=>{if(o.isMesh){o.geometry?.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){m?.map?.dispose();m?.dispose();}}});textures.forEach(t=>t.dispose());},
  };
}
