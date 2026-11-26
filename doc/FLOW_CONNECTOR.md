# Local Google Flow connector — experimental

This connector drives Flow's web interface from a separate worker, with a Chromium profile dedicated to each client. It is not a Google API and no API right is inferred from the Ultra subscription. Google's terms still apply: https://policies.google.com/terms . No mechanism to bypass CAPTCHAs, access restrictions or authentication is included.

## Actual state

Implemented: PostgreSQL queue, per-job human authorization of credits, isolation of client/campaign references, step tracking, MP4 download after verification, login and worker commands, and a Video Studio screen reserved for administrators. An interruption after the click is armed never causes an automatic second submission. Pending jobs can be cancelled; a local cancellation does not cancel a generation already submitted to Google.

Update: a real Google generation was then authorized for a maximum of 10 credits and carried out. See the real-test summary below. The initial queue was verified without spending anything. Manual login and authenticated inspection were then carried out; the agent adapter's selectors come from that inspection. The local queue tests prove persistence and stopping before consumption; the real Google test is separate evidence. Clips are downloaded into the Flow panel; their insertion into the HyperFrames composition, approvals and the client portal are not integrated yet.

## Login and requirements

The API must be running for the embedded PostgreSQL. Install Chromium and FFprobe, and use the same database and the same SORAVYN_VIDEO_ROOT for the API and the worker. The worker is local, with a graphical interface by default. Do not expose the profile or its directory over HTTP. No cookie, password or token is copied into the database or the application logs.

```sh
pnpm flow:login --company CLIENT_UUID
# Log in yourself in the dedicated standard Chromium window, then close it.
SORAVYN_FLOW_ENABLED=true pnpm flow:worker --company CLIENT_UUID
```

Only one login/worker command can own this profile. The `browser.lock` lock stays in place after a hard crash: stop any owning process and check the jobs and Flow before removing this directory by hand. Do not delete the profile to unlock it.

## Operator calibration

Create a private file `SORAVYN_VIDEO_ROOT/flow/CLIENT_UUID/recipe.json` after a real inspection of the connected project. For the historical direct mode, this file must contain the following properties, strictly validated (the agent schema is described below):

- `projectUrl`: Google Flow HTTPS URL without parameters or credentials.
- `ready`, `prompt`, `submit`, `price`, `settings`, `download`: Playwright selectors inspected in this interface.
- `priceText`: exact text of the visible cost; `credits`: its verified total cost for a single clip.
- `settingsText`: exact verified text containing the model, the format and the expected number of results.
- `blockers`: real selectors of the login, consent or challenge screens to watch.
- `reviewedAt`: ISO date of verification, valid for at most seven days.

No selector example is provided as if it were reliable. Use an empty project: if a download already exists, the job stops to avoid importing an old result. Automatic creation of new projects and handling of several results remain to be calibrated/developed; this connector therefore does not yet guarantee a chain of generations without intervention.

The price and settings text must match the calibration exactly. The worker requires a single downloadable result. It does not read the account's overall balance: the authorized envelope does not guarantee the amount actually billed by Google nor a cap across several applications. New spending requires a new, explicitly authorized job.

The `submission_uncertain` status requires human reconciliation in Flow. There is no automatic retry button for this case. After reconnection or calibration, only jobs stopped before submission can resume.

## Verification

```sh
pnpm -r --workspace-concurrency=1 typecheck
pnpm test:run
pnpm build
SORAVYN_TEST_URL=http://127.0.0.1:3207 node scripts/verification/flow-smoke.mjs
```

The smoke test creates two verification clients and launches no Google browser. Its worker stops on the absence of a recipe; this proof is distinct from a real generation.

The login command launches Chromium normally, without Playwright or CDP. Google may nevertheless refuse this browser or later automation. No camouflage or bypass parameter is added. If the refusal persists, stop this path and use Flow manually or an officially supported API.

## Authenticated inspection of 16 November 2026

Manual login succeeded. The interface observed is Flow Agent: a conversational proposal announces Veo 3.1 Lite, 8 seconds, 16:9, 720p and 10 credits, then asks for confirmation. The "Always" ask-for-confirmation setting is enabled. No Google video generation was triggered at this stage.

This interface requires a multi-step path (proposal, confirmation, generation, download) that is not covered by the historical direct recipe. A dedicated adapter was added afterwards (see below); a successful login alone does not validate the autonomous worker. The project and the inspection items stay in local private storage, outside the repository.

## Authorized real test and Flow Agent adapter

A single clip was approved in Flow after the user's explicit authorization: a Veo 3.1 Lite video for 10 displayed credits. The original 720p MP4 was downloaded without upscaling: 1280 × 720, 7.93 seconds, H264/AAC, complete FFmpeg decoding succeeded. The clip was imported into a SORAVYN campaign and its HTTP download verified. The amount actually debited was not reconciled with the Google statement. No second generation was launched.

The `agent_confirmation` adapter now supports the observed path: creating an empty project, checking the "Always" mode and the default model, entering the brief, reading the native permission, refusing any batch of several videos or price above the maximum, then a one-off approval and the original 720p download. It never selects "Always approve in the project". A private local recipe can contain `mode`, `projectUrl`, `model`, `reviewedAt`, `blockers`; the calibrated model is strictly `Veo 3.1 - Lite`. No call to an internal Google API and no copying of cookies is used. The direct recipe remains available for other interfaces.

The adapter's safeguards passed tests with a real Chromium on a synthetic offline HTML page. They are distinct from the Google test, run through browser control then operator import: **the full automatic worker has not yet performed an end-to-end Google generation**. Its activation remains explicit and no additional generation is authorized by the previous test.

To recover an already generated result without repeating a spend, the local operator can use `pnpm flow:import --company UUID --job UUID --file /path/clip.mp4 --observed-credits 10`. The job must be stopped, belong to the client and have a sufficient authorization, and the file must pass FFprobe and a complete FFmpeg decode. This command imports the result into private storage and makes it viewable in the Flow panel; it is neither an editorial validation nor a publication.
