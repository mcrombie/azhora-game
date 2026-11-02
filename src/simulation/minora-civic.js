import {housingSummary} from './housing.js';

const EPS=1e-8;
const finite=(n,min=0,max=Infinity)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
const fail=()=>{throw Error('Invalid Minora civic configuration.');};

function validateConfig(config){
  const shares=config?.storageShares;
  if(!shares||!['granary','temple','merchants'].every(key=>finite(shares[key],0,1))||
    Math.abs(shares.granary+shares.temple+shares.merchants-1)>EPS||
    !finite(config.sealedTempleShare??0,0,shares.temple)||
    !finite(config.guildMealShare,0,1)||!finite(config.charityMealShare,0,1)||
    config.guildMealShare+config.charityMealShare>1||!finite(config.reserveTarget)||
    !finite(config.battleWindow)||!Array.isArray(config.reliefRegions)||
    config.reliefRegions.some(id=>typeof id!=='string'||!id))fail();
  return config;
}

/** Building descriptions are authored physical accommodation, not a second
 * population model. Visitor beds and named residents never enlarge regional
 * capacity or create another food consumer. Null means not yet authored. */
export function minoraHousingReport(region,buildingMetadata=[]){
  const regional=housingSummary(region);
  const buildings=buildingMetadata.map(b=>{
    if(typeof b.id!=='string'||!b.id)throw Error('Civic building needs an identity.');
    const places=b.accommodation??{};
    for(const key of ['households','residentPlaces','visitorBeds']){
      if(places[key]!==undefined&&(!Number.isSafeInteger(places[key])||places[key]<0))throw Error('Invalid civic accommodation: '+b.id);
    }
    return {id:b.id,households:places.households??null,residentPlaces:places.residentPlaces??null,visitorBeds:places.visitorBeds??null};
  });
  if(new Set(buildings.map(b=>b.id)).size!==buildings.length)throw Error('Duplicate civic building identity.');
  return {regional,buildings,visitorBeds:buildings.reduce((n,b)=>n+(b.visitorBeds??0),0),
    accommodationComplete:buildings.length>0&&buildings.every(b=>b.households!==null&&b.residentPlaces!==null&&b.visitorBeds!==null),
    scale:'representative',populationAllocatedToBuildings:false};
}

function recentReliefBattles(battles,day,config){
  const relevant=new Set(config.reliefRegions),seen=new Set();
  return battles.filter(b=>{
    if(!relevant.has(b.region)||!['active','resolved'].includes(b.status))return false;
    const when=b.status==='resolved'?b.resolvedOn:b.started;
    if(!finite(when)||when>day||(b.status==='resolved'&&day-when>config.battleWindow))return false;
    // A pending battle is not an additional arrival of refugees. This is only
    // a pressure signal for the city's existing charity presentation.
    const id=b.id??[b.region,b.started,b.resolvedOn,b.status].join(':');
    if(seen.has(id))return false;seen.add(id);return true;
  }).length;
}

function reliefState(food,recentBattles){
  const causes=[];
  if(food.ration<1-EPS)causes.push('reduced-rations');
  if(food.unrest>=.2)causes.push('civilian-distress');
  if(food.reserveRatio!==null&&food.reserveRatio<.4)causes.push('low-reserves');
  if(recentBattles)causes.push('nearby-fighting');
  const level=food.ration<.7||food.unrest>=.6?'critical':causes.length?'strained':'manageable';
  return {level,causes,recentBattles,populationMovementModeled:false};
}

/** Read-only allocation of the authoritative regional ledger. This projection
 * owns no stock, timer, transfer, spending command or resident population.
 * Institutional shares are tuning supplied by content; a sealed temple share
 * is private bookkeeping here, not a stockpile exempted from food.js rations.
 * Consumed food is partitioned only after an actual economic tick. */
