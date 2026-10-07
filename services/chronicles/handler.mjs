import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, TransactWriteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { BedrockRuntimeClient, ConverseCommand, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { createChronicleService } from './service.mjs';
const table = process.env.JOBS_TABLE, bucket = process.env.ARTIFACT_BUCKET;
const db = DynamoDBDocumentClient.from(new DynamoDBClient({}), { marshallOptions: { removeUndefinedValues: true } });
const sqs = new SQSClient({}), s3 = new S3Client({});
// Never retry a potentially billed model call. Durable job claims handle queue redelivery.
const textModel = new BedrockRuntimeClient({ region: 'us-east-1', maxAttempts: 1 });
const imageModel = new BedrockRuntimeClient({ region: 'us-west-2', maxAttempts: 1 });
const store = {
  async get(pk) { return (await db.send(new GetCommand({ TableName: table, Key: { pk }, ConsistentRead: true }))).Item; },
  async reserve(job, limit) {
    try {
      await db.send(new TransactWriteCommand({ TransactItems: [
        { Put: { TableName: table, Item: job, ConditionExpression: 'attribute_not_exists(pk)' } },
        { Update: { TableName: table, Key: { pk: `budget#${job.month}` }, UpdateExpression: 'SET reservedCents = if_not_exists(reservedCents, :zero) + :amount', ConditionExpression: 'attribute_not_exists(reservedCents) OR reservedCents <= :remaining', ExpressionAttributeValues: { ':zero': 0, ':amount': job.reservationCents, ':remaining': limit - job.reservationCents } } },
      ] })); return 'reserved';
    } catch (e) {
      if (e.name !== 'TransactionCanceledException') throw e;
      if (await store.get(job.pk)) return 'duplicate';
      if (e.CancellationReasons?.[1]?.Code === 'ConditionalCheckFailed') return 'budget';
      throw e;
    }
  },
  async rollover(job, month, limit) {
    try {
      await db.send(new TransactWriteCommand({TransactItems:[
        {Update:{TableName:table,Key:{pk:job.pk},UpdateExpression:'SET #status = :queued, #month = :new',ConditionExpression:'#status = :budget AND #month = :old',ExpressionAttributeNames:{'#status':'status','#month':'month'},ExpressionAttributeValues:{':queued':'queued',':budget':'budget',':new':month,':old':job.month}}},
        {Update:{TableName:table,Key:{pk:'budget#'+month},UpdateExpression:'SET reservedCents = if_not_exists(reservedCents, :zero) + :amount',ConditionExpression:'attribute_not_exists(reservedCents) OR reservedCents <= :remaining',ExpressionAttributeValues:{':zero':0,':amount':job.reservationCents,':remaining':limit-job.reservationCents}}}
      ]}));return true;
    } catch(e) {if(e.name==='TransactionCanceledException'&&e.CancellationReasons?.some(r=>r.Code==='ConditionalCheckFailed'))return false;throw e;}
  },
  async claim(pk, time) {
    try { return (await db.send(new UpdateCommand({ TableName: table, Key: { pk }, UpdateExpression: 'SET #status = :working, updatedAt = :time', ConditionExpression: '#status = :queued AND (attribute_not_exists(notBefore) OR notBefore <= :time)', ExpressionAttributeNames: { '#status': 'status' }, ExpressionAttributeValues: { ':working': 'working', ':queued': 'queued', ':time': time }, ReturnValues: 'ALL_NEW' }))).Attributes; }
    catch (e) { if (e.name === 'ConditionalCheckFailedException') return null; throw e; }
  },
  async patch(pk, fields) {
    const pairs = Object.entries(fields);
    await db.send(new UpdateCommand({ TableName: table, Key: { pk }, UpdateExpression: 'SET ' + pairs.map((_, i) => `#k${i} = :v${i}`).join(', '), ExpressionAttributeNames: Object.fromEntries(pairs.map(([k], i) => [`#k${i}`, k])), ExpressionAttributeValues: Object.fromEntries(pairs.map(([, v], i) => [`:v${i}`, v])) }));
  },
};
const service = createChronicleService({ store, enabled: () => process.env.GENERATION_ENABLED === 'true',
  queue: { send: (id, delay = 0) => sqs.send(new SendMessageCommand({ QueueUrl: process.env.QUEUE_URL, MessageBody: JSON.stringify({ id }), DelaySeconds: delay })) },
  objects: {
    put: (key, body, type = 'image/png') => s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: type, ServerSideEncryption: 'AES256' })),
    url: key => getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 3600 }),
  },
  writer: { async generate(prompt) {
    const result = await textModel.send(new ConverseCommand({ modelId: process.env.TEXT_MODEL ?? 'us.anthropic.claude-haiku-4-5-20251001-v1:0', messages: [{ role: 'user', content: [{ text: prompt }] }], inferenceConfig: { maxTokens: 1000, temperature: .65 } }));
    const text = result.output?.message?.content?.filter(c => c.text).map(c => c.text).join('') ?? '';
    try { return JSON.parse(text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')); }
    catch (error) { error.modelReturned = true; throw error; }
  } },
  illustrator: { async generate(prompt, seed) {
    const result = await imageModel.send(new InvokeModelCommand({ modelId: 'stability.stable-image-core-v1:1', contentType: 'application/json', accept: 'application/json', body: JSON.stringify({ prompt, seed, aspect_ratio: '3:2', output_format: 'png', negative_prompt: 'text, lettering, writing, inscriptions, typography, captions, signatures, watermarks, hats, caps, hoods, headwear, modern clothing, photographs' }) }));
    const value = JSON.parse(new TextDecoder().decode(result.body)); if (value.finish_reasons?.some(Boolean)) throw new Error('Image generation was filtered.'); return Buffer.from(value.images?.[0] ?? '', 'base64');
  } },
  log: value => console.log(JSON.stringify({ ...value, service: 'azhora-chronicles' })),
});
export async function handler(event) {
  if (Array.isArray(event.Records)) {
    const failures = [];
    for (const record of event.Records) try { const { id } = JSON.parse(record.body); if (!/^[a-f0-9]{64}$/.test(id)) throw new Error('Invalid queue ID'); await service.run(id); } catch { failures.push({ itemIdentifier: record.messageId }); }
    return { batchItemFailures: failures };
  }
  try { return await service.api(event); } catch (e) { console.error(JSON.stringify({ event: 'ApiFailed', error: e.name })); return { statusCode: 503, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ error: 'Chronicle service temporarily unavailable. The facts remain saved.' }) }; }
}
