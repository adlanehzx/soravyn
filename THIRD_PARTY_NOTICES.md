# Notices

OpenSoul/Paperclip : Copyright (c) 2026 Simhasana LLC, MIT, texte intégral dans LICENSE. Les packages internes anciennement @paperclipai/* sont désormais @soravyn/* ; leur origine reste attribuée ici.

LLM Video Maker : Copyright (c) 2026 Harald Thorvald Hautin, MIT, texte intégral dans vendor/llm-video-maker/LICENSE.

Assets et modèles externes : audit individuel requis avant redistribution.

The optional isolated video image installs HyperFrames 0.6.91 (Apache-2.0), GSAP 3.14.2, Chromium, FFmpeg and DejaVu fonts. Their package licenses remain in the image/system package documentation. Review the exact installed dependencies and applicable GSAP/FFmpeg build terms before distributing the image; no complete transitive license certification is claimed.

The video image also installs eSpeak NG (GPL-3.0-or-later) and its Debian runtime dependencies. Installed package copyright/license notices are retained under /usr/share/doc in the image. User-supplied images retain their owners’ rights; operator-supplied provenance is recorded in each assets.manifest.json. No Ollama model weights are distributed by SORAVYN.

## Optional local model used for verification

Ollama is an optional external runtime (MIT), not bundled with SORAVYN:
https://github.com/ollama/ollama/blob/main/LICENSE

The local verification used Qwen2.5-1.5B-Instruct (Apache-2.0). Model weights
are downloaded separately and are not distributed in this repository.
Model card and license: https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct
The license of another model must be checked separately before its use.
