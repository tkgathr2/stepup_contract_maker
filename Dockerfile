# ---- Build stage ----
FROM node:20-slim AS builder

WORKDIR /app

# Install build dependencies
COPY package.json package-lock.json ./
RUN PUPPETEER_SKIP_DOWNLOAD=true npm ci

# Copy source and build
COPY . .
RUN npx prisma generate && npx next build

# ---- Production stage ----
FROM node:20-slim AS runner

WORKDIR /app

# Install Chromium shared-library dependencies + Japanese fonts
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 \
    libnspr4 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxkbcommon0 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    libcups2 \
    libxrandr2 \
    libxdamage1 \
    libxcomposite1 \
    libx11-xcb1 \
    libxtst6 \
    libxss1 \
    libxfixes3 \
    libxi6 \
    libxcursor1 \
    libgtk-3-0 \
    libdbus-1-3 \
    libexpat1 \
    fonts-noto-cjk \
    fonts-liberation \
    ca-certificates \
    openssl \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Copy everything from builder (simpler and ensures nothing is missed)
COPY --from=builder /app ./

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node scripts/create-sample-templates.js && npx next start -H 0.0.0.0 -p 3000"]
