import test from 'node:test';
import assert from 'node:assert/strict';
import {createGenerationClient} from '../src/settlements/generation-client.js';
import {createMemoryArchive,flushChronicles} from '../src/settlements/archive.js';
import {createSettlementWorld} from '../src/settlements/engine.js';
import {createPressAuth} from '../src/settlements/auth.js';
test('Offline work stays pending and resumes against the same persisted page',async()=>{
 const archive=createMemoryArchive(),core=createSettlementWorld();await flushChronicles(core,archive);let online=false,t=0,requests=[];
 const client=createGenerationClient({archive,baseUrl:'https://press.example',getToken:()=> 'token',now:()=>t,fetcher:async(url,options)=>{requests.push(JSON.parse(options.body).entry.id);if(!online)throw Error('offline');return {ok:true,json:async()=>({status:'queued',jobId:'job'})};}});
 await client.pump(core.worldId);assert.equal((await archive.list(core.worldId))[0].status,'pending');online=true;t=31000;await client.pump(core.worldId);
 assert.equal(requests[0],requests[1]);assert.equal((await archive.list(core.worldId))[0].status,'queued');
});
test('Reopening a completed illustration refreshes its private URL without a new generation',async()=>{
 const archive=createMemoryArchive(),entry=createSettlementWorld().entries()[0];await archive.put(entry);
 await archive.update(entry.id,{status:'ready',jobId:'old-job',prose:'A preserved account of the common stores.',imageUrl:'https://old.example/image',imageExpiresAt:0});
 const requests=[],client=createGenerationClient({archive,baseUrl:'https://press.example',getToken:()=> 'token',fetcher:async(url,options)=>{requests.push({url,method:options.method});return {ok:true,json:async()=>({status:'ready',jobId:'old-job',prose:'A preserved account of the common stores.',imageUrl:'https://new.example/image',imageExpiresAt:Date.now()+3000000})};}});
 const row=await client.refresh(entry.id);assert.equal(row.generation.imageUrl,'https://new.example/image');assert.equal(requests.length,1);assert.equal(requests[0].method,undefined);assert.match(requests[0].url,/old-job$/);
 await archive.update(entry.id,{status:'ready',prose:row.generation.prose,imageUrl:'https://public.example/permanent.png'});
 assert.equal((await client.refresh(entry.id)).generation.imageUrl,'https://public.example/permanent.png');assert.equal(requests.length,1);
});
test('Authentication stores only short-lived session tokens and signs out locally',async()=>{
 const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 let t=0,calls=[];const auth=createPressAuth({config:{region:'us-east-1',clientId:'public-client'},storage,now:()=>t,fetcher:async(url,options)=>{calls.push(JSON.parse(options.body));return {ok:true,json:async()=>({AuthenticationResult:{AccessToken:'access',RefreshToken:'refresh',ExpiresIn:3600}})};}});
 await auth.signIn('collaborator','temporary-password');assert.ok(!JSON.stringify([...data]).includes('temporary-password'));assert.equal(await auth.token(),'access');
 t=3600000;assert.equal(await auth.token(),'access');assert.equal(calls[1].AuthFlow,'REFRESH_TOKEN_AUTH');auth.signOut();assert.equal(await auth.token(),'');
});
