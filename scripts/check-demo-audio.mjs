import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {loadPlaywright,findChromium,startServer,ROOT} from './lib/recorder.mjs';

const server=await startServer(0),{chromium}=await loadPlaywright();
let browser;
try{
  browser=await chromium.launch({executablePath:findChromium(chromium),headless:true});
  const page=await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'load'});
  const events=[
    {time:0,kind:'scene',input:{mode:'playing',inside:true,room:'tower'}},
    {time:6,kind:'scene',input:{mode:'playing',inside:false,hour:10,regionId:1}},
    {time:14,kind:'scene',input:{mode:'skirmish',inside:false,hour:10,regionId:1}},
    {time:16,kind:'impact',cue:'guarded'},{time:16.1,kind:'impact',cue:'counter'},{time:17,kind:'impact',cue:'hurt'},
    {time:22,kind:'scene',input:{mode:'playing',inside:false,hour:23,regionId:1}},
  ];
  for(let tick=1;tick<300;tick++)events.push({time:tick/10,kind:'tick'});
  const render=options=>page.evaluate(async options=>{
    const module=await import('./src/dev/demo/audio-render.js');return module.renderDemoAudio(options);
  },options);
  const read=async bytes=>{
    const chunks=[];
    for(let offset=0;offset<bytes;offset+=1024*1024)chunks.push(Buffer.from(await page.evaluate(async offset=>{
      const module=await import('./src/dev/demo/audio-render.js');return module.readDemoAudioChunk(offset);
    },offset),'base64'));
    return Buffer.concat(chunks);
  };
  const result=await render({events,duration:30,settings:{music:.42,nature:.65,muted:false}});
  assert.equal(result.report.duration,30);assert.equal(result.report.scenes,4);assert.equal(result.report.impacts,3);
  assert.ok(result.report.peak>.001&&result.report.peak<.999);assert.equal(result.bytes,44+30*48000*4);
  const wav=await read(result.bytes);assert.equal(wav.length,result.bytes);assert.equal(wav.toString('ascii',0,4),'RIFF');
  const dir=path.join(ROOT,'tests','artifacts');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'demo-audio-check.wav'),wav);
  const pulse=await render({events:[{time:2,kind:'impact',cue:'counter'}],duration:4,settings:{music:0,nature:0,muted:false}});
  const pulseWav=await read(pulse.bytes);let first=-1,last=-1;
  for(let frame=0;frame<4*48000;frame++)if(Math.abs(pulseWav.readInt16LE(44+frame*4))>2){if(first<0)first=frame;last=frame;}
  assert.ok(first/48000>=2&&first/48000<2.02,'Impact begins at encoded frame time, independent of wall clock.');
  assert.ok(last/48000>2.1&&last/48000<2.4,'Impact ends within its authored duration.');
  const report={...result.report,chunkBytes:wav.length,sync:{firstSample:first,lastSample:last,firstSeconds:first/48000,lastSeconds:last/48000}};
  fs.writeFileSync(path.join(dir,'demo-audio-check.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{
  await browser?.close();await new Promise(resolve=>server.close(resolve));
}
