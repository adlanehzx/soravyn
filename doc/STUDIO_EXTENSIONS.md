# Studio extensions

## Delivered features

1. **Local creative pack**: persisted jobs, four observable steps (strategy, script, storyboard, texts), validated structured answers. From Campaign Studio, drafts are submitted to the existing steps in their order. Human approval remains mandatory. Configure `SORAVYN_OLLAMA_MODEL` and optionally `SORAVYN_OLLAMA_URL` on the API and the worker; only a local HTTP endpoint is accepted. No new paid cloud call.
2. **Marketing texts**: writing, import of the pack's proposals, approval/rejection with comment, and a new version linked to the previous one. Texts can be viewed and downloaded in Content Library; no external publication.
3. **Brand Kit**: colors, languages, three local font families, editorial rules and a PNG/JPEG/WebP logo with a rights statement. The API checks logo ownership and the worker checks its integrity before isolated decoding. Workflows freeze this data; changing the brand does not rewrite campaigns already started.
4. **Video variations**: approved source, format choice, ordered scene selection and a new visual hook. New production and new approval. A variation does not replace a workflow's current video. Minimum total duration of 5 seconds in line with the engine contract; maximum 90 seconds. Rendering is complete, not a partial frame computation. Custom timings are removed when scenes are selected.
5. **Timecoded comments and client portal**: position checked within the scene, optional correction task on the operator side. Review links limited to one video, valid for 1 to 14 days, revocable; random tokens stored only as hashes. The link secret stays in the browser fragment and is sent through a header that is masked in the logs. The client sees neither the internal notes nor the administration. A link allows one decision; a rejection creates a task without running a model. Client agreement is distinct from internal approval. A replaced workflow video is no longer accessible through its old link.
6. **Budget and diagnostics**: campaign envelope, amounts reserved transactionally before tasks are authorized, declared costs and manual release after review/end of task. Basic diagnostics for storage, local model, Docker, render image and recent worker signal.
7. **Voice and subtitles**: real WAV preview with eSpeak in an isolated container, speed/pitch and literal pronunciation replacements. Custom timings, per word or sentence, checked, exported as SRT and shown in the render. Without custom timings, the SRT subtitles follow the scenes.

## Explicit limits

- A real Ollama model was not run during verification: the HTTP model server is a fixture. The real generation path depends on an installed local model, its capabilities and the available resources.
- No premium voice and no automatic word-by-word alignment. Custom timings are entered manually. No music added by this release.
- The budget also checks generic agent runs attached to a capped campaign. Only the unconsumed part of the reservations is added to the costs reported; an authorization can be renewed. It does not directly cap the provider's invoice. See GOVERNANCE.md.
- The portal is access by possession of a private link, not a named account with strong authentication. It remains subject to the instance's network configuration. Anyone holding the link can give an opinion; revoke the link in case of a leak.
- The worker signal relies on a file in the shared storage, refreshed every ten seconds and considered recent for thirty seconds. It is an activity diagnostic, not a render guarantee nor a distributed scheduler.
- The list of packs is limited to the campaign's 100 most recent jobs, and the library texts list to 200 items. No pagination in this release.
- No responsive browser test was run for these new panels. TypeScript/build and HTTP tests do not replace a visual review.

## Reproducible verification

```sh
pnpm db:generate             # only after a schema change
pnpm -r typecheck
pnpm test:run
pnpm build
```

The script `scripts/verification/studio-extensions-smoke.mjs` expects a local API started like this, in a dedicated terminal:

```sh
PORT=3203 SORAVYN_OLLAMA_MODEL=soravyn-fixture \
SORAVYN_OLLAMA_URL=http://127.0.0.1:11435 pnpm dev:once
```

Then run in another terminal:

```sh
node scripts/verification/studio-extensions-smoke.mjs
```

The script starts a simulated model server on port 11435 and `--once` workers limited to its verification client with `SORAVYN_VIDEO_COMPANY_ID`. Avoid having a global worker process these test jobs at the same time. It creates verification clients and artifacts; it deletes no existing data. Docker, the `soravyn-video:0.6.91` image and ffprobe are required. The detailed result is written to `/tmp/soravyn-extensions-proof.json`.
