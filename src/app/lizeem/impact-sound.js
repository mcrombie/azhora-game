/** The encounter's small synthesized impact cues, shared with offline demo audio. */
export function playImpactSound(context,kind,destination=context.destination,at=context.currentTime){
  const tone=(frequency,end,duration,gain,type='triangle',delay=0)=>{
    const t=at+delay,osc=context.createOscillator(),volume=context.createGain();
    osc.type=type;osc.frequency.setValueAtTime(frequency,t);osc.frequency.exponentialRampToValueAtTime(end,t+duration);
    volume.gain.setValueAtTime(.0001,t);volume.gain.exponentialRampToValueAtTime(gain,t+.004);volume.gain.exponentialRampToValueAtTime(.0001,t+duration);
    osc.connect(volume);volume.connect(destination);osc.start(t);osc.stop(t+duration+.01);
    osc.onended=()=>{osc.disconnect();volume.disconnect();};
  };
  if(kind==='guarded'){tone(980,650,.12,.035);tone(1510,1000,.07,.012,'sine');}
  else if(kind==='counter'){tone(150,55,.13,.09);tone(440,660,.16,.028,'sine',.015);}
  else if(kind==='hurt'){tone(85,38,.2,.1,'sine');tone(140,45,.11,.045);}
  else tone(180,60,.11,.065);
}
