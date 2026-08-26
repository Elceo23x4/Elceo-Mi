FROM postgres:18.6-bookworm

ARG RCLONE_VERSION=1.70.3
ARG RCLONE_SHA256=7d69057e69385f6514a9684c7eaa424d972096b130284bb34dd967c4ed4f9dad

RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates curl unzip \
    && curl --fail --silent --show-error --location \
      "https://github.com/rclone/rclone/releases/download/v${RCLONE_VERSION}/rclone-v${RCLONE_VERSION}-linux-amd64.zip" \
      --output /tmp/rclone.zip \
    && echo "${RCLONE_SHA256}  /tmp/rclone.zip" | sha256sum --check --strict \
    && unzip -q /tmp/rclone.zip -d /tmp/rclone \
    && install -m 0755 "/tmp/rclone/rclone-v${RCLONE_VERSION}-linux-amd64/rclone" /usr/local/bin/rclone \
    && rm -rf /var/lib/apt/lists/* /tmp/rclone /tmp/rclone.zip

COPY --chmod=0755 backup.sh /usr/local/bin/elceo-postgres-r2-backup

ENTRYPOINT ["/usr/local/bin/elceo-postgres-r2-backup"]
