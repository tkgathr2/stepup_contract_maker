FROM node:20-slim

# Install LibreOffice and Japanese fonts for PDF generation
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    libreoffice-writer \
    libreoffice-common \
    fonts-noto-cjk \
    openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy all application code
COPY . .

# Build Next.js
RUN npx next build

# Expose port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start: run migrations, sync templates, then start Next.js
CMD ["sh", "-c", "npx prisma migrate deploy && node scripts/create-sample-templates.js && npx next start -H 0.0.0.0"]
