#!/bin/bash
set -euo pipefail
umask 077

started_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
workdir=""
stage="initialization"

log() {
  printf 'event=backup_worker mode=%s utc=%s %s\n' "${BACKUP_RUN_MODE:-unset}" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"
}

cleanup() {
  status=$?
  if [[ -n "$workdir" && -d "$workdir" ]]; then
    rm -rf -- "$workdir"
  fi
  if (( status == 0 )); then
    log "completion=PASS started_at=$started_at overall=PASS"
  else
    log "stage=$stage status=FAIL started_at=$started_at overall=FAIL"
  fi
  exit "$status"
}
trap cleanup EXIT

require_var() {
  if [[ -z "${!1:-}" ]]; then
    printf 'error=missing_required_environment variable=%s\n' "$1" >&2
    return 1
  fi
}

for variable in BACKUP_RUN_MODE R2_ENDPOINT R2_BUCKET R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY; do
  require_var "$variable"
done

case "$BACKUP_RUN_MODE" in
  probe) ;;
  backup) require_var DATABASE_URL ;;
  *) printf 'error=invalid_run_mode expected=probe_or_backup\n' >&2; exit 64 ;;
esac

workdir="$(mktemp -d)"
config="$workdir/rclone.conf"
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
rclone_cmd=(rclone --config "$config" --log-level ERROR)

log "started_at=$started_at"

if [[ "$BACKUP_RUN_MODE" == "probe" ]]; then
  stage="probe_upload"
  stamp="$(date -u +%Y%m%dT%H%M%SZ)"
  random_id="$(od -An -N8 -tx1 /dev/urandom | tr -d ' \n')"
  object_key="probes/${stamp}-${random_id}/probe.txt"
  probe_file="$workdir/probe.txt"
  downloaded="$workdir/probe.downloaded.txt"
  printf 'ELCEO R2 backup probe %s %s\n' "$stamp" "$random_id" >"$probe_file"
  expected_sha="$(sha256sum "$probe_file" | awk '{print $1}')"
  "${rclone_cmd[@]}" copyto "$probe_file" "r2:${R2_BUCKET}/${object_key}"
  log "object_key=$object_key upload=PASS"
  stage="probe_integrity"
  "${rclone_cmd[@]}" copyto "r2:${R2_BUCKET}/${object_key}" "$downloaded"
  actual_sha="$(sha256sum "$downloaded" | awk '{print $1}')"
  [[ "$actual_sha" == "$expected_sha" ]]
  log "object_key=$object_key integrity_verification=PASS"
  stage="probe_delete"
  "${rclone_cmd[@]}" deletefile "r2:${R2_BUCKET}/${object_key}"
  log "object_key=$object_key remote_delete=PASS"
  exit 0
fi

stage="archive_dump"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
year="${timestamp:0:4}"
month="${timestamp:4:2}"
day="${timestamp:6:2}"
filename="elceo-${timestamp}.dump"
object_key="backups/${year}/${month}/${day}/${filename}"
dump_file="$workdir/$filename"
manifest_file="$workdir/${filename}.json"
downloaded_dump="$workdir/verified-$filename"
downloaded_manifest="$workdir/verified-${filename}.json"
pg_version="$(pg_dump --version)"
log "pg_dump_version=$(printf '%s' "$pg_version" | tr ' ' '_') object_key=$object_key"
pg_dump --format=custom --no-owner --no-acl --file="$dump_file" "$DATABASE_URL"

stage="archive_validation"
pg_restore --list "$dump_file" >/dev/null
log "object_key=$object_key archive_validation=PASS"

sha256="$(sha256sum "$dump_file" | awk '{print $1}')"
byte_size="$(wc -c <"$dump_file" | tr -d ' ')"
cat >"$manifest_file" <<EOF
{"object_filename":"$filename","utc_timestamp":"$timestamp","sha256":"$sha256","byte_size":$byte_size,"pg_dump_version":"$pg_version"}
EOF
log "object_key=$object_key archive_byte_size=$byte_size"

stage="upload"
"${rclone_cmd[@]}" copyto --immutable "$dump_file" "r2:${R2_BUCKET}/${object_key}"
"${rclone_cmd[@]}" copyto --immutable "$manifest_file" "r2:${R2_BUCKET}/${object_key}.json"
log "object_key=$object_key upload=PASS"

stage="integrity_verification"
"${rclone_cmd[@]}" copyto "r2:${R2_BUCKET}/${object_key}" "$downloaded_dump"
"${rclone_cmd[@]}" copyto "r2:${R2_BUCKET}/${object_key}.json" "$downloaded_manifest"
printf '%s  %s\n' "$sha256" "$downloaded_dump" | sha256sum --check --strict >/dev/null
cmp --silent "$manifest_file" "$downloaded_manifest"
log "object_key=$object_key integrity_verification=PASS"
