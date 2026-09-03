# PostgreSQL 18.6 to Cloudflare R2 backup worker

This directory builds a short-lived Railway Cron worker. It uses PostgreSQL
18.6 client tools to create restorable custom-format archives and rclone 1.75.0
to transfer them to the private `elceo-staging-backups` R2 bucket. It opens no
port, has no healthcheck, runs one operation, and exits as the unprivileged
`postgres` user. Keeping it separate prevents the public web runtime from
receiving backup credentials.

The final base is the official multi-platform
`postgres:18.6-bookworm@sha256:1c59e2c3c818eaa0f0628f695b36e7c9e362d6b219b36a54a32df645cbd7e1af`
index. Refreshing this digest when the official PostgreSQL image receives
security or base-layer updates is an intentional, reviewed maintenance action.
The multi-stage build selects amd64 or arm64 rclone 1.75.0 and verifies the
corresponding official release checksum; download tools do not enter the final
image.

## Runtime configuration

Set only these worker variables in the **staging** Railway service:

| Variable | Meaning |
| --- | --- |
| `DATABASE_URL` | Private PostgreSQL URL; required only in `backup` mode |
| `R2_ENDPOINT` | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
| `R2_BUCKET` | `elceo-staging-backups` |
| `R2_ACCESS_KEY_ID` | Bucket-scoped Object Read & Write key ID |
| `R2_SECRET_ACCESS_KEY` | Bucket-scoped secret |
| `BACKUP_RUN_MODE` | Exactly `probe` or `backup` |
| `PGCONNECT_TIMEOUT` | Optional PostgreSQL connection timeout in seconds; defaults to 15, range 1–300 |
| `BETTERSTACK_BACKUP_HEARTBEAT_URL` | Optional secret Better Stack heartbeat URL for backup-mode result reporting |

The script creates a private temporary rclone configuration and removes its
working directory on every exit. Never put credential values in Docker build
arguments, the repository, or the web service. The rclone S3 remote sets
`provider = Cloudflare`, `no_check_bucket = true`, and `acl = private`.

PostgreSQL connection establishment is bounded by `PGCONNECT_TIMEOUT=15` by
default, and `pg_dump` waits at most 60 seconds for each required shared lock.
There is deliberately no total dump-duration timeout: a legitimate large dump
may run longer. Rclone uses a 15-second connection timeout, five-minute stalled
I/O timeout, three high-level retries, five low-level retries, and ten seconds
between retries, preventing unbounded network retry behavior.

## Backup heartbeat semantics

Heartbeat reporting is optional and applies only to `backup` mode; probe mode
never sends a heartbeat. When configured, the value must be an HTTPS URL on
`uptime.betterstack.com` with the `/api/v1/heartbeat/<token>` endpoint shape.
Keep the complete value in the Railway secret variable and never place it in
commands, source, build arguments, or logs.

The worker sends the normal heartbeat only after the dump and completion
manifest have both been uploaded and remotely verified. If a real backup step
fails, its single exit handler makes one best-effort request to the configured
URL with `/fail` appended and then returns the original backup exit status.
Rclone `copyurl` supplies the HTTPS transport already present in the hardened
image; it uses a five-second connection timeout, a ten-second stalled-I/O
timeout, a 15-second maximum duration, and one attempt with no transport output.

The R2/database result and heartbeat-delivery result are separate operational
signals. A Better Stack outage is logged as a redacted `delivery=FAIL`, but it
does not invalidate an already verified R2 backup, change `overall=PASS`, or
make the worker exit non-zero. Likewise, failure-heartbeat delivery cannot mask
or replace the status of the backup operation that failed.

## Build and manual staging run

Create a Railway service whose root directory is this directory and whose
Dockerfile is `Dockerfile`. Add only the variables above, initially set
`BACKUP_RUN_MODE=probe`, and trigger one manual deployment/run. Confirm the run
reports upload, downloaded SHA-256 verification, remote deletion, and overall
`PASS`. Then switch to `backup` and manually run once. Do not configure a Cron
schedule in this phase. The same one-shot command can be scheduled later.

Probe mode never connects to PostgreSQL. It writes random local content, uploads
it below a unique `probes/` prefix, downloads and SHA-256 verifies it, then
deletes the remote object.

Backup mode first creates and locally validates
`backups/YYYY/MM/DD/elceo-<UTC timestamp>.dump`. It uploads and downloads the
dump, and verifies its SHA-256 before it creates or publishes the authoritative
`<dump key>.complete.json` manifest. The manifest declares schema version 1,
`status: complete`, object filename/key, timestamp, digest, byte size, and
pg_dump version. It is itself downloaded and compared byte-for-byte. A failure
before dump verification can leave an orphan dump, but never a completion
manifest. Future restore selection must only consider a dump with a valid
completion manifest. The worker never deletes old backups; configure retention
separately with an R2 lifecycle policy.

Rclone `--immutable` is only a client-side transfer overwrite guard. It is not
Cloudflare R2 WORM or object-retention protection. Actual production deletion
and overwrite protection will later use an R2 Bucket Lock on the `backups/`
prefix. The `probes/` prefix must remain outside that lock so probe cleanup
continues to work. This repository does not configure the lock.

## Restore readiness

Download the dump and its completion manifest, validate the manifest and digest,
then validate the archive without touching a database:

```sh
test "$(sha256sum elceo-<UTC timestamp>.dump | awk '{print $1}')" = \
  "$(jq -r .sha256 elceo-<UTC timestamp>.dump.complete.json)"
pg_restore --list elceo-<UTC timestamp>.dump >/dev/null
```

For a future disposable restore target, use the pattern (not the staging DB):

```sh
pg_restore --no-owner --no-acl --dbname="$DISPOSABLE_DATABASE_URL" elceo-<UTC timestamp>.dump
```

Production remains blocked until a staging backup succeeds and a separate,
disposable-target restore rehearsal completes successfully. This worker neither
configures Railway nor changes production.
