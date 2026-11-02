/** Shorten an existing recorded campaign's reading pauses, preserving gameplay.
 * node scripts/trim-campaign-dialogue.mjs <recording-folder> [--plan-only]
 */
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {findFfmpeg,findFfprobe,log} from './lib/recorder.mjs';
import {measureAudio} from './lib/audio-master.mjs';

const source=path.resolve(process.argv[2]??''),out=path.join(source,'dialogue-cut');
const report=JSON.parse(fs.readFileSync(path.join(source,'report.json'),'utf8'));
if(!report.success||!report.finished||!report.state?.concluded||report.fps!==30)throw Error('Expected a complete 30fps campaign recording.');
const fps=report.fps,rate=48000,samplesPerFrame=rate/fps;
const film=path.join(out,'Azhora-Lizeemi-War-Short-Dialogues.mp4'),wav=path.join(out,'soundtrack-edited.wav');
if(fs.existsSync(film)||fs.existsSync(wav))throw Error('Edited media already exists; preserve the previous export.');
fs.mkdirSync(out,{recursive:true});
const stages=report.stages.filter(s=>s.stage!=='complete').map(s=>({...s,frame:Math.round(s.at*fps)}));
// Recorder stage logging deduplicates equal stage names. Recover consecutive
// dialogue pages from the director's timeline within the same filmed stage.
for(let i=0;i<stages.length;i++){
  const s=stages[i],end=stages[i+1]?.frame??report.frames;
  const pages=report.state.timeline.filter(t=>t.stage===s.stage&&t.total>=s.total-.01&&t.total<s.total+(end-s.frame)/fps-.01);
  for(const page of pages){
    const frame=s.frame+Math.round((page.total-s.total)*fps);
    if(frame>s.frame&&frame<end)stages.push({...s,caption:page.caption,frame,at:frame/fps,total:page.total});
  }
  // The source list has at most one repeated-page stage in this recording.
  if(stages.length!==report.stages.length-1)break;
}
stages.sort((a,b)=>a.frame-b.frame);
const reading=new Set(['introduction-read','uguth-read','training-brief','training-result','portal-read',
  'allegiance-read','allegiance-confirm','bear-read','harbor-read','battle-brief','battle-result',
  'map-wait-read','final-invitation','lookout-read','complete-read']);
const cuts=[],boxes=[];
for(let i=0;i<stages.length;i++){
  const s=stages[i];if(!reading.has(s.stage))continue;
  const end=stages[i+1]?.frame??report.frames;
  // A result stage begins before the 1.25-second enemy fall/report reveal.
  // Retain that animation, then three seconds of the actual report.
  const reveal=s.stage.endsWith('-result')?38:0;
  const firstFrames=15,lastFrames=75;
  const start=s.frame+reveal+firstFrames,stop=end-lastFrames;
  const box={stage:s.stage,caption:s.caption,startFrame:s.frame,dialogueFrame:s.frame+reveal,endFrame:end,
    originalSeconds:(end-s.frame-reveal)/fps,retainedReadingSeconds:Math.min(90,end-s.frame-reveal)/fps};
  boxes.push(box);
  if(stop>start)cuts.push({start,end:stop,stage:s.stage,caption:s.caption});
}
for(let i=0;i<cuts.length;i++)if(cuts[i].start<0||cuts[i].end>report.frames||i&&cuts[i].start<cuts[i-1].end)throw Error('Invalid overlapping cuts.');
const kept=[];let cursor=0;
for(const cut of cuts){if(cut.start>cursor)kept.push({start:cursor,end:cut.start});cursor=cut.end;}
if(cursor<report.frames)kept.push({start:cursor,end:report.frames});
const removed=cuts.reduce((n,c)=>n+c.end-c.start,0),frames=report.frames-removed,seconds=frames/fps;
const mapFrame=frame=>frame-cuts.reduce((n,c)=>n+Math.max(0,Math.min(frame,c.end)-c.start),0);
const edit={source:path.join(source,'Azhora-Lizeemi-War-YouTube.mp4'),output:film,fps,width:report.width,height:report.height,
  originalFrames:report.frames,frames,originalSeconds:report.seconds,seconds,removedSeconds:removed/fps,
  boxes,cuts,kept,sourceGameplayPreserved:true,audioFadeMilliseconds:20};
