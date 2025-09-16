# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Install security updates
RUN apk --no-cache add dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Copy package files first for better caching
COPY apps/web/package.json ./
RUN npm ci --only=production --legacy-peer-deps && npm cache clean --force

# Copy web app source files
COPY apps/web/app ./app
COPY apps/web/lib ./lib
COPY apps/web/middleware.ts ./
COPY apps/web/next.config.mjs ./
COPY apps/web/postcss.config.mjs ./
COPY apps/web/tailwind.config.js ./
COPY apps/web/tsconfig.json ./
COPY apps/web/vitest.config.ts ./
COPY apps/web/vitest.setup.ts ./
COPY apps/web/eslint.config.mjs ./
COPY apps/web/prettier.config.mjs ./
COPY apps/web/next-env.d.ts ./

# Copy shared packages
COPY packages/config/tsconfig.base.json ./packages/config/
COPY packages/ui ./packages/ui

# Fix tsconfig path and build
RUN sed -i 's|../../packages/config/tsconfig.base.json|./packages/config/tsconfig.base.json|g' tsconfig.json
RUN npm run build

# Run stage
FROM node:20-alpine
WORKDIR /app

# Install security updates and dumb-init
RUN apk --no-cache add dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy built files and install production dependencies
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Install only production dependencies
RUN npm ci --only=production --legacy-peer-deps && npm cache clean --force

# Set secure permissions
RUN chown -R nextjs:nodejs /app && \
    chmod -R 755 /app

# Switch to non-root user
USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]