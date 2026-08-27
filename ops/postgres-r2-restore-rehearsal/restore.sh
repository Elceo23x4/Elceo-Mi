#!/bin/bash
set -euo pipefail
umask 077

started_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
workdir=""
stage="confirmation_gate"
export PGCONNECT_TIMEOUT="${PGCONNECT_TIMEOUT:-15}"

log() { printf 'event=restore_rehearsal utc=%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"; }
cleanup() {
  status=$?
  [[ -z "$workdir" || ! -d "$workdir" ]] || rm -rf -- "$workdir"
  if (( status == 0 )); then log "started_at=$started_at overall=PASS"; else log "stage=$stage status=FAIL overall=FAIL"; fi
  exit "$status"
}
trap cleanup EXIT

require_var() {
  [[ -n "${!1:-}" ]] || { printf 'error=missing_required_environment variable=%s\n' "$1" >&2; return 1; }
}

# This gate intentionally precedes all other validation and all network/database access.
if [[ "${RESTORE_CONFIRMATION:-}" != RESTORE_EMPTY_DISPOSABLE_TARGET ]]; then
  printf 'error=restore_confirmation_required expected=RESTORE_EMPTY_DISPOSABLE_TARGET\n' >&2
  exit 64
fi
for variable in RESTORE_DATABASE_URL R2_ENDPOINT R2_BUCKET R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY RESTORE_OBJECT_KEY; do
  require_var "$variable"
done
if ! [[ "$PGCONNECT_TIMEOUT" =~ ^[1-9][0-9]*$ ]] || (( PGCONNECT_TIMEOUT > 300 )); then
  printf 'error=invalid_environment variable=PGCONNECT_TIMEOUT expected=integer_1_to_300\n' >&2; exit 64
fi

log "restore_started=$started_at"
workdir="$(mktemp -d)"
config="$workdir/rclone.conf"
manifest="$workdir/manifest.json"
archive="$workdir/archive.dump"
cat >"$config" <<EOF
[r2]
type = s3
provider = Cloudflare
access_key_id = $R2_ACCESS_KEY_ID
secret_access_key = $R2_SECRET_ACCESS_KEY
endpoint = $R2_ENDPOINT
no_check_bucket = true
acl = private
EOF
rclone_cmd=(rclone --config "$config" --log-level ERROR --contimeout 15s --timeout 5m --retries 3 --low-level-retries 5 --retries-sleep 10s)
manifest_key="${RESTORE_OBJECT_KEY}.complete.json"

stage="manifest_download"
"${rclone_cmd[@]}" copyto "r2:${R2_BUCKET}/${manifest_key}" "$manifest"
log "manifest_download=PASS object_key=$manifest_key"

stage="manifest_validation"
filename="${RESTORE_OBJECT_KEY##*/}"
jq -e --arg key "$RESTORE_OBJECT_KEY" --arg filename "$filename" '
  type == "object" and
  .manifest_schema_version == 1 and .status == "complete" and
  .object_key == $key and .object_filename == $filename and
  (.sha256 | type == "string" and test("^[0-9a-f]{64}$")) and
  (.byte_size | type == "number" and . > 0 and floor == .) and
  (.pg_dump_version | type == "string" and test("PostgreSQL\\) 18\\.6([ .]|$)"))
' "$manifest" >/dev/null
expected_sha="$(jq -r '.sha256' "$manifest")"
expected_size="$(jq -r '.byte_size | tostring' "$manifest")"
log "manifest_validation=PASS object_key=$manifest_key"

stage="archive_download"
"${rclone_cmd[@]}" copyto "r2:${R2_BUCKET}/${RESTORE_OBJECT_KEY}" "$archive"
log "archive_download=PASS object_key=$RESTORE_OBJECT_KEY"
stage="archive_size_verification"
actual_size="$(wc -c <"$archive" | tr -d ' ')"
[[ "$actual_size" == "$expected_size" ]]
log "archive_size_verification=PASS byte_size=$actual_size"
stage="archive_sha256_verification"
actual_sha="$(sha256sum "$archive" | awk '{print $1}')"
[[ "$actual_sha" == "$expected_sha" ]]
log "archive_sha256_verification=PASS"
stage="archive_validation"
pg_restore --list "$archive" >/dev/null
log "archive_validation=PASS"

stage="destination_safety"
server_version_num="$(psql "$RESTORE_DATABASE_URL" -XAtqc 'SHOW server_version_num')"
[[ "$server_version_num" =~ ^18[0-9]{4}$ ]]
identity="$(psql "$RESTORE_DATABASE_URL" -XAtF '|' -c "SELECT current_database(), current_user")"
[[ "$identity" == *'|'* && -n "$identity" ]]
IFS='|' read -r database_name database_user <<<"$identity"
counts="$(psql "$RESTORE_DATABASE_URL" -XAtF '|' -c "SELECT count(*) FILTER (WHERE c.relkind IN ('r','p')), count(*) FILTER (WHERE c.relkind = 'v'), count(*) FILTER (WHERE c.relkind = 'S'), count(*) FILTER (WHERE c.relname = 'elceo_migration_rehearsal_ledger') FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'")"
[[ "$counts" == "0|0|0|0" ]]
log "postgresql_version_num=$server_version_num destination_database=$database_name destination_user=$database_user destination_empty_check=PASS"

stage="restore_execution"
pg_restore --exit-on-error --no-owner --no-acl --dbname="$RESTORE_DATABASE_URL" "$archive"
log "restore_execution=PASS"

stage="post_restore_fingerprint"
fingerprint_sql=$(cat <<'SQL'
SELECT 'postgresql_version=' || current_setting('server_version');
SELECT 'database_identity=' || current_database() || ':' || current_user;
SELECT 'public_tables=' || count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p');
SELECT 'public_table_names_md5=' || md5(coalesce(string_agg(c.relname, ',' ORDER BY c.relname),'')) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p');
SELECT 'public_views=' || count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='v';
SELECT 'public_view_names_md5=' || md5(coalesce(string_agg(c.relname, ',' ORDER BY c.relname),'')) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='v';
SELECT 'public_sequences=' || count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='S';
SELECT 'public_sequence_names_md5=' || md5(coalesce(string_agg(c.relname, ',' ORDER BY c.relname),'')) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='S';
SELECT 'extensions=' || coalesce(string_agg(extname || ':' || extversion, ',' ORDER BY extname),'') FROM pg_extension;
SELECT 'ledger_total=' || count(*) FROM public.elceo_migration_rehearsal_ledger;
SELECT 'ledger_applied=' || count(*) FROM public.elceo_migration_rehearsal_ledger WHERE status='applied';
SELECT 'ledger_failed=' || count(*) FROM public.elceo_migration_rehearsal_ledger WHERE status='failed';
SELECT 'ledger_first=' || coalesce(min(filename),'') FROM public.elceo_migration_rehearsal_ledger;
SELECT 'ledger_last=' || coalesce(max(filename),'') FROM public.elceo_migration_rehearsal_ledger;
SQL
)
fingerprint_output="$(psql "$RESTORE_DATABASE_URL" -XAt -c "$fingerprint_sql")"
while IFS= read -r line; do log "post_restore_fingerprint=$line"; done <<<"$fingerprint_output"
