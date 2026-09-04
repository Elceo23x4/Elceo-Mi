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
args=("$@")
env >>"$MOCK_CHILD_ENV_LOG"
printf '%s\n' "$*" >>"$MOCK_RCLONE_LOG"
if [[ " $* " == *" copyurl "* ]]; then
  [[ " $* " != *fake-sentinel-token* ]] || { printf 'heartbeat secret exposed in argv\n' >&2; exit 90; }
  [[ -z "${BETTERSTACK_BACKUP_HEARTBEAT_URL+x}" ]] || { printf 'heartbeat secret exposed in environment\n' >&2; exit 91; }
  urls_file=${args[${#args[@]}-2]}
  response_dir=${args[${#args[@]}-1]}
  [[ "$(stat -c %a "$urls_file")" == 600 ]]
  IFS=, read -r private_url response_name <"$urls_file"
  [[ "$response_name" == response ]]
  signal=success
  [[ "$private_url" == */fail ]] && signal=failure
  printf 'heartbeat %s\n' "$signal" >>"$MOCK_RCLONE_LOG"
  printf '%s\n' "$private_url" >&2
  printf 'discarded response' >"$response_dir/$response_name"
  exit "${MOCK_HEARTBEAT_STATUS:-0}"
fi
for ((i=0; i<${#args[@]}; i++)); do
  if [[ "${args[$i]}" == copyto ]]; then
    source=${args[${#args[@]}-2]}; destination=${args[${#args[@]}-1]}
    if [[ "${MOCK_FAIL_RCLONE_STAGE:-}" == dump_upload && "$source" != r2:* && "$destination" == *.dump ]]; then exit 42; fi
    if [[ "${MOCK_FAIL_RCLONE_STAGE:-}" == dump_download && "$source" == *.dump ]]; then exit 43; fi
    if [[ "${MOCK_FAIL_RCLONE_STAGE:-}" == manifest_upload && "$destination" == *.complete.json ]]; then exit 44; fi
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
env >>"$MOCK_CHILD_ENV_LOG"
printf 'pg_dump %s\n' "$*" >>"$MOCK_PG_LOG"
[[ "${1:-}" == --version ]] && { echo 'pg_dump (PostgreSQL) 18.6 (Debian 18.6-1.pgdg12+1)'; exit; }
[[ "${MOCK_DUMP_STATUS:-0}" != 0 ]] && exit "$MOCK_DUMP_STATUS"
for arg in "$@"; do [[ "$arg" == --file=* ]] && printf 'mock custom archive' >"${arg#--file=}"; done
exit 0
MOCK
cat >"$mockbin/pg_restore" <<'MOCK'
#!/bin/bash
env >>"$MOCK_CHILD_ENV_LOG"
printf 'pg_restore %s\n' "$*" >>"$MOCK_PG_LOG"
exit "${MOCK_RESTORE_STATUS:-0}"
MOCK
chmod +x "$mockbin"/*

export PATH="$mockbin:$PATH" MOCK_RCLONE_LOG="$tmp/rclone.log" MOCK_PG_LOG="$tmp/postgres.log" MOCK_REMOTE="$tmp/remote"
export MOCK_CHILD_ENV_LOG="$tmp/child-environment.log"
export R2_ENDPOINT=https://account.r2.cloudflarestorage.com R2_BUCKET=elceo-staging-backups
export R2_ACCESS_KEY_ID=redacted-key R2_SECRET_ACCESS_KEY=redacted-secret

assert_clean() { [[ -z "$(find "$TMPDIR" -mindepth 1 -print -quit)" ]]; }
reset_mocks() { rm -rf "$MOCK_REMOTE"; : >"$MOCK_RCLONE_LOG"; : >"$MOCK_PG_LOG"; : >"$MOCK_CHILD_ENV_LOG"; }
heartbeat_url='https://uptime.betterstack.com/api/v1/heartbeat/fake-sentinel-token'

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
BETTERSTACK_BACKUP_HEARTBEAT_URL="$heartbeat_url" BACKUP_RUN_MODE=probe "$subject" >"$tmp/probe.log"
[[ ! -s "$MOCK_PG_LOG" ]]
grep -q 'copyto .*probes/' "$MOCK_RCLONE_LOG"
grep -q 'copyto r2:.*probes/' "$MOCK_RCLONE_LOG"
grep -q 'deletefile r2:.*probes/' "$MOCK_RCLONE_LOG"
grep -q 'integrity_verification=PASS' "$tmp/probe.log"
grep -q 'heartbeat=SKIPPED reason=probe_mode' "$tmp/probe.log"
! grep -q '^heartbeat ' "$MOCK_RCLONE_LOG"
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
grep -q 'heartbeat=SKIPPED reason=not_configured' "$tmp/backup.log"
! grep -q '^heartbeat ' "$MOCK_RCLONE_LOG"
! grep -Eq 'postgresql://|redacted-key|redacted-secret' "$tmp/backup.log"
dump_upload_line=$(grep -n 'copyto --immutable .*\.dump$' "$MOCK_RCLONE_LOG" | cut -d: -f1)
dump_download_line=$(grep -n 'copyto r2:.*\.dump ' "$MOCK_RCLONE_LOG" | cut -d: -f1)
manifest_upload_line=$(grep -n 'copyto --immutable .*\.complete\.json$' "$MOCK_RCLONE_LOG" | cut -d: -f1)
(( dump_upload_line < dump_download_line && dump_download_line < manifest_upload_line ))
assert_clean

# A configured success signal occurs exactly once and only after remote
# completion-manifest verification; it never uses the failure endpoint.
reset_mocks
DATABASE_URL=redacted BETTERSTACK_BACKUP_HEARTBEAT_URL="$heartbeat_url" \
  BACKUP_RUN_MODE=backup "$subject" >"$tmp/heartbeat-success.stdout" 2>"$tmp/heartbeat-success.stderr"
[[ "$(grep -c '^heartbeat success$' "$MOCK_RCLONE_LOG")" == 1 ]]
! grep -q '^heartbeat failure$' "$MOCK_RCLONE_LOG"
manifest_line=$(grep -n 'completion_manifest_verification=PASS' "$tmp/heartbeat-success.stdout" | cut -d: -f1)
heartbeat_line=$(grep -n 'heartbeat_signal=success delivery=PASS' "$tmp/heartbeat-success.stdout" | cut -d: -f1)
overall_line=$(grep -n 'overall=PASS' "$tmp/heartbeat-success.stdout" | cut -d: -f1)
(( manifest_line < heartbeat_line && heartbeat_line < overall_line ))
! grep -Fq 'fake-sentinel-token' "$tmp/heartbeat-success.stdout" "$tmp/heartbeat-success.stderr" "$MOCK_RCLONE_LOG" "$MOCK_PG_LOG" "$MOCK_CHILD_ENV_LOG"
! grep -Fq 'BETTERSTACK_BACKUP_HEARTBEAT_URL=' "$MOCK_CHILD_ENV_LOG"
! grep -Fq 'copyurl --stdout' "$MOCK_RCLONE_LOG"
grep -q 'copyurl --urls .*heartbeat-urls.csv .*heartbeat-response' "$MOCK_RCLONE_LOG"
assert_clean

# Monitoring degradation after a valid backup does not alter backup success
# and cannot recursively produce a failure signal.
reset_mocks
DATABASE_URL=redacted BETTERSTACK_BACKUP_HEARTBEAT_URL="$heartbeat_url" MOCK_HEARTBEAT_STATUS=28 \
  BACKUP_RUN_MODE=backup "$subject" >"$tmp/heartbeat-unavailable.log" 2>&1
grep -q 'heartbeat_signal=success delivery=FAIL' "$tmp/heartbeat-unavailable.log"
grep -q 'overall=PASS' "$tmp/heartbeat-unavailable.log"
[[ "$(grep -c '^heartbeat ' "$MOCK_RCLONE_LOG")" == 1 ]]
! grep -q '^heartbeat failure$' "$MOCK_RCLONE_LOG"
! grep -Fq 'fake-sentinel-token' "$tmp/heartbeat-unavailable.log"
assert_clean

# Representative failures retain their exact status and issue one failure
# signal without ever issuing success.
for scenario in dump:31 dump_upload:42 dump_download:43 manifest_upload:44; do
  reset_mocks
  name=${scenario%%:*}; expected=${scenario##*:}
  set +e
  if [[ "$name" == dump ]]; then
    DATABASE_URL=redacted BETTERSTACK_BACKUP_HEARTBEAT_URL="$heartbeat_url" MOCK_DUMP_STATUS="$expected" \
      BACKUP_RUN_MODE=backup "$subject" >"$tmp/failure-$name.log" 2>&1
  else
    DATABASE_URL=redacted BETTERSTACK_BACKUP_HEARTBEAT_URL="$heartbeat_url" MOCK_FAIL_RCLONE_STAGE="$name" \
      BACKUP_RUN_MODE=backup "$subject" >"$tmp/failure-$name.log" 2>&1
  fi
  status=$?
  set -e
  [[ "$status" == "$expected" ]]
  [[ "$(grep -c '^heartbeat failure$' "$MOCK_RCLONE_LOG")" == 1 ]]
  ! grep -q '^heartbeat success$' "$MOCK_RCLONE_LOG"
  ! grep -Fq 'fake-sentinel-token' "$tmp/failure-$name.log"
  assert_clean
done

# A failed failure signal remains best effort and preserves the backup error.
reset_mocks
set +e
DATABASE_URL=redacted BETTERSTACK_BACKUP_HEARTBEAT_URL="$heartbeat_url" MOCK_DUMP_STATUS=37 MOCK_HEARTBEAT_STATUS=28 \
  BACKUP_RUN_MODE=backup "$subject" >"$tmp/failure-heartbeat-unavailable.log" 2>&1
status=$?
set -e
[[ "$status" == 37 ]]
grep -q 'heartbeat_signal=failure delivery=FAIL' "$tmp/failure-heartbeat-unavailable.log"
[[ "$(grep -c '^heartbeat failure$' "$MOCK_RCLONE_LOG")" == 1 ]]
! grep -Fq 'fake-sentinel-token' "$tmp/failure-heartbeat-unavailable.log"
assert_clean

# Invalid monitoring configuration is redacted and non-gating: the complete
# database/R2 path still determines PASS and no heartbeat is attempted.
for invalid_url in \
  'http://uptime.betterstack.com/api/v1/heartbeat/fake-sentinel-token' \
  'https://unexpected.invalid/api/v1/heartbeat/fake-sentinel-token' \
  'not-a-url-fake-sentinel-token'; do
  reset_mocks
  DATABASE_URL=redacted BETTERSTACK_BACKUP_HEARTBEAT_URL="$invalid_url" \
    BACKUP_RUN_MODE=backup "$subject" >"$tmp/invalid-heartbeat.log" 2>&1
  grep -q 'configuration=WARNING variable=BETTERSTACK_BACKUP_HEARTBEAT_URL heartbeat=DISABLED reason=invalid_url' "$tmp/invalid-heartbeat.log"
  grep -q 'completion_manifest_verification=PASS' "$tmp/invalid-heartbeat.log"
  grep -q 'overall=PASS' "$tmp/invalid-heartbeat.log"
  ! grep -Fq 'fake-sentinel-token' "$tmp/invalid-heartbeat.log" "$MOCK_RCLONE_LOG" "$MOCK_PG_LOG" "$MOCK_CHILD_ENV_LOG"
  ! grep -Fq 'BETTERSTACK_BACKUP_HEARTBEAT_URL=' "$MOCK_CHILD_ENV_LOG"
  ! grep -q '^heartbeat ' "$MOCK_RCLONE_LOG"
  assert_clean
done

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
