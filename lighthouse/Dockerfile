FROM node:22-bookworm-slim

ENV CHROME_PATH=/usr/bin/chromium
ENV TEMPORAL_ADDRESS=temporal:7233
ENV TEMPORAL_NAMESPACE=default
ENV LIGHTHOUSE_TASK_QUEUE=seogeo-lighthouse

RUN apt-get update \
    && apt-get install -y --no-install-recommends chromium \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY src ./src

CMD ["npm", "start"]
