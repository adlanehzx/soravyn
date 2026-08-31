FROM node:24.20.0-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends chromium ffmpeg fonts-dejavu-core espeak-ng && rm -rf /var/lib/apt/lists/*
WORKDIR /opt/video
RUN npm init -y && npm install --ignore-scripts hyperframes@0.6.91 gsap@3.14.2
ENV PRODUCER_HEADLESS_SHELL_PATH=/usr/bin/chromium
ENV HOME=/tmp
USER 1000:1000
WORKDIR /work
ENTRYPOINT ["node", "/opt/video/node_modules/hyperframes/dist/cli.js"]
