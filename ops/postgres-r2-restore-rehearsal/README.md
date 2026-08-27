# PostgreSQL R2 restore rehearsal

This one-shot worker performs a controlled disaster-recovery rehearsal by reading a completed PostgreSQL custom archive from R2 and restoring it into a disposable, empty PostgreSQL 18 target. It is deliberately separate from the automated backup worker: its R2 credential **must** be Object Read only and scoped to the one backup bucket, while its database credential may write only to the disposable restore target. It opens no port, has no healthcheck, is not a Cron job, and exits after one run.

## Safety contract

Supply exactly `RESTORE_DATABASE_URL`, `R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `RESTORE_OBJECT_KEY`, and `RESTORE_CONFIRMATION=RESTORE_EMPTY_DISPOSABLE_TARGET`. The object key names the dump; the worker derives `<dump>.complete.json`. Never supply a staging or production source database URL as `RESTORE_DATABASE_URL`. The destination must be PostgreSQL 18, disposable, and empty; the worker never uses `--clean`, `--create`, drop operations, or R2 writes/deletes.

After the destination preflight passes, the manifest is the first R2 object fetched and is parsed with `jq`. Its schema, completion status, key, filename, size, SHA-256, and PostgreSQL 18.6 producer version must match. The archive then must match its size and SHA-256 and pass `pg_restore --list`. Only after those checks and the immediate empty-target recheck does the worker execute:

```text
pg_restore --single-transaction --no-owner --no-acl --dbname="$RESTORE_DATABASE_URL" archive.dump
```

`--single-transaction` makes restoration atomic: a failed rehearsal cannot leave an apparently usable partial database. The worker checks the same fail-closed destination inventory both before any R2 read and immediately before restore; it covers tables, views, materialized views, foreign tables, sequences, public routines, user-created public types, and the migration ledger.

On success it emits the server/database identity, `pg_tables`/`pg_views`/`pg_sequences` counts and sorted-name MD5s using the exact source fingerprint semantics, sorted extensions, and migration-ledger totals/status/applied-filename bounds. These are observations rather than hard-coded schema acceptance conditions, so future valid schema versions remain usable.

After a successful rehearsal, remove the temporary Railway worker and restore database. Do not configure Railway or Cloudflare through this directory. Production backup acceptance additionally requires a production point-in-time recovery (PITR) strategy.

## Validation

Run `bash -n restore.sh test.sh`, `./test.sh`, build the Docker image, and check the runtime versions/user as performed by the focused CI job.
