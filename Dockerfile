# Build on the native platform and cross-compile to avoid slow QEMU emulation
FROM --platform=$BUILDPLATFORM oven/bun:1 AS builder
ARG TARGETARCH

WORKDIR /build

COPY package.json bun.lock tsconfig.json bunfig.toml ./

RUN bun install --frozen-lockfile

COPY utils/ ./utils/
COPY providers/ ./providers/
COPY index.ts build.ts example.config.json ./

RUN bun check

# Cross-compile self-contained standalone binary based on the target architecture
RUN case "$TARGETARCH" in \
      amd64) export BUN_COMPILE_TARGET=bun-linux-x64 ;; \
      arm64) export BUN_COMPILE_TARGET=bun-linux-arm64 ;; \
    esac && \
    OUTFILE=/build/gacha-auto bun build.ts && \
    mkdir -p /build/home-container && \
    chown -R 65532:65532 /build/home-container

# Minimal hardened glibc runtime
FROM cgr.dev/chainguard/glibc-dynamic:latest

# Pre-seed writable container home directory for non-root execution
COPY --from=builder --chown=65532:65532 /build/home-container /home/container
COPY --from=builder --chown=65532:65532 /build/example.config.json /home/container/example.config.json
COPY --from=builder --chmod=0755 /build/gacha-auto /usr/bin/gacha-auto

USER 65532:65532
WORKDIR /home/container

CMD ["gacha-auto", "--cron"]
