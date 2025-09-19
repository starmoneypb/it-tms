# Build
FROM golang:1.23-alpine AS builder
WORKDIR /app

# Install security updates and build dependencies
RUN apk add --no-cache ca-certificates tzdata build-base git

# Create non-root user for build
RUN addgroup -g 1001 -S app && adduser -u 1001 -S app -G app

# Copy dependencies first for better caching
COPY go.mod go.sum ./
RUN go mod download && go mod verify

# Copy source code and build
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o /out/api ./cmd/server

# Run (distroless-ish)
FROM alpine:3.20
RUN apk --no-cache add ca-certificates tzdata wget

# Create non-root user
RUN addgroup -g 1001 -S app && adduser -u 1001 -S app -G app
WORKDIR /app

# Copy all necessary files in one layer
COPY --from=builder /out/api /app/server
COPY --from=builder /app/openapi.yaml /app/openapi.yaml

# Set secure permissions
RUN chown -R app:app /app && \
    chmod -R 755 /app && \
    chmod +x /app/server

ENV PORT=8080
ENV UPLOAD_DIR=uploads

RUN mkdir -p /app/uploads && chown -R app:app /app/uploads && chmod 755 /app/uploads

# Switch to non-root user
USER app

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/healthz || exit 1

EXPOSE 8080
CMD ["/app/server"]