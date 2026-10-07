/** CloudFormation, kept executable so IAM boundaries are shared by validation and deployment. */
import {writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const ref = name => ({Ref:name}), arn = name => ({'Fn::GetAtt':[name,'Arn']}), sub = text => ({'Fn::Sub':text});
const resource=(Type,Properties,other={})=>({Type,Properties,...other});
const policy=Statement=>({Version:'2012-10-17',Statement});
const allow=(Action,Resource)=>({Effect:'Allow',Action,Resource});
const trust=policy([{Effect:'Allow',Principal:{Service:'lambda.amazonaws.com'},Action:'sts:AssumeRole'}]);
const model='anthropic.claude-haiku-4-5-20251001-v1:0';
const logActions=['logs:CreateLogStream','logs:PutLogEvents'];
const params={
  CodeBucket:{Type:'String',Description:'Private release bucket in us-east-1.'},
  CodeKey:{Type:'String',Description:'Immutable SHA-named Lambda zip key.'},
  GenerationEnabled:{Type:'String',Default:'false',AllowedValues:['false','true'],Description:'Enable only after account model access and current price ceilings are verified.'},
};
const code={S3Bucket:ref('CodeBucket'),S3Key:ref('CodeKey')};
const env={JOBS_TABLE:ref('Jobs'),ARTIFACT_BUCKET:ref('Artifacts'),QUEUE_URL:ref('Queue'),GENERATION_ENABLED:ref('GenerationEnabled'),TEXT_MODEL:'us.'+model};
export const template={
 AWSTemplateFormatVersion:'2010-09-09',Description:'Private collaborator chronicle press. Shared $25 monthly model reservations; infrastructure charges separate.',
 Parameters:params,
 Resources:{
  Artifacts:resource('AWS::S3::Bucket',{PublicAccessBlockConfiguration:{BlockPublicAcls:true,BlockPublicPolicy:true,IgnorePublicAcls:true,RestrictPublicBuckets:true},BucketEncryption:{ServerSideEncryptionConfiguration:[{ServerSideEncryptionByDefault:{SSEAlgorithm:'AES256'}}]},OwnershipControls:{Rules:[{ObjectOwnership:'BucketOwnerEnforced'}]},VersioningConfiguration:{Status:'Enabled'}},{DeletionPolicy:'Retain',UpdateReplacePolicy:'Retain'}),
  ArtifactsPolicy:resource('AWS::S3::BucketPolicy',{Bucket:ref('Artifacts'),PolicyDocument:policy([{Effect:'Deny',Principal:'*',Action:'s3:*',Resource:[arn('Artifacts'),sub('${Artifacts.Arn}/*')],Condition:{Bool:{'aws:SecureTransport':'false'}}}])}),
  Jobs:resource('AWS::DynamoDB::Table',{BillingMode:'PAY_PER_REQUEST',AttributeDefinitions:[{AttributeName:'pk',AttributeType:'S'}],KeySchema:[{AttributeName:'pk',KeyType:'HASH'}],SSESpecification:{SSEEnabled:true},PointInTimeRecoverySpecification:{PointInTimeRecoveryEnabled:true}},{DeletionPolicy:'Retain',UpdateReplacePolicy:'Retain'}),
  DeadLetters:resource('AWS::SQS::Queue',{MessageRetentionPeriod:1209600,SqsManagedSseEnabled:true}),
  Queue:resource('AWS::SQS::Queue',{VisibilityTimeout:1200,MessageRetentionPeriod:1209600,SqsManagedSseEnabled:true,RedrivePolicy:{deadLetterTargetArn:arn('DeadLetters'),maxReceiveCount:3}}),
  Users:resource('AWS::Cognito::UserPool',{AdminCreateUserConfig:{AllowAdminCreateUserOnly:true},UsernameConfiguration:{CaseSensitive:false},Policies:{PasswordPolicy:{MinimumLength:14,RequireLowercase:true,RequireNumbers:true,RequireSymbols:true,RequireUppercase:true}},AccountRecoverySetting:{RecoveryMechanisms:[{Name:'admin_only',Priority:1}]}},{DeletionPolicy:'Retain',UpdateReplacePolicy:'Retain'}),
  Client:resource('AWS::Cognito::UserPoolClient',{UserPoolId:ref('Users'),GenerateSecret:false,ExplicitAuthFlows:['ALLOW_USER_PASSWORD_AUTH','ALLOW_REFRESH_TOKEN_AUTH'],PreventUserExistenceErrors:'ENABLED',AccessTokenValidity:1,IdTokenValidity:1,RefreshTokenValidity:1,TokenValidityUnits:{AccessToken:'hours',IdToken:'hours',RefreshToken:'days'},EnableTokenRevocation:true}),
  ApiLog:resource('AWS::Logs::LogGroup',{LogGroupName:sub('/aws/lambda/${AWS::StackName}-api'),RetentionInDays:14}),
  WorkerLog:resource('AWS::Logs::LogGroup',{LogGroupName:sub('/aws/lambda/${AWS::StackName}-worker'),RetentionInDays:14}),
  ApiRole:resource('AWS::IAM::Role',{AssumeRolePolicyDocument:trust,Policies:[{PolicyName:'AdmitReadAndQueue',PolicyDocument:policy([
    allow(logActions,arn('ApiLog')),allow(['dynamodb:GetItem','dynamodb:PutItem','dynamodb:UpdateItem'],arn('Jobs')),
    allow('sqs:SendMessage',arn('Queue')),allow('s3:GetObject',sub('${Artifacts.Arn}/chronicles/*'))])}]}),
  WorkerRole:resource('AWS::IAM::Role',{AssumeRolePolicyDocument:trust,Policies:[{PolicyName:'GenerateClaimedChronicles',PolicyDocument:policy([
    allow(logActions,arn('WorkerLog')),allow(['dynamodb:GetItem','dynamodb:UpdateItem'],arn('Jobs')),
    allow(['sqs:ReceiveMessage','sqs:DeleteMessage','sqs:GetQueueAttributes','sqs:SendMessage'],arn('Queue')),
    allow('s3:PutObject',sub('${Artifacts.Arn}/chronicles/*')),
    allow('bedrock:InvokeModel',[sub('arn:${AWS::Partition}:bedrock:us-east-1:${AWS::AccountId}:inference-profile/us.'+model),...['us-east-1','us-east-2','us-west-2'].map(r=>sub('arn:${AWS::Partition}:bedrock:'+r+'::foundation-model/'+model)),sub('arn:${AWS::Partition}:bedrock:us-west-2::foundation-model/stability.stable-image-core-v1:1')])
  ])}]}),
  Api:resource('AWS::Lambda::Function',{FunctionName:sub('${AWS::StackName}-api'),Runtime:'nodejs22.x',Handler:'handler.handler',Code:code,Role:arn('ApiRole'),MemorySize:256,Timeout:25,Environment:{Variables:env}},{DependsOn:'ApiLog'}),
  Worker:resource('AWS::Lambda::Function',{FunctionName:sub('${AWS::StackName}-worker'),Runtime:'nodejs22.x',Handler:'handler.handler',Code:code,Role:arn('WorkerRole'),MemorySize:512,Timeout:180,Environment:{Variables:env}},{DependsOn:'WorkerLog'}),
  QueueConsumer:resource('AWS::Lambda::EventSourceMapping',{EventSourceArn:arn('Queue'),FunctionName:ref('Worker'),BatchSize:1,FunctionResponseTypes:['ReportBatchItemFailures'],ScalingConfig:{MaximumConcurrency:2}}),
  HttpApi:resource('AWS::ApiGatewayV2::Api',{Name:sub('${AWS::StackName}-api'),ProtocolType:'HTTP',CorsConfiguration:{AllowOrigins:['*'],AllowHeaders:['content-type','authorization'],AllowMethods:['GET','POST','OPTIONS'],MaxAge:300}}),
  Auth:resource('AWS::ApiGatewayV2::Authorizer',{ApiId:ref('HttpApi'),AuthorizerType:'JWT',IdentitySource:['$request.header.Authorization'],Name:'Collaborators',JwtConfiguration:{Audience:[ref('Client')],Issuer:sub('https://cognito-idp.${AWS::Region}.amazonaws.com/${Users}')}}),
  Integration:resource('AWS::ApiGatewayV2::Integration',{ApiId:ref('HttpApi'),IntegrationType:'AWS_PROXY',IntegrationUri:arn('Api'),PayloadFormatVersion:'2.0'}),
  Submit:resource('AWS::ApiGatewayV2::Route',{ApiId:ref('HttpApi'),RouteKey:'POST /v1/chronicles',Target:sub('integrations/${Integration}'),AuthorizationType:'JWT',AuthorizerId:ref('Auth')}),
  Get:resource('AWS::ApiGatewayV2::Route',{ApiId:ref('HttpApi'),RouteKey:'GET /v1/chronicles/{id}',Target:sub('integrations/${Integration}'),AuthorizationType:'JWT',AuthorizerId:ref('Auth')}),
  Stage:resource('AWS::ApiGatewayV2::Stage',{ApiId:ref('HttpApi'),StageName:'$default',AutoDeploy:true,DefaultRouteSettings:{ThrottlingBurstLimit:5,ThrottlingRateLimit:2}}),
  InvokePermission:resource('AWS::Lambda::Permission',{Action:'lambda:InvokeFunction',FunctionName:ref('Api'),Principal:'apigateway.amazonaws.com',SourceArn:sub('arn:${AWS::Partition}:execute-api:${AWS::Region}:${AWS::AccountId}:${HttpApi}/*')}),
  UnknownMetric:resource('AWS::Logs::MetricFilter',{LogGroupName:ref('WorkerLog'),FilterPattern:'{ $.event = "InvocationUnknown" }',MetricTransformations:[{MetricNamespace:'Azhora/Chronicles',MetricName:'UnknownInvocations',MetricValue:'1',DefaultValue:0}]}),
  ReadyMetric:resource('AWS::Logs::MetricFilter',{LogGroupName:ref('WorkerLog'),FilterPattern:'{ $.event = "ChronicleReady" }',MetricTransformations:[{MetricNamespace:'Azhora/Chronicles',MetricName:'CompletedPages',MetricValue:'1',DefaultValue:0}]}),
  UnknownAlarm:resource('AWS::CloudWatch::Alarm',{Namespace:'Azhora/Chronicles',MetricName:'UnknownInvocations',ComparisonOperator:'GreaterThanThreshold',Threshold:0,EvaluationPeriods:1,Period:300,Statistic:'Sum',TreatMissingData:'notBreaching'}),
  QueueAlarm:resource('AWS::CloudWatch::Alarm',{Namespace:'AWS/SQS',MetricName:'ApproximateAgeOfOldestMessage',Dimensions:[{Name:'QueueName',Value:{'Fn::GetAtt':['Queue','QueueName']}}],ComparisonOperator:'GreaterThanThreshold',Threshold:3600,EvaluationPeriods:1,Period:300,Statistic:'Maximum',TreatMissingData:'notBreaching'}),
 },
 Outputs:{
  ApiUrl:{Value:sub('https://${HttpApi}.execute-api.${AWS::Region}.amazonaws.com')},
  ClientId:{Value:ref('Client')},UserPoolId:{Value:ref('Users')},JobsTable:{Value:ref('Jobs')},ArtifactBucket:{Value:ref('Artifacts')},
 },
};
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)await writeFile(new URL('./template.json',import.meta.url),JSON.stringify(template,null,2)+'\n');
