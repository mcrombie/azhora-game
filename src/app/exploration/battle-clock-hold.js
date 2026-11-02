// An encounter suspends the clock without changing the player's run/pause
// preference. Rewind/save checkpoints must retain that preference, not the
// temporary suspension, or returning from a retried battle strands time.
export function createBattleClockHold(getSession){
  let resumeAfter=null;
  const running=()=>resumeAfter??getSession().clock().running;
  return {
    running,
    hold(){resumeAfter??=getSession().clock().running;getSession().pause();},
    release(){
      const resume=resumeAfter;resumeAfter=null;
      const session=getSession();
      if(resume&&!session.clock().running)session.toggle();
    },
    restore(saved){resumeAfter=getSession().snapshot().pending?saved?.tower?.running??null:null;},
    pause(){if(resumeAfter!==null)resumeAfter=false;getSession().pause();},
    run(){
      if(resumeAfter!==null){resumeAfter=true;return;}
      const session=getSession();if(!session.clock().running)session.toggle();
    },
  };
}
