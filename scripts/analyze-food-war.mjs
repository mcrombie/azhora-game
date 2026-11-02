import {analyzeWarFood} from '../src/dev/food/war-balance.js';
try{
  const args=process.argv.slice(2);
  if(args.includes('--help')){
    console.log('Food-war balance audit: --days=120 --seeds=1731,1,2,3 --json --compare-planning\nDefault: seed 1731 and seeds 1–31, six matched cases, at most 120 days.\n--compare-planning also runs the previous food-war planning rules.\nAll runs stop at victory; unresolved results are reported, not counted as draws.');
  }else{
    if(args.some(a=>!['--json','--compare-planning'].includes(a)&&!/^--(days|seeds)=.+$/.test(a)))throw Error('Unknown argument; use --help.');
    const option=name=>{const values=args.filter(a=>a.startsWith(`--${name}=`));if(values.length>1)throw Error('Duplicate '+name);return values[0]?.slice(name.length+3);};
    const settings={days:Number(option('days')??120),...(option('seeds')?{seeds:option('seeds').split(',')}: {})};
    const result=analyzeWarFood(settings);
    if(args.includes('--compare-planning'))result.previous=analyzeWarFood({...settings,planning:false});
    if(args.includes('--json'))console.log(JSON.stringify(result,null,2));
    else{
      console.log(`Food war: ${result.seeds.length} paired seeds, up to ${result.days} days. Every run verifies replay.`);
      console.table(result.summary.map(s=>Object.fromEntries(Object.entries(s).map(([k,v])=>[k,typeof v==='number'?Math.round(v*10)/10:v]))));
      if(result.previous){console.log('Previous planning (same seeds, food targets and military tuning):');console.table(result.previous.summary);}
      console.log('No-food control retains three-day battles; it has no supply planning. Supply-driven divergence also changes later random draws.\nPost-victory recovery is not measured: the campaign clock stops at victory. Repair cases restore production after day 20 only if the war is still active.');
    }
  }
}catch(error){console.error(error.message);process.exitCode=1;}
