"""Commission a pack through IAM-authenticated Lambda Invoke from an operator session.

Uses the same admission/reservation/queue path as the JWT API. This is an
account-owner authoring utility, not a public authentication alternative.
Never prints credentials or signed asset URLs, and never retries unknown jobs.
"""
import argparse, hashlib, json, pathlib, re, time
import boto3

def main():
    p = argparse.ArgumentParser()
    p.add_argument('--pack', required=True)
    p.add_argument('--stack', default='azhora-chronicles')
    p.add_argument('--limit', type=int)
    p.add_argument('--wait-minutes', type=int, default=20)
    p.add_argument('--export', help='Export completed pages and images for a public read-only demo.')
    p.add_argument('--asset-base', help='Public HTTPS base of the demo, required with --export.')
    args = p.parse_args()
    file = pathlib.Path(args.pack)
    pack = json.loads(file.read_text())
    session = boto3.Session(region_name='us-east-1')
    identity = session.client('sts').get_caller_identity()
    owner = 'operator-' + hashlib.sha256(identity['Arn'].encode()).hexdigest()[:48]
    fn = session.client('lambda')
    outputs = {o['OutputKey']: o['OutputValue'] for o in session.client('cloudformation').describe_stacks(StackName=args.stack)['Stacks'][0]['Outputs']}
    def save():
        temp = file.with_suffix('.tmp')
        temp.write_text(json.dumps(pack, indent=2)); temp.replace(file)
    def api(method, row):
        event = {'requestContext': {'http': {'method': method}, 'authorizer': {'jwt': {'claims': {'sub': owner}}}}, 'rawPath': '/v1/chronicles'}
        if method == 'POST': event['body'] = json.dumps({'entry': row['entry'], 'shareWithCollaborators': True})
        else: event['rawPath'] += '/' + row['generation']['jobId']
        response = fn.invoke(FunctionName=args.stack+'-api', Payload=json.dumps(event).encode())
        data = json.loads(response['Payload'].read())
        if response.get('FunctionError') or data.get('statusCode') not in (200, 202):
            raise RuntimeError('Admission/poll failed; preserved pack is safe to resume: '+str(data.get('statusCode', response.get('FunctionError'))))
        row['generation'] = json.loads(data['body']); save()
    rows = pack['entries'][:args.limit] if args.limit else pack['entries']
    # Read-only reconciliation can observe an operator-recovered result without a POST.
    for row in rows:
        if row['generation']['status'] in ('unknown', 'failed') and row['generation'].get('jobId'): api('GET', row)
    for row in rows:
        if row['generation']['status'] in ('pending', 'budget'): api('POST', row)
    deadline = time.time()+args.wait_minutes*60
    while time.time() < deadline and any(r['generation']['status'] in ('queued','working') for r in rows):
        for row in rows:
            if row['generation']['status'] in ('queued','working'): api('GET',row)
        print(json.dumps({'ready':sum(r['generation']['status']=='ready' for r in rows), 'total':len(rows), 'states': sorted(set(r['generation']['status'] for r in rows))}), flush=True)
        if any(r['generation']['status'] in ('queued','working') for r in rows): time.sleep(10)
    if args.export:
        if not args.asset_base or not re.fullmatch(r'https://[a-zA-Z0-9.-]+/[a-zA-Z0-9/_-]*/?',args.asset_base): raise RuntimeError('Choose an HTTPS demo asset base.')
        if any(r['generation']['status'] != 'ready' for r in pack['entries']): raise RuntimeError('Every page must be complete before public export.')
        out = pathlib.Path(args.export); (out/'images').mkdir(parents=True,exist_ok=True)
        table = session.resource('dynamodb').Table(outputs['JobsTable']); s3 = session.client('s3')
        public = json.loads(json.dumps(pack))
        for row in public['entries']:
            job_id = row['generation']['jobId']
            if not re.fullmatch(r'[a-f0-9]{64}',job_id): raise RuntimeError('Invalid saved job ID.')
            job = table.get_item(Key={'pk':job_id},ConsistentRead=True)['Item']
            if job['owner'] != owner or job['status'] != 'ready': raise RuntimeError('Only the operator-owned complete pack can be exported.')
            name = job_id+'.png'
            s3.download_file(outputs['ArtifactBucket'],job['imageKey'],str(out/'images'/name))
            row['generation'] = {'status':'ready','prose':row['generation']['prose'],'imageUrl':args.asset_base.rstrip('/')+'/images/'+name}
        (out/'demo-pack.json').write_text(json.dumps(public,ensure_ascii=False))
        print(json.dumps({'exported':len(public['entries']),'directory':str(out)}),flush=True)

if __name__ == '__main__': main()
