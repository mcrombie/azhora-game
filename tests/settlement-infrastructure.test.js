import test from 'node:test';
import assert from 'node:assert/strict';
import {template} from '../services/chronicles/template.mjs';
test('The public API has collaborator JWT authorization and cannot invoke a model',()=>{
 for(const name of ['Submit','Get'])assert.equal(template.Resources[name].Properties.AuthorizationType,'JWT');
 assert.equal(template.Resources.Client.Properties.GenerateSecret,false);
 assert.equal(template.Resources.Users.Properties.AdminCreateUserConfig.AllowAdminCreateUserOnly,true);
 assert.doesNotMatch(JSON.stringify(template.Resources.ApiRole),/bedrock:/);
 const modelStatement=template.Resources.WorkerRole.Properties.Policies[0].PolicyDocument.Statement.find(s=>s.Action==='bedrock:InvokeModel');
 assert.ok(modelStatement);assert.doesNotMatch(JSON.stringify(modelStatement.Resource),/foundation-model\/\*/);
});
test('Artifacts are private and retained, queue failures are durable, and generation starts disabled',()=>{
 assert.deepEqual(Object.values(template.Resources.Artifacts.Properties.PublicAccessBlockConfiguration),[true,true,true,true]);
 assert.equal(template.Resources.Artifacts.DeletionPolicy,'Retain');assert.equal(template.Resources.Jobs.DeletionPolicy,'Retain');
 assert.equal(template.Parameters.GenerationEnabled.Default,'false');
 assert.ok(template.Resources.Queue.Properties.VisibilityTimeout>6*template.Resources.Worker.Properties.Timeout);
 assert.equal(template.Resources.QueueConsumer.Properties.BatchSize,1);
 assert.equal(template.Resources.QueueConsumer.Properties.ScalingConfig.MaximumConcurrency,2);
 assert.equal(template.Resources.Worker.Properties.ReservedConcurrentExecutions,undefined);
});
