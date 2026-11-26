# Local video production

The first operating mode composes an explicit scene script into a SORAVYN HTML/GSAP template and runs HyperFrames 0.6.91. Script generation through a local Ollama is optional and requires a configured model. eSpeak narration and client images are integrated below. Music, word-level subtitle alignment and automatic publication remain absent.

## Prepare and start

```sh
pnpm video:image
pnpm dev
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DATABASE pnpm video:worker
```

The worker must use the same database as the server. With the inherited embedded configuration by default, the database listens on 54330; check the local configuration. Never copy development credentials into a public deployment.

Configure SORAVYN_VIDEO_ROOT (absolute path recommended), identical for the API and the worker. Default value: data/video at the project root. SORAVYN_VIDEO_IMAGE lets you select a managed image; users cannot supply an image or a command in a brief.

Create a brand and a campaign, then open Video Studio. Add the scenes and choose the format. The job is persisted; start the worker to process the queue. The dashboard shows observed events, with no artificial percentage. Successful outputs can be downloaded and a video_review request is created in the existing approvals.

## Architecture and limits

- PostgreSQL transactional claim with FOR UPDATE SKIP LOCKED; 20-minute lease, 15-minute render timeout. Two attempts at most after an interruption; explicit failure beyond that. A manual retry of a failed job is possible.
- Worker separate from the HTTP server; one job at a time per process.
- Non-root container, network cut off, read-only root, capabilities dropped, no-new-privileges, 2 CPUs, 2 GB RAM, 256 processes, bounded tmpfs and shm. No API secret and no Docker socket is mounted in the container. Only the job's folder is shared.
- The administrator worker has access to the Docker daemon: it must run on a dedicated production host, and not expose this capability to agents.
- Scene text is escaped; the API accepts neither HTML nor commands. No arbitrary AI-generated compositions yet.
- Files are private and served after a company check. The HTML is downloaded with a restrictive CSP, never displayed directly in the authenticated origin.
- Automatic MP4 validation: video track, dimensions and duration. Aesthetic and editorial review remains human. No full WCAG audit or automatic vision agent is claimed.
- Artifacts kept: brief compatible with the upstream validator, storyboard, composition, MP4 and FFprobe report. The upstream script validate-brief.mjs is actually executed.
- The library and per-scene revisions are available with the limits described below. Failed renders keep their intermediate files for administration.
- No worker liveness proof in the diagnostics: an available image does not mean a worker is running.

## Narration, images and revisions

The form now accepts local `fr` or `en` narration through eSpeak NG. This engine is not Kokoro: its output is synthetic. Rerun `pnpm video:image` to install the new image. Each scene track is measured, padded with silence up to the set duration, then assembled and muxed into AAC. If a voice overruns its scene, the job fails; shorten the text or create a project with a sufficient duration. No speed is silently increased.

PNG/JPEG/WebP images are uploaded through the existing storage. The API and the worker check the company; the worker also checks the SHA-256 and limits each file to 10 MB. PNG decoding and normalization by Sharp in the container with a pixel limit. The license/ownership note entered by the operator is kept in assets.manifest.json; this does not automatically certify its rights. Images take a separate slot above the content, so that their possible text is not overlaid on the script. No automatic stock media or external image generation yet.

The exported subtitles are per-scene SRTs, with no word alignment or dynamic style. Scenes show their visual text in the composition. A revision changes a scene's title and visual text, keeps its clock and spoken text, then recomputes the whole render. The old job stays intact, the revision carries revisionOf and revisionNote, and requires its own approval. The upstream validator is used for the HyperFrames brief without audio; the eSpeak narration is muxed in a later SORAVYN step and described in the final report.

The Content Library centralizes the client's finished productions and images, search, approved creations, downloads and side-by-side comparison of two renders. Current limit: 100 productions and 100 recent images; no pagination or frame-synchronized comparison.

## Optional local AI script

Configure SORAVYN_OLLAMA_URL and SORAVYN_OLLAMA_MODEL in the server and the worker. The button prepares an asynchronous job; the worker calls the local Ollama API and validates its JSON output. The script stays in the script_ready state and must be loaded/reviewed in the form before rendering. No automatic render or paid call results from it.

Reference for the contract used: https://docs.ollama.com/api/generate (POST /api/generate, stream:false, format:json). Cloud and arbitrary endpoints are not accepted by this local connector. No Ollama model was available during implementation: the connector's tests use simulated HTTP responses. A generation with a real model remains to be verified after installation/configuration by the administrator. The other existing agent adapters remain usable independently.

## Unified worker configuration

`pnpm video:worker` now reads the same instance configuration as the server. DATABASE_URL still takes priority for an external database. In embedded mode, start the API first; the worker detects the cluster's port in the postmaster.pid file and keeps its existing database identity. It is no longer necessary to copy development credentials into the local command.
