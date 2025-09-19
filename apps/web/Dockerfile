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
RUN pnpm install --frozen-lockfile

# Copy source files
COPY apps/web ./apps/web
COPY packages ./packages

# Build the web app
WORKDIR /app/apps/web
# Ensure all dependencies are available for build
RUN pnpm install --frozen-lockfile
# Build with environment variables
RUN pnpm run build

# Run stage
FROM node:20-alpine
WORKDIR /app

# Install security updates, dumb-init, wget, and pnpm
RUN apk --no-cache add dumb-init wget && \
    npm install -g pnpm@9.12.0

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/ui/package.json ./packages/ui/

# Copy built files and static assets
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next ./apps/web/.next
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# Set secure permissions
RUN chown -R nextjs:nodejs /app && \
    chmod -R 755 /app

# Switch to non-root user
USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
WORKDIR /app/apps/web
CMD ["pnpm", "start"]