# syntax=docker/dockerfile:1

FROM --platform=$BUILDPLATFORM golang:1.25-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git

COPY go.mod go.sum ./
RUN go mod download

COPY . .

ARG TARGETOS
ARG TARGETARCH

RUN CGO_ENABLED=0 \
    GOOS=$TARGETOS \
    GOARCH=$TARGETARCH \
    go build -ldflags="-s -w" \
    -o silly

FROM gcr.io/distroless/base-debian12

WORKDIR /app

COPY --from=builder /app/silly /usr/local/bin/silly

EXPOSE 6890

USER nonroot:nonroot

ENTRYPOINT ["/usr/local/bin/silly"]
