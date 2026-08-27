ARG POSTGRES_IMAGE=postgres:18.6-bookworm@sha256:1c59e2c3c818eaa0f0628f695b36e7c9e362d6b219b36a54a32df645cbd7e1af

FROM ${POSTGRES_IMAGE} AS rclone-fetch
ARG TARGETARCH
ARG RCLONE_VERSION=1.75.0
ARG RCLONE_SHA256_AMD64=aa2804e08f48250e71009c727124b6341cd0288465804a9a09d14663cabafbaa
ARG RCLONE_SHA256_ARM64=d0ad88ba4c8e285b7c9efa591e0ab643280a91741e13c27f3a9c0957ccfa5203

RUN case "$TARGETARCH" in \
      amd64) checksum="$RCLONE_SHA256_AMD64" ;; \
      arm64) checksum="$RCLONE_SHA256_ARM64" ;; \
      *) echo "Unsupported TARGETARCH: $TARGETARCH" >&2; exit 64 ;; \
    esac \
    && apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates curl unzip \
    && curl --fail --silent --show-error --location \
      "https://github.com/rclone/rclone/releases/download/v${RCLONE_VERSION}/rclone-v${RCLONE_VERSION}-linux-${TARGETARCH}.zip" \
      --output /tmp/rclone.zip \
    && echo "${checksum}  /tmp/rclone.zip" | sha256sum --check --strict \
    && unzip -q /tmp/rclone.zip -d /tmp/rclone \
    && install -m 0755 "/tmp/rclone/rclone-v${RCLONE_VERSION}-linux-${TARGETARCH}/rclone" /rclone

FROM ${POSTGRES_IMAGE}
RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates jq \
    && rm -rf /var/lib/apt/lists/*

COPY --from=rclone-fetch /rclone /usr/local/bin/rclone
COPY --chmod=0755 restore.sh /usr/local/bin/elceo-postgres-r2-restore-rehearsal

USER postgres
ENTRYPOINT ["/usr/local/bin/elceo-postgres-r2-restore-rehearsal"]
