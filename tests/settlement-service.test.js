import test from 'node:test';
import assert from 'node:assert/strict';
import { createChronicleService, PAGE_RESERVATION_CENTS, MONTHLY_CENTS } from '../services/chronicles/service.mjs';
import { createSettlementWorld } from '../src/settlements/engine.js';
function fixture() {
  const jobs = new Map(), queue = [], calls = [], assets = new Map(); let cents = 0, failText = false, imageError = null, instant = new Date('2026-10-06T12:00:00Z');
  const store = { get: async id => jobs.get(id), reserve: async job => { if (jobs.has(job.pk)) return 'duplicate'; if (cents + job.reservationCents > MONTHLY_CENTS) return 'budget'; cents += job.reservationCents; jobs.set(job.pk, structuredClone(job)); return 'reserved'; }, claim: async id => { const job = jobs.get(id); if (job?.status !== 'queued' || job.notBefore > instant.getTime()) return null; job.status = 'working'; return structuredClone(job); }, patch: async (id, fields) => Object.assign(jobs.get(id), fields) };
  let entry = createSettlementWorld().entries()[0];
  store.rollover = async (job, month, limit) => { if (cents + job.reservationCents > limit) return false; cents += job.reservationCents; Object.assign(jobs.get(job.pk), { month, status: 'queued' }); return true; };
  const service = createChronicleService({ store, queue: { send: async id => queue.push(id) }, now: () => instant,
    writer: { generate: async () => { calls.push('text'); if (failText) throw new Error('timeout after provider accepted'); return { prose: 'I opened the tally today and counted our twelve neighbors. We have begun to keep a record of our work.', scene: 'A keeper of the tally counts stores beside twelve neighbors in a timber settlement.', eventIds: [entry.events[0].id] }; } },
    illustrator: { generate: async () => { calls.push('image'); if (imageError) throw imageError; return Buffer.from('89504e470d0a1a0a00000000', 'hex'); } },
    objects: { put: async (key, value) => assets.set(key, value), url: async key => `https://example.test/${key}` },
  });
  const request = (value = entry, owner = 'owner') => ({ rawPath: '/v1/chronicles', requestContext: { http: { method: 'POST' }, authorizer: { jwt: { claims: { sub: owner } } } }, body: JSON.stringify({ entry: value }) });
  return { service, request, jobs, queue, calls, assets, entry, cents: () => cents, setCents: n => { cents = n; }, setDate: date => { instant = new Date(date); }, timeout: () => { failText = true; }, imageError: e => { imageError = e; } };
}

test('A confirmed rate rejection waits, then resumes only the image without reserving or writing twice', async () => {
  const f = fixture(), id = JSON.parse((await f.service.api(f.request())).body).jobId;
  f.imageError(Object.assign(new Error('denied before inference'), { name: 'ThrottlingException', $metadata: { httpStatusCode: 429 } }));
  await f.service.run(id); const saved = f.jobs.get(id).prose;
  assert.equal(f.jobs.get(id).status, 'queued'); assert.equal(f.jobs.get(id).resumeImage, true);
  await f.service.run(id); assert.deepEqual(f.calls, ['text', 'image']);
  f.setDate('2026-10-06T12:02:00Z'); f.imageError(null);
  await Promise.all([f.service.run(id), f.service.run(id)]);
  assert.deepEqual(f.calls, ['text', 'image', 'image']); assert.equal(f.jobs.get(id).status, 'ready');
  assert.equal(f.jobs.get(id).prose, saved); assert.equal(f.cents(), PAGE_RESERVATION_CENTS);
});

