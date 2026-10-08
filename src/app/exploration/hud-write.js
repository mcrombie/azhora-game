// Frame-driven prompts stay responsive without invalidating the same DOM state
// on every animation frame. Dialogue and one-off actions can still write normally.
export function writeHud(element,property,value){
  if(element[property]!==value)element[property]=value;
}
