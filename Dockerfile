FROM node:20-slim

ARG GH_TOKEN

RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./

RUN git config --global url."https://${GH_TOKEN}@github.com/".insteadOf "https://github.com/" && \
    git config --global url."https://${GH_TOKEN}@github.com/".insteadOf "git://github.com/" && \
    npm install --legacy-peer-deps

COPY . .

RUN mkdir -p tmp sessions jadibot data

CMD ["node", "index.js"]
