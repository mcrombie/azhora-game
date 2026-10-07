"""Recover an interrupted final database write using already saved assets; never invoke a model."""
import argparse, hashlib, json
import boto3
parser=argparse.ArgumentParser()
parser.add_argument("--table", required=True)
parser.add_argument("--bucket", required=True)
parser.add_argument("--job", required=True)
args=parser.parse_args()
table=boto3.resource("dynamodb",region_name="us-east-1").Table(args.table)
job=table.get_item(Key={"pk":args.job},ConsistentRead=True).get("Item")
if not job or job["status"] not in ("working","unknown","failed"):
    raise SystemExit("Only an interrupted job can be reconciled.")
prefix="chronicles/"+hashlib.sha256(job["owner"].encode()).hexdigest()+"/"+args.job
s3=boto3.client("s3",region_name="us-east-1")
try:
    narrative=json.loads(s3.get_object(Bucket=args.bucket,Key=prefix+".json")["Body"].read())
    s3.head_object(Bucket=args.bucket,Key=prefix+".png")
except s3.exceptions.ClientError:
    raise SystemExit("No complete saved result. Keep this job pending; investigate provider usage before any manually authorized new invocation.")
if narrative["entry"]["factsHash"]!=job["entry"]["factsHash"]:
    raise SystemExit("Saved assets do not match this job.")
table.update_item(Key={"pk":args.job},UpdateExpression="SET #s=:ready, stage=:stage, prose=:prose, imageKey=:key",ConditionExpression="#s IN (:working,:unknown,:failed)",ExpressionAttributeNames={"#s":"status"},ExpressionAttributeValues={":ready":"ready",":stage":"reconciled-assets",":prose":narrative["narrative"]["prose"],":key":prefix+".png",":working":"working",":unknown":"unknown",":failed":"failed"})
print("Recovered saved prose and image without a model call.")
