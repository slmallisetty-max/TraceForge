# TraceForge Production Dockerfile

FROM node:18-alpine AS base

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/proxy/package.json ./packages/proxy/
COPY packages/web/package.json ./packages/web/
COPY packages/cli/package.json ./packages/cli/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/ ./packages/
COPY tsconfig.json ./

# Build all packages
RUN pnpm build

# Create production image
FROM node:18-alpine AS production

# Install wget for health checks
RUN apk add --no-cache wget

RUN npm install -g pnpm

WORKDIR /app

# Copy built artifacts and dependencies
COPY --from=base /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=base /app/packages ./packages
COPY --from=base /app/node_modules ./node_modules

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Create .ai-tests directory
RUN mkdir -p .ai-tests/traces .ai-tests/tests

# Create startup script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose ports
EXPOSE 8787 3001

ENV NODE_ENV=production

ENTRYPOINT ["docker-entrypoint.sh"]
