import {FARMLAND_REGIONS} from '../../app/farmland-review/regions.js';
import {CARICAS_RESIDENT_PLACEMENTS} from '../../content/regions/minora-frontier/caricas-resident-placements.js';
import {LIZEEM_BRIDGES} from '../../content/regions/minora-frontier/lizeem-crossings.js';
import {canStand} from '../../gameplay/movement/locomotion.js';
import {CARICAS_MINORA_APPROACH} from '../../content/regions/minora-frontier/caricas-agriculture.js';
import {createAdventureWar} from '../../experiments/day-night/opening-war.js';

const assert=(ok,label)=>{if(!ok)throw Error(label);};
const frames=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
const tick=a=>{for(let i=0;i<40;i++)a.step(.04,0);};
const dismiss=()=>{if(document.getElementById('encounter-dialog').open)document.getElementById('encounter-return').click();};
export async function town(a){
  a.resume();a.war.pause();await a.visit({x:-2098,z:279});tick(a);
  const r=FARMLAND_REGIONS.caricas,w=a.testWorld,geometry=w.agricultureState().regions.caricas;
  assert(geometry.buildings===18&&geometry.fields===10&&geometry.farms===3,'Campaign uses redesigned town without duplicate legacy buildings');
  for(const lane of r.lanes)for(let i=1;i<lane.length;i++){
    const [ax,az]=lane[i-1],[bx,bz]=lane[i],n=Math.ceil(Math.hypot(bx-ax,bz-az));
    for(let j=0;j<=n;j++){
      const x=ax+(bx-ax)*j/n,z=az+(bz-az)*j/n;
      assert(canStand(x,z,w,.8),'Lane clear for walker and horse at '+x+','+z+' '+JSON.stringify(w.nearColliders(x,z,2).filter(c=>Math.hypot(c.x-x,c.z-z)<10)));
    }
  }
  for(const b of r.buildings)assert(canStand(b.x,b.z+b.d/2+2,w,.42),'Accessible entrance: '+b.name);
  dismiss();a.look({yaw:.15,pitch:.35,distance:15});await frames();
  const economy=a.war.state().campaign.regions.caricas;
  assert(economy.food.population===1265&&economy.food.production===170&&economy.housing.capacity===1600,'Regional economy unchanged');
  return {geometry,economy,render:a.renderStats()};
}
export async function residents(a){
  const rows=[];
  for(const [id,p] of Object.entries(CARICAS_RESIDENT_PLACEMENTS)){
    await a.visit({x:p.x+4,z:p.z+4});tick(a);dismiss();
    const person=a.tower.state().residents.people.find(p=>p.id===id);
    assert(person,'Resident loads near new workplace: '+id);
    const [x,y,z]=person.position;
    assert(Math.abs(y-a.testWorld.heightAt(x,z))<.1,'Grounded resident: '+id);
    if(p.shelter)assert(person.shelterValid,'Safe shelter route: '+id);
    rows.push({id,position:person.position,place:person.currentPlace,shelterValid:person.shelterValid});
  }
  assert(a.tower.state().residents.constructed<=12,'Resident cache remains bounded');
  await a.visit({x:-2018,z:290});a.look({yaw:Math.PI,pitch:.25,distance:9});tick(a);await frames();return {rows};
}
export async function minoraRoad(a){
  a.resume();a.war.pause();dismiss();a.selectMount('foot');
  // The opening battlefield deliberately stops travel at its boundary. Check
  // the complete civilian road after those battles, then restore the fixture.
  const saved=a.war.save(a.snapshot()),settled=createAdventureWar(saved);
  settled.campaign.watchBattles(false);settled.advance(3);
  assert(!settled.snapshot().engagements.some(b=>b.region==='caricas'&&b.status==='active'),'Road review is outside active combat');
  a.war.restore({...saved,...settled.checkpoint()});a.war.pause();
  const route=[[-2250,135],...CARICAS_MINORA_APPROACH,[-2098,244],[-2098,279]],journeys=[];
  const roads=a.testWorld.minimapData({x:-2145,z:170},200).paths;
  assert(roads.some(l=>l.some(p=>p.x===-2148&&p.z===135)&&l.some(p=>p.x===-2098&&p.z===279)),
    'Minimap uses the continuous bridge-to-market road');
  try{for(const mounted of [false,true]){
    const line=mounted?[...route].reverse():route,[x,z]=line[0];
    await a.visit({x,z});dismiss();a.selectMount('foot');
    if(mounted){a.stable.restore({owned:true,taught:true,horse:{x,z,yaw:0},version:1});a.stable.toggleMount();assert(a.stable.mounted,'Mount for return journey');}
    let steps=0;
    for(const [tx,tz] of line.slice(1)){
      let reached=false;
      a.hold('KeyW',true);
      try{for(let i=0;i<1600;i++){
        dismiss();const p=a.state().position,dx=tx-p[0],dz=tz-p[2];
        if(Math.hypot(dx,dz)<.5){reached=true;break;}
        a.look({yaw:Math.atan2(-dx,-dz),pitch:.3,distance:11});a.step(.04);steps++;
        assert(!a.state().mount.swimming,'Journey stays on road and bridge');
      }}finally{a.hold('KeyW',false);}
      assert(reached,(mounted?'Rider':'Walker')+' reaches '+tx+','+tz+' '+JSON.stringify({position:a.state().position,mode:a.state().mode,grounded:a.state().grounded,mount:a.state().mount}));
    }
    journeys.push({mounted,steps,position:a.state().position});
  }}finally{a.war.restore(saved);a.war.pause();}
  await a.visit({x:-2145,z:154});dismiss();a.look({yaw:-.5,pitch:.65,distance:75});tick(a);await frames();
  assert(!a.state().frameErrors.length,'Road journey has no runtime errors');
  return {journeys,render:a.renderStats()};
}
export async function bridge(a){
  const b=LIZEEM_BRIDGES[0],w=a.testWorld;
  for(let x=b.x-b.length/2;x<=b.x+b.length/2;x+=1)assert(canStand(x,b.z,w,.8),'Public bridge remains traversable');
  await a.visit({x:b.x+65,z:b.z});a.look({yaw:-Math.PI/2,pitch:.25,distance:9});tick(a);await frames();
  dismiss();const geometry=w.agricultureState().regions;
  assert(a.save().ok,'Redesigned world saves');const expected=JSON.stringify(a.war.state().campaign);
  await a.loadSaved();a.resume();a.war.pause();
  assert(JSON.stringify(a.war.state().campaign)===expected,'Continue preserves exact economy and war');
  assert(JSON.stringify(w.agricultureState().regions)===JSON.stringify(geometry),'Continue retains fixed scenery');
  await frames();return {position:a.snapshot().position,render:a.renderStats()};
}
export async function map(a){
  dismiss();a.openMap();a.war.openFoodReport('caricas');await frames();
  assert(a.state().mode==='map'&&!document.getElementById('encounter-dialog').open,'Map report visibly open');
  const text=document.getElementById('food-world-report').textContent;
  assert(text.includes('1,265')&&text.includes('1,600')&&text.includes('regional totals'),'Map explains abstract regional population and housing');
  return {text,render:a.renderStats()};
}
export async function battle(a){
  a.resume();a.war.pause();const b=a.war.state().campaign.engagements.find(b=>b.region==='caricas'&&b.status==='active');
  assert(b,'Opening battle remains active');await a.visit(b.location);a.war.sync();
  if(!a.war.state().campaign.pending)assert(a.war.join(b.id).ok,'Physical battle entry');
  await a.war.help('west','intercept');tick(a);await frames();
  assert(a.state().mode==='skirmish','Battle starts among revised town buildings');
  assert(a.state().fieldActors.length>0&&a.state().fieldActors.every(p=>p.clear),'Combatants spawn clear of buildings');
  assert(a.testHero.group.visible,'Hero visible in combat');assert(!a.state().frameErrors.length,'No runtime frame errors');
  return {actors:a.state().fieldActors,render:a.renderStats()};
}
