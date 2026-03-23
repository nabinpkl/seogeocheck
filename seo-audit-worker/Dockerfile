FROM node:22-bookworm-slim

ENV TEMPORAL_ADDRESS=temporal:7233
ENV TEMPORAL_NAMESPACE=default
ENV SEO_AUDIT_TASK_QUEUE=seogeo-seo-signals
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

RUN corepack enable && \
    apt-get update && \
    apt-get install -y build-essential python3 pkg-config procps && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile && \
    pnpm exec playwright install --with-deps chromium

COPY src ./src

CMD ["pnpm", "start"]
