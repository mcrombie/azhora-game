import {canStand} from '../game-state.js';
import {residentPoint} from './world.js';
import {validateSettlementSnapshot} from './engine.js';
export async function runSettlementChecks(h) {
 const assert=(ok,message)=>{if(!ok)throw Error(message);},frames=async(n=2)=>{for(let i=0;i<n;i++)await new Promise(requestAnimationFrame);};
 h.prepare();await h.host.tour('feradom-fishers');await h.host.flush();await frames(15);
 const first=h.host.status();assert(first.sites.length===3,'All three sites must be surveyed');
 for(const site of first.sites) {
   assert(h.world.regionAt(site.x,site.z)?.id===21,'Pilot escaped Feradom');
   for(let i=0;i<12;i++){const p=residentPoint(site,i);assert(canStand(p.x,p.z,h.world,.4,h.world.heightAt(p.x,p.z)),'Resident approach is obstructed');}
 }
 const undisc=first.sites.find(p=>!h.chart.knowsPoint(p.x,p.z));if(undisc)assert(!h.host.knownLocations().some(p=>p.id===undisc.id),'Unvisited community leaked through chart fog');
 const site=first.sites[0];h.chart.reveal(site.x,site.z);
 const npc=first.communities[0].residents[0];
 assert(h.host.converse({...npc,role:npc.occupation,region:21,speech:'feradom'}),'Resident did not use Azhora dialogue');
 assert(document.querySelector('#dialogue')?.textContent.includes(npc.name),'Dialogue did not show persistent resident');
 h.host.book.open(site.id);await frames(5);
 assert(document.querySelectorAll('.annals-stats button').length===9,'Historical resource controls missing');
 document.querySelector('.annals-stats button').click();
 assert(document.querySelector('.annals-detail').textContent.includes('at the close'),'Historical statistic is inert');
 document.querySelector('.annals-local-map [role=button]').dispatchEvent(new MouseEvent('click',{bubbles:true}));
 assert(document.querySelector('.annals-resident h4'),'Interactive household map is inert');
 h.host.book.close();const saved=h.host.snapshot();
 assert(validateSettlementSnapshot(saved),'Settlement checkpoint invalid');
 assert(h.host.restore(saved),'Checkpoint restore refused');await h.host.ready();await h.host.flush();
 assert(h.host.status().communities[0].residents[0].name===npc.name,'Resident identity changed on reload');
 const road=h.snapshot();assert(h.validate(road).ok,'The full road checkpoint rejected its settlement section');
 const legacy=structuredClone(road);delete legacy.settlements;assert(h.validate(legacy).ok,'A pre-settlement road checkpoint no longer loads');
 const damaged=structuredClone(road);damaged.settlements.settlements[0].stocks.barley=-1;assert(!h.validate(damaged).ok,'Invalid settlement stock passed road validation');
 assert(await h.restoreRoad(road),'The actual Continue route rejected the settlement checkpoint');await h.host.ready();await h.host.flush();
 assert(h.host.status().communities[0].residents[0].id===npc.id,'Continue lost the persistent resident');
 const oldTime=h.living.clock();h.setMode('pause');await frames(8);assert(h.living.clock()===oldTime,'Paused game advanced settlement clock');
 h.setMode('playing');h.living.advance(1440);for(let i=0;i<61;i++)h.frame();await h.host.flush();
 assert((await h.host.archive.list(h.host.snapshot().worldId)).filter(p=>p.kind==='daily').length===3,'Unvisited communities missed a day');
 h.host.restore(saved);await h.host.ready();await h.host.flush();assert(h.host.snapshot().worldId!==saved.worldId,'Rewound published history did not branch');
 h.host.book.open(site.id);await frames(8);
 return {ok:true,settlementChecks:18,sites:first.sites.map(({id,x,z})=>({id,x,z})),residents:36,errors:h.frameErrors()};
}
