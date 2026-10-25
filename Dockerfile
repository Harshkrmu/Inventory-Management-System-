# Small, production-only image: installs just what's needed to run
# the app (no devDependencies like nodemon), then starts the server.

FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "server.js"]
