import { chooseLoadingMode } from './app/startup/loading-choice.js';

// Keep world modules out of the ten-second decision screen. Automated checks
// keep their established full-world path unless they explicitly request Fast.
const query = new URLSearchParams(location.search);
if (query.has('test') && !query.has('load')) query.set('load', 'full');
try {
  if(query.get('scene')==='climate-annex'){
    const {startClimateAnnex}=await import('./experiments/climate-annex/climate-annex.js');startClimateAnnex();
  }else{
  globalThis.__AZHORA_LOADING_MODE__ = await chooseLoadingMode({ search: query.toString() });
  // Keep the choice across in-app renderer reloads, without making it a saved
  // preference. A fresh desktop launch still offers the ten-second Full default.
  const launchURL=new URL(location.href);
  launchURL.searchParams.set('load',globalThis.__AZHORA_LOADING_MODE__);
  history.replaceState(null,'',launchURL.href);
  await import('./main.js');
  }
} catch (error) {
  console.error(error);
  document.getElementById('loading')?.classList.add('hidden');
  const fatal = document.getElementById('fatal');
  if(!fatal&&query.get('scene')==='climate-annex'){const notice=document.createElement('p');notice.style.cssText='position:fixed;top:120px;left:32px;background:#173d34;padding:20px;color:#fff';notice.textContent='The annex could not load: '+error.message;document.body.append(notice);}
  if (fatal) { fatal.classList.remove('hidden'); fatal.dataset.stack = String(error?.stack ?? error); }
  const message = document.getElementById('fatal-message');
  if (message) message.textContent = 'Please close and reopen the game. ' + (error?.message ?? error);
}
