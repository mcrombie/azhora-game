// Only the current context holds time. Returning to outdoor play resumes it
// immediately, even while standing still; no movement or reading latch remains.
export function createAdventureTimeGate(){
  return {
    reason({mode='playing',room=null,active=true,reading=false,mapRunning=false}={}){
      if(room==='tower'||room==='lookout')return "Taleth's tower / Time stands still";
      if(!active)return 'Time held / Return to the game';
      if(room)return 'Time held indoors';
      if(mode!=='playing'&&!(mode==='map'&&mapRunning))return 'Time held';
      return reading?'Reading / Close the report to resume':null;
    },
  };
}
