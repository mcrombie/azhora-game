/** Internal, fixed-frame recording of the current new-game campaign. No desktop capture.
 * Run: node scripts/record-lizeem-war.mjs --side=west --out=tests/artifacts/demos/my-demo
 * Rehearse without encoding: add --dry-run. Short AV proof: add --seconds=15.
 * Requires installed Playwright/Chromium and full FFmpeg (resolved locally by recorder.mjs).
 * Uses an isolated browser profile, normal character inputs and the game's map time controls.
 * Outputs the silent picture, synchronized raw WAV, H.264/AAC MP4, chapters and audit report.
 * A full run succeeds only after the actual campaign winner and Taleth's conclusion exist.
 */
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {getBrowserDeps,startServer,screenCapture,createVideo,writeContactSheet,log,ROOT} from './lib/recorder.mjs';
import {installVirtualClock} from './lib/virtual-clock.mjs';
import {installDemoAudio} from '../src/dev/demo/audio-capture.js';

const argv=process.argv.slice(2),value=(name,fallback)=>argv.find(a=>a.startsWith(name+'='))?.slice(name.length+1)??fallback;
const dry=argv.includes('--dry-run'),fps=30,side=value('--side','west'),seconds=Number(value('--seconds',7200));
const width=Number(value('--width',dry?960:1920)),height=width*9/16;
const folder=path.resolve(value('--out',path.join(ROOT,'tests/artifacts/demos',new Date().toISOString().replace(/[:.]/g,'-'))));
fs.mkdirSync(folder,{recursive:true});
const files={silent:path.join(folder,'picture.mp4'),video:path.join(folder,'Azhora-Lizeemi-War.mp4'),wav:path.join(folder,'soundtrack.wav'),
  audio:path.join(folder,'audio-events.json'),report:path.join(folder,'report.json'),sheet:path.join(folder,'contact-sheet.jpg')};
const deps=await getBrowserDeps(),server=await startServer(),origin=`http://127.0.0.1:${server.address().port}`;
let browser,context,page,video,frame=0,loops=0,lastStage='',lastNote=Date.now(),lastShot=-1,loadFrames=0;
const began=Date.now(),errors=[],fatalErrors=[],shots=[],stages=[],report={side,dry,fps,width,height,started:new Date().toISOString(),files};
function command(exe,args){return new Promise((resolve,reject)=>{const child=spawn(exe,args,{windowsHide:true,stdio:['ignore','pipe','pipe']});let out='',err='';
  child.stdout.on('data',b=>out+=b);child.stderr.on('data',b=>err=(err+b).slice(-12000));child.on('error',reject);
  child.on('close',code=>code===0?resolve(out):reject(Error(`${path.basename(exe)} exited ${code}: ${err}`)));});}
