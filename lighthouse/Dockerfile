FROM node:22-bookworm-slim

ENV CHROME_PATH=/usr/bin/chromium
ENV PORT=3001

RUN apt-get update \
    && apt-get install -y --no-install-recommends chromium \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY src ./src

EXPOSE 3001

CMD ["npm", "start"]
