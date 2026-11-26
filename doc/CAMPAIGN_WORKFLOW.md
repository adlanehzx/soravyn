# SORAVYN campaign workflow

## Delivered path

From Campaign Studio, open "Production workflow and deliverables", choose the strategy, script and storyboard owners, then create the workflow. The agents must belong to the same client. The brand and the brief are frozen with their version/date in the workflow; a later change to the brand does not alter a production in progress.

Strategy is the first open step. The script and storyboard tasks stay blocked until their predecessor is approved. Tasks are created without an executable assignee; the owner is recorded in the step. The operator's explicit authorization assigns the task, checks the agent's remaining monthly budget and requests its wake-up through the existing heartbeat mechanism. If its policy or configuration prevents execution, the interface reports it. An agent can only submit an active step it owns, after checking out its task. Production uses the models/adapters already configured, not a new implicit provider.

An operator can also write the deliverable by hand; its author is then recorded as human. The tests of the path use this possibility and do not pass their verification content off as AI generation.

Each submission creates an immutable versioned deliverable and a new approval. Strategy uses summary, positioning, keyMessages and channels; script and storyboard use the studio's scene contract. The approval center and the campaign panel expose the contents and decisions. A rejection or a revision request requires a comment, cancels the previous version's task and creates a correction task without launching a new paid model. An old approval cannot validate a newer version.

When strategy, script and storyboard are approved, the operator can queue the render. The job picks up the brand snapshot, the brief and the approved storyboard. Independent manual renders are refused for governed campaigns. The worker stays separate from the HTTP server. A successful output moves the campaign to review.

A video rejection automatically creates a correction task. The new version keeps unmodified scenes, durations and spoken text; its job becomes the current deliverable. Approving the fix completes the correction tasks of its lineage. Delivery can only use an approved current video, never a replaced version.

## Scheduling and report

The schedule records channel and date for an approved video. It publishes nothing on social networks. The operator confirms a delivery made manually and can add an HTTP(S) link.

Results are entered manually with source, date and author. They are presented as such, with no analytics integration and no invented ROI. The JSON report includes the tasks, versions, decisions, videos, deliveries and measurements. Costs are the sum of the events explicitly attached to the IDs of the campaign's tasks; missing or unattributed consumption is not treated as zero cost.

## API

Prefix: /api/companies/:companyId/studio/campaigns/:campaignId/workflow

- GET /: frozen context, steps, deliverables and corrections.
- POST /: strategistId, creativeId, producerId.
- POST /:kind/authorize: confirmConfiguredModelCosts:true (operator).
- POST /:kind/deliverables: validated content (operator or active responsible agent).
- POST /render: video job from the approved storyboard.
- GET/POST /schedule: manual schedule of an approved video.
- POST /schedule/:slotId/delivered: manual confirmation, optional externalUrl.
- POST /schedule/:slotId/cancel: cancellation of an undelivered slot.
- POST /measurements: metric, value, optional target, unit, source, measuredAt.
- GET /report: export of the traceable client report.

Decisions use the existing approval endpoints. The campaign_deliverable and video_review types are reserved for workflows and cannot be forged through the generic approval-creation endpoint. Client access is checked before approval mutations and agent key management.

## Explicit limits

The controlled budget is the agent's monthly budget; no hard monetary cap per campaign is claimed when the cost of the call is unknown. The authorization displays this limit before execution. The cost report depends on provider feedback. Human roles keep the base's operator model; a fine-grained administrator/collaborator/approver separation requires further work.

Approved upstream steps do not reopen yet after production has started. To change the brief or the durations in that case, create a new campaign/production. Delivered video revisions concern the visuals and keep narration/clock.

A complete creative run with a real LLM provider remains to be verified with a configured adapter and a cost authorization. The proofs for control plane, agent authentication, MP4 render, concurrency, rejection and delivery are distinguished from simulated model answers or content entered by the test operator.

## Cancellation and cost tracking

Queued or running video jobs can be cancelled from Video Studio. The decision is persisted with lease invalidation; the worker watches its lease, stops its own container and cannot publish a result under an expired lease. Container names include the lease so that an old worker does not stop its replacement's container. A duration limit inside the container complements the worker process timeout. An explicit retry is allowed after a failure or a cancellation.

Costs from heartbeat runs are now attached to their task when the context provides a valid issueId from the same client. They go through the existing cost service, which updates the budgets and pauses the agent once the declared monthly budget is reached. Consumption that exposes no cost or task stays flagged as incomplete in the report; this does not guarantee a billing cap at an external provider.

Delivery slots still scheduled can be cancelled; a delivery already recorded stays in the history.
