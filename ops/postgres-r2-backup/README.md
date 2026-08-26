# PostgreSQL 18.6 to Cloudflare R2 backup worker

This directory builds a short-lived Railway Cron worker. It uses the PostgreSQL
18.6 client tools to create restorable custom-format archives and rclone 1.70.3
to transfer them to the private `elceo-staging-backups` R2 bucket. It opens no
port, has no healthcheck, runs one operation, and exits. Keeping it separate
prevents the public web runtime from receiving backup credentials.

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

The script creates a mode-0600-equivalent temporary rclone configuration under
a private temporary directory and removes the directory on every exit. Never
put these values in Docker build arguments, the repository, or the web service.
The rclone S3 remote sets `provider = Cloudflare`, `no_check_bucket = true`, and
`acl = private`.

## Build and manual staging run

Create a Railway service whose root directory is this directory and whose
Dockerfile is `Dockerfile`. Add only the variables above, initially set
`BACKUP_RUN_MODE=probe`, and trigger one manual deployment/run. Confirm the run
reports upload, downloaded SHA-256 verification, remote deletion, and overall
`PASS`. Then switch to `backup` and manually run once. Do not configure a Cron
schedule in this phase. The same one-shot command can be scheduled by Railway
later without changing the image.

Probe mode never connects to PostgreSQL. It writes random local content, uploads
it below a unique `probes/` prefix, downloads and SHA-256 verifies it, then
deletes the remote object.

Backup mode creates `backups/YYYY/MM/DD/elceo-<UTC timestamp>.dump` plus a JSON
manifest. It validates the custom archive with `pg_restore --list`, uploads both
objects immutably, downloads both again, verifies the dump SHA-256 and compares
the manifest byte-for-byte. Any failure exits non-zero. The worker never deletes
old backups; configure retention separately with an R2 lifecycle policy.

## Restore readiness

Download an archive and validate it without touching a database:

```sh
pg_restore --list elceo-<UTC timestamp>.dump >/dev/null
```

For a future disposable restore target, use the pattern (not the staging DB):

```sh
pg_restore --no-owner --no-acl --dbname="$DISPOSABLE_DATABASE_URL" elceo-<UTC timestamp>.dump
```

Production remains blocked until a staging backup succeeds and a separate,
disposable-target restore rehearsal completes successfully. This worker neither
configures Railway nor changes production.
