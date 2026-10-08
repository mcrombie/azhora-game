// Only a destination is saved. Coordinates and descriptions are resolved from
// current knowledge on load, so a bookmark cannot reveal an unknown army.
export const COUNCIL_DESTINATIONS=['council','mayor','temple'];
export function validWarNavigation(value){
  if(value===undefined||value===null)return true;
  if(typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['kind','id'].includes(k)))return false;
  if(value.kind==='opening')return ['bear',...COUNCIL_DESTINATIONS].includes(value.id);
  return ['army','battle'].includes(value.kind)&&(typeof value.id==='string'&&value.id.length>0&&value.id.length<=128||Number.isSafeInteger(value.id)&&value.id>=0);
}
export function savedWarNavigation(saved){
  if(saved?.afterlife?.inLimbo)return null;
  if(saved&&Object.hasOwn(saved,'navigation'))return validWarNavigation(saved.navigation)&&saved.navigation?{...saved.navigation}:null;
  // Older saves already past the horse handoff should not restart that guide.
  return saved?.riding?.owned?null:{kind:'opening',id:'bear'};
}
