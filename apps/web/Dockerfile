# syntax=docker/dockerfile:1.7-labs

# -------------------- base --------------------
    FROM node:20-alpine AS base
    WORKDIR /app
    
    # Use corepack to pin pnpm and set a persistent store for cache mounts
    RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
    RUN pnpm config set store-dir /pnpm/store
    
    # Non-root user (same UID/GID as before)
    RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
    
    ENV NEXT_TELEMETRY_DISABLED=1
    
    # -------------------- deps (network only once) --------------------
    FROM base AS deps
    # Only files affecting dependencies
    COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
    COPY apps/web/package.json ./apps/web/package.json
    COPY packages/ui/package.json ./packages/ui/package.json
    
    # Pre-fetch deps into the pnpm store (uses BuildKit cache mount; fast on rebuilds)
    RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
        pnpm fetch
    
    # -------------------- builder --------------------
    FROM base AS builder
    ENV NODE_OPTIONS="--max-old-space-size=2048"
    
    # Full source
    COPY . .
    
    # Install from pre-fetched store without hitting the registry
    RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
        pnpm install --frozen-lockfile --offline
    
    # Build (cache Next at .next/cache; still fresh because sources changed invalidate it)
    WORKDIR /app/apps/web
    
    # Support both WS env var spellings (WS_URL / SOCKET_URL)
    ARG NEXT_PUBLIC_API_URL
    ARG NEXT_PUBLIC_WS_URL
    ARG NEXT_PUBLIC_SOCKET_URL
    
    RUN --mount=type=cache,id=next-cache,target=.next/cache \
        export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL}" && \
        export NEXT_PUBLIC_WS_URL="${NEXT_PUBLIC_WS_URL:-${NEXT_PUBLIC_SOCKET_URL}}" && \
        pnpm run build
    
    # -------------------- runner --------------------
    FROM node:20-alpine AS runner
    WORKDIR /app
    
    # minimal tools for healthcheck + init
    RUN apk --no-cache add dumb-init wget
    
    # Non-root user
    RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
    
    ENV NODE_ENV=production
    ENV NEXT_TELEMETRY_DISABLED=1
    
    # Copy standalone server and assets
    COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
    COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
    COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
    
    USER nextjs
    
    # Health check
    HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
        CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1
    
    EXPOSE 3000
    
    # Use dumb-init to handle signals properly
    ENTRYPOINT ["dumb-init", "--"]
    CMD ["node", "apps/web/server.js"]
    