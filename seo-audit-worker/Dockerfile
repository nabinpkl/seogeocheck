FROM node:22-bookworm-slim

ENV TEMPORAL_ADDRESS=temporal:7233
ENV TEMPORAL_NAMESPACE=default
ENV SEO_AUDIT_TASK_QUEUE=seogeo-seo-signals

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

COPY src ./src

CMD ["pnpm", "start"]
