#!/usr/bin/env bash
# Installed on the VM; checks public main branches without GitHub credentials.
set -Eeuo pipefail
umask 077

ROOT=${PHARMACAST_ROOT:-/srv/pharmacast}
cd "$ROOT"
test -f .env && test -f compose.yaml && test -f compose.override.yaml
mkdir -p .deploy/cache .deploy/state backups
exec 9> .deploy/actualizar.lock
flock -n 9 || exit 0

declare -A repos=(
  [web]=https://github.com/TP202610019/PharmaCast.git
  [backend]=https://github.com/TP202610019/PharmaCast-Backend.git
  [ml]=https://github.com/TP202610019/PharmaCast-MLService.git
)
declare -A target previous
changed=()
work=""
promoted=0

log() { printf '[PharmaCast] %s\n' "$*"; }
compose() { docker compose "$@"; }
cleanup() {
  if [[ -n "$work" && "$work" == "$ROOT"/.deploy/build.* ]]; then
    rm -rf -- "$work"
  fi
}
rollback() {
  local status=$?
  trap - ERR
  log "Actualización fallida. Los commits no se marcarán como desplegados."
  if (( promoted )); then
    for service in "${changed[@]}"; do
      docker image tag "${previous[$service]}" "pharmacast-$service:latest" || true
    done
    compose up -d --no-build --wait --wait-timeout 180 || true
    compose exec -T web nginx -s reload || true
    log "Se intentó recuperar las imágenes anteriores. Verifica el estado de la aplicación."
  fi
  log "La base no se revierte automáticamente. Si falló una migración, revisa el registro y la copia en backups/."
  exit "$status"
}
trap cleanup EXIT
trap rollback ERR

compose config --quiet
for service in web backend ml; do
  repo="$ROOT/.deploy/cache/$service.git"
  if [[ ! -d "$repo" ]]; then
    git init --bare -q "$repo"
    git -C "$repo" remote add origin "${repos[$service]}"
  fi
  GIT_TERMINAL_PROMPT=0 git -C "$repo" fetch -q --depth=1 origin main
  target[$service]=$(git -C "$repo" rev-parse FETCH_HEAD)
  deployed=""
  if [[ -f ".deploy/state/$service.sha" ]]; then
    deployed=$(cat ".deploy/state/$service.sha")
  fi
  if [[ "$deployed" != "${target[$service]}" ]]; then
    changed+=("$service")
  fi
done

# Routine checks stay quiet; systemd records the exit status.
if (( ${#changed[@]} == 0 )); then
  exit 0
fi
log "Cambios detectados: ${changed[*]}"
work=$(mktemp -d "$ROOT/.deploy/build.XXXXXXXX")

# Build every affected service before changing any running image.
for service in "${changed[@]}"; do
  mkdir "$work/$service"
  git -C "$ROOT/.deploy/cache/$service.git" archive "${target[$service]}" \
    | tar -x -C "$work/$service"
  docker build -t "pharmacast-$service:${target[$service]}" "$work/$service"
  container=$(compose ps -a -q "$service")
  previous[$service]=$(docker inspect --format '{{.Image}}' "$container")
done

if [[ " ${changed[*]} " == *" backend "* ]]; then
  docker build --target migrations \
    -t "pharmacast-migrations:${target[backend]}" "$work/backend"
  backup="$ROOT/backups/predeploy-$(date -u +%Y%m%dT%H%M%SZ)-${target[backend]:0:8}.dump"
  compose exec -T db sh -ec \
    'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$backup.tmp"
  test -s "$backup.tmp"
  mv "$backup.tmp" "$backup"
  log "Copia de PostgreSQL guardada en $backup"
  container=$(compose ps -q db)
  # Reuse the existing Compose network without assuming its generated name.
  network=$(docker inspect --format '{{range $name, $_ := .NetworkSettings.Networks}}{{$name}}{{end}}' "$container")
  docker run --rm --network "$network" --env-file "$ROOT/.env" \
    --entrypoint sh "pharmacast-migrations:${target[backend]}" -ec \
    'exec /tools/dotnet-ef database update --no-build --configuration Release \
      --connection "Host=db;Port=5432;Database=$POSTGRES_DB;Username=$POSTGRES_USER;Password=$POSTGRES_PASSWORD"'
fi

promoted=1
for service in "${changed[@]}"; do
  docker image tag "pharmacast-$service:${target[$service]}" "pharmacast-$service:latest"
done
compose up -d --no-build --wait --wait-timeout 180
# Nginx must resolve the backend's new container address after recreation.
compose exec -T web nginx -t
compose exec -T web nginx -s reload

compose exec -T ml python - <<'PY'
import urllib.error
import urllib.request
urllib.request.urlopen("http://127.0.0.1:8000/health", timeout=15).read()
try:
    response = urllib.request.urlopen("http://backend:8080/api/auth/me", timeout=15)
except urllib.error.HTTPError as error:
    if error.code != 401:
        raise
else:
    raise RuntimeError(f"La ruta protegida respondió {response.status}; se esperaba 401")
PY

# Check TLS locally, preserving the public hostname and certificate validation.
# Retry briefly while Nginx finishes its graceful reload.
for attempt in 1 2 3 4 5; do
  if curl --fail --silent --show-error --connect-timeout 5 --max-time 20 \
      --resolve pharmacast.online:443:127.0.0.1 \
      https://pharmacast.online/ -o /dev/null; then
    break
  fi
  if (( attempt == 5 )); then false; fi
  sleep 2
done

for service in "${changed[@]}"; do
  printf '%s\n' "${target[$service]}" > ".deploy/state/$service.sha.tmp"
  mv ".deploy/state/$service.sha.tmp" ".deploy/state/$service.sha"
  log "$service desplegado: ${target[$service]}"
done
log "Actualización completada."
