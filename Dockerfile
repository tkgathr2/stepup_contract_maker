FROM node:20-slim AS base

# Install LibreOffice and Japanese fonts
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    libreoffice-core \
    libreoffice-writer \
    fonts-noto-cjk \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# ----- deps stage -----
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci

# ----- build stage -----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npx next build

# ----- runner stage -----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy prisma files for migration
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Copy template files and scripts
COPY --from=builder /app/templates ./templates
COPY --from=builder /app/scripts ./scripts

# Expose port (Railway sets PORT env var)
EXPOSE 3000

# Start: run migrations, seed templates, then start server
CMD npx prisma migrate deploy && node scripts/create-sample-templates.js && node server.js
