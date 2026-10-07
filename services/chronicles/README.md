# The Azhora chronicle press

This service is independent of Hearthfall's existing deployment. It accepts fictional settlement facts from invited collaborators and creates one new prose account and one new woodcut per page.

## Infrastructure and cost boundary

- HTTP API Gateway validates Cognito JWTs. Self-registration is disabled; the user-pool client has no secret.
- The API Lambda validates facts, atomically reserves spending in DynamoDB, saves a job, and sends its ID to SQS. It has no Bedrock permission.
- The queue permits at most two concurrent worker invocations, which claim queued jobs exactly once. Their role can invoke only the chosen Haiku inference profile and Stable Image Core model, update this job table, and write this private bucket. No reserved Lambda capacity is required.
- SQS has a dead-letter queue; database state and S3 artifacts are encrypted and retained on stack deletion.
- CloudWatch records completion, failure, unknown billing outcomes and queue delay. Logs expire after fourteen days.

The model reservation limit is **$25 per UTC calendar month for the whole service**, shared by all collaborators. Each page reserves eight cents before any invocation: four cents for bounded text and four for one image. At most 312 such reservations fit in a month. Reservations are intentionally not refunded automatically, even when an invocation fails or is uncertain. They are a conservative spending ceiling, not a billing estimate.

On 2026-10-06, AWS's actual agreement offer rate cards reported US standard Haiku input/output rates of $1.10/$5.50 per million tokens and Stable Image Core at $0.04 per image. The writer caps context at 24,000 UTF-8 bytes and output at 1,000 tokens, leaving headroom within its four-cent reservation. Verify prices again before enabling a later release. See [Bedrock pricing](https://aws.amazon.com/bedrock/pricing/) and [the Haiku model card](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-haiku-4-5.html).

API Gateway, Lambda, Cognito, SQS, DynamoDB/PITR, S3 and CloudWatch are metered separately. The model gate does not cap infrastructure charges or other activity in the AWS account. There is no provisioned model throughput or always-on server.

Jobs waiting across month boundaries pause and require a reservation in the month in which they will actually invoke. No new job starts within four minutes of month end. Model SDK retries are disabled. Duplicate queue deliveries cannot claim an already working job. Provider timeouts and interrupted invocations become `unknown`, preserving their reservations; they are never automatically re-invoked.

An explicit Bedrock `ThrottlingException` with HTTP 429 is a rejected request, according to the [InvokeModel error contract](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_InvokeModel.html). Only this case uses delayed exponential backoff with jitter, bounded to six retries. A rejected image resumes from saved prose; it does not invoke the writer again. The original reservation remains. Conditional claims enforce the saved retry time even when duplicate messages arrive early.

## Build and prepare deployment

```sh
npm ci --prefix services/chronicles
npm run build --prefix services/chronicles
node services/chronicles/template.mjs
python services/chronicles/package-release.py
```

The release archive is in `tests/artifacts/chronicles/azhora-press-release.zip`. Upload it into an authenticated AWS CloudShell session, or build the pinned integration commit in CloudShell. Unzip it, then:

```sh
python azhora-press/deploy.py
```

The script validates CloudFormation, creates a private release bucket if needed, uploads a SHA-named package, and prints a concrete change set. **It does not execute the stack by default.** Review its resources and IAM policies. Execute the reviewed change set through CloudFormation, or use `--execute` to create and execute a newly reviewed deployment. All resources run in us-east-1 except image inference in us-west-2; US Haiku inference may route to its supported US destination regions.

Generation defaults to disabled. Activate only after verifying the rate ceilings and accepting [Anthropic's applicable Bedrock terms](https://aws.amazon.com/legal/bedrock/third-party-models/) and Stability AI's terms. `deploy.py --enable --execute` checks model agreement and authorization status before activation. The script never accepts agreements, creates login credentials, or sends invitations.

Copy the resulting public configuration to `assets/settlement-service.json`. It contains only API URL, Cognito client ID and region. Rebuild the static site if needed. In the game's F8 pilot controls, open **Collaborators' press** to sign in. Tokens stay in session storage, passwords are not retained, refresh lasts at most the configured day, and sign-out clears the local session.

Create each collaborator in the dedicated Cognito pool with self-signup disabled. Use a temporary password and require a first-login password change. Suppress automated invitation messages unless the account owner explicitly asks to send them. Never commit credentials. Accounts grant access only to this press, not AWS Console access.

## API

- `POST /v1/chronicles`: `{entry, shareWithCollaborators?: true}`.
- `GET /v1/chronicles/{jobId}`: returns pending/queued/working/ready/budget/failed/unknown, with saved prose and a short-lived image URL when ready.

The identity is a hash of authenticated user plus page ID. Changed facts under that identity return 409. An authoring pack may explicitly mark its jobs shared; all invited collaborators can then read those assets through authenticated GET. Ordinary game jobs are owner-only. Fact payloads remain immutable.

Application state remains authoritative. Prose and scene validation enforces bounded strings and references to actual event IDs. This is a grounding constraint, not a semantic proof against every possible model hallucination.

## Operations and recovery

- Set CloudFormation `GenerationEnabled=false` to pause model calls. Preserve the table: deleting budget records would discard the spending guard.
- A storage or service outage leaves facts pending locally. The bounded checkpoint outbox is acknowledged only after archive writes complete.
- A queue send interrupted after reservation is recovered by resubmitting the same page, without another reservation.
- A worker timeout leaves a working/unknown job; redelivery does not repeat billed work.
- If both artifacts reached S3 but the final database update failed, `reconcile.py --table … --bucket … --job …` restores ready status from those saved artifacts without invoking a model.
- If a result is missing and billing is uncertain, investigate provider usage before authorizing a new invocation. Failed or unknown jobs do not automatically spend again.
- Legacy jobs classified as unknown before explicit throttle handling can be reviewed with `reconcile-throttles.py --pack …`. Its `--execute` option permits only operator-owned image requests with a matching CloudWatch `ThrottlingException`, saved prose, and a current-month reservation. It records the log-event evidence and never recovers a timeout or unlogged outcome.
- Monitor the unknown-invocation alarm, queue-age alarm, DLQ, Lambda errors and structured logs. Alarms have no messaging destinations configured.
- Removing the stack retains completed histories and job/budget records. The release bucket is also retained. Cleanup is an explicit account-owner action.

## Release status

The AWS service is deployed and enabled. See the [AWS activation record](../../docs/living-settlements.md#aws-activation-record) for account status and verification limits. The checked-in configuration contains the live public endpoint and client ID; it contains no credentials. Collaborator accounts remain to be provisioned after review.

## Operator authoring and public export

An account owner already signed into CloudShell can commission a pack without creating demo credentials:

```sh
node scripts/generate-settlement-demo.mjs
python services/chronicles/commission-pack.py --pack tests/artifacts/demo-pack/settlement-pack.json --wait-minutes 30 --export tests/artifacts/public-demo --asset-base https://d1ka8cpbx2rxkb.cloudfront.net/azhora-demo/
node scripts/build-settlement-demo.mjs
```

Run the generator only once for a new edition; resume commissioning against the saved pack. The operator utility uses IAM-authorized Lambda Invoke and a caller-derived identity. It does not bypass HTTP authentication or expose an unsigned API. Export requires all ninety-three pages to be ready and owned by the operator, copies the preserved images, and strips private job references and expiring URLs. Publish only the exported directory to the designated demo prefix. Public readers cannot submit generation work.
