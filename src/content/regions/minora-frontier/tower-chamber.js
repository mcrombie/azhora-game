import {addGuildRegalia} from './guild-regalia.js';
import {sanctuaryContains,SANCTUARY} from './guild-sanctuary-layout.js';
import {GUILD_EXPANSION,GUILD_PALETTES} from './guild-expansion.js';
import {buildLowerGuildChamber} from './guild-lower-chambers.js';
import {buildUpperGuildChamber} from './guild-upper-chambers.js';
import * as THREE from 'three';
import {createCharacter,disposeCharacter,groundShadow} from '../../characters/characters.js';
import {TALETH} from '../../quests/lizeem-farmlands/taleth.js';
import {TOWER,TALETH_SPOT} from '../../../app/exploration/tower-state.js';
import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';
import {createChronoscope} from './chronoscope.js';
import {TOWER_FLOORS,TOWER_ROOM_HALF_WIDTH} from './tower-floor-layout.js';
import {createTowerStaircase} from './tower-staircase.js';
import {buildGuildFurnishings} from './tower-furnishings.js';
import {GUILD_WIZARDS} from './guild-wizards.js';
import {createSenroWindows,SNERO_WINDOWS,SNERO_WINDOW_SIZE} from './senro-windows.js';
import {softenDreamScenery} from './nessa-atmosphere.js';
import {createTowerBird} from './tower-birds.js';
import {createTowerStillroomDoor,STILLROOM_DOOR} from '../../../app/exploration/training/stillroom-door.js';

const PALETTES={
  ...GUILD_PALETTES,
  taleth:{stone:'#b5b3a0',shade:'#687779',trim:'#ded4b7',cloth:'#29455c',gold:'#b99b5d',wood:'#594638',floor:'#b8b3a0',light:0xaecbd7},
  senro:{stone:'#b4b09b',shade:'#616c63',trim:'#e2d6b8',cloth:'#50695b',gold:'#bd9c68',wood:'#574136',floor:'#bcb49d',light:0xe5d7b1},
  hadrin:{stone:'#b6aa94',shade:'#71695b',trim:'#e4d2aa',cloth:'#7e492c',gold:'#bf9151',wood:'#57402c',floor:'#b7aa8f',light:0xffd49f},
};

