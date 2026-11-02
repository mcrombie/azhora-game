import {FRONTIER_SITES,OREMINDI_HOLDS,KUDAN_TOWN} from '../../content/regions/oremindi-frontier/oremindi-frontier-layout.js';
import {createOremindiFrontierSteps} from '../../content/regions/oremindi-frontier/oremindi-frontier-scenery.js';
import * as THREE from 'three';
import {sneroWindowScene} from './snero-window-scenes.js';
import {YUNETHRE_REVIEW_CONFIGS} from './yunethre-review-scenes.js';
import {CANERD_REVIEW_CONFIG} from './canerd-review-scene.js';
import {groundWithRiver,regionBase} from '../../world/terrain/world-terrain.js';
import {westWaterSurface} from '../../content/regions/western-regions/west-ground.js';
import {VAELLIR,MITHALA_RIVERS} from '../../content/regions/western-regions/west-regions.js';
import {cityRiverView} from './city-river-view.js';
import {SEA_LEVEL} from '../../world/terrain/region-world.js';
import {createAevisScenerySteps} from '../../content/regions/aevis/aevis-scenery.js';
import {createNylonScenerySteps} from '../../content/regions/nylon/nylon-scenery.js';
import {nylonHarborDeckHeight} from '../../content/regions/nylon/nylon-city.js';
import {createSelamusScenerySteps} from '../../content/regions/selamus/selamus-scenery.js';
import {createCoastalVillageSteps} from '../../content/regions/ascarth/coastal-villages-scenery.js';
import {createSelamusHarborSteps} from '../../content/regions/selamus/selamus-harbor.js';
import {SELAMUS_VIEWS,selamusTint} from '../../content/regions/selamus/selamus-city.js';
import {createPyraScenerySteps} from '../../content/regions/pyra/pyra-scenery.js';
import {PYRA_VIEWS,pyraTint,pyraPoint} from '../../content/regions/pyra/pyra-world.js';
import {createMithalaCityScenerySteps} from '../../content/regions/mithala/mithala-city-scenery.js';
import {mithalaDeckHeight,mithalaDistrictAt} from '../../content/regions/mithala/mithala-city.js';
import {createLondScenerySteps} from '../../content/regions/lond/lond-scenery.js';
import {outerWaterAt,outerTint,outerGround} from '../../content/regions/outer-regions/outer-regions-world.js';
import {stonefistTerrainSink} from '../../content/regions/lond/lond-layout.js';

