import {FOOD_EXPERIMENTS,runFoodExperiment} from '../src/dev/food/food-experiments.js';

const args=process.argv.slice(2);
const help=`Lizeem food experiments (no graphics or player saves)\n\n  npm run simulate:food\n  npm run simulate:food -- --case=imports-restored --days=35\n  npm run simulate:food -- --case=war --seed=42 --days=60\n  npm run simulate:food -- --case=normal --json\n\nCases: all, ${Object.keys(FOOD_EXPERIMENTS).join(', ')}\nDefault: all cases, 35 campaign days, seed 1731.\nThe economic comparisons hold armies and recruitment fixed; 'war' runs both.\nRestoration occurs after day 20. Wars stop at their actual victory day.\n--json includes daily ledgers, final state, seed and replayable commands.\n`;
try{
  if(args.includes('--help')){console.log(help);process.exit(0);}
  if(args.some(a=>a!=='--json'&&!/^--(case|days|seed)=.+$/.test(a)))throw Error('Unknown argument. Use --help.');
  const value=(name,fallback)=>{const found=args.filter(a=>a.startsWith(`--${name}=`));if(found.length>1)throw Error(`Duplicate --${name}.`);return found.length?found[0].slice(name.length+3):fallback;};
  const selected=value('case','all'),days=Number(value('days','35')),seed=value('seed','1731');
  const names=selected==='all'?Object.keys(FOOD_EXPERIMENTS):[selected];
  const results=names.map(name=>runFoodExperiment(name,{days,seed}));
  if(args.includes('--json'))console.log(JSON.stringify(results.length===1?results[0]:results,null,2));
  else for(const result of results){
    console.log(`\n${result.name}: ${result.description}`);
    console.log(`Day ${result.day}/${result.requestedDays}; seed ${result.seed}; replay verified${result.winner?`; winner: ${result.winner}`:''}`);
    const milestones=new Set([1,7,14,15,20,21,28,result.day]);
    console.table(result.history.filter(h=>milestones.has(h.day)).map(h=>{
      const minora=h.regions.find(r=>r.id==='isareos'),nesdor=h.regions.find(r=>r.id==='nesdor');
      return {day:h.day,'Minora store':Math.round(minora.store),'Minora imports':+minora.imports.toFixed(1),
        'Minora fed':`${Math.round(minora.civilianRation*100)}%`,'Minora stability':`${Math.round(minora.stability*100)}%`,
        'Nesdor store':Math.round(nesdor.store),'Nesdor fed':`${Math.round(nesdor.civilianRation*100)}%`};
    }));
    console.table(result.history.at(-1).regions.map(r=>({region:r.id,owner:r.owner,store:+r.store.toFixed(1),
      production:+r.production.toFixed(1),demand:+r.demand.toFixed(1),imports:+r.imports.toFixed(1),exports:+r.exports.toFixed(1),
      'stability %':Math.round(r.stability*100),'garrison readiness %':Math.round(r.readiness*100)})));
    const losses=result.state.events.filter(e=>e.type==='food-attrition').reduce((n,e)=>n+e.strength,0);
    const error=Math.max(...result.history.map(h=>Math.abs(h.ledger.opening+h.ledger.produced-h.ledger.consumed-h.ledger.lost-h.ledger.closing)));
    console.log(`Troops lost to hunger: ${losses}. Maximum food-accounting error: ${error.toExponential(2)} units.`);
  }
}catch(error){console.error(error.message);process.exitCode=1;}
