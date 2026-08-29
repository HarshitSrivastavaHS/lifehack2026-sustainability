FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    ca-certificates \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

RUN npm install --global \
    @expo/ngrok@4.1.0 \
    @openai/codex

WORKDIR /workspace

RUN mkdir -p /workspace/node_modules \
    && chown -R node:node /workspace

USER node

CMD ["sleep", "infinity"]
