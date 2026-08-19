# Build Stage
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install git and build tools
RUN apk add --no-cache git ca-certificates tzdata

COPY go.mod go.sum* ./
RUN go mod download

COPY . .

RUN go mod tidy
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o /app/bin/prepyo-api ./cmd/api

# Final Minimal Stage
FROM alpine:3.20

WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata curl

COPY --from=builder /app/bin/prepyo-api /app/prepyo-api

EXPOSE 8080

USER nobody:nobody

ENTRYPOINT ["/app/prepyo-api"]