function save(){fs.writeFileSync(files.report,JSON.stringify({...report,frames:frame,seconds:frame/fps,loadFrames,wallSeconds:(Date.now()-began)/1000,stages,errors},null,2));}
try{
  browser=await deps.chromium.launch({executablePath:deps.executablePath,headless:true,args:[...deps.args,'--autoplay-policy=no-user-gesture-required']});
  context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
  await context.addInitScript(installVirtualClock,{});
  await context.addInitScript(installDemoAudio,{seed:87});
  page=await context.newPage();page.setDefaultTimeout(120000);
  page.on('pageerror',e=>{const text=String(e.stack??e);errors.push(text);fatalErrors.push(text);});
  page.on('console',m=>{if(m.type()==='error')errors.push(`${m.text()} ${m.location().url??''}`.trim());});
  await page.goto(origin+'/index.html?test=1&menu=1',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#new-world-war',{state:'visible'});
  await page.evaluate(async({side})=>{
    window.__AZHORA_DEMO_TIME__=0;window.__AZHORA_DEMO_AUDIO_CAPTURE__.start();
    window.__demo=(await import('./src/dev/demo/campaign-driver.js')).createCampaignDemo({side,tour:false});
    window.__freezeClock({timers:true,animations:true});window.__demo.begin();
    document.body.classList.add('recording');
  },{side});
  // A trusted gesture unlocks the launcher's audio host; the recording context
  // is silent and follows the video clock, with sound rendered offline later.
  await page.mouse.click(4,4);
  await page.addStyleTag({content:'body.recording #open-developer{display:none!important}'});
  const capture=await screenCapture(page,{quality:95});
  if(!dry)video=createVideo({out:files.silent,fps,ffmpeg:deps.ffmpeg,crf:20,preset:'medium'});
  log(dry?'Rehearsing':'Recording',side,`${width}x${height}`,folder);
  while(frame/fps<seconds){
    const result=await page.evaluate(({time,dt})=>{
      const before=window.__demo.state();
      // Loading is cut; normal gameplay, conversations and map waiting are filmed.
      const cut=before.loading||['opening','world-loading','prepare-country','ascent','tower-return'].includes(before.stage)&&before.busy;
      window.__AZHORA_DEMO_TIME__=time;window.__AZHORA_DEMO_AUDIO_CAPTURE__.setRecording(!cut);
      window.__demo.tick(dt);const callbacks=window.__tick(dt*1000),s=window.__demo.state();
      return {s,cut,callbacks};
    },{time:frame/fps,dt:1/fps});
    loops++;const s=result.s;report.state=s;
    if(s.error)throw Error(s.error);
    if(fatalErrors.length)throw Error(fatalErrors.at(-1));
    if(s.stage!==lastStage){lastStage=s.stage;stages.push({at:frame/fps,...s});log(`${(frame/fps).toFixed(1)}s`,s.stage,s.caption,JSON.stringify(s.position));save();}
    if(result.cut){loadFrames++;if(loadFrames>fps*1800)throw Error('Loading exceeded 30 minutes of virtual time');}
    else{
      let jpeg;
      if(!dry) {jpeg=await capture();await video.write(jpeg);}
      if(lastShot<0||frame/fps-lastShot>=45||s.done){
        jpeg??=await capture();shots.push({jpeg,label:`${Math.floor(frame/fps/60)}:${String(Math.floor(frame/fps)%60).padStart(2,'0')} ${s.caption}`});
        fs.writeFileSync(path.join(folder,`frame-${String(frame).padStart(6,'0')}.jpg`),jpeg);lastShot=frame/fps;
      }
      frame++;
    }
    if(s.done)break;
    if(Date.now()-lastNote>20000){lastNote=Date.now();log('progress',`${(frame/fps).toFixed(1)}s`,s.stage,s.seconds.toFixed(1),`war=${s.campaignSeconds.toFixed(1)}`,`wall=${Math.round((Date.now()-began)/1000)}s`);save();}
    if(loops%10===0)await new Promise(r=>setImmediate(r));
  }
  const captured=await page.evaluate(()=>window.__AZHORA_DEMO_AUDIO_CAPTURE__.snapshot());
  fs.writeFileSync(files.audio,JSON.stringify(captured));report.audioEvents=captured.events.length;
  report.finished=!!report.state.done;report.preview=!report.finished;
  if(!report.finished&&!argv.some(a=>a.startsWith('--seconds=')))throw Error('Campaign did not reach its conclusion');
  if(video){report.picture=await video.finish();video=null;}
  await writeContactSheet({context},shots,files.sheet,{columns:4,width:400});
  if(!dry){
    log('Rendering synchronized soundtrack',captured.events.length,'events');
    await context.close();context=await browser.newContext();page=await context.newPage();
    await page.goto(origin+'/index.html?menu=1',{waitUntil:'domcontentloaded'});
    const rendered=await page.evaluate(async args=>{
      window.__render=await import('./src/dev/demo/audio-render.js');return window.__render.renderDemoAudio(args);
    },{events:captured.events,duration:frame/fps,settings:captured.settings,rate:48000,seed:87});
    report.soundtrack=rendered.report;
    const fd=fs.openSync(files.wav,'w');
    try{for(let offset=0;offset<rendered.bytes;offset+=1048576){
      const chunk=await page.evaluate(offset=>window.__render.readDemoAudioChunk(offset,1048576),offset);fs.writeSync(fd,Buffer.from(chunk,'base64'));
    }}finally{fs.closeSync(fd);}
    await page.evaluate(()=>window.__render.releaseDemoAudio());
    log('Muxing H.264 picture and AAC stereo sound');
    await command(deps.ffmpeg,['-hide_banner','-loglevel','error','-y','-i',files.silent,'-i',files.wav,'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','192k','-ar','48000','-movflags','+faststart','-shortest',files.video]);
    report.media=JSON.parse(await command(deps.ffprobe,['-v','error','-show_streams','-show_format','-of','json',files.video]));
    const streams=report.media.streams;
    if(!streams.some(s=>s.codec_name==='h264')||!streams.some(s=>s.codec_name==='aac'))throw Error('Final recording is missing picture or sound');
    if(streams.some(s=>Math.abs(Number(s.duration)-frame/fps)>.1))throw Error('Final audio/video duration mismatch');
  }
  const chapterStages=new Set(['menu','uguth-read','portal-read','allegiance-read','bear-read','voyage','battle-brief','return-home','final-invitation','lookout-read']);
  const stamp=t=>`${Math.floor(t/60)}:${String(Math.floor(t)%60).padStart(2,'0')}`;
  const chapters=stages.filter(s=>chapterStages.has(s.stage)).map(s=>`${stamp(s.at)} ${s.stage==='battle-brief'?`Battle at ${s.currentBattle?.region??'the next front'}`:s.caption}`);
  fs.writeFileSync(path.join(folder,'youtube-chapters.txt'),chapters.join('\n')+'\n');
  report.success=true;save();log(report.finished?'Complete campaign':'Preview complete',folder);
}catch(e){
  report.success=false;report.failure=String(e.stack??e);log('FAILED',report.failure);
  if(page&&!page.isClosed()){await page.screenshot({path:path.join(folder,'failure.png')}).catch(()=>{});
    report.diagnostic=await page.evaluate(()=>({clock:window.__clock?.(),stillroom:window.__STILLROOM__?.state(),world:window.__EXPLORATION__?.state(),text:document.body.innerText})).catch(()=>null);}
  if(video){await video.finish().catch(()=>video.abort());video=null;}
  save();process.exitCode=1;
}finally{
  await browser?.close().catch(()=>{});await new Promise(r=>server.close(r));
}
