// Observe the shipped requestAnimationFrame loop. Do not drive a.step(), input,
// focus, position, clock or quest state: those can conceal transition races.
export async function watch(a,{full=false}={}){
  const begun=performance.now(),stages=[];let previous='';
  while(performance.now()-begun<(full?1800000:180000)){
    const s=a.campaignAutoplay.state(),key=s.stage+':'+s.busy;
    const notice=document.getElementById('exploration-status').textContent;
    if(s.stage==='door'&&notice.startsWith('The doorway could not open:'))throw Error(notice);
    if(key!==previous){previous=key;const point={...s,mode:a.state().mode,position:a.state().position,wallMs:Math.round(performance.now()-begun)};stages.push(point);console.log('EXPLORATION_REALTIME '+JSON.stringify(point));}
    if(full&&s.stage==='complete'){if(!a.tower.state().concluded||!a.war.state().campaign.winner)throw Error('Autoplay stopped before the finale');return {stages,driver:s,winner:a.war.state().campaign.winner,day:a.war.state().campaign.day,errors:a.state().frameErrors};}
    if(!s.active)throw Error('Real-time autoplay stopped: '+JSON.stringify({driver:s,mode:a.state().mode,position:a.state().position,notice:document.getElementById('exploration-status').textContent,frameErrors:a.state().frameErrors}));
    if(!full&&s.stage==='fight'&&s.seconds>2)return {stages,driver:s,errors:a.state().frameErrors};
    await new Promise(r=>setTimeout(r,100));
  }
  throw Error('Real-time rehearsal timed out: '+JSON.stringify({driver:a.campaignAutoplay.state(),mode:a.state().mode,notice:document.getElementById('exploration-status').textContent,errors:a.state().frameErrors}));
}
