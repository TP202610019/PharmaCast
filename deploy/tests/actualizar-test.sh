#!/usr/bin/env bash
# Deterministic orchestration tests: no real network, Docker daemon or database.
set -Eeuo pipefail
script=$(realpath "$(dirname "$0")/../actualizar.sh")
sandbox=$(mktemp -d)
trap 'rm -rf -- "$sandbox"' EXIT
mkdir "$sandbox/bin"
export MOCK_ROOT="$sandbox"

cat > "$sandbox/bin/git" <<'EOF'
#!/usr/bin/env bash
set -eu
if [[ "$1" == init ]]; then mkdir -p "${@: -1}"; exit 0; fi
repo=$2
service=$(basename "$repo" .git)
case "$3" in
  rev-parse) cat "$MOCK_ROOT/revisions/$service" ;;
  archive) tar -cf - --files-from /dev/null ;;
esac
EOF

cat > "$sandbox/bin/docker" <<'EOF'
#!/usr/bin/env bash
set -eu
printf '%s\n' "$*" >> "$MOCK_ROOT/calls"
if [[ "$1" == build && -f "$MOCK_ROOT/fail-build" ]]; then exit 7; fi
if [[ "$1" == run && -f "$MOCK_ROOT/fail-migration" ]]; then exit 8; fi
if [[ "$1" == inspect ]]; then
  if [[ "$3" == *NetworkSettings* ]]; then
    printf 'pharmacast_default\n'
  else
    printf 'sha256:previous-image\n'
  fi
fi
if [[ "$1" == compose && "$2" == ps ]]; then printf 'container-id\n'; fi
if [[ "$1" == compose && "$*" == *pg_dump* ]]; then printf 'database-backup\n'; fi
EOF

cat > "$sandbox/bin/curl" <<'EOF'
#!/usr/bin/env bash
[[ ! -f "$MOCK_ROOT/fail-health" ]]
EOF
cat > "$sandbox/bin/flock" <<'EOF'
#!/usr/bin/env bash
[[ ! -f "$MOCK_ROOT/locked" ]]
EOF
cat > "$sandbox/bin/sleep" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
chmod +x "$sandbox/bin/"*
export PATH="$sandbox/bin:$PATH"

reset_case() {
  rm -rf -- "$sandbox/root" "$sandbox/revisions"
  rm -f -- "$sandbox/calls" "$sandbox/fail-build" "$sandbox/fail-migration" "$sandbox/fail-health" "$sandbox/locked"
  export PHARMACAST_ROOT="$sandbox/root"
  mkdir -p "$PHARMACAST_ROOT/.deploy/state" "$sandbox/revisions"
  touch "$PHARMACAST_ROOT/.env" "$PHARMACAST_ROOT/compose.yaml" "$PHARMACAST_ROOT/compose.override.yaml" "$sandbox/calls"
  for service in web backend ml; do
    printf 'old-%s\n' "$service" > "$sandbox/revisions/$service"
    cp "$sandbox/revisions/$service" "$PHARMACAST_ROOT/.deploy/state/$service.sha"
  done
}
run() { bash "$script" > "$sandbox/output" 2>&1; }
assert_has() { grep -F -- "$1" "$sandbox/calls" > /dev/null; }
assert_not() { if grep -F -- "$1" "$sandbox/calls" > /dev/null; then cat "$sandbox/calls"; exit 1; fi; }
assert_old() { [[ "$(cat "$PHARMACAST_ROOT/.deploy/state/$1.sha")" == "old-$1" ]]; }

reset_case
run
assert_not 'build '
printf 'PASS unchanged: no builds or restarts\n'

reset_case
printf 'new-web\n' > "$sandbox/revisions/web"
run
[[ "$(cat "$PHARMACAST_ROOT/.deploy/state/web.sha")" == new-web ]]
assert_not 'pg_dump'
assert_not 'pharmacast-backend:new'
assert_has 'compose exec -T web nginx -s reload'
printf 'PASS frontend change: only web builds and state advances\n'

reset_case
printf 'new-backend\n' > "$sandbox/revisions/backend"
run
assert_has 'build --target migrations'
assert_has 'pg_dump'
assert_has 'run --rm --network pharmacast_default'
[[ "$(cat "$PHARMACAST_ROOT/.deploy/state/backend.sha")" == new-backend ]]
[[ -n "$(find "$PHARMACAST_ROOT/backups" -name '*.dump' -print -quit)" ]]
printf 'PASS backend change: backup, migrations and state advance\n'

reset_case
printf 'new-web\n' > "$sandbox/revisions/web"
touch "$sandbox/fail-build"
if run; then exit 1; fi
assert_old web
assert_not 'image tag'
assert_not 'compose up'
printf 'PASS failed build: running deployment stays untouched\n'

reset_case
printf 'new-backend\n' > "$sandbox/revisions/backend"
touch "$sandbox/fail-migration"
if run; then exit 1; fi
assert_old backend
assert_has 'pg_dump'
assert_not 'image tag'
assert_not 'compose up'
printf 'PASS failed migration: no image replacement or state advance\n'

reset_case
printf 'new-web\n' > "$sandbox/revisions/web"
touch "$sandbox/fail-health"
if run; then exit 1; fi
assert_old web
assert_has 'image tag sha256:previous-image pharmacast-web:latest'
printf 'PASS failed health check: old image recovered, state unchanged\n'

reset_case
touch "$sandbox/locked"
run
[[ ! -s "$sandbox/calls" ]]
printf 'PASS concurrent run: skipped by deployment lock\n'
