import * as THREE from 'three';

/** Fixed pools; holding the trigger never creates more scene objects. */
export const DRAGON_FIRE_LIMITS=Object.freeze({stream:112,sparks:96,smoke:64,groundFires:18,groundFlames:108,maxRange:240});
const finitePoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.z);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

/** World-space presentation only. The controller owns collision and damage.
 * origin/direction should come from the dragon's posed mouth, and impacts from
 * the controller's resolved ray. tipRadius is the resolved cone-end radius.
 * An impact with id/left is a persistent ground fire; other dry impacts only
 * bloom briefly, and wet impacts never ignite. clear() removes all effects. */
export function createDragonFireView(scene){
  const root=new THREE.Group();root.name='Developer dragon fire';root.visible=false;scene.add(root);
  const flameGeometry=new THREE.IcosahedronGeometry(1,0);
  // Facet tones preserve the world's low-poly character even on self-lit fire.
  const flameNormals=flameGeometry.getAttribute('normal'),facetColors=new Float32Array(flameNormals.count*3);
  for(let i=0;i<flameNormals.count;i++){
    const tone=.82+.18*Math.max(0,flameNormals.getY(i)*.7+flameNormals.getX(i)*.3);
    facetColors.set([tone,tone,tone],i*3);
  }
  flameGeometry.setAttribute('color',new THREE.BufferAttribute(facetColors,3));
  const sparkGeometry=new THREE.ConeGeometry(1,1,4);
  const smokeGeometry=new THREE.IcosahedronGeometry(1,0);
  const emberGeometry=new THREE.CircleGeometry(1,12);
  // Alpha compositing keeps overlapping lobes orange; additive layers otherwise
  // accumulate into a white laser long before the stream reaches the ground.
  const hotMaterial=new THREE.MeshBasicMaterial({color:0xffffff,vertexColors:true,transparent:true,opacity:.9,
    blending:THREE.NormalBlending,depthWrite:false,toneMapped:false});
  const groundMaterial=hotMaterial.clone();
  const sparkMaterial=hotMaterial.clone();
  sparkMaterial.vertexColors=false;sparkMaterial.blending=THREE.AdditiveBlending;sparkMaterial.opacity=.72;
  const smokeMaterial=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.29,depthWrite:false});
  const emberMaterial=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.56,
    blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,side:THREE.DoubleSide});
  function instances(name,geometry,material,count){
    const mesh=new THREE.InstancedMesh(geometry,material,count);mesh.name=name;mesh.count=0;mesh.frustumCulled=false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);root.add(mesh);return mesh;
  }
  const stream=instances('Dragon billowing flame stream',flameGeometry,hotMaterial,DRAGON_FIRE_LIMITS.stream);
  const sparks=instances('Dragon fire sparks',sparkGeometry,sparkMaterial,DRAGON_FIRE_LIMITS.sparks);
  const smoke=instances('Dragon fire smoke',smokeGeometry,smokeMaterial,DRAGON_FIRE_LIMITS.smoke);
  const ground=instances('Dragon ground flames',flameGeometry,groundMaterial,DRAGON_FIRE_LIMITS.groundFlames);
  const embers=instances('Dragon ground embers',emberGeometry,emberMaterial,DRAGON_FIRE_LIMITS.groundFires);
  const sparkPool=Array.from({length:DRAGON_FIRE_LIMITS.sparks},()=>({age:1,life:0,x:0,y:0,z:0,vx:0,vy:0,vz:0,size:0}));
  const smokePool=Array.from({length:DRAGON_FIRE_LIMITS.smoke},()=>({age:1,life:0,x:0,y:0,z:0,vx:0,vy:0,vz:0,size:0}));
  const fires=Array.from({length:DRAGON_FIRE_LIMITS.groundFires},()=>({life:0,x:0,y:0,z:0,radius:1,persistent:false,id:null}));
  const origin=new THREE.Vector3(),direction=new THREE.Vector3(0,0,1),side=new THREE.Vector3(1,0,0),lift=new THREE.Vector3(0,1,0);
  const forward=new THREE.Vector3(0,0,1),up=new THREE.Vector3(0,1,0),velocity=new THREE.Vector3();
  const beamRotation=new THREE.Quaternion(),particleRotation=new THREE.Quaternion(),upright=new THREE.Quaternion();
  const emberRotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2);
  const transform=new THREE.Object3D(),color=new THREE.Color();
  const white=new THREE.Color(0xffdf76),yellow=new THREE.Color(0xffbd25),orange=new THREE.Color(0xff5c15),red=new THREE.Color(0xd32d0b);
  let clock=0,strength=0,active=false,range=0,tipRadius=1,seed=73517,sparkCursor=0,smokeCursor=0,sparkCredit=0,smokeCredit=0,disposed=false;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  function put(mesh,index,x,y,z,sx,sy,sz,rotation,tint){
    transform.position.set(x,y,z);transform.scale.set(Math.max(.001,sx),Math.max(.001,sy),Math.max(.001,sz));
    transform.quaternion.copy(rotation);transform.updateMatrix();mesh.setMatrixAt(index,transform.matrix);mesh.setColorAt(index,tint);
  }
  function refresh(mesh,count){mesh.count=count;mesh.visible=count>0;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
  function impact(p){
    if(!finitePoint(p)||p.wet)return;
    const persistent=p.id!==undefined&&Number.isFinite(p.left)&&p.left>0;
    if(!persistent&&!active)return;
    const radius=clamp(Number.isFinite(p.radius)?p.radius:2.6,.6,9);
    let slot=persistent?fires.find(f=>f.life>0&&f.persistent&&f.id===p.id):
      fires.find(f=>f.life>0&&!f.persistent&&Math.hypot(f.x-p.x,f.z-p.z)<Math.max(2,radius*.7)&&Math.abs(f.y-p.y)<2);
    if(!slot)slot=fires.find(f=>f.life<=0)??fires.reduce((a,b)=>a.life<b.life?a:b);
    slot.x=p.x;slot.y=p.y;slot.z=p.z;slot.radius=radius;slot.persistent=persistent;slot.id=persistent?p.id:null;
    slot.life=persistent?clamp(p.left,0,8):.2;
  }
  function emitSpark(){
    const p=sparkPool[sparkCursor++%sparkPool.length],t=random(),spread=(.18+range*.019*t)*random(),a=random()*Math.PI*2;
    const lateral=Math.cos(a)*spread,vertical=Math.sin(a)*spread;
    p.x=origin.x+direction.x*range*t+side.x*lateral+lift.x*vertical;
    p.y=origin.y+direction.y*range*t+side.y*lateral+lift.y*vertical;
    p.z=origin.z+direction.z*range*t+side.z*lateral+lift.z*vertical;
    p.vx=direction.x*6+side.x*(random()-.5)*5;p.vy=direction.y*6+4+random()*4;p.vz=direction.z*6+side.z*(random()-.5)*5;
    p.age=0;p.life=.4+random()*.85;p.size=.04+random()*.085;
  }
  function emitSmoke(liveFires){
    const p=smokePool[smokeCursor++%smokePool.length],f=liveFires.length?liveFires[Math.floor(random()*liveFires.length)]:null;
    const a=random()*Math.PI*2,r=(f?f.radius:.4+range*.018)*random();
    p.x=(f?f.x:origin.x+direction.x*range)+Math.cos(a)*r;
    p.y=(f?f.y:origin.y+direction.y*range)+.5;
    p.z=(f?f.z:origin.z+direction.z*range)+Math.sin(a)*r;
    p.vx=.3+random()*.8;p.vy=1.7+random()*1.5;p.vz=(random()-.5)*.7;
    p.age=0;p.life=2.8+random()*2.6;p.size=.55+random()*.8;
  }
  function update(dt,options={}){
    if(disposed)return;
    const step=clamp(Number.isFinite(dt)?dt:0,0,.1);clock+=step;
    const requested=Number.isFinite(options.intensity)?clamp(options.intensity,0,2):1;
    const usableDirection=finitePoint(options.direction)&&Math.hypot(options.direction.x,options.direction.y,options.direction.z)>.0001;
    active=Boolean(options.active&&finitePoint(options.origin)&&usableDirection&&Number.isFinite(options.range)&&options.range>0&&requested>0);
    if(active){
      origin.copy(options.origin);direction.copy(options.direction).normalize();range=clamp(options.range,.1,DRAGON_FIRE_LIMITS.maxRange);
      tipRadius=clamp(Number.isFinite(options.tipRadius)?options.tipRadius:.3+range*.023,.1,12);
      side.crossVectors(direction,up);if(side.lengthSq()<.0001)side.set(1,0,0);else side.normalize();
      lift.crossVectors(side,direction).normalize();beamRotation.setFromUnitVectors(forward,direction);
    }
    const goal=active?requested:0;
    strength=step?strength+(goal-strength)*(1-Math.exp(-step*(active?12:16))):goal;
    if(strength<.015)strength=0;
    for(const f of fires)f.life=Math.max(0,f.life-step);
    if(Array.isArray(options.impacts))for(const p of options.impacts.slice(-DRAGON_FIRE_LIMITS.groundFires))impact(p);
    const liveFires=fires.filter(f=>f.life>0);
    let streamCount=0;
    if(strength>0){
      const width=tipRadius,span=range/78;
      for(let i=0;i<80;i++){
        const t=(i+.25)/80,phase=clock*8-t*23;
        const radius=(.14+width*Math.pow(t,.72))*(.72+.18*Math.sin(phase*1.13+i*.41))*Math.min(1,strength);
        const angle=i*2.399963+clock*.9,scatter=radius*.28;
        const sx=Math.cos(angle)*scatter,sy=Math.sin(angle*1.2)*scatter;
        color.copy(orange).lerp(yellow,clamp(.32+Math.sin(phase)*.2-t*.17,0,1)).lerp(red,t*t*.3);
        put(stream,streamCount++,origin.x+direction.x*range*t+side.x*sx+lift.x*sy,
          origin.y+direction.y*range*t+side.y*sx+lift.y*sy,origin.z+direction.z*range*t+side.z*sx+lift.z*sy,
          radius,radius*(.85+.15*Math.sin(phase)),Math.min(range*(1-t),Math.max(span*.9,radius*.8)),beamRotation,color);
      }
      for(let i=0;i<32;i++){
        const t=(i+.2)/32,radius=(.085+width*t*.39)*(1-t*.48)*Math.min(1,strength);
        color.copy(white).lerp(yellow,t*.65);
        put(stream,streamCount++,origin.x+direction.x*range*t,origin.y+direction.y*range*t,origin.z+direction.z*range*t,
          radius,radius,Math.min(range*(1-t),Math.max(range/30*.8,radius)),beamRotation,color);
      }
    }
    hotMaterial.opacity=Math.min(.9,strength*.9);refresh(stream,streamCount);
    if(active){sparkCredit+=step*70*Math.min(strength,1.5);while(sparkCredit>=1){emitSpark();sparkCredit--;}}
    else sparkCredit=0;
    if(active||liveFires.length){smokeCredit+=step*(active?10:0)+step*liveFires.length*.6;while(smokeCredit>=1){emitSmoke(liveFires);smokeCredit--;}}
    else smokeCredit=0;
    let sparkCount=0,smokeCount=0;
    for(const p of sparkPool){
      if(p.age>=p.life)continue;p.age+=step;if(p.age>=p.life)continue;
      p.x+=p.vx*step;p.y+=p.vy*step;p.z+=p.vz*step;p.vy-=step*2;
      const fade=1-p.age/p.life;velocity.set(p.vx,p.vy,p.vz).normalize();particleRotation.setFromUnitVectors(up,velocity);
      color.copy(white).lerp(orange,1-fade);
      put(sparks,sparkCount++,p.x,p.y,p.z,p.size*fade,p.size*(2+fade*4),p.size*fade,particleRotation,color);
    }
    for(const p of smokePool){
      if(p.age>=p.life)continue;p.age+=step;if(p.age>=p.life)continue;
      p.x+=p.vx*step;p.y+=p.vy*step;p.z+=p.vz*step;
      const t=p.age/p.life,fade=Math.min(1,t*9)*Math.min(1,(1-t)*4),scale=p.size*(1+t*3)*fade;
      color.setRGB(.12+t*.09,.12+t*.085,.10+t*.08);particleRotation.setFromAxisAngle(up,p.age*.17);
      put(smoke,smokeCount++,p.x,p.y,p.z,scale,scale*.78,scale,particleRotation,color);
    }
    refresh(sparks,sparkCount);refresh(smoke,smokeCount);
    let flameCount=0,emberCount=0;
    for(let i=0;i<fires.length;i++){
      const f=fires[i];if(f.life<=0)continue;
      const heat=Math.min(1,f.life/(f.persistent?2:.15)),r=f.radius*heat;
      color.copy(red).lerp(orange,.35+.15*Math.sin(clock*5+i));
      if(f.persistent)put(embers,emberCount++,f.x,f.y+.035,f.z,r,r,.001,emberRotation,color);
      for(let j=0;j<6;j++){
        const a=j*Math.PI/3+i*.7,spread=j?f.radius*.58:0,phase=clock*7+j*2+i;
        const height=(.9+f.radius*.65)*(.65+.35*Math.sin(phase))*heat;
        color.copy(yellow).lerp(orange,.45+.3*Math.sin(phase+1));
        put(ground,flameCount++,f.x+Math.cos(a)*spread,f.y+(f.persistent?height*.66:Math.sin(a*2)*spread*.6),f.z+Math.sin(a)*spread,
          (.25+f.radius*.21)*heat,height,(.25+f.radius*.21)*heat,upright,color);
      }
    }
    refresh(ground,flameCount);refresh(embers,emberCount);
    root.visible=streamCount+sparkCount+smokeCount+flameCount>0;
  }
  function clear(){
    active=false;strength=0;range=0;sparkCredit=0;smokeCredit=0;clock=0;seed=73517;sparkCursor=0;smokeCursor=0;
    for(const p of [...sparkPool,...smokePool]){p.age=1;p.life=0;}
    for(const f of fires)f.life=0;
    for(const mesh of [stream,sparks,smoke,ground,embers])refresh(mesh,0);
    root.visible=false;
  }
  function state(){return{active,intensity:strength,range,elapsed:clock,flames:stream.count+ground.count,
    streamInstances:stream.count,sparks:sparks.count,smoke:smoke.count,groundFires:embers.count,groundFlames:ground.count,
    meshes:root.children.length,disposed};}
  function dispose(){if(disposed)return;clear();disposed=true;root.removeFromParent();
    for(const g of new Set([flameGeometry,sparkGeometry,smokeGeometry,emberGeometry]))g.dispose();
    for(const m of [hotMaterial,groundMaterial,sparkMaterial,smokeMaterial,emberMaterial])m.dispose();
  }
  return{root,update,clear,state,dispose};
}
