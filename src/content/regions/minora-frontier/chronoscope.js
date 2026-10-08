import * as THREE from 'three';

// An original Guild instrument: a shallow stone memory basin held between two
// brass meridians. The host supplies the scenario's political colours; this
// scenery never runs, rewinds, or owns campaign time.
export function createChronoscope(parent){
  const root=new THREE.Group();root.name='The Guild chronoscope';root.position.set(1,0,-6.5);parent.add(root);
  const make=(color,emissiveIntensity=0)=>new THREE.MeshStandardMaterial({color,roughness:.64,metalness:.18,flatShading:true,emissive:color,emissiveIntensity});
  const stone=make('#263641'),bronze=make('#ac8c51'),edge=make('#d4c28e'),ink=make('#102c40',.2),light=make('#8bb9c6',.6);
  function mesh(geometry,material,x=0,y=0,z=0,group=root){const object=new THREE.Mesh(geometry,material);object.position.set(x,y,z);group.add(object);return object;}
  const box=(material,x,y,z,w,h,d)=>mesh(new THREE.BoxGeometry(w,h,d),material,x,y+h/2,z);
  // The footprint matches the old table. A deep, faceted lip contains the
  // projection and conceals it from neither Taleth nor the southern approach.
  box(stone,0,0,0,4.7,1.13,2.55);box(bronze,0,.12,0,4.9,.13,2.75);
  const bowl=mesh(new THREE.CylinderGeometry(1.48,1.15,.43,10),stone,0,1.25,0);bowl.scale.x=1.73;
  const rim=mesh(new THREE.TorusGeometry(1.43,.075,4,30),edge,0,1.48,0);rim.rotation.x=Math.PI/2;rim.scale.x=1.73;
  const surface=mesh(new THREE.CircleGeometry(1.39,30),ink,0,1.455,0);surface.rotation.x=-Math.PI/2;surface.scale.x=1.73;
  // Thirty quiet divisions imply that the object measures time; animation
  // does not imply a second simulation ticking underneath the campaign.
  for(let day=0;day<30;day++){
    const angle=day/30*Math.PI*2;
    const mark=mesh(new THREE.BoxGeometry(.035,.035,day%5===0?.22:.11),bronze,Math.cos(angle)*2.35,1.49,Math.sin(angle)*1.36);
    mark.rotation.y=-angle+Math.PI/2;
  }
  const projection=new THREE.Group();projection.position.y=1.62;root.add(projection);
  // Abstract relief plates use the same north-to-south layout and order as
  // the five-region map: Isareos, Nethereum, Ovesos, Caricas, Nesdor.
  const provinces=[
    [[-.95,-1.04],[-.14,-.88],[.07,-.45],[-.43,-.29],[-1.23,-.47]],
    [[-1.23,-.41],[-.43,-.23],[-.16,.14],[-.62,.58],[-1.67,.20]],
    [[-.53,.6],[-.08,.2],[.54,.55],[.63,1.01],[-.12,1.05]],
    [[.12,-.83],[1.04,-.53],[.76,.05],[.50,.46],[-.06,.12],[-.38,-.29]],
    [[.84,.13],[1.73,.38],[1.62,.86],[.71,1.01],[.64,.51]],
  ];
  const colors=['#d2bb83','#789e91','#789e91','#bf7969','#bf7969'];
  const tokens=provinces.map((points,i)=>{
    const shape=new THREE.Shape(points.map(([x,z])=>new THREE.Vector2(x,-z)));
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:.075,bevelEnabled:false});geometry.rotateX(-Math.PI/2);
    return mesh(geometry,make(colors[i],.35),0,0,0,projection);
  });
  // A single luminous river joins the plates, so they read as land in one
  // basin rather than five unrelated magical ornaments.
  const riverPoints=[[-.24,-.88],[-.40,-.29],[-.09,.15],[.56,.52],[.66,1.02]];
  for(let i=1;i<riverPoints.length;i++){
    const [ax,az]=riverPoints[i-1],[bx,bz]=riverPoints[i],length=Math.hypot(bx-ax,bz-az);
    const river=mesh(new THREE.BoxGeometry(.045,.02,length),light,(ax+bx)/2,.085,(az+bz)/2,projection);river.rotation.y=Math.atan2(bx-ax,bz-az);
  }
  const orbital=new THREE.Group();orbital.position.set(0,1.55,0);root.add(orbital);
  // The lower halves disappear into the instrument; the airy upper arches
  // give the chamber a recognizable silhouette without a bulky screen.
  const meridians=[];
  for(const [radius,angle] of [[1.75,.18],[1.51,-.65]]){
    const meridian=mesh(new THREE.TorusGeometry(radius,.025,4,32,Math.PI),bronze,0,0,0,orbital);meridian.rotation.y=angle;meridians.push(meridian);
  }
  const spindle=mesh(new THREE.OctahedronGeometry(.11,0),light,0,3.45,0);
  const pointer=mesh(new THREE.OctahedronGeometry(.07,0),light,2.22,1.65,0);
  const glow=new THREE.PointLight(0x78b8d0,9,7,2);glow.position.set(0,2,0);root.add(glow);
  let active=false,amount=0,time=0,pointerAngle=0;
  function setChronicle({active:enabled=false,colors:next=colors}={}){
    active=!!enabled;
    tokens.forEach((token,index)=>{const color=next[index]??colors[index];token.material.color.set(color);token.material.emissive.set(color);});
  }
  function update(delta=0){
    // Gameplay elapsed time can freeze during the vision and rewind on a
    // checkpoint restore. Keep the instrument's animation on its own local
    // presentation clock instead of differencing those timestamps.
    const dt=Number.isFinite(delta)?Math.min(.1,Math.max(0,delta)):0;time+=dt;
    amount+=(Number(active)-amount)*Math.min(1,dt*4);
    projection.position.y=1.62+amount*.34+Math.sin(time*.55)*amount*.025;
    ink.emissiveIntensity=.2+amount*.6;light.emissiveIntensity=.6+amount*.8;glow.intensity=9+amount*18;
    tokens.forEach(token=>token.material.emissiveIntensity=.35+amount*.4);
    meridians[0].rotation.y=.18+Math.sin(time*.18)*amount*.20;
    meridians[1].rotation.y=-.65+Math.sin(time*.22+.6)*amount*.24;
    pointerAngle+=dt*(.035+amount*.165);pointer.position.set(Math.cos(pointerAngle)*2.22,1.67,Math.sin(pointerAngle)*1.26);
    spindle.rotation.y=time*.25;
  }
  return {root,setChronicle,update};
}
