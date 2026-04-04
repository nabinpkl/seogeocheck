FROM node:22-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

FROM base AS deps
WORKDIR /app/frontend

COPY frontend/package.json ./package.json
COPY frontend/pnpm-lock.yaml ./pnpm-lock.yaml
COPY frontend/pnpm-workspace.yaml ./pnpm-workspace.yaml

RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app/frontend

ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/frontend/node_modules ./node_modules
COPY frontend/package.json ./package.json
COPY frontend/pnpm-lock.yaml ./pnpm-lock.yaml
COPY frontend/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY frontend/next.config.ts ./next.config.ts
COPY frontend/tsconfig.json ./tsconfig.json
COPY frontend/next-env.d.ts ./next-env.d.ts
COPY frontend/postcss.config.mjs ./postcss.config.mjs
COPY frontend/eslint.config.mjs ./eslint.config.mjs
COPY frontend/components.json ./components.json
COPY frontend/scripts ./scripts
COPY frontend/public ./public
COPY frontend/src ./src
COPY schemas ../schemas

RUN pnpm run build

FROM base AS runner
WORKDIR /app/frontend

ARG PORT=3000
ENV PORT=${PORT}
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/frontend/package.json ./package.json
COPY --from=builder /app/frontend/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/frontend/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/frontend/next.config.ts ./next.config.ts
COPY --from=builder /app/frontend/public ./public
COPY --from=builder /app/frontend/.next ./.next
COPY --from=builder /app/frontend/node_modules ./node_modules

RUN pnpm prune --prod

EXPOSE ${PORT}

CMD ["sh", "-lc", "pnpm exec next start -p ${PORT}"]