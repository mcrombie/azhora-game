/** Export-only loudness adjustment. Measurements use FFmpeg's R128/true-peak
 * analysis; mastering is one constant gain, preserving the game's dynamics. */
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {findFfmpeg} from './recorder.mjs';

function run(ffmpeg,args){
  return new Promise((resolve,reject)=>{
    const child=spawn(ffmpeg,args,{windowsHide:true,stdio:['ignore','ignore','pipe']});let stderr='';
    child.stderr.on('data',data=>stderr=(stderr+data).slice(-65536));child.once('error',reject);
    child.once('close',code=>code===0?resolve(stderr):reject(Error(`FFmpeg exited ${code}: ${stderr.slice(-3000)}`)));
  });
}

/** Analyze only: loudnorm's processed output is discarded, never used as audio. */
export async function measureAudio(input,{ffmpeg=findFfmpeg()}={}){
  const file=path.resolve(input);if(!fs.statSync(file).isFile())throw Error('Audio input is not a file.');
  const log=await run(ffmpeg,['-hide_banner','-nostdin','-nostats','-i',file,'-map','0:a:0','-vn',
    '-af','loudnorm=I=-20:TP=-1.5:LRA=20:print_format=json','-f','null','-']);
  const block=log.match(/\{\s*"input_i"\s*:[\s\S]*?\}/g)?.at(-1);
  if(!block)throw Error('FFmpeg did not return loudness measurements.');
  const data=JSON.parse(block),number=key=>Number(data[key]);
  return {integratedLufs:number('input_i'),truePeakDb:number('input_tp'),loudnessRangeLu:number('input_lra'),thresholdLufs:number('input_thresh')};
}

/** A small measurement margin avoids crossing the ceiling through 0.01 dB
 * report rounding. Peak-limited material can intentionally remain below target. */
export function recommendGain(measured,{targetLufs=-20,truePeakCeilingDb=-1.5,marginDb=.05}={}){
  if(!Number.isFinite(measured?.integratedLufs)||!Number.isFinite(measured?.truePeakDb))throw Error('Cannot master silent or invalid audio.');
  if(!Number.isFinite(targetLufs)||targetLufs< -70||targetLufs> -5||!Number.isFinite(truePeakCeilingDb)||truePeakCeilingDb>0||truePeakCeilingDb< -9
    ||!Number.isFinite(marginDb)||marginDb<0||marginDb>1)throw Error('Invalid mastering target.');
  const loudnessGain=targetLufs-measured.integratedLufs,peakGain=truePeakCeilingDb-measured.truePeakDb-marginDb;
  const gainDb=Math.floor((Math.min(loudnessGain,peakGain)+1e-9)*100)/100;
  return {targetLufs,truePeakCeilingDb,gainDb,peakLimited:peakGain<loudnessGain,
    predictedLufs:measured.integratedLufs+gainDb,predictedTruePeakDb:measured.truePeakDb+gainDb};
}

export async function masterAudio({input,output,ffmpeg=findFfmpeg(),targetLufs=-20,truePeakCeilingDb=-1.5}={}){
  if(!input||!output)throw Error('Input and a separate output WAV path are required.');
  const source=path.resolve(input),destination=path.resolve(output);
  if(source.toLowerCase()===destination.toLowerCase())throw Error('Keep the original soundtrack: choose a separate output file.');
  if(path.extname(destination).toLowerCase()!=='.wav')throw Error('Master to WAV before encoding the final movie audio.');
  if(fs.existsSync(destination))throw Error('Mastered output already exists; choose a new path.');
  const before=await measureAudio(source,{ffmpeg}),plan=recommendGain(before,{targetLufs,truePeakCeilingDb});
  fs.mkdirSync(path.dirname(destination),{recursive:true});
  await run(ffmpeg,['-hide_banner','-nostdin','-nostats','-n','-i',source,'-map','0:a:0','-vn',
    '-af',`volume=${plan.gainDb.toFixed(2)}dB:precision=double`,'-c:a','pcm_s24le','-ar','48000',destination]);
  const after=await measureAudio(destination,{ffmpeg});
  if(!Number.isFinite(after.integratedLufs)||after.truePeakDb>truePeakCeilingDb+.02)throw Error('Mastered true peak exceeds the requested ceiling.');
  return {input:source,output:destination,sourcePreserved:true,processing:'Constant gain only; no compressor or limiter.',before,...plan,after,bytes:fs.statSync(destination).size};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  try{
    const args=process.argv.slice(2),option=name=>args.find(arg=>arg.startsWith(name+'='))?.slice(name.length+1);
    const input=option('--input'),output=option('--out'),reportFile=option('--report');
    if(!input)throw Error('Usage: node scripts/lib/audio-master.mjs --input=source.wav [--out=mastered.wav] [--report=measurements.json]');
    const result=output?await masterAudio({input,output}):await measureAudio(input).then(before=>({input:path.resolve(input),before,...recommendGain(before)}));
    if(reportFile){fs.mkdirSync(path.dirname(path.resolve(reportFile)),{recursive:true});fs.writeFileSync(reportFile,JSON.stringify(result,null,2));}
    console.log(JSON.stringify(result,null,2));
  }catch(error){console.error(error.stack??error);process.exitCode=1;}
}
