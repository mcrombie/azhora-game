"""Deploy the independent chronicle press from an authenticated AWS CLI/CloudShell session.
No credentials, tokens, user passwords, subscriptions, or model agreements are created here.
"""
import argparse, hashlib, json, pathlib, time
import boto3

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--stack", default="azhora-chronicles")
    parser.add_argument("--enable", action="store_true", help="Requires verified current model pricing and accepted model agreements.")
    parser.add_argument("--execute", action="store_true", help="Execute the printed, reviewed change set.")
    args = parser.parse_args()
    root = pathlib.Path(__file__).resolve().parent
    template = (root / "template.json").read_text()
    release = (root / "chronicles.zip").read_bytes()
    region = "us-east-1"
    sts = boto3.client("sts", region_name=region)
    account = sts.get_caller_identity()["Account"]
    s3 = boto3.client("s3", region_name=region)
    cfn = boto3.client("cloudformation", region_name=region)
    if args.enable:
        for model_region, model in [("us-east-1", "anthropic.claude-haiku-4-5-20251001-v1:0"), ("us-west-2", "stability.stable-image-core-v1:1")]:
            ready = boto3.client("bedrock", region_name=model_region).get_foundation_model_availability(modelId=model)
            if ready["agreementAvailability"]["status"] != "AVAILABLE" or ready["authorizationStatus"] != "AUTHORIZED":
                raise RuntimeError(f"Model agreement/access is not ready: {model}")
    cfn.validate_template(TemplateBody=template)
    bucket = f"{args.stack}-releases-{account}-{region}"
    try:
        s3.head_bucket(Bucket=bucket, ExpectedBucketOwner=account)
    except s3.exceptions.ClientError as error:
        if error.response["ResponseMetadata"]["HTTPStatusCode"] != 404:
            raise
        s3.create_bucket(Bucket=bucket)
    s3.put_public_access_block(Bucket=bucket, PublicAccessBlockConfiguration=dict(BlockPublicAcls=True, IgnorePublicAcls=True, BlockPublicPolicy=True, RestrictPublicBuckets=True))
    s3.put_bucket_encryption(Bucket=bucket, ServerSideEncryptionConfiguration={"Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]})
    key = "releases/" + hashlib.sha256(release).hexdigest() + ".zip"
    s3.put_object(Bucket=bucket, Key=key, Body=release, ServerSideEncryption="AES256", ContentType="application/zip")
    try:
        status = cfn.describe_stacks(StackName=args.stack)["Stacks"][0]["StackStatus"]
        kind = "CREATE" if status == "REVIEW_IN_PROGRESS" else "UPDATE"
    except cfn.exceptions.ClientError as error:
        if "does not exist" not in str(error):
            raise
        kind = "CREATE"
    name = "press-" + str(int(time.time()))
    parameters = [{"ParameterKey": k, "ParameterValue": v} for k, v in {"CodeBucket": bucket, "CodeKey": key, "GenerationEnabled": str(args.enable).lower()}.items()]
    change = cfn.create_change_set(StackName=args.stack, ChangeSetName=name, ChangeSetType=kind, TemplateBody=template, Parameters=parameters, Capabilities=["CAPABILITY_IAM"], Tags=[{"Key": "Project", "Value": "AzhoraHearthfall"}])
    cfn.get_waiter("change_set_create_complete").wait(ChangeSetName=change["Id"])
    review = cfn.describe_change_set(ChangeSetName=change["Id"])
    print(json.dumps({"changeSet": change["Id"], "generation": args.enable, "modelReservationLimitUSD": 25, "hosting": "metered separately", "changes": [{"action": c["ResourceChange"]["Action"], "type": c["ResourceChange"]["ResourceType"], "name": c["ResourceChange"]["LogicalResourceId"]} for c in review["Changes"]]}, indent=2), flush=True)
    if not args.execute:
        return
    cfn.execute_change_set(ChangeSetName=change["Id"])
    cfn.get_waiter("stack_create_complete" if kind == "CREATE" else "stack_update_complete").wait(StackName=args.stack)
    values = {v["OutputKey"]: v["OutputValue"] for v in cfn.describe_stacks(StackName=args.stack)["Stacks"][0]["Outputs"]}
    config = {"version": 1, "region": region, "apiUrl": values["ApiUrl"], "clientId": values["ClientId"]}
    (root / "settlement-service.json").write_text(json.dumps(config, indent=2))
    print(json.dumps({"status": "deployed", "config": config, "userPoolId": values["UserPoolId"], "jobsTable": values["JobsTable"]}), flush=True)

if __name__ == "__main__":
    main()
