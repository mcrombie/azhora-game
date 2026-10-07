"""Operator-only recovery of legacy jobs explicitly denied by Bedrock throttling.

Review the dry run first. This never retries timeouts, parsing failures, generic
errors, or unlogged outcomes. Existing text and the original reservation survive.
"""
import argparse, datetime, hashlib, json, pathlib, time
import boto3

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--pack', required=True)
    parser.add_argument('--stack', default='azhora-chronicles')
    parser.add_argument('--execute', action='store_true')
    args = parser.parse_args()
    session = boto3.Session(region_name='us-east-1')
    owner = 'operator-' + hashlib.sha256(session.client('sts').get_caller_identity()['Arn'].encode()).hexdigest()[:48]
    pack = json.loads(pathlib.Path(args.pack).read_text())
    allowed = {r['generation'].get('jobId') for r in pack['entries']}
    cfn = session.client('cloudformation')
    outputs = {v['OutputKey']: v['OutputValue'] for v in cfn.describe_stacks(StackName=args.stack)['Stacks'][0]['Outputs']}
    queue_url = cfn.describe_stack_resource(StackName=args.stack, LogicalResourceId='Queue')['StackResourceDetail']['PhysicalResourceId']
    table = session.resource('dynamodb').Table(outputs['JobsTable'])
    logs = session.client('logs')
    rejected = {}
    for page in logs.get_paginator('filter_log_events').paginate(
            logGroupName='/aws/lambda/'+args.stack+'-worker',
            startTime=int((time.time()-86400)*1000), filterPattern='InvocationUnknown'):
        for event in page['events']:
            message = event['message']
            try: data = json.loads(message[message.index('{'):])
            except (ValueError, json.JSONDecodeError): continue
            if data.get('error') == 'ThrottlingException' and data.get('stage') == 'image-requested' and data.get('id') in allowed:
                rejected[data['id']] = event['eventId']
    ready = []
    month = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m')
    for job_id, evidence in rejected.items():
        job = table.get_item(Key={'pk':job_id}, ConsistentRead=True).get('Item', {})
        if (job.get('owner') == owner and job.get('status') == 'unknown'
                and job.get('stage') == 'image-requested' and job.get('month') == month
                and job.get('prose') and job.get('scene')):
            ready.append((job_id, evidence))
    print(json.dumps({'confirmedImageRejections':len(ready), 'mode':'execute' if args.execute else 'review',
                      'jobIds':[i for i, _ in ready], 'newReservations':0}), flush=True)
    if not args.execute: return
    sqs = session.client('sqs')
    for job_id, evidence in ready:
        delay = 60 + int(job_id[-2:],16) % 31
        table.update_item(Key={'pk':job_id},
            UpdateExpression='SET #s=:queued, #stage=:recovered, resumeImage=:yes, notBefore=:due, updatedAt=:now, recoveryEvidence=:evidence',
            ConditionExpression='#s=:unknown AND #stage=:requested AND #owner=:owner AND #month=:month',
            ExpressionAttributeNames={'#s':'status','#stage':'stage','#owner':'owner','#month':'month'},
            ExpressionAttributeValues={':queued':'queued',':recovered':'operator-confirmed-throttle',':yes':True,
                ':due':int(time.time()*1000)+delay*1000,':now':int(time.time()*1000),':evidence':evidence,
                ':unknown':'unknown',':requested':'image-requested',':owner':owner,':month':month})
        sqs.send_message(QueueUrl=queue_url, MessageBody=json.dumps({'id':job_id}), DelaySeconds=delay)
    print(json.dumps({'requeuedConfirmedRejections':len(ready)}))

if __name__ == '__main__':
    main()
