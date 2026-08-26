#!/bin/bash
set -euo pipefail

subject="$(cd "$(dirname "$0")" && pwd)/backup.sh"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
mockbin="$tmp/bin"
export TMPDIR="$tmp/workspaces"
mkdir "$mockbin" "$TMPDIR"

cat >"$mockbin/rclone" <<'EOF'
#!/bin/bash
set -euo pipefail
printf '%s\n' "$*" >>"$MOCK_LOG"
args=("$@")
for ((i=0; i<${#args[@]}; i++)); do
  if [[ "${args[$i]}" == copyto ]]; then
    source=${args[${#args[@]}-2]}; destination=${args[${#args[@]}-1]}
    if [[ "$source" == r2:* ]]; then
      remote_file="${MOCK_REMOTE:?}/$(printf '%s' "$source" | sha256sum | awk '{print $1}')"
      cp "$remote_file" "$destination"
    else
      mkdir -p "${MOCK_REMOTE:?}"
      remote_file="$MOCK_REMOTE/$(printf '%s' "$destination" | sha256sum | awk '{print $1}')"
      cp "$source" "$remote_file"
    fi
    exit 0
  fi
done
if [[ "$*" == *deletefile* ]]; then
  remote="${args[${#args[@]}-1]}"
  rm -f "$MOCK_REMOTE/$(printf '%s' "$remote" | sha256sum | awk '{print $1}')"
fi
EOF
cat >"$mockbin/pg_dump" <<'EOF'
#!/bin/bash
[[ "${1:-}" == --version ]] && { echo 'pg_dump (PostgreSQL) 18.6 (Debian 18.6-1.pgdg12+1)'; exit; }
for arg in "$@"; do [[ "$arg" == --file=* ]] && printf 'mock custom archive' >"${arg#--file=}"; done
exit 0
EOF
cat >"$mockbin/pg_restore" <<'EOF'
#!/bin/bash
exit "${MOCK_RESTORE_STATUS:-0}"
EOF
chmod +x "$mockbin"/*

export PATH="$mockbin:$PATH" MOCK_LOG="$tmp/rclone.log" MOCK_REMOTE="$tmp/remote"
export R2_ENDPOINT=https://account.r2.cloudflarestorage.com R2_BUCKET=elceo-staging-backups
export R2_ACCESS_KEY_ID=redacted-key R2_SECRET_ACCESS_KEY=redacted-secret

if env -u R2_BUCKET BACKUP_RUN_MODE=probe "$subject" >"$tmp/missing.log" 2>&1; then
  echo 'required environment test unexpectedly passed' >&2; exit 1
fi
grep -q 'variable=R2_BUCKET' "$tmp/missing.log"
! grep -Rq 'redacted-key\|redacted-secret' "$tmp"/missing.log

: >"$MOCK_LOG"
BACKUP_RUN_MODE=probe "$subject" >"$tmp/probe.log"
grep -q 'probes/' "$MOCK_LOG"
grep -q 'deletefile' "$MOCK_LOG"
grep -q 'integrity_verification=PASS' "$tmp/probe.log"

: >"$MOCK_LOG"
DATABASE_URL=postgresql://secret@example/db BACKUP_RUN_MODE=backup "$subject" >"$tmp/backup.log"
grep -q -- '--immutable' "$MOCK_LOG"
grep -q 'backups/.*/elceo-.*\.dump' "$MOCK_LOG"
grep -q 'overall=PASS' "$tmp/backup.log"
! grep -q 'postgresql://\|redacted-key\|redacted-secret' "$tmp/backup.log"

if DATABASE_URL=redacted MOCK_RESTORE_STATUS=7 BACKUP_RUN_MODE=backup "$subject" >"$tmp/failure.log" 2>&1; then
  echo 'failure propagation test unexpectedly passed' >&2; exit 1
fi
grep -q 'stage=archive_validation status=FAIL' "$tmp/failure.log"
[[ -z "$(find "$TMPDIR" -mindepth 1 -print -quit)" ]]

echo 'backup worker tests: PASS'
