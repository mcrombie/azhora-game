// Authored chapters supply rules, not a second rendering-owned campaign state.
// Commands are transactional: a rejected command or invalid restore changes nothing.
export function createAuthoredCampaign(rules, initial) {
  const copy=value=>structuredClone(value);
  if(!rules.validate(initial))throw Error('Incompatible chapter state.');
  let state=copy(initial);
  return {
    snapshot:()=>copy(state),
    command(command){
      const next=copy(state),result=rules.reduce(next,copy(command));
      if(!result?.ok)return result??{ok:false,reason:'Unknown chapter command.'};
      if(!rules.validate(next))throw Error('Chapter command produced invalid state.');
      state=next;return result;
    },
    advance(seconds,active=true){
      if(!active)return {ok:true,changed:false};
      if(!Number.isFinite(seconds)||seconds<0)return {ok:false,reason:'Invalid elapsed time.'};
      return this.command({type:'advance',seconds});
    },
    restore(value){if(!rules.validate(value))return {ok:false,reason:'Incompatible chapter state.'};state=copy(value);return {ok:true};},
  };
}