// Eleven physical rooms and a shared spiral. Every floor's static details are
// merged: the many books and masonry blocks do not each cost a draw call.
export function createTowerChamber(parent){
  const root=new THREE.Group();root.name='Minora: eleven Guild chambers';root.position.set(TOWER.x,TOWER.y,TOWER.z);parent.add(root);
  const colliders=[],ownedMaterials=new Set(),floors=[],wizards={},wizardPositions={},statics=[];
  const stairs=createTowerStaircase(root);colliders.push(...stairs.colliders);
  let chronoscope=null,senroWindows=null,localTime=0,sanctuary=null,sanctuaryBuilding=null,sanctuaryBuildMs=0,sanctuaryGeometryMs=0,sanctuaryModule=null,disposed=false,feetY=TOWER.y,sanctuaryError=null;
  const loadSanctuary=()=>sanctuaryModule??=import('./guild-sanctuary.js').catch(error=>{sanctuaryModule=null;throw error;});
  async function prepare(x,z,y=feetY){
    if(!sanctuaryContains(x,z,y)||sanctuary)return;
    const begun=performance.now();
    sanctuaryBuilding??=loadSanctuary().then(async m=>{if(disposed)throw Error('The tower has closed.');const buildStart=performance.now();const built=await m.createGuildSanctuary(root,{yieldBuild:()=>new Promise(resolve=>setTimeout(resolve,0))});if(disposed){built.dispose();return;}sanctuary=built;sanctuaryError=null;sanctuaryGeometryMs=Math.round(performance.now()-buildStart);sanctuaryBuildMs=Math.round(performance.now()-begun);colliders.push(...sanctuary.colliders);sanctuary.hide();}).catch(error=>{sanctuaryBuilding=null;sanctuaryError=error.message;throw error;});
    await sanctuaryBuilding;
  }
  function solid(f,x,y,z,w,h,d,kind='tower-furnishing'){
    colliders.push({x:TOWER.x+x,z:TOWER.z+z,hx:w/2,hz:d/2,minY:TOWER.y+f.y+y,maxY:TOWER.y+f.y+y+h,kind});
  }
  function finish(builder,parent){
    const mesh=builder.finish(parent,{castShadow:false});
    // The builder lends a shared material; own our copy for safe teardown.
    mesh.material=mesh.material.clone();mesh.material.emissive.set('#192029');mesh.material.emissiveIntensity=.11;
    ownedMaterials.add(mesh.material);statics.push(mesh);return mesh;
  }
  function ring(b,color,x,y,z,r,thickness=.07,segments=32){
    for(let i=0;i<segments;i++){
      const a=i/segments*Math.PI*2,c=(i+1)/segments*Math.PI*2;
      b.beam(color,[x+Math.cos(a)*r,y,z+Math.sin(a)*r],[x+Math.cos(c)*r,y,z+Math.sin(c)*r],thickness);
    }
  }
  function architecture(f,group,p){
    if(f.id==='bolbur')return;
    const b=createSceneryBuilder(`${f.wizard}: masonry, vault and inlaid floor`);
    const wall=(x,y,z,w,h,d)=>{b.block(p.stone,x,y,z,w,h,d);solid(f,x,y,z,w,h,d,'tower-wall');};
    b.block(p.shade,0,-.4,0,TOWER_ROOM_HALF_WIDTH*2,.4,27);b.block(p.floor,0,0,0,27,.025,25);
    for(let x=-12;x<=12;x+=2)for(const z of [-11.7,11.7])b.block((x/2)%2?p.shade:p.trim,x,.027,z,1.92,.025,.7);
    for(let z=-10;z<=10;z+=2)for(const x of [-12.6,12.6])b.block((z/2)%2?p.shade:p.trim,x,.027,z,.7,.025,1.92);
    for(const x of [-10,-6,-2,2,6,10])b.block(p.grout??'#8f8e80',x,.026,0,.035,.018,22.6);
    for(const z of [-9,-5,-1,3,7,11])b.block(p.grout??'#8f8e80',0,.026,z,24.7,.018,.035);
    if(f.id!=='helba'){
      b.block(p.cloth,0,.05,3.2,4.5,.035,15.2);
      for(const x of [-2.13,2.13])b.block(p.gold,x,.09,3.2,.075,.012,15.2);
      for(const z of [-4.2,10.6])b.block(p.gold,0,.09,z,4.25,.012,.075);
      for(let i=0;i<12;i++)for(const side of [-1,1])b.block(p.trim,side*2.3,.048,-3.8+i*1.25,.12,.03,.12);
      b.block(p.cloth,8.1,.045,0,10.6,.025,2.3);b.block(p.gold,8.1,.075,-1.05,10.6,.012,.055);b.block(p.gold,8.1,.075,1.05,10.6,.012,.055);
      ring(b,p.gold,0,.105,0,1.25,.045,24);ring(b,p.trim,0,.107,0,.85,.035,24);
    }else{
      // Pale stone garden paths, laid almost flush with the existing floor.
      // The central aisle and the east doorway share the same quiet surface.
      for(let row=0;row<9;row++)for(const side of [-1,1]){
        b.block(row%3?'#c9c4ab':'#c1bca3',side*.85,.048,-5+row*1.85,1.66,.025,1.79);
      }
      for(let i=0;i<6;i++)b.block(i%2?'#c9c4ab':'#c1bca3',3+i*1.85,.048,0,1.79,.025,2.25);
    }
    wall(-14,0,0,1,10,27);wall(0,0,-13,29,10,1);wall(0,0,13,29,10,1);
    // A genuine opening onto the spiral landing, not an interaction portal.
    wall(14,0,-7.65,1,10,10.7);wall(14,0,7.65,1,10,10.7);wall(14,6,0,1,4,4.6);
    b.block(p.shade,0,10,0,29,.4,27);
    for(const z of [-12.44,12.44]){
      b.block(p.shade,0,0,z,27.8,.7,.18);b.block(p.trim,0,.7,z,27.8,.16,.22);
      b.block(p.trim,0,8.9,z,27.8,.35,.3);b.block(p.shade,0,9.25,z,27.8,.12,.28);
      for(let row=0;row<5;row++)for(let k=-3;k<=3;k++){
        const x=k*3.9+(row%2)*1.8;if(Math.abs(x)>13)continue;
        b.block(p.mortar??(row%2?'#92958c':'#9b9c92'),x,1.25+row*1.35,z,3.75,.025,.022);
        b.block(p.mortar??'#999b91',x-1.9,1.25+row*1.35,z,.025,1.32,.022);
      }
    }
    for(const side of [-1,1]){
      // The east wall opens onto the spiral: its skirting must stop at the
      // doorway as well, otherwise a visitor appears to walk through masonry.
      for(const [z,length] of side===1?[[-7.35,9.9],[7.35,9.9]]:[[0,24.6]]){
        b.block(p.shade,side*13.44,0,z,.18,.7,length);b.block(p.trim,side*13.43,.7,z,.22,.16,length);
      }
      for(const z of [-10,-5,5,10]){
        b.block(p.trim,side*13.23,0,z,.6,8.95,.7);b.block(p.shade,side*13.06,.15,z,.9,.35,1.05);
        b.block(p.gold,side*13.04,6.8,z,.95,.1,1.05);b.block(p.trim,side*12.99,8.4,z,1.2,.5,1.3);
        solid(f,side*13.23,0,z,.6,8.95,.7,'tower-pier');
      }
    }
    for(const z of [-10,-5,0,5,10]){
      b.block(p.wood,0,9.6,z,27.2,.28,.35);
      for(const side of [-1,1])b.beam(p.trim,[side*13.2,7.7,z],[side*8.5,9.3,z],.33,.32);
    }
    for(const x of [-10,-5,0,5,10])b.block(p.wood,x,9.68,0,.26,.18,25.5);
    for(const z of [-2.4,2.4]){b.block(p.trim,13.42,0,z,.5,6.2,.32);b.block(p.gold,13.14,1.1,z,.05,4.1,.10);}
    b.block(p.trim,13.42,5.85,0,.6,.35,5.1);
    // Snero has one distant view on each wall, clear of the piers and stair door.
    if(f.id==='senro')for(const view of SNERO_WINDOWS)b.frame(view.x,0,view.z,view.yaw,()=>{
      const {width,height,sill}=SNERO_WINDOW_SIZE;
      b.block(p.shade,0,sill-.2,-.30,width+.65,height+.4,.45);b.block(p.trim,0,sill-.3,.01,width+.75,.3,.85);
      for(const dx of [-width/2,width/2])b.block(p.trim,dx,sill-.1,.11,.15,height+.2,.28);
      b.block(p.trim,0,sill+height,.02,width+.75,.24,.55);
      for(const yy of [sill,sill+height])b.block(p.gold,0,yy,.13,width,.055,.09);
    });
    else for(const x of [-8,8]){
      b.block(p.shade,x,2.9,-12.30,4.1,5.2,.45);b.block(p.trim,x,2.8,-11.99,4.2,.3,.85);
      b.block(p.cloth,x,3.1,-12.02,3.45,4.8,.05);
      for(const dx of [-1.6,0,1.6])b.block(p.trim,x+dx,3.0,-11.89,.13,4.9,.15);
      for(const yy of [3.2,5.2,7.7])b.block(p.trim,x,yy,-11.87,3.4,.12,.17);
      for(const dx of [-.8,.8])for(const yy of [4.3,6.5])b.box(f.id==='hadrin'?'#d6bd83':'#abc4ce',x+dx,yy,-11.95,1.38,1.75,.05);
    }
    if(f.id==='taleth'){
      b.block(p.shade,0,0,12.38,4.8,6,.25);b.block(p.wood,0,0,12.12,3.9,5.4,.25);solid(f,0,0,12.12,3.9,5.4,.25,'tower-exit');
      for(const x of [-2.25,2.25])b.block(p.trim,x,0,11.98,.38,6.2,.7);
      b.block(p.trim,0,5.8,11.98,4.8,.4,.7);b.block(p.gold,0,.3,11.96,.08,4.8,.05);
      for(const y of [1.0,4.5])b.block('#42464a',0,y,11.91,3.8,.13,.08);
      b.block(p.gold,1.35,2.3,11.85,.18,.3,.1);
    }else{
      b.block(p.wood,0,1.8,12.35,6.4,4.8,.18);b.block(p.cloth,0,2,12.19,6,4.4,.08);
      for(const x of [-2.8,2.8])b.block(p.gold,x,2,12.12,.07,4.4,.04);
    }
    const mesh=finish(b,group);if(f.id==='nessa')softenDreamScenery(mesh.material);
  }
  for(const f of TOWER_FLOORS){
    const p=PALETTES[f.id],shell=new THREE.Group(),contents=new THREE.Group();shell.position.y=f.y;contents.position.y=f.y;root.add(shell,contents);
    shell.name=`${f.wizard}: floor architecture`;contents.name=`${f.wizard}: chamber contents`;
    architecture(f,shell,p);contents.visible=false;shell.visible=Math.abs(f.y)<16;
    const definition=GUILD_WIZARDS.find(w=>w.id===f.id),x=definition?.offset.x??TALETH_SPOT.x-TOWER.x,z=definition?.offset.z??TALETH_SPOT.z-TOWER.z;
    const position={x:TOWER.x+x,y:TOWER.y+f.y,z:TOWER.z+z};wizardPositions[f.id]=position;
    floors.push({...f,shell,contents,position,built:false});
  }
  function populate(f){
    if(f.built)return;f.built=true;
    // Fetch the small sanctuary module near the top landing. Geometry is
    // built in yielding stages as the visitor climbs the final flight.
    if(f.id==='bolbur')void loadSanctuary().catch(()=>{});
    const p=PALETTES[f.id],{contents}=f,extra=GUILD_EXPANSION.find(w=>w.id===f.id);
    if(f.id==='senro')senroWindows=createSenroWindows(contents);
    const build=extra?(extra.level<0?buildLowerGuildChamber:buildUpperGuildChamber):buildGuildFurnishings;
    const roomFinish=f.id==='nessa'?(builder,parent)=>{const mesh=finish(builder,parent);if(mesh)softenDreamScenery(mesh.material);return mesh;}:finish;
    const furnishings=build({id:f.id,parent:contents,palette:p,solid:(...args)=>solid(f,...args),finish:roomFinish,ownedMaterials});
    const look=extra?.look??(f.id==='senro'?{build:'tall-lean',headgear:'bare',hairStyle:'curls',hair:0xc3bcaa,facialHair:'moustache',garment:'robe',jerkin:false,marks:[]}
      :{build:'broad',headgear:'bare',hairStyle:'short-cropped',hair:0x9a5932,facialHair:'bushy',garment:'robe',jerkin:false,marks:[]});
    const actor=f.id==='taleth'?createCharacter({...TALETH,role:TALETH.modelRole,tunic:TALETH.color,armed:false})
      :createCharacter({role:'mercenary',tunic:extra?.color??(f.id==='senro'?0x66866a:0x986533),skin:extra?.skin??(f.id==='senro'?0xd6b594:0xcaa07d),armed:false,hat:false,look});
    const definition=GUILD_WIZARDS.find(w=>w.id===f.id),x=definition?.offset.x??TALETH_SPOT.x-TOWER.x,z=definition?.offset.z??TALETH_SPOT.z-TOWER.z;
    actor.setArmed(false);actor.group.position.set(x,0,z);actor.group.name=f.wizard;contents.add(actor.group);
    if(extra)addGuildRegalia(actor,f.id,p);
    if(f.id==='senro'){
      const chest=actor.group.getObjectByName('Chest'),kit=createSceneryBuilder('Snero: worn traveling satchel and rolled map');
      kit.beam('#735440',[-.16,1.32,.19],[.27,.83,.23],.055,.025);
      kit.beam('#735440',[-.16,1.32,-.15],[.27,.83,-.15],.055,.025);
      kit.block('#8e684a',.29,.67,.02,.21,.27,.28);kit.block('#5d4535',.29,.87,.03,.23,.08,.30);
      kit.block(p.gold,.29,.77,.175,.045,.055,.018);kit.block('#d5c8a4',.34,.73,.173,.07,.045,.012);
      kit.cylinder('#e2d3b3',-.28,.79,.01,.065,.43);kit.cylinder('#79634b',-.28,.94,.01,.071,.055);
      kit.beam('#735440',[-.26,.87,.04],[-.23,1.03,.06],.025);
      // An uneven travel scarf and a patched pocket keep his robe personal.
      const scarf='#be8d44';
      kit.box(scarf,0,1.30,.015,.32,.10,.30);
      kit.beam(scarf,[-.095,1.31,.19],[-.14,.92,.23],.105,.028);
      kit.beam(scarf,[.09,1.30,.195],[.16,1.10,.22],.085,.03);
      for(const x of [-.17,-.14,-.11])kit.beam('#e1c58a',[x,.93,.23],[x-.01,.88,.234],.014);
      kit.box('#8c9972',-.14,.72,.224,.14,.16,.025,0,0,-.12);
      for(const y of [.67,.72,.77])kit.box('#d7c6a0',-.2,y,.243,.025,.009,.012);
      kit.box('#ddcda9',-.13,.82,.23,.07,.085,.016,0,0,-.16);
      if(chest){const mesh=kit.finish(chest,{castShadow:false});mesh.position.y=-chest.position.y;mesh.material=mesh.material.clone();}
      const head=actor.group.getObjectByName('Head'),detail=createSceneryBuilder('Snero: round brass spectacles and unruly forelock');
      // Open rims show his eyes; a mended arm and slightly crooked bridge suit
      // someone who is always mislaying his glasses among his travel notes.
      for(const side of [-1,1]){
        const cy=.233+side*.006;
        for(let i=0;i<12;i++){
          const a=i*Math.PI/6,c=(i+1)*Math.PI/6;
          detail.beam(p.gold,[side*.078+Math.cos(a)*.065,cy+Math.sin(a)*.065,.231],[side*.078+Math.cos(c)*.065,cy+Math.sin(c)*.065,.231],.011);
        }
        detail.beam(p.gold,[side*.143,cy,.231],[side*.19,cy,.025],.011);
      }
      detail.beam(p.gold,[-.015,.233,.231],[.015,.245,.231],.012);
      detail.box('#e2d6b8',.163,.239,.15,.025,.025,.043);
      detail.rock('#c3bcaa',-.05,.407,.04,.054,.079,.052,-.35);
      detail.rock('#c3bcaa',.025,.401,-.04,.047,.065,.048,.4);
      if(head){const spectacles=detail.finish(head,{castShadow:false});spectacles.material=spectacles.material.clone();}
    }
    if(f.id==='hadrin'){
      const chest=actor.group.getObjectByName('Chest'),apron=createSceneryBuilder('Hadrin: working apron and well-used tools');
      apron.box('#c3a079',0,.79,.235,.39,.65,.035);apron.box('#71513d',0,.67,.26,.36,.15,.035);
      for(const x of [-.13,.13])apron.beam('#c3a079',[x,.91,.24],[x*.8,1.29,.16],.035,.02);
      apron.box('#d0b083',.08,.70,.285,.13,.13,.025);apron.beam('#5b4536',[-.11,.62,.29],[-.11,.91,.29],.025);
      apron.box('#a8b1ad',-.11,.91,.29,.14,.055,.055);apron.box('#ecd9ad',.08,.76,.31,.06,.065,.012);
      // The accessory coordinates use feet height; Chest has an elevated pivot.
      if(chest){const kit=apron.finish(chest,{castShadow:false});kit.position.y=-chest.position.y;kit.material=kit.material.clone();}
      const head=actor.group.getObjectByName('Head'),detail=createSceneryBuilder('Hadrin: brass reading spectacles');
      for(const side of [-1,1])for(let i=0;i<8;i++){
        const a=i*Math.PI/4,c=(i+1)*Math.PI/4;
        detail.beam(p.gold,[side*.072+Math.cos(a)*.055,.228+Math.sin(a)*.045,.226],[side*.072+Math.cos(c)*.055,.228+Math.sin(c)*.045,.226],.009);
      }
      detail.beam(p.gold,[-.019,.236,.226],[.019,.236,.226],.009);
      for(const side of [-1,1])detail.beam(p.gold,[side*.13,.235,.22],[side*.19,.235,.035],.009);
      if(head){const spectacles=detail.finish(head,{castShadow:false});spectacles.material=spectacles.material.clone();}
    }
    const position={x:TOWER.x+x,y:TOWER.y+f.y,z:TOWER.z+z};wizardPositions[f.id]=position;wizards[f.id]=actor;
    colliders.push({x:position.x,z:position.z,r:.52,minY:position.y,maxY:position.y+2.3,kind:f.id==='taleth'?'taleth':'guild-wizard',id:f.id});
    const shadow=groundShadow(.3);shadow.position.set(x,.10,z);contents.add(shadow);
    const light=new THREE.PointLight(p.light,110,28,2);light.position.set(0,6,1);contents.add(light);
    contents.visible=f.id==='taleth';
    if(f.id==='taleth'){
      chronoscope=createChronoscope(contents);solid(f,1,0,-6.5,5.2,1.65,3.2);
      f.stillroomDoor=createTowerStillroomDoor(contents);solid(f,-12.65,0,STILLROOM_DOOR.z-TOWER.z,.8,7.5,5.7,'stillroom-door');
    }
    const bird=createTowerBird(contents,f.id,p,(...args)=>solid(f,...args));
    Object.assign(f,{actor,position,shadow,furnishings,light,bird});
  }
  for(const f of floors.filter(f=>['taleth','senro','hadrin'].includes(f.id)))populate(f);
  return {root,colliders,taleth:wizards.taleth,wizards,wizardPositions,
    get treeRegistry(){return root.visible&&sanctuary?.root.visible?sanctuary.treeRegistry:null;},
    treeRegistryAt:player=>root.visible&&sanctuary?.root.visible&&sanctuaryContains(player.x,player.z,player.y)?sanctuary.treeRegistry:null,
    birdTarget(player){return floors.map(f=>f.bird?.state()).filter(b=>b?.active&&Math.abs(player.y-(b.position[1]-1.6))<2.5&&Math.hypot(player.x-b.position[0],player.z-b.position[2])<3).sort((a,b)=>Math.hypot(player.x-a.position[0],player.z-a.position[2])-Math.hypot(player.x-b.position[0],player.z-b.position[2]))[0]??null;},
    supportAt:(x,z,o)=>sanctuaryContains(x,z,o?.maxY??feetY)&&sanctuary?sanctuary.supportAt(x,z):stairs.supportAt(x,z,o),
    heightAt:(x,z)=>sanctuaryContains(x,z,feetY)&&sanctuary?sanctuary.heightAt(x,z):stairs.heightAt(x,z),
    waterAt:(x,z)=>sanctuaryContains(x,z,feetY)&&sanctuary?sanctuary.waterAt(x,z):-100,
    canExploreAt:(x,z,y=feetY)=>stairs.canExploreAt(x,z)||sanctuaryContains(x,z,y),
    readyAt:(x,z,y=feetY)=>sanctuaryContains(x,z,y)?!!sanctuary:stairs.canExploreAt(x,z),prepare,
    guildGuides:()=>[],guildTravel:async()=>null,
    interiorMap:point=>sanctuaryContains(point.x,point.z,point.y)?sanctuary?.map:null,
    setChronicle:chronoscope.setChronicle,
    renderWindows(renderer,camera,time){senroWindows.render(renderer,camera,time);for(const f of floors)f.furnishings?.render?.(renderer,camera);},
    demonstrateWorkshop(id){for(const f of floors)if(f.contents.visible&&f.furnishings?.demonstrate?.(id))return true;return false;},
    ensureFloor(id){const f=floors.find(f=>f.id===id);if(f)populate(f);},
    update(time,player,dt=0){
      feetY=player.y;
      // Start construction during the last flight, yielding between sectors.
      // readyAt holds the doorway safely if an unusually fast arrival beats it.
      if(!sanctuary&&!sanctuaryBuilding&&!sanctuaryError&&player.y>SANCTUARY.y-14&&Math.abs(player.x-TOWER.x)<35)void prepare(TOWER.x,TOWER.z,SANCTUARY.y).catch(()=>{});
      if(sanctuary){if(player.y>=SANCTUARY.y-4&&player.x<TOWER.x+26)sanctuary.update(time,player,dt);else sanctuary.hide();}
      localTime+=Math.min(.1,Math.max(0,dt));
      const nearest=floors.reduce((best,f)=>Math.abs((player.y??TOWER.y)-(TOWER.y+f.y))<Math.abs((player.y??TOWER.y)-(TOWER.y+best.y))?f:best,floors[1]);
      for(const f of floors){
        const delta=Math.abs((player.y??TOWER.y)-(TOWER.y+f.y));
        f.shell.visible=delta<16&&Math.abs(player.x-TOWER.x)<100;
        f.contents.visible=delta<8.6&&Math.abs(player.x-TOWER.x)<100;
        if(f.contents.visible)populate(f);
        if(f.light)f.light.visible=f===nearest;
        f.bird?.update(dt,player,f.contents.visible);
        if(!f.contents.visible)continue;
        f.actor.animate(time,0,true);f.furnishings.update(localTime,player);
        if(Math.abs(player.y-f.position.y)<3&&Math.hypot(player.x-f.position.x,player.z-f.position.z)<7)f.actor.group.rotation.y=Math.atan2(player.x-f.position.x,player.z-f.position.z);
      }
      if(floors.find(f=>f.id==='taleth').contents.visible)chronoscope.update(dt);
    },
    state:()=>({sanctuaryBuildMs,sanctuaryGeometryMs,sanctuary:sanctuary?.state()??null,floors:floors.map(f=>({id:f.id,y:TOWER.y+f.y,visible:f.contents.visible,built:f.built,bird:f.bird?.state()??null,demonstration:f.furnishings?.state?.()??null,wizard:{...f.position}})),staticBatches:statics.length,staticVertices:statics.reduce((n,m)=>n+m.geometry.attributes.position.count,0),activeRoomLights:floors.filter(f=>f.contents.visible&&f.light?.visible).length,workshop:floors.find(f=>f.id==='hadrin').furnishings.workshopState?.()??null,senro:{windows:senroWindows.state(),study:floors.find(f=>f.id==='senro').furnishings.studyState?.()??null}}),
    dispose(){
      disposed=true;sanctuary?.dispose();stairs.dispose();senroWindows.dispose();for(const f of floors)f.stillroomDoor?.dispose();
      for(const f of floors.filter(f=>f.built)){disposeCharacter(f.actor);f.shadow.material.dispose();f.shadow.removeFromParent();f.furnishings.dispose();f.bird?.dispose();}
      const geometries=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of [].concat(o.material??[]))if(m)ownedMaterials.add(m);});
      root.removeFromParent();for(const g of geometries)g.dispose();for(const m of ownedMaterials){m.map?.dispose();m.dispose();}
    },
  };
}