fs.writeFileSync(path.join(out,'edit-plan.json'),JSON.stringify(edit,null,2));
log('Edit plan',`${boxes.length} reading panels`,`${(removed/fps).toFixed(2)} seconds removed`,`${seconds.toFixed(2)} seconds retained`);
if(process.argv.includes('--plan-only'))process.exit(0);

// PCM editing makes every cut exact: 1600 stereo samples per video frame.
// Twenty-millisecond fades at joins suppress clicks without shortening audio.
const input=fs.readFileSync(path.join(source,'soundtrack-mastered.wav'));
let format=null,data=null;
if(input.toString('ascii',0,4)!=='RIFF'||input.toString('ascii',8,12)!=='WAVE')throw Error('Expected PCM WAV.');
for(let p=12;p+8<=input.length;){
  const id=input.toString('ascii',p,p+4),length=input.readUInt32LE(p+4),start=p+8;
  if(id==='fmt ')format={tag:input.readUInt16LE(start),channels:input.readUInt16LE(start+2),rate:input.readUInt32LE(start+4),bits:input.readUInt16LE(start+14)};
  if(id==='data'){data=input.subarray(start,start+length);break;}
  p=start+length+(length%2);
}
if(!format||![1,65534].includes(format.tag)||format.channels!==2||format.rate!==rate||format.bits!==24||!data)throw Error('Expected mastered stereo 24-bit 48kHz PCM.');
const block=6,totalSamples=frames*samplesPerFrame,bytes=totalSamples*block;
const header=Buffer.alloc(44);header.write('RIFF');header.writeUInt32LE(bytes+36,4);header.write('WAVEfmt ',8);
header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(2,22);header.writeUInt32LE(rate,24);
header.writeUInt32LE(rate*block,28);header.writeUInt16LE(block,32);header.writeUInt16LE(24,34);header.write('data',36);header.writeUInt32LE(bytes,40);
const fd=fs.openSync(wav,'wx');let writtenSamples=0;
const ramp=x=>(1-Math.cos(Math.PI*Math.max(0,Math.min(1,x))))/2;
try{
  fs.writeSync(fd,header);
  for(let k=0;k<kept.length;k++){
    const segment=kept[k],count=(segment.end-segment.start)*samplesPerFrame;
    const chunk=Buffer.from(data.subarray(segment.start*samplesPerFrame*block,segment.end*samplesPerFrame*block));
    if(chunk.length!==count*block)throw Error('Source audio is shorter than its video.');
    const fade=Math.min(960,Math.floor(count/2));
    function gainAt(i,gain){for(let c=0;c<2;c++){const at=i*block+c*3;chunk.writeIntLE(Math.round(chunk.readIntLE(at,3)*gain),at,3);}}
    if(k>0)for(let i=0;i<fade;i++)gainAt(i,ramp(i/(fade-1)));
    if(k<kept.length-1)for(let i=0;i<fade;i++)gainAt(count-fade+i,ramp(1-i/(fade-1)));
    // The source PCM predates the original sharing-copy fade. Restore it here.
    const ending=2*rate;
    for(let i=Math.max(0,totalSamples-ending-writtenSamples);i<count;i++)gainAt(i,ramp((totalSamples-1-writtenSamples-i)/(ending-1)));
    fs.writeSync(fd,chunk);writtenSamples+=count;
  }
}finally{fs.closeSync(fd);}
if(writtenSamples!==totalSamples)throw Error('Audio edit length mismatch.');
const run=(exe,args,progress=false)=>new Promise((resolve,reject)=>{
  const child=spawn(exe,args,{windowsHide:true,stdio:['ignore','pipe','pipe']});let stdout='',stderr='';
  child.stdout.on('data',b=>{stdout+=b;if(progress){const m=/out_time=(\S+)/.exec(String(b));if(m)log('Encoding',m[1]);}});
  child.stderr.on('data',b=>stderr=(stderr+b).slice(-10000));child.once('error',reject);
  child.once('close',code=>code===0?resolve(stdout):reject(Error(`${path.basename(exe)} exited ${code}: ${stderr}`)));
});
const ffmpeg=findFfmpeg(),ffprobe=findFfprobe();
const omit=cuts.map(c=>`between(n,${c.start},${c.end-1})`).join('+');
const filter=`select='not(${omit})',setpts=N/(${fps}*TB)`;
fs.writeFileSync(path.join(out,'video-filter.txt'),filter);
log('Encoding shortened 1080p picture and synchronized game sound');
await run(ffmpeg,['-hide_banner','-loglevel','error','-nostdin','-n','-i',path.join(source,'picture.mp4'),'-i',wav,
  '-map','0:v:0','-map','1:a:0','-vf',filter,'-filter_threads','2','-c:v','libx264','-preset','fast','-crf','18','-threads','4',
  '-pix_fmt','yuv420p','-r',String(fps),'-fps_mode','cfr','-c:a','aac','-b:a','192k','-ar',String(rate),
  '-movflags','+faststart','-shortest','-metadata','title=Azhora — Lizeemi War Campaign (West Lizeem) — Short Dialogues',
  '-metadata','comment=Full recorded playthrough with reading pauses shortened to three seconds. Original game music and sound.',
  '-progress','pipe:1','-stats_period','10',film],true);
