#!/bin/bash
set -euo pipefail

subject="$(cd "$(dirname "$0")" && pwd)/restore.sh"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
mockbin="$tmp/bin"; export TMPDIR="$tmp/workspaces"
mkdir "$mockbin" "$TMPDIR"

cat >"$mockbin/rclone" <<'MOCK'
#!/bin/bash
set -euo pipefail
printf '%s\n' "$*" >>"$MOCK_CALLS"
source=${*: -2:1}; destination=${*: -1}
[[ "$source" == r2:* ]] || { echo 'write operation refused by mock' >&2; exit 90; }
if [[ "$source" == *.complete.json ]]; then
  [[ -f "$MOCK_REMOTE/manifest.json" ]] || exit 3
  cp "$MOCK_REMOTE/manifest.json" "$destination"
else
  [[ -f "$MOCK_REMOTE/archive.dump" ]] || exit 3
  cp "$MOCK_REMOTE/archive.dump" "$destination"
fi
MOCK
cat >"$mockbin/pg_restore" <<'MOCK'
#!/bin/bash
set -euo pipefail
printf 'pg_restore %s\n' "$*" >>"$MOCK_CALLS"
if [[ " $* " == *' --list '* ]]; then exit "${MOCK_LIST_STATUS:-0}"; fi
exit "${MOCK_RESTORE_STATUS:-0}"
MOCK
cat >"$mockbin/psql" <<'MOCK'
#!/bin/bash
set -euo pipefail
printf 'psql %s\n' "$*" >>"$MOCK_CALLS"
query=${*: -1}
if [[ "$query" == *"SELECT 'postgresql_version='"* ]]; then
  printf '%s\n' 'postgresql_version=18.6' 'database_identity=railway:postgres' 'public_tables=106' \
    'public_table_names_md5=3b0cb9b9cbc77bad0ac73552177078f2' 'public_views=0' \
    'public_view_names_md5=d41d8cd98f00b204e9800998ecf8427e' 'public_sequences=0' \
    'public_sequence_names_md5=d41d8cd98f00b204e9800998ecf8427e' 'extensions=pgcrypto:1.4,plpgsql:1.0' \
    'ledger_total=51' 'ledger_applied=51' 'ledger_failed=0' 'ledger_first=0001_init.sql' 'ledger_last=0050_adaptive_materialization.sql'
elif [[ "$query" == 'SHOW server_version_num' ]]; then echo "${MOCK_SERVER_VERSION:-180600}"
elif [[ "$query" == *'current_database(), current_user'* ]]; then echo 'railway|postgres'
elif [[ "$query" == *"object_kind = 'materialized_view'"* ]]; then
  count=0; [[ ! -f "$MOCK_SAFETY_COUNTER" ]] || count=$(cat "$MOCK_SAFETY_COUNTER")
  count=$((count + 1)); printf '%s' "$count" >"$MOCK_SAFETY_COUNTER"
  if (( count == 1 )); then echo "${MOCK_COUNTS_FIRST:-0|0|0|0|0|0|0|0}"
  else echo "${MOCK_COUNTS_SECOND:-0|0|0|0|0|0|0|0}"; fi
