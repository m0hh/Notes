# Start from the official Go image
FROM golang:1.24.2-alpine AS builder

# Install migrate CLI
RUN go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest

WORKDIR /app

# Copy go mod and sum files
COPY go.mod go.sum ./

# Download all dependencies. Dependencies will be cached if the go.mod and go.sum files are not changed
RUN go mod download

# Copy the source code into the container
COPY . .

# Build the Go app
# Running CGO_ENABLED=0 to build a statically linked binary for smaller image size
# and -ldflags "-w -s" to strip debug information
RUN \
    BUILD_TIME_VALUE=$(date +%Y-%m-%dT%H:%M:%S%Z) && \
    CGO_ENABLED=0 GOOS=linux go build \
    -a -installsuffix cgo \
    -ldflags "-w -s -X main.buildTime=${BUILD_TIME_VALUE} -X main.version=1.0.0" \
    -o /go/bin/app \
    ./cmd/api

# Start a new stage from scratch for a smaller image
FROM alpine:latest

# Security updates
RUN apk --no-cache add ca-certificates

# Set the Current Working Directory inside the container
WORKDIR /root/

# Copy the Pre-built binary file from the previous stage
COPY --from=builder /go/bin/migrate /usr/local/bin/
COPY --from=builder /go/bin/app .

# Copy migrations (if your app runs them on startup, otherwise adjust)
COPY --from=builder /app/migrations ./migrations

# Copy templates (if needed by your app at runtime)
# COPY --from=builder /app/internal/mailer/templates ./internal/mailer/templates

# Copy uploads directory (if needed, though typically this would be a volume)
# RUN mkdir -p /root/uploads/temp
# COPY --from=builder /app/uploads ./uploads


# Expose port 4000 to the outside world
EXPOSE 4000

# Command to run the executable
# Pass necessary configurations as environment variables or command-line arguments
# For example, you might need to pass DB_DSN, API keys, etc.
# CMD ["./app", "-db-dsn=", "your_db_dsn_here"]
CMD ["sh", "-c", "migrate -path ./migrations -database \"$DB_DSN\" up && ./app"]