log('Verifying all video frames and audio');
await run(ffmpeg,['-v','error','-xerror','-err_detect','explode','-nostdin','-i',film,'-map','0:v:0','-map','0:a:0','-f','null','-']);
const media=JSON.parse(await run(ffprobe,['-v','error','-count_frames','-show_streams','-show_format','-of','json',film]));
const v=media.streams.find(s=>s.codec_type==='video'),a=media.streams.find(s=>s.codec_type==='audio');
if(v.width!==1920||v.height!==1080||v.codec_name!=='h264'||v.pix_fmt!=='yuv420p'||Number(v.nb_read_frames)!==frames||v.r_frame_rate!=='30/1')throw Error('Edited video format or frame count mismatch.');
if(a.codec_name!=='aac'||a.channels!==2||+a.sample_rate!==rate||[a,v].some(s=>Math.abs(+s.duration-seconds)>.1))throw Error('Edited audio/video synchronization mismatch.');
const audio=await measureAudio(film);if(!Number.isFinite(audio.integratedLufs)||audio.truePeakDb>=0)throw Error('Edited sound is silent or clips.');
const sourceChapters=JSON.parse(fs.readFileSync(path.join(source,'final-verification.json'),'utf8')).chapters;
const chapters=[];
for(const chapter of sourceChapters){const at=Math.floor(mapFrame(Math.round(chapter.at*fps))/fps);if(!chapters.length||at-chapters.at(-1).at>=10)chapters.push({at,title:chapter.title});}
while(chapters.length&&seconds-chapters.at(-1).at<10)chapters.pop();
const labels=chapters.map(c=>`${String(Math.floor(c.at/60)).padStart(2,'0')}:${String(c.at%60).padStart(2,'0')} ${c.title}`).join('\n')+'\n';
fs.writeFileSync(path.join(out,'youtube-chapters.txt'),labels);
fs.writeFileSync(path.join(out,'youtube-description.txt'),`Azhora — Lizeemi War Campaign (West Lizeem)\n\nThe complete recorded playthrough, with dialogue, instructions and result-reading pauses shortened to about three seconds per panel. Pause the video to read longer passages. All combat, travel, choices and the conclusion are retained.\n\nIncludes the game's music, birdsong and combat sounds. Recorded internally at 1920×1080, 30 fps.\n\n${labels}`);
fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify({...edit,bytes:fs.statSync(film).size,fullDecodePassed:true,media,audio,chapters},null,2));
log('Finished',film,`${seconds.toFixed(2)} seconds`,`${(fs.statSync(film).size/1048576).toFixed(1)} MiB`);
