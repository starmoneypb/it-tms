# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Install security updates and pnpm
RUN apk --no-cache add dumb-init && \
    npm install -g pnpm@9.12.0

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Copy workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/ui/package.json ./packages/ui/

# Install workspace dependencies (including dev dependencies needed for build)
RUN pnpm install --frozen-lockfile && \
    rm -rf /root/.cache && \
    rm -rf /tmp/*

# Copy source files
COPY apps/web ./apps/web
COPY packages ./packages

# Preserve public directory before build (Next.js standalone doesn't include it)
RUN cp -r ./apps/web/public ./public-backup

# Build the web app
WORKDIR /app/apps/web
# Build with environment variables
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Disable TypeScript incremental compilation to save space
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Build with minimal cache and clean up immediately
RUN --mount=type=cache,target=/root/.cache/pnpm \
    --mount=type=cache,target=/root/.cache/next \
    pnpm run build && \
    rm -rf .next/cache && \
    rm -rf node_modules/.cache && \
    rm -rf /tmp/* && \
    pnpm prune --prod && \
    find . -name "*.tsbuildinfo" -delete

# Run stage
FROM node:20-alpine
WORKDIR /app

# Install security updates, dumb-init, and wget
RUN apk --no-cache add dumb-init wget

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install npm (since pnpm symlinks don't work well in standalone)
RUN npm install -g npm@latest

# Copy the standalone server and its dependencies
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
# Copy the static files to the correct location for standalone
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./.next/static
# Copy public directory to root level for standalone server
COPY --from=builder --chown=nextjs:nodejs /app/public-backup ./public

# Install production dependencies with npm (avoid pnpm symlink issues)
# Use npm install instead of npm ci since we don't have package-lock.json (using pnpm)
RUN npm install --omit=dev --legacy-peer-deps

# Ensure the nextjs user has write permissions to /app
RUN chown nextjs:nodejs /app && chmod 755 /app

# Switch to non-root user
USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]