#!/bin/bash
set -euo pipefail

subject="$(cd "$(dirname "$0")" && pwd)/backup.sh"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
mockbin="$tmp/bin"
export TMPDIR="$tmp/workspaces"
mkdir "$mockbin" "$TMPDIR"

cat >"$mockbin/rclone" <<'MOCK'
#!/bin/bash
set -euo pipefail
printf '%s\n' "$*" >>"$MOCK_RCLONE_LOG"
args=("$@")
for ((i=0; i<${#args[@]}; i++)); do
  if [[ "${args[$i]}" == copyto ]]; then
    source=${args[${#args[@]}-2]}; destination=${args[${#args[@]}-1]}
    if [[ "$source" == r2:* ]]; then
      remote_file="$MOCK_REMOTE/$(printf '%s' "$source" | sha256sum | awk '{print $1}')"
      cp "$remote_file" "$destination"
      if [[ "${MOCK_CORRUPT_DUMP_DOWNLOAD:-0}" == 1 && "$source" == *.dump ]]; then
        printf 'corrupt' >>"$destination"
      fi
    else
      if [[ "${MOCK_IMMUTABLE_COLLISION:-0}" == 1 && "$*" == *--immutable* ]]; then exit 9; fi
      mkdir -p "$MOCK_REMOTE"
      remote_file="$MOCK_REMOTE/$(printf '%s' "$destination" | sha256sum | awk '{print $1}')"
      if [[ -e "$remote_file" && "$*" == *--immutable* ]]; then exit 9; fi
      cp "$source" "$remote_file"
    fi
    exit 0
  fi
done
if [[ "$*" == *deletefile* ]]; then
  remote="${args[${#args[@]}-1]}"
  rm -f "$MOCK_REMOTE/$(printf '%s' "$remote" | sha256sum | awk '{print $1}')"
fi
MOCK
cat >"$mockbin/pg_dump" <<'MOCK'
#!/bin/bash
printf 'pg_dump %s\n' "$*" >>"$MOCK_PG_LOG"
[[ "${1:-}" == --version ]] && { echo 'pg_dump (PostgreSQL) 18.6 (Debian 18.6-1.pgdg12+1)'; exit; }
for arg in "$@"; do [[ "$arg" == --file=* ]] && printf 'mock custom archive' >"${arg#--file=}"; done
exit 0
MOCK
cat >"$mockbin/pg_restore" <<'MOCK'
#!/bin/bash
printf 'pg_restore %s\n' "$*" >>"$MOCK_PG_LOG"
exit "${MOCK_RESTORE_STATUS:-0}"
MOCK
chmod +x "$mockbin"/*

export PATH="$mockbin:$PATH" MOCK_RCLONE_LOG="$tmp/rclone.log" MOCK_PG_LOG="$tmp/postgres.log" MOCK_REMOTE="$tmp/remote"
export R2_ENDPOINT=https://account.r2.cloudflarestorage.com R2_BUCKET=elceo-staging-backups
export R2_ACCESS_KEY_ID=redacted-key R2_SECRET_ACCESS_KEY=redacted-secret

assert_clean() { [[ -z "$(find "$TMPDIR" -mindepth 1 -print -quit)" ]]; }
reset_mocks() { rm -rf "$MOCK_REMOTE"; : >"$MOCK_RCLONE_LOG"; : >"$MOCK_PG_LOG"; }

if env -u R2_BUCKET BACKUP_RUN_MODE=probe "$subject" >"$tmp/missing.log" 2>&1; then
  echo 'required environment test unexpectedly passed' >&2; exit 1
fi
grep -q 'variable=R2_BUCKET' "$tmp/missing.log"
! grep -Eq 'redacted-key|redacted-secret' "$tmp/missing.log"
assert_clean

if BACKUP_RUN_MODE=invalid "$subject" >"$tmp/invalid.log" 2>&1; then
  echo 'invalid mode test unexpectedly passed' >&2; exit 1
fi
grep -q 'error=invalid_run_mode' "$tmp/invalid.log"
assert_clean

reset_mocks
BACKUP_RUN_MODE=probe "$subject" >"$tmp/probe.log"
[[ ! -s "$MOCK_PG_LOG" ]]
grep -q 'copyto .*probes/' "$MOCK_RCLONE_LOG"
grep -q 'copyto r2:.*probes/' "$MOCK_RCLONE_LOG"
grep -q 'deletefile r2:.*probes/' "$MOCK_RCLONE_LOG"
grep -q 'integrity_verification=PASS' "$tmp/probe.log"
probe_upload_line=$(grep -n 'copyto .*probe.txt r2:' "$MOCK_RCLONE_LOG" | cut -d: -f1)
probe_download_line=$(grep -n 'copyto r2:.*probe.txt ' "$MOCK_RCLONE_LOG" | cut -d: -f1)
probe_delete_line=$(grep -n 'deletefile r2:.*probe.txt' "$MOCK_RCLONE_LOG" | cut -d: -f1)
(( probe_upload_line < probe_download_line && probe_download_line < probe_delete_line ))
assert_clean

reset_mocks
DATABASE_URL=postgresql://secret@example/db BACKUP_RUN_MODE=backup "$subject" >"$tmp/backup.log"
grep -q 'pg_dump --format=custom --no-owner --no-acl --lock-wait-timeout=60s --file=' "$MOCK_PG_LOG"
grep -q 'pg_restore --list' "$MOCK_PG_LOG"
grep -q -- '--immutable .*backups/.*/elceo-.*\.dump' "$MOCK_RCLONE_LOG"
grep -q '"manifest_schema_version":1,"status":"complete"' "$MOCK_REMOTE"/*
grep -q 'overall=PASS' "$tmp/backup.log"
! grep -Eq 'postgresql://|redacted-key|redacted-secret' "$tmp/backup.log"
dump_upload_line=$(grep -n 'copyto --immutable .*\.dump$' "$MOCK_RCLONE_LOG" | cut -d: -f1)
dump_download_line=$(grep -n 'copyto r2:.*\.dump ' "$MOCK_RCLONE_LOG" | cut -d: -f1)
manifest_upload_line=$(grep -n 'copyto --immutable .*\.complete\.json$' "$MOCK_RCLONE_LOG" | cut -d: -f1)
(( dump_upload_line < dump_download_line && dump_download_line < manifest_upload_line ))
assert_clean

reset_mocks
if DATABASE_URL=redacted MOCK_RESTORE_STATUS=7 BACKUP_RUN_MODE=backup "$subject" >"$tmp/validation-failure.log" 2>&1; then
  echo 'archive validation failure unexpectedly passed' >&2; exit 1
fi
grep -q 'stage=archive_validation status=FAIL' "$tmp/validation-failure.log"
! grep -q 'complete.json' "$MOCK_RCLONE_LOG"
assert_clean

reset_mocks
if DATABASE_URL=redacted MOCK_CORRUPT_DUMP_DOWNLOAD=1 BACKUP_RUN_MODE=backup "$subject" >"$tmp/corruption.log" 2>&1; then
  echo 'remote corruption unexpectedly passed' >&2; exit 1
fi
grep -q 'stage=dump_integrity_verification status=FAIL' "$tmp/corruption.log"
! grep -q 'complete.json' "$MOCK_RCLONE_LOG"
assert_clean

reset_mocks
if DATABASE_URL=redacted MOCK_IMMUTABLE_COLLISION=1 BACKUP_RUN_MODE=backup "$subject" >"$tmp/collision.log" 2>&1; then
  echo 'immutable collision unexpectedly passed' >&2; exit 1
fi
grep -q 'stage=dump_upload status=FAIL' "$tmp/collision.log"
! grep -q 'complete.json' "$MOCK_RCLONE_LOG"
assert_clean

echo 'backup worker tests: PASS'