else exit 70; fi
MOCK
chmod +x "$mockbin"/*
export PATH="$mockbin:$PATH" MOCK_CALLS="$tmp/calls" MOCK_REMOTE="$tmp/remote" MOCK_SAFETY_COUNTER="$tmp/safety-counter"
export RESTORE_DATABASE_URL='postgresql://restore.invalid/railway'
export R2_ENDPOINT='https://account.r2.cloudflarestorage.com' R2_BUCKET='elceo-staging-backups'
export R2_ACCESS_KEY_ID='r2-key-secret' R2_SECRET_ACCESS_KEY='r2-value-secret'
export RESTORE_OBJECT_KEY='backups/2026/08/27/elceo-20260827T122725Z.dump'
export RESTORE_CONFIRMATION='RESTORE_EMPTY_DISPOSABLE_TARGET'

assert_clean() { [[ -z "$(find "$TMPDIR" -mindepth 1 -print -quit)" ]]; }
assert_secret_free() { ! grep -Eq 'database-secret|r2-key-secret|r2-value-secret|postgresql://' "$1"; }
make_remote() {
  rm -rf "$MOCK_REMOTE"; mkdir "$MOCK_REMOTE"; : >"$MOCK_CALLS"; rm -f "$MOCK_SAFETY_COUNTER"
  printf 'valid custom archive fixture' >"$MOCK_REMOTE/archive.dump"
  size=$(wc -c <"$MOCK_REMOTE/archive.dump" | tr -d ' ')
  sha=$(sha256sum "$MOCK_REMOTE/archive.dump" | awk '{print $1}')
  cat >"$MOCK_REMOTE/manifest.json" <<EOF
{"manifest_schema_version":1,"status":"complete","object_filename":"elceo-20260827T122725Z.dump","object_key":"$RESTORE_OBJECT_KEY","sha256":"$sha","byte_size":$size,"pg_dump_version":"pg_dump (PostgreSQL) 18.6 (Debian)"}
EOF
}
expect_failure() {
  name=$1; shift
  if "$@" >"$tmp/$name.log" 2>&1; then echo "$name unexpectedly passed" >&2; exit 1; fi
  assert_secret_free "$tmp/$name.log"; assert_clean
}

: >"$MOCK_CALLS"
expect_failure missing_confirmation env -u RESTORE_CONFIRMATION "$subject"
[[ ! -s "$MOCK_CALLS" ]]
expect_failure incorrect_confirmation env RESTORE_CONFIRMATION=WRONG "$subject"
[[ ! -s "$MOCK_CALLS" ]]
expect_failure missing_environment env -u R2_BUCKET "$subject"
[[ ! -s "$MOCK_CALLS" ]]

make_remote; rm "$MOCK_REMOTE/manifest.json"
expect_failure missing_manifest "$subject"
make_remote; printf '{broken' >"$MOCK_REMOTE/manifest.json"
expect_failure malformed_manifest "$subject"
make_remote; jq '.status="uploading"' "$MOCK_REMOTE/manifest.json" >"$tmp/m"; mv "$tmp/m" "$MOCK_REMOTE/manifest.json"
expect_failure incomplete_manifest "$subject"
make_remote; jq '.object_key="other.dump"' "$MOCK_REMOTE/manifest.json" >"$tmp/m"; mv "$tmp/m" "$MOCK_REMOTE/manifest.json"
expect_failure object_mismatch "$subject"
make_remote; jq '.sha256="NOT-A-SHA"' "$MOCK_REMOTE/manifest.json" >"$tmp/m"; mv "$tmp/m" "$MOCK_REMOTE/manifest.json"
expect_failure invalid_sha "$subject"
make_remote; jq '.byte_size += 1' "$MOCK_REMOTE/manifest.json" >"$tmp/m"; mv "$tmp/m" "$MOCK_REMOTE/manifest.json"
expect_failure size_mismatch "$subject"
make_remote; printf x >>"$MOCK_REMOTE/archive.dump"; size=$(wc -c <"$MOCK_REMOTE/archive.dump"); jq --argjson s "$size" '.byte_size=$s' "$MOCK_REMOTE/manifest.json" >"$tmp/m"; mv "$tmp/m" "$MOCK_REMOTE/manifest.json"
expect_failure corrupt_sha "$subject"
make_remote; expect_failure archive_list_failure env MOCK_LIST_STATUS=7 "$subject"
make_remote; expect_failure dirty_preflight env MOCK_COUNTS_FIRST='1|0|0|0|0|0|0|0' "$subject"
! grep -q ' copyto ' "$MOCK_CALLS"
for dirty_case in \
  'materialized_view:0|0|1|0|0|0|0|0' \
  'foreign_table:0|0|0|1|0|0|0|0' \
  'public_routine:0|0|0|0|0|1|0|0' \
  'public_type:0|0|0|0|0|0|1|0'; do
  name=${dirty_case%%:*}; counts=${dirty_case#*:}
  make_remote; expect_failure "dirty_$name" env MOCK_COUNTS_FIRST="$counts" "$subject"
  ! grep -q ' copyto ' "$MOCK_CALLS"
done
make_remote; expect_failure dirty_recheck env MOCK_COUNTS_SECOND='0|0|1|0|0|0|0|0' "$subject"
test "$(grep -c ' copyto ' "$MOCK_CALLS")" = 2
! grep -q 'pg_restore --single-transaction' "$MOCK_CALLS"
make_remote; expect_failure restore_failure env MOCK_RESTORE_STATUS=8 "$subject"
grep -q 'stage=restore_execution status=FAIL' "$tmp/restore_failure.log"

make_remote
"$subject" >"$tmp/success.log" 2>&1
grep -q 'manifest_validation=PASS' "$tmp/success.log"
grep -q 'archive_sha256_verification=PASS' "$tmp/success.log"
grep -q 'destination_preflight=PASS' "$tmp/success.log"
grep -q 'destination_pre_restore_recheck=PASS' "$tmp/success.log"
grep -q 'restore_execution=PASS' "$tmp/success.log"
grep -q 'post_restore_fingerprint=public_tables=106' "$tmp/success.log"
grep -q 'overall=PASS' "$tmp/success.log"
assert_secret_free "$tmp/success.log"; assert_clean
preflight_line=$(grep -n 'destination_preflight=PASS' "$tmp/success.log" | cut -d: -f1)
manifest_line=$(grep -n 'manifest_validation=PASS' "$tmp/success.log" | cut -d: -f1)
archive_line=$(grep -n 'archive_validation=PASS' "$tmp/success.log" | cut -d: -f1)
recheck_line=$(grep -n 'destination_pre_restore_recheck=PASS' "$tmp/success.log" | cut -d: -f1)
restore_line=$(grep -n 'restore_execution=PASS' "$tmp/success.log" | cut -d: -f1)
fingerprint_line=$(grep -n 'post_restore_fingerprint=' "$tmp/success.log" | head -1 | cut -d: -f1)
(( preflight_line < manifest_line && manifest_line < archive_line && archive_line < recheck_line && recheck_line < restore_line && restore_line < fingerprint_line ))
test "$(grep -c 'object_kind = .materialized_view.' "$MOCK_CALLS")" = 2
grep -q 'pg_restore --single-transaction --no-owner --no-acl --dbname=' "$MOCK_CALLS"

# Static command-surface assertions prevent an R2 mutating operation from being constructed.
! grep -Eq '(^|[[:space:]])(delete|deletefile|purge|move|moveto|copy|sync)([[:space:]]|$)' "$subject"
grep -Fq 'rclone_cmd[@]}" copyto "r2:' "$subject"
! grep -Eq -- '--clean|--create' "$subject"
grep -Fq 'pg_restore --single-transaction --no-owner --no-acl --dbname="$RESTORE_DATABASE_URL"' "$subject"
grep -Fq "FROM pg_tables WHERE schemaname='public'" "$subject"
grep -Fq "FROM pg_views WHERE schemaname='public'" "$subject"
grep -Fq "FROM pg_sequences WHERE schemaname='public'" "$subject"
grep -Fq "min(filename),'') FROM public.elceo_migration_rehearsal_ledger WHERE status='applied'" "$subject"
grep -Fq "max(filename),'') FROM public.elceo_migration_rehearsal_ledger WHERE status='applied'" "$subject"

echo 'restore rehearsal worker tests: PASS'
