# ChainDock Ledger Service — Railway (Option A: mock + file persistence)
FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
# Railway injects PORT; default 3001 for local parity.
ENV PORT=3001 LEDGER_MODE=mock ALLOW_DEMO_ENDPOINTS=true LEDGER_FILE=/data/ledger.json
VOLUME ["/data"]
EXPOSE 3001
CMD ["node", "dist/server.js"]