test('An image timeout remains unknown and never repeats either model', async () => {
  const f = fixture(), id = JSON.parse((await f.service.api(f.request())).body).jobId;
  f.imageError(Object.assign(new Error('possibly processed'), { name: 'ModelTimeoutException', $metadata: { httpStatusCode: 408 } }));
  await f.service.run(id); await f.service.run(id); await f.service.api(f.request());
  assert.equal(f.jobs.get(id).status, 'unknown'); assert.deepEqual(f.calls, ['text', 'image']);
  assert.ok(f.jobs.get(id).prose); assert.equal(f.cents(), PAGE_RESERVATION_CENTS);
});
test('Duplicate admissions reserve once, and duplicate queue delivery cannot bill twice', async () => {
  const f = fixture(); const [a, b] = await Promise.all([f.service.api(f.request()), f.service.api(f.request())]);
  assert.ok([200, 202].includes(a.statusCode)); assert.ok([200, 202].includes(b.statusCode)); assert.equal(f.cents(), PAGE_RESERVATION_CENTS);
  const id = JSON.parse(a.body).jobId; await Promise.all([f.service.run(id), f.service.run(id)]);
  assert.deepEqual(f.calls, ['text', 'image']); assert.equal(f.jobs.get(id).status, 'ready');
  const reopened = JSON.parse((await f.service.api(f.request())).body); assert.equal(reopened.status, 'ready'); assert.match(reopened.imageUrl, /^https:/); assert.equal(f.calls.length, 2);
});
test('An uncertain billed invocation is never repeated by worker redelivery', async () => {
  const f = fixture(); f.timeout(); const id = JSON.parse((await f.service.api(f.request())).body).jobId;
  await f.service.run(id); await f.service.run(id);
  assert.equal(f.jobs.get(id).status, 'unknown'); assert.deepEqual(f.calls, ['text']); assert.equal(f.cents(), PAGE_RESERVATION_CENTS);
});
test('The shared monthly model limit stops admission before invoking a provider', async () => {
  const f = fixture(); f.setCents(2496); const result = JSON.parse((await f.service.api(f.request())).body);
  assert.equal(result.status, 'budget'); assert.equal(f.queue.length, 0); assert.equal(f.jobs.size, 0); assert.equal(f.cents(), 2496);
});
test('Unauthenticated callers and other collaborators cannot read an account', async () => {
  const f = fixture(); const req = f.request(); delete req.requestContext.authorizer;
  assert.equal((await f.service.api(req)).statusCode, 401);
  const id = JSON.parse((await f.service.api(f.request())).body).jobId;
  const get = f.request(f.entry, 'other'); get.rawPath = `/v1/chronicles/${id}`; get.requestContext.http.method = 'GET';
  assert.equal((await f.service.api(get)).statusCode, 404);
});
test('Modified facts cannot overwrite an already admitted edition', async () => {
  const f = fixture(); await f.service.api(f.request());
  const entry = createSettlementWorld({ seed: 88 }).entries()[0];
  assert.equal((await f.service.api(f.request(entry))).statusCode, 409);
  entry.after.water = -100; assert.equal((await f.service.api(f.request(entry))).statusCode, 400);
});
test('A queued job crossing a month cannot use an old reservation to bypass the current allowance',async()=>{
 const f=fixture(),id=JSON.parse((await f.service.api(f.request())).body).jobId;
 f.setDate('2026-11-01T00:05:00Z');await f.service.run(id);assert.deepEqual(f.calls,[]);assert.equal(f.jobs.get(id).status,'budget');
 f.setCents(2496);await f.service.api(f.request());assert.equal(f.jobs.get(id).status,'budget');assert.equal(f.cents(),2496);
 f.setCents(0);await f.service.api(f.request());assert.equal(f.cents(),8);await f.service.run(id);assert.deepEqual(f.calls,['text','image']);
});
test('A saved authoring pack can explicitly share images with invited collaborators without making them public',async()=>{
 const f=fixture(),req=f.request();req.body=JSON.stringify({entry:f.entry,shareWithCollaborators:true});
 const id=JSON.parse((await f.service.api(req)).body).jobId;await f.service.run(id);
 const get=f.request(f.entry,'crombie');get.rawPath='/v1/chronicles/'+id;get.requestContext.http.method='GET';
 assert.equal((await f.service.api(get)).statusCode,200);delete get.requestContext.authorizer;assert.equal((await f.service.api(get)).statusCode,401);
});