export function deriveMinoraCivicState(region,{config,day=0,battles=[],buildings=[]}={}){
  const housing=minoraHousingReport(region,buildings);
  if(!region.food)return {available:false,projection:true,food:null,
    relief:{level:'unknown',causes:[],recentBattles:0,populationMovementModeled:false},services:null,housing};
  validateConfig(config);
  if(!finite(day)||!Array.isArray(battles))throw Error('Invalid civic campaign context.');
  const f=region.food;
  if(!finite(f.store)||!finite(f.population)||!finite(f.civilianRation,0,1)||
    !finite(f.militaryRation,0,1)||!finite(f.unrest,0,1))throw Error('Invalid civic food source.');
  const recorded=f.last!==null&&f.last!==undefined;
  if(recorded&&(!finite(f.last.civilianDemand)||!finite(f.last.consumed)))throw Error('Invalid civic consumption source.');
  const civilianDemand=recorded?f.last.civilianDemand:null;
  // Local battle reconciliation can alter military demand without another food
  // tick. Never apportion more than the ledger actually records as consumed.
  const civilianConsumed=recorded?Math.min(f.last.consumed,civilianDemand*f.civilianRation):0;
  const guild=civilianConsumed*config.guildMealShare,templeRelief=civilianConsumed*config.charityMealShare;
  const granary=f.store*config.storageShares.granary,templeTotal=f.store*config.storageShares.temple;
  const sealed=f.store*(config.sealedTempleShare??0);
  const food={store:f.store,storage:{granary,temple:{total:templeTotal,open:templeTotal-sealed,sealed},merchants:Math.max(0,f.store-granary-templeTotal)},
    civilianDemand,civilianConsumed,allocations:{households:Math.max(0,civilianConsumed-guild-templeRelief),guild,templeRelief},
    recorded,ration:f.civilianRation,militaryRation:f.militaryRation,unrest:f.unrest,
    reserveRatio:config.reserveTarget>0?f.store/config.reserveTarget:null};
  const relief=reliefState(food,recentReliefBattles(battles,day,config));
  const status=f.civilianRation<1-EPS?'reduced':recorded?'supplied':'ready';
  return {available:true,projection:true,food,relief,
    services:{guild:{status,consumed:guild},templeRelief:{status,consumed:templeRelief}},housing};
}

/** Deliberate disclosure boundary. Player-facing inspections/dialogue receive
 * this allowlisted report, never the internal inventory allocation above.
 * Quantities, ownership weights and sealed reserves cannot be inferred from
 * exact public sub-totals supplied by this report. */
export function minoraPublicCivicReport(civic){
  if(!civic.available)return {available:false,reliefLevel:'unknown',
    granary:'The city granary receives provisions for Minora.',market:'Private merchants supply the daily market.',
    guild:'The city supports the Guild in return for teaching, engineering and public service.',
    temple:'The temple offers meals and shelter without asking which league a civilian supports.',
    relief:'The present supply situation has not been assessed.'};
  const {food,relief}=civic,short=food.ration<1-EPS,low=relief.causes.includes('low-reserves');
  return {available:true,reliefLevel:relief.level,
    granary:short?'Food is being rationed across the city.':low?'Meals are reaching the city, but its provisions are running low.':'The city granary is supporting regular meals.',
    market:short?'Traders are working with the same shortage that affects the city.':'Private merchants supply the daily market.',
    guild:short?'The Guild shares the city’s reduced rations while continuing its public duties.':'The Guild’s food allowance comes from existing city provisions, supporting teaching, engineering and public service.',
    temple:short?'The temple’s charitable kitchen is serving reduced meals to people in need, regardless of their league.':'The temple serves meals to homeless residents and civilian refugees from either league.',
    relief:relief.level==='critical'
      ?short?'The relief kitchen is under severe strain while the city receives reduced meals.':'The relief kitchen remains under severe strain from civilian distress, although full meals have resumed.'
      :relief.level==='strained'
      ?relief.causes.includes('nearby-fighting')&&!short&&!low&&!relief.causes.includes('civilian-distress')
        ?'Nearby fighting is putting pressure on the relief kitchen; ordinary meals remain supplied.'
        :'The relief kitchen is under strain as the city’s supply situation worsens.'
      :'The relief kitchen can manage its present needs.'};
}
