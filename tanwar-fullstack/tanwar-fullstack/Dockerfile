# Small production image: only runtime dependencies, runs as a non-root user.
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --chown=node:node . .

ENV NODE_ENV=production
EXPOSE 4000
USER node

CMD ["node", "server.js"]
