// Give a spectator time to read the visible passage. Collapsed background
// detail is excluded by the host; Stop/Resume remains available throughout.
export function autoplayReadingTime(text,minimum=8){
  const words=String(text??'').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(minimum,Math.min(60,2+words/3.5));
}
