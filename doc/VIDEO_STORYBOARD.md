# SORAVYN — AI multimodal storyboard generation and Video Studio bridge

## 1. Overview

This module establishes the autonomous bridge between:
1. **The Brand Memory**: target personas, products and value propositions, handled objections with verifiable proof.
2. **The Marketing Plan** and **the omnichannel Editorial Calendar**: creative proposals, formats, hooks and publication dates.
3. **The Docker and HyperFrames Video Studio**: isolated worker, GSAP composition, local speech synthesis, validated MP4 render and SRT subtitle extraction.

---

## 2. Architecture and components

### 2.1 Multimodal storyboard synthesis (`server/src/services/storyboard-generator.ts`)
- **Calibrated narrative structure**: 4 consecutive scenes totaling 24 seconds:
  1. **Scene 1: Hook (5s)**: a punchy hook aligned with the target audience and the channel.
  2. **Scene 2: Problem / Friction (6s)**: formulation of the objection or friction identified in the Brand Memory.
  3. **Scene 3: Solution and Offer (8s)**: demonstration of the brand's product value proposition.
  4. **Scene 4: Call to Action / CTA (5s)**: an engaging close towards conversion.
- **Synchronized subtitles (`captionCues`)**: computation of the `[startMs, endMs]` time markers for generating the `.srt` file.
- **Automatic platform resolution**: `tiktok`, `reels`, `shorts` (9:16 vertical), `youtube` (16:9 landscape), or `square` (1:1).

### 2.2 API endpoints (`server/src/routes/video-storyboard.ts`)
- `POST /api/companies/:companyId/studio/video/preview-storyboard`: simulation and inspection of the storyboard without triggering a heavy render.
- `POST /api/companies/:companyId/studio/video/generate-from-proposal`: generates the storyboard, queues the video job (`studio_video_jobs`), and switches the editorial slot to `status: "in_production"`.
- `GET /api/companies/:companyId/studio/video/proposals`: filtered list of the marketing proposals eligible for the video format.

### 2.3 Asynchronous synchronization and post-production
- **Render finished (`server/src/video-worker.ts`)**: the worker signals the end of the render and updates the linked editorial calendar item to `ready_for_review` status, with the MP4 download URL in `publishedUrl`.
- **Governance and approval (`server/src/routes/approvals.ts`)**: when the decision maker approves the video, the calendar slot automatically switches to `approved`.

### 2.4 User interface (`ui/src/components/EditorialCalendarPanel.tsx`)
- Automatic detection of the video items in the calendar.
- Interactive `🎬 AI Storyboard & Render` button opening a configuration modal (platform, template, narration).
- Instant preview of the 4-scene scenario and the voice-over lines.
- Animated `⚙️ Rendering...` badge while the Docker worker is running.
- Built-in HTML5 video player with MP4 asset download buttons once ready.

---

## 3. Tests

- **Unit tests** (`server/src/__tests__/storyboard-generator.test.ts`).
- **End-to-end PostgreSQL smoke test** (`scripts/verification/video-storyboard-smoke.ts`): full cycle against a real PostgreSQL instance, including strict multi-tenant partitioning (404 rejection of cross-company requests).
