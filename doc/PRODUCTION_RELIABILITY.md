# Persistent production, compositions and narration

## Steps and resumption

Creative packs record the strategy, the script, the storyboard and the texts separately in `production_steps`. Each row contains the state, the number of attempts, the dates, a fingerprint of the inputs and the validated result. Invalid JSON output is never recorded as a success.

Retrying a failed or cancelled job keeps its successful steps. The worker revalidates them and compares their fingerprints before reusing them. A targeted resumption creates a new pack: it keeps the compatible steps located before the chosen step and recomputes that one and the following ones. The source production is not modified and no campaign approval is granted automatically.

Each attempt writes to a folder specific to its lease. Published files are copied from that attempt under lease control, by atomic rename. An old container therefore does not share the working files of its retry. Attempts and intermediate files are kept; no additional automatic purge policy is added.

Saves check the job's lease in a transaction. An old worker, or a worker whose job has been cancelled, cannot publish its result late. A step left `running` after a stop is shown as interrupted as long as the job is no longer running. The lease recovery limits and the two existing automatic attempts are kept; explicit failures require an operator retry.

The creative fingerprint includes the frozen context, the configured model, the origin of the endpoint and the pipeline version. It does not detect a change of weights behind an unchanged model name: use a new name/version or resume from the strategy. Generated outputs remain proposals; no exhaustive semantic verification of the facts is claimed.

## Rendering and artifacts

The worker separates two real operations in restricted containers: media and audio preparation, then rendering and assembly. Their files are described by SHA-256 fingerprints. A retry reuses them only if the expected files are present, of bounded size and intact. A failed MP4 check can thus be retried without recomputing the frames already rendered.

The HTML composition and the integrity checks of the source media are still run on every attempt. This mechanism is not frame-by-frame incremental rendering; a visual change always creates a new render. Old jobs without saved steps are not retroactively converted.

## Three compositions

- **Editorial**: text hierarchy, scene marker and discreet media.
- **Product**: main visual and sales pitch separated, layout adapted to the ratio.
- **Launch**: centered hook, large title and launch frame.

The compositions are fixed SORAVYN code. Titles, texts and brand names are escaped; no arbitrary HTML or script is accepted by this path. The composition name is part of the validated contract. The vendored skills and their notices remain unchanged.

## Scene preview

The preview button creates a separate job in the worker. It produces a real MP4, with a long side of 640 pixels and 24 frames/s, a rate that complies with the engine contract. The format stays proportional; a scene shorter than five seconds is extended to five seconds for this preview. Custom subtitles are cropped to the selected scene.

The preview creates no approval, does not replace the approved storyboard and does not appear as a final deliverable. It has to be rerun after a change: this is not a real-time video editor. Its download remains limited to the company's authorized operators.

## Narration

The voice remains eSpeak, in French or English. Speed, pitch, pronunciations and pauses between words are configurable. The eSpeak pause is expressed in units of 10 ms at standard speed and varies with the speed. An FFmpeg `loudnorm` option targets −16 LUFS; this is simple single-pass normalization, not an audio broadcast certification. The preview playback also applies these settings.

A revision or variation can reuse the narration of its source if it belongs to the same company and campaign, if the spoken texts, durations, voice, pronunciations, normalization and exact Docker image match, and if the WAV matches the fingerprint in its report. The new video's report indicates the source reused. A missing, altered or incompatible file causes a new synthesis. Old reports without an audio fingerprint are not used as a cache.

No neural/premium voice and no automatic word-by-word alignment in this release. Custom subtitles remain entered manually. No paid provider and no additional model weights are installed.

## Verification

```sh
pnpm -r typecheck
pnpm test:run
pnpm build
```

The script `scripts/verification/production-foundations-smoke.mjs` expects a test API:

```sh
PORT=3204 SORAVYN_OLLAMA_MODEL=soravyn-foundation-fixture \
SORAVYN_OLLAMA_URL=http://127.0.0.1:11436 pnpm dev:once
```

In a second terminal:

```sh
node scripts/verification/production-foundations-smoke.mjs
```

The script creates its test clients and uses workers limited to their company. Avoid a concurrent global worker during this check. The HTTP model is a local fixture that returns an invalid storyboard once. Rendering, narration, normalization and the FFmpeg measurements are real. A fake host `ffprobe` binary is used to deliberately cause a failure after rendering, then the real binary verifies the resumption. No external provider is called. The machine proof is written to `/tmp/soravyn-foundations-proof.json`.

After the main check, `node scripts/verification/production-cancel-smoke.mjs` uses its proof to verify a cancellation during a model response, the refusal of a late publication, then the resumption of the interrupted step only. This check also uses an HTTP fixture.

For an upgrade from the old worker, stop the old processes before launching the new version: the historical workers used a shared working folder per job. The protections of the new attempts do not modify the code of an old process that is still running.
