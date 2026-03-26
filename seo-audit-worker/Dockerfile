FROM node:22-bookworm-slim

ENV TEMPORAL_ADDRESS=temporal:7233
ENV TEMPORAL_NAMESPACE=default
ENV SEO_AUDIT_TASK_QUEUE=seogeo-seo-signals
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

RUN corepack enable && \
    apt-get update && \
    apt-get install -y build-essential python3 pkg-config procps && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /workspace/seo-audit-worker

COPY seo-audit-worker/package.json seo-audit-worker/pnpm-lock.yaml seo-audit-worker/tsconfig.json ./
RUN pnpm install --frozen-lockfile && \
    pnpm exec playwright install --with-deps chromium

COPY seo-audit-worker/src ./src
COPY schemas ../schemas

RUN pnpm run build

CMD ["pnpm", "start"]
