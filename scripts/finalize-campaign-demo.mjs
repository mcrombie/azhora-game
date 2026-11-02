/** Master and verify a completed internal campaign recording for sharing.
 * Usage: node scripts/finalize-campaign-demo.mjs tests/artifacts/demos/my-demo
 */
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {findFfmpeg,findFfprobe,log} from './lib/recorder.mjs';
import {masterAudio,measureAudio} from './lib/audio-master.mjs';

const folder=path.resolve(process.argv[2]??''),reportPath=path.join(folder,'report.json');
const report=JSON.parse(fs.readFileSync(reportPath,'utf8'));
if(!report.success||!report.finished||!report.state?.done||!report.state.winner||!report.state.concluded)
  throw Error('Only a completed, verified campaign can be finalized.');
const mastered=path.join(folder,'soundtrack-mastered.wav'),output=path.join(folder,'Azhora-Lizeemi-War-YouTube.mp4');
if(fs.existsSync(output))throw Error('Final movie already exists; keep it or choose a different recording folder.');
const ffmpeg=findFfmpeg(),ffprobe=findFfprobe();
const run=(exe,args)=>new Promise((resolve,reject)=>{
  const child=spawn(exe,args,{windowsHide:true,stdio:['ignore','pipe','pipe']});let out='',err='';
  child.stdout.on('data',b=>out+=b);child.stderr.on('data',b=>err=(err+b).slice(-12000));
  child.once('error',reject);child.once('close',code=>code===0?resolve(out):reject(Error(`${path.basename(exe)} exited ${code}: ${err}`)));
});

log('Measuring and mastering the complete soundtrack');
const audio=await masterAudio({input:report.files.wav,output:mastered});
fs.writeFileSync(path.join(folder,'audio-mastering.json'),JSON.stringify(audio,null,2));
const side=report.side==='west'?'West Lizeem':'East Lizeem';
const endingFade={seconds:2,start:Math.max(0,report.seconds-2),curve:'hsin'};
log('Writing the sharing copy');
await run(ffmpeg,['-hide_banner','-loglevel','error','-nostdin','-n','-i',report.files.silent,'-i',mastered,
  '-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','192k','-ar','48000',
  '-af',`afade=t=out:st=${endingFade.start}:d=${endingFade.seconds}:curve=${endingFade.curve}`,
  '-movflags','+faststart','-shortest',
  '-metadata',`title=Azhora — Lizeemi War Campaign (${side})`,
  '-metadata','comment=Internal automated playthrough of the current development build. Game music, birdsong and combat audio.',output]);
log('Checking every encoded frame and the final audio');
await run(ffmpeg,['-v','error','-xerror','-err_detect','explode','-nostdin','-i',output,'-map','0:v:0','-map','0:a:0','-f','null','-']);
const media=JSON.parse(await run(ffprobe,['-v','error','-count_frames','-show_streams','-show_format','-of','json',output]));
const picture=media.streams.find(s=>s.codec_type==='video'),sound=media.streams.find(s=>s.codec_type==='audio');
if(picture?.codec_name!=='h264'||picture.width!==report.width||picture.height!==report.height||picture.pix_fmt!=='yuv420p'
  ||Number(picture.nb_read_frames)!==report.frames||picture.r_frame_rate!==`${report.fps}/1`)
  throw Error('The final picture does not match the recorded frame count, dimensions, or format.');
if(sound?.codec_name!=='aac'||sound.channels!==2||Number(sound.sample_rate)!==48000)
  throw Error('Final sound format is incorrect.');
if([picture,sound].some(s=>!Number.isFinite(Number(s.duration))||Math.abs(Number(s.duration)-report.seconds)>.1))throw Error('Sound and picture durations do not match.');
const finalAudio=await measureAudio(output);
if(!Number.isFinite(finalAudio.integratedLufs)||!Number.isFinite(finalAudio.truePeakDb)||finalAudio.truePeakDb>=0)throw Error('Final AAC audio is silent or clips.');
const chapterFile=path.join(folder,'youtube-chapters.txt');
// YouTube chapters start at 00:00 and each span at least ten seconds.
// https://support.google.com/youtube/answer/9884579
const chapterEntries=[];
const chapterTitles={
  'Begin the Lizeemi War':'Opening: the Spirit and Time Realm',
  'Uguth explains preparation':"Uguth's combat tutorial",
  'Azhora awaits':'Through the doorway to Azhora',
  'Ready to ride':'Return to Minora',
  'The river country after the war':"Taleth and the war's aftermath",
  'The Lizeem country':'Guild lookout: campaign conclusion',
};
for(const line of fs.readFileSync(chapterFile,'utf8').trim().split(/\r?\n/)){
  const match=/^(\d+):(\d{2}) (.+)$/.exec(line);
  if(!match)throw Error('Invalid chapter timestamp: '+line);
  const at=Number(match[1])*60+Number(match[2]);
  if(!chapterEntries.length||at-chapterEntries.at(-1).at>=10)
    chapterEntries.push({at,title:chapterTitles[match[3]]??match[3].replace(/Battle at (\w)/g,(_,letter)=>'Battle at '+letter.toUpperCase())});
}
while(chapterEntries.length&&report.seconds-chapterEntries.at(-1).at<10)chapterEntries.pop();
if(chapterEntries.length<3||chapterEntries[0].at!==0)throw Error('Chapter list must begin at zero and contain at least three chapters.');
const chapters=chapterEntries.map(({at,title})=>`${String(Math.floor(at/60)).padStart(2,'0')}:${String(at%60).padStart(2,'0')} ${title}`).join('\n')+'\n';
fs.writeFileSync(chapterFile,chapters);
const description=`Azhora — Lizeemi War Campaign (${side})\n\nA complete playthrough of the current development build: the Spirit and Time Realm opening, Uguth's combat tutorial, the Lizeemi campaign and Taleth's conclusion.\n\nIncludes the game's music, birdsong and combat sounds. Recorded internally with automated character inputs at ${report.width}×${report.height}, ${report.fps} fps. Loading screens are omitted; waits use the game's visible map time controls.\n\n${chapters}`;
fs.writeFileSync(path.join(folder,'youtube-description.txt'),description);
const final={file:output,bytes:fs.statSync(output).size,seconds:report.seconds,width:picture.width,height:picture.height,fps:report.fps,
  frames:report.frames,side,winner:report.state.winner,battles:report.state.battles,concluded:report.state.concluded,
  fullDecodePassed:true,media,audioMastering:audio,endingFade,chapters:chapterEntries,encodedAudio:finalAudio};
fs.writeFileSync(path.join(folder,'final-verification.json'),JSON.stringify(final,null,2));
log('Ready to share',output,`${(final.bytes/1048576).toFixed(1)} MiB`,`${final.seconds.toFixed(2)} seconds`);
