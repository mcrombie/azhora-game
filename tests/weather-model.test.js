import test from 'node:test';
import assert from 'node:assert/strict';
import {weatherSample,weatherClimate,WEATHER_KINDS} from '../src/world/environment/weather-model.js';

test('weather is a deterministic adjacent sequence with bounded spells and smooth transitions',()=>{
  const fields=['cloudCover','rain','wind','overcast'];
  for(const climate of ['temperate','wet','desert']) {
    const samples=[];let time=0,prior=weatherSample(0,{climate});
    for(let i=0;i<96;i++) {
      const sample=weatherSample(time,{climate});samples.push([time,sample]);
      assert.ok(sample.spellEnd-sample.spellStart>=165-1e-8&&sample.spellEnd-sample.spellStart<=285+1e-8);
      assert.ok(sample.transitionSeconds>=25&&sample.transitionSeconds<=45);
      assert.ok(Math.abs(WEATHER_KINDS.indexOf(sample.from)-WEATHER_KINDS.indexOf(sample.to))<=1);
      for(let dt=0;dt<=sample.transitionSeconds+1;dt+=.25) {
        const next=weatherSample(time+dt,{climate});
        for(const field of fields) {
          assert.ok(Number.isFinite(next[field])&&next[field]>=0&&next[field]<=1,field);
          if(dt)assert.ok(Math.abs(next[field]-prior[field])<.02,`${field} changes gently`);
        }
        assert.ok(Math.abs(next.windX)<=1&&Math.abs(next.windZ)<=1);prior=next;
      }
      const before=weatherSample(sample.spellEnd-1e-5,{climate}),after=weatherSample(sample.spellEnd+1e-5,{climate});
      for(const field of fields)assert.ok(Math.abs(before[field]-after[field])<1e-6,`${field} continuous at spell/block boundary`);
      time=sample.spellEnd+1e-4;
    }
    for(const [seconds,sample] of samples.reverse())assert.deepEqual(weatherSample(seconds,{climate}),sample,'Seeking/reloading the same saved time does not reroll weather');
  }
});

test('the opening is partly cloudy, rain arrives naturally in fifteen minutes, and later cycles vary',()=>{
  assert.equal(weatherSample(0).kind,'partly-cloudy');
  const first=Array.from({length:91},(_,i)=>weatherSample(i*10));
  assert.ok(first.some(sample=>sample.rain>.5));
  assert.ok(first.findIndex(sample=>sample.rain>.01)>40,'The adventure does not start with a downpour');
  assert.notDeepEqual(Array.from({length:24},(_,i)=>weatherSample(i*300).to),Array.from({length:24},(_,i)=>weatherSample(7200+i*300).to));
  for(const value of [-1,NaN,Infinity,undefined])assert.deepEqual(weatherSample(value),weatherSample(0));
  for(const kind of WEATHER_KINDS){const sample=weatherSample(200,{override:kind});assert.equal(sample.kind,kind);assert.equal(sample.transition,1);}
});

test('atlas climate hints keep deserts dry and distinguish humid woods from temperate country',()=>{
  for(const region of [{name:'Ganesh Desert'},{id:58},{name:'Navarth'},{climate:'BWh'},{name:'Ovesos'}])assert.equal(weatherClimate(region),'desert');
  for(const region of [{name:'Acor Wetlands'},{id:1},{name:'North Ibenwood'},{palette:{hazeDensity:.007}}])assert.equal(weatherClimate(region),'wet');
  for(const region of [{name:'North Celder'},null,{name:'Caricas'}])assert.equal(weatherClimate(region),'temperate');
  for(let time=0;time<86400;time+=43){const sample=weatherSample(time,{climate:'desert'});assert.equal(sample.rain,0);assert.notEqual(sample.kind,'rain');}
});