import {createEndevorScenerySteps} from '../../content/regions/endevor/endevor-scenery.js';
import {acorGround,acorTint} from '../../content/regions/acor/acor-world.js';
import {createEndevorWaterSteps} from '../../content/regions/endevor/endevor-water.js';
import {endevorTownTint} from '../../content/regions/endevor/endevor-country.js';
import {endevorTerrainSink} from '../../content/regions/endevor/endevor-layout.js';
import {createGanunScenerySteps,createGanunReviewWaterSteps} from '../../content/regions/ganun/ganun-scenery.js';
import {ganunTerrainSink} from '../../content/regions/ganun/ganun-layout.js';
import {ganunTint} from '../../content/regions/ganun/ganun-town.js';
import {RIESOV,WITHERST,northernTownSink} from '../../content/regions/northern-towns/northern-towns-layout.js';
import {createNorthernTownScenerySteps,createNorthernTownReviewWaterSteps} from '../../content/regions/northern-towns/northern-towns-scenery.js';
import {northernTownTint} from '../../content/regions/northern-towns/northern-towns-buildings.js';
import {NONTH_CENTRE,nonthTownSink} from '../../content/regions/nonth/nonth-town-layout.js';
import {createNonthTownScenerySteps,createNonthReviewWaterSteps} from '../../content/regions/nonth/nonth-town-scenery.js';
import {nonthTownTint} from '../../content/regions/nonth/nonth-town-buildings.js';
import {THOTH_CENTRE,thothTownSink} from '../../content/regions/thoth/thoth-town-layout.js';
import {createThothTownScenerySteps,createThothReviewWaterSteps} from '../../content/regions/thoth/thoth-town-scenery.js';
import {thothTownTint} from '../../content/regions/thoth/thoth-town-buildings.js';
import {ORSA_MOUTH,orsaTownSink} from '../../content/regions/orsa/orsa-town-layout.js';
import {createOrsaTownScenerySteps,createOrsaReviewWaterSteps} from '../../content/regions/orsa/orsa-town-scenery.js';
import {orsaTownTint} from '../../content/regions/orsa/orsa-town-buildings.js';
import {createAlezhorTownScenerySteps,createAlezhorTownReviewWaterSteps} from '../../content/regions/alezhor/alezhor-town-scenery.js';
import {IBEN_TOWN,IBENAL_HAMLETS,ibenPoint} from '../../content/regions/ibenal-settlements/ibenal-settlements-layout.js';
import {createIbenalSettlementSteps,createIbenalSettlementReviewWaterSteps} from '../../content/regions/ibenal-settlements/ibenal-settlements-scenery.js';
const ganunGround=(x,z)=>outerGround(x,z,regionBase(x,z));
const endevorGround=(x,z)=>acorGround(x,z,regionBase(x,z));
const view=(eye,target)=>({eye:{x:eye[0],y:eye[1],z:eye[2]},target:{x:target[0],y:target[1],z:target[2]}});
const portConfig=t=>{
  const x=t.mouth.x,z=t.mouth.z;
  return {name:t.name,build:kit=>createNorthernTownScenerySteps({...kit,town:t}),extra:kit=>createNorthernTownReviewWaterSteps({...kit,town:t}),box:[x-230,z-180,410,420],ground:(x,z)=>ganunGround(x,z)-northernTownSink(x,z),height:ganunGround,tint:(x,z)=>northernTownTint(x,z)??outerTint(x,z),water:()=>null,
    views:{overview:view([x+126,151,z-151],[x-71,10,z+13]),harbor:view([x+63,35,z-40],[x-84,12,z+7]),market:view([x-81,14,z+21],[x-117,14,z-9]),bridge:view([x+13,11,z+52],[x-116,14,z+27])}};
};
const ox=ORSA_MOUTH.x,oz=ORSA_MOUTH.z;
const tx=THOTH_CENTRE.x,tz=THOTH_CENTRE.z;
const nx=NONTH_CENTRE.x,nz=NONTH_CENTRE.z;
const ibenConfig=site=>{
  const camera=(u,y,v,tu,ty,tv)=>({eye:{...ibenPoint(site,u,v),y},target:{...ibenPoint(site,tu,tv),y:ty}}),town=site===IBEN_TOWN;
  return {name:site.name,build:kit=>createIbenalSettlementSteps({...kit,site}),extra:kit=>createIbenalSettlementReviewWaterSteps({...kit,site}),
    box:[site.x-150,site.z-145,300,290],ground:groundWithRiver,height:groundWithRiver,tint:()=>town?0x9eae8a:0xa9b08a,water:()=>null,
    views:town?{overview:camera(-90,110,-100,-5,8,10),harbor:camera(20,20,-90,-5,12,18),green:camera(-15,10,-7,-15,14,32),river:camera(70,50,-20,-5,10,14)}:
      {overview:camera(-70,75,-65,0,5,10),fields:camera(-70,60,90,0,5,30),landing:camera(50,16,-80,0,5,0)}};
};
const frontierConfig=site=>{
  const {x,z,y}=site;return {name:site.name,build:kit=>createOremindiFrontierSteps({...kit,region:site.region}),box:[x-160,z-180,320,360],ground:groundWithRiver,height:groundWithRiver,tint:()=>0x8b967d,water:()=>null,
    views:{overview:view([x-110,y+120,z+140],[x,y+5,z]),street:view([x,y+3,z+6],[x-15,y+7,z-15]),range:view([x-280,y+240,z+290],[x+45,y+50,z-50])}};
};
const configs={
  canerd:CANERD_REVIEW_CONFIG,
  ...YUNETHRE_REVIEW_CONFIGS,
  ...Object.fromEntries(FRONTIER_SITES.filter(s=>s.kind!=='ruin').map(s=>[s.id,frontierConfig(s)])),
  iben:ibenConfig(IBEN_TOWN),
  ...Object.fromEntries(IBENAL_HAMLETS.map(site=>[site.id,ibenConfig(site)])),
  alezhor:{name:'Alezhor Town',build:createAlezhorTownScenerySteps,extra:createAlezhorTownReviewWaterSteps,box:[-4140,820,240,200],height:groundWithRiver,ground:groundWithRiver,tint:()=>0xa5ad83,water:()=>null,
    views:{overview:view([-3905,130,1040],[-4040,8,895]),harbor:view([-4040,32,1005],[-4040,14,895]),market:view([-4043,9,905],[-4037,14,874]),gate:view([-4124,12,898],[-4060,11,889]),courtyard:view([-3970,25,907],[-3997,9,880])}},
  nonth:{name:'Nonth Town',build:createNonthTownScenerySteps,extra:createNonthReviewWaterSteps,box:[nx-135,nz-140,270,280],ground:(x,z)=>ganunGround(x,z)-nonthTownSink(x,z),height:ganunGround,tint:(x,z)=>nonthTownTint(x,z)??outerTint(x,z),water:()=>null,
    views:{overview:view([nx+135,145,nz+145],[nx-12,30,nz-5]),market:view([nx-8,29,nz+23],[nx-8,29.8,nz-2]),keep:view([nx+10,37,nz-11],[nx-18,43,nz-42]),quay:view([nx+84,35,nz-10],[nx-18,34,nz-5]),street:view([nx-43,30,nz+49],[nx-40,34,nz-22])}},
  thoth:{name:'Thoth Town',build:createThothTownScenerySteps,extra:createThothReviewWaterSteps,box:[tx-195,tz-185,400,370],ground:(x,z)=>ganunGround(x,z)-thothTownSink(x,z),height:ganunGround,tint:(x,z)=>thothTownTint(x,z)??outerTint(x,z),water:()=>null,
    views:{overview:view([tx-166,208,tz+190],[tx,24,tz-6]),market:view([tx+68,36,tz-12],[tx+15,25,tz-59]),bridge:view([tx+3,27,tz+51],[tx-17,40,tz-63]),hall:view([tx-2,33,tz-28],[tx-28,43,tz-57]),river:view([tx-101,39,tz+5],[tx+3,28,tz+3])}},
  orsa:{name:'Orsa Town',build:createOrsaTownScenerySteps,extra:createOrsaReviewWaterSteps,box:[ox-150,oz-150,380,360],ground:(x,z)=>ganunGround(x,z)-orsaTownSink(x,z),height:ganunGround,tint:(x,z)=>orsaTownTint(x,z)??outerTint(x,z),water:()=>null,
    views:{overview:view([ox-145,140,oz+150],[ox+55,9,oz+15]),harbor:view([ox-94,26,oz+18],[ox+63,14,oz+14]),bridge:view([ox+54,12,oz+53],[ox+78,18,oz-44]),hall:view([ox+42,16,oz-13],[ox+91,23,oz-44])}},
  riesov:portConfig(RIESOV),witherst:portConfig(WITHERST),
  ganun:{name:'Ganun Town',build:createGanunScenerySteps,extra:createGanunReviewWaterSteps,box:[1410,-2570,480,500],ground:(x,z)=>ganunGround(x,z)-ganunTerrainSink(x,z),height:ganunGround,tint:(x,z)=>ganunTint(x,z)??outerTint(x,z),water:()=>null,
    views:{overview:view([1865,202,-2165],[1621,11,-2392]),harbor:view([1756,42,-2307],[1629,15,-2404]),market:view([1610,21,-2394],[1569,20,-2439]),bridge:view([1690,11,-2410],[1568,18,-2438]),granaries:view([1695,48,-2240],[1595,12,-2331])}},
  endevor:{name:'Endevor Town',build:createEndevorScenerySteps,extra:kit=>createEndevorWaterSteps({...kit,owns:(x,z)=>x> -2430&&x< -1830&&z> -3440&&z< -2790}),box:[-2430,-3440,600,650],ground:(x,z)=>endevorGround(x,z)-endevorTerrainSink(x,z),height:endevorGround,tint:(x,z)=>endevorTownTint(x,z)??acorTint(x,z),water:()=>null,
    views:{overview:view([-2345,197,-3480],[-2144,6,-3245]),harbor:view([-2185,38,-3366],[-2135,10,-3241]),market:view([-2139,17,-3265],[-2104,11,-3235]),bridge:view([-2183,11,-3258],[-2113,11,-3258]),farmland:view([-2280,170,-2990],[-2150,10,-3190])}},
  lond:{name:'Stonefist & Lond Town',build:createLondScenerySteps,box:[-420,-3600,790,850],ground:(x,z)=>outerGround(x,z)-stonefistTerrainSink(x,z),height:outerGround,tint:outerTint,water:outerWaterAt,
    views:{overview:view([245,260,-2950],[-85,56,-3330]),stonefist:view([-52,148,-3195],[-160,77,-3385]),town:view([159,100,-3137],[18,24,-3251]),bridge:view([98,31,-3262],[-140,79,-3385]),crown:view([-122,133,-3324],[-160,110,-3385]),street:view([68,24,-3246],[93,26,-3219]),guildhall:view([-19,28,-3231],[-39,34,-3266])}},
  aevis:{name:'Aevis',build:createAevisScenerySteps,box:[-1030,1780,260,245],tint:()=>0xa5a179,
    views:{overview:view([-1085,180,2050],[-920,12,1890]),street:view([-960,13,1864],[-905,9,1864]),citadel:view([-937,49,1890],[-948,23,1846]),harbor:view([-820,58,1808],[-910,10,1870])}},
  nylon:{name:'Nylon',build:createNylonScenerySteps,box:[-1460,990,340,400],tint:()=>0x9ca475,height:(x,z)=>nylonHarborDeckHeight(x,z)??groundWithRiver(x,z),
    views:{overview:view([-1130,205,1370],[-1314,24,1160]),street:view([-1309,14,1141],[-1332,28,1092]),library:view([-1318,31,1135],[-1334,32,1091]),harbor:view([-1178,115,1390],[-1290,42,1230]),'sea gate':view([-1288,59,1440],[-1288,43,1300]),guardians:view([-1288,64,1385],[-1288,53,1301]),lion:view([-1287,64,1334],[-1306,54,1301]),lioness:view([-1249,64,1334],[-1270,54,1301]),profile:view([-1344,61,1311],[-1306,54,1301])}},
  selemis:{name:'Selemis',build:createSelamusScenerySteps,extra:function*(kit){yield* createSelamusHarborSteps(kit);yield* createCoastalVillageSteps(kit);},box:[-1110,2160,600,545],tint:selamusTint,
    views:{overview:SELAMUS_VIEWS.selamus,street:SELAMUS_VIEWS['selamus-canal'],palace:SELAMUS_VIEWS['selamus-temple'],rooftops:SELAMUS_VIEWS['selamus-rooftops'],coast:view([-820,180,2450],[-770,8,2225]),village:view([-906,50,2260],[-850,8,2208])}},
  pyra:{name:'Pyra',build:createPyraScenerySteps,box:[-3200,855,520,490],tint:pyraTint,rivers:[VAELLIR],
    views:{overview:PYRA_VIEWS.pyra,street:{eye:pyraPoint(134,45,36),target:pyraPoint(65,42,36)},palace:PYRA_VIEWS['pyra-palace'],bridge:PYRA_VIEWS['pyra-bridge']}},
  mithala:{name:'Mithala',build:createMithalaCityScenerySteps,box:[-1880,-1650,350,435],rivers:MITHALA_RIVERS,height:(x,z)=>mithalaDeckHeight(x,z)??groundWithRiver(x,z),tint:(x,z)=>mithalaDistrictAt(x,z)?0xb4a17a:null,
    views:{overview:view([-1540,210,-1185],[-1700,17,-1440]),street:view([-1686,23,-1319],[-1701,24,-1360]),fork:view([-1671,90,-1372],[-1750,21,-1434]),north:view([-1610,118,-1592],[-1696,24,-1528]),quays:view([-1543,91,-1341],[-1648,22,-1440])}}
};
const id=new URLSearchParams(location.search).get('city')||'aevis',config=(id.startsWith('window-')?sneroWindowScene(id.slice(7)):configs[id])??configs.aevis;
document.getElementById('title').textContent=config.name;document.getElementById('city').value=id;
document.getElementById('city').onchange=e=>location.search=`?city=${e.target.value}`;
const scene=new THREE.Scene();scene.background=new THREE.Color('#bbc9c5');
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(1.5,devicePixelRatio));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;document.body.prepend(renderer.domElement);
const camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.15,5000),target=new THREE.Vector3();let yaw=0,pitch=.7,distance=300,drag=null;
scene.add(new THREE.HemisphereLight('#fff1d5','#617970',2.1));
const sun=new THREE.DirectionalLight('#fff0d0',2.5),[mx,mz,sx,sz]=config.box,cx=mx+sx/2,cz=mz+sz/2;
sun.position.set(cx+180,400,cz+80);sun.target.position.set(cx,0,cz);scene.add(sun,sun.target);sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);
Object.assign(sun.shadow.camera,{left:-350,right:350,top:350,bottom:-350,near:1,far:900});sun.shadow.camera.updateProjectionMatrix();sun.shadow.normalBias=.24;sun.shadow.bias=-.0002;
function render(){camera.position.set(target.x+Math.sin(yaw)*Math.cos(pitch)*distance,target.y+Math.sin(pitch)*distance,target.z+Math.cos(yaw)*Math.cos(pitch)*distance);camera.lookAt(target);renderer.render(scene,camera);}
// Construction must also make progress in the hidden native screenshot window.
const frame=()=>new Promise(resolve=>setTimeout(resolve,0));
async function consume(steps){let next,end=performance.now()+12;do{next=steps.next();if(performance.now()>end){await frame();end=performance.now()+12;}}while(!next.done);return next.value;}
async function build(){
  let city;
  if(config.buildScene)city=await config.buildScene(scene);
  else{
  const pos=[],cols=[],indices=[],water=[],color=new THREE.Color(),nx=Math.ceil(sx/1.8),nz=Math.ceil(sz/1.8);
  for(let j=0;j<=nz;j++){
    for(let i=0;i<=nx;i++){
      const x=mx+sx*i/nx,z=mz+sz*j/nz,y=(config.ground??groundWithRiver)(x,z);
      pos.push(x,y,z);color.set(config.tint(x,z)??0x8b9b70);cols.push(color.r,color.g,color.b);
      if(i&&j){const a=j*(nx+1)+i;indices.push(a,a-nx-2,a-1,a,a-nx-1,a-nx-2);
        const x0=x-sx/nx,z0=z-sz/nz,w=(config.water??westWaterSurface)((x+x0)/2,(z+z0)/2);
        if(!config.rivers&&w!==null&&w>SEA_LEVEL+.03)water.push(x0,w,z0,x0,w,z,x,w,z,x0,w,z0,x,w,z,x,w,z0);
      }
    }
    if(j%8===0)await frame();
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  const terrain=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:1}));terrain.receiveShadow=true;scene.add(terrain);
  const wm=new THREE.MeshStandardMaterial({color:'#6b9ea4',roughness:.36,metalness:.1});
  if(config.rivers)cityRiverView(scene,config.rivers,config.box,wm);
  const sea=new THREE.Mesh(new THREE.PlaneGeometry(sx*2,sz*2),wm);sea.rotation.x=-Math.PI/2;sea.position.set(cx,SEA_LEVEL,cz);scene.add(sea);
  const wg=new THREE.BufferGeometry();wg.setAttribute('position',new THREE.Float32BufferAttribute(water,3));wg.computeVertexNormals();scene.add(new THREE.Mesh(wg,wm));
  const colliders=[],kit={parent:scene,colliders,heightAt:config.height??groundWithRiver,groundHeight:groundWithRiver};
  city=await consume(config.build(kit));if(config.extra)await consume(config.extra(kit));
  }
  function select(name){const v=config.views[name];if(!v)return;target.copy(v.target);const delta=new THREE.Vector3().copy(v.eye).sub(target);distance=delta.length();yaw=Math.atan2(delta.x,delta.z);pitch=Math.asin(delta.y/distance);city.view?.(v.target);render();}
  for(const [i,name] of Object.keys(config.views).entries()){const b=document.createElement('button');b.textContent=`${i+1} · ${name[0].toUpperCase()+name.slice(1)}`;b.onclick=()=>select(name);document.getElementById('views').append(b);}
  addEventListener('keydown',e=>{const name=Object.keys(config.views)[Number(e.key)-1];if(name)select(name);});
  document.getElementById('loading').hidden=true;renderer.shadowMap.needsUpdate=true;select('overview');
  if(city.update){let last=performance.now();setInterval(()=>{const now=performance.now();city.update(now/1000,Math.min(.05,(now-last)/1000));last=now;render();},50);}
  window.__CITY_REVIEW__={view:select,views:Object.keys(config.views),metrics:city.metrics,placements:city.detail?.placements,stats:()=>({...renderer.info.render,geometries:renderer.info.memory.geometries}),
    // Legacy screenshot/reference capture. Snero now uses live 3D window
    // scenes prepared by scripts/build-snero-windows.mjs, not these images.
    capture({name,width=512,height=704}){
      if(!config.views[name])throw Error('Unknown city capture view: '+name);
      const previous={target:target.clone(),yaw,pitch,distance,ratio:renderer.getPixelRatio()};
      try{
        renderer.setPixelRatio(1);renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
        select(name);return renderer.domElement.toDataURL('image/jpeg',.92);
      }finally{
        target.copy(previous.target);yaw=previous.yaw;pitch=previous.pitch;distance=previous.distance;
        renderer.setPixelRatio(previous.ratio);renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();render();
      }
    },
  };
}
renderer.domElement.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId);});
renderer.domElement.addEventListener('pointermove',e=>{if(!drag)return;yaw-=(e.clientX-drag.x)*.007;pitch=Math.max(-.2,Math.min(1.5,pitch+(e.clientY-drag.y)*.006));drag={x:e.clientX,y:e.clientY};render();});
renderer.domElement.addEventListener('pointerup',()=>drag=null);
renderer.domElement.addEventListener('wheel',e=>{distance=Math.max(8,Math.min(1700,distance*Math.exp(e.deltaY*.001)));render();},{passive:true});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);render();});
build().catch(error=>{console.error(error);document.getElementById('loading').textContent=error.message;window.__CITY_REVIEW_ERROR__=error.stack;});
