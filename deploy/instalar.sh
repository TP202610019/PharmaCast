#!/usr/bin/env bash
set -Eeuo pipefail
if (( EUID != 0 )); then
  printf 'Ejecuta este instalador con sudo bash.\n' >&2
  exit 1
fi
cd /srv/pharmacast
test -s .env && test -s compose.yaml && test -s compose.override.yaml
for command in git docker curl flock tar; do command -v "$command" >/dev/null; done
docker compose config --quiet

# Fetch the companion script from the same reviewed commit as this installer.
# The SHA is supplied explicitly; never execute a partially downloaded script.
sha=${1:?Falta el SHA del commit del frontend}
[[ "$sha" =~ ^[0-9a-f]{40}$ ]]
tmp=$(mktemp)
trap 'rm -f -- "$tmp"' EXIT
curl --fail --silent --show-error --location \
  "https://raw.githubusercontent.com/TP202610019/PharmaCast/$sha/deploy/actualizar.sh" -o "$tmp"
bash -n "$tmp"
install -o root -g root -m 750 "$tmp" /usr/local/sbin/pharmacast-actualizar
install -d -o root -g root -m 700 .deploy

cat > /etc/systemd/system/pharmacast-actualizar.service <<'EOF'
[Unit]
Description=Actualizar PharmaCast desde main
Wants=network-online.target
Requires=docker.service
After=network-online.target docker.service
StartLimitIntervalSec=0

[Service]
Type=oneshot
WorkingDirectory=/srv/pharmacast
Environment=GIT_TERMINAL_PROMPT=0
ExecStart=/usr/local/sbin/pharmacast-actualizar
TimeoutStartSec=3600
UMask=0077
EOF

cat > /etc/systemd/system/pharmacast-actualizar.timer <<'EOF'
[Unit]
Description=Revisar cambios de PharmaCast cada minuto

[Timer]
OnBootSec=2min
OnUnitInactiveSec=1min
AccuracySec=5s

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
# First deployment is manual, so its logs and any failure are visible immediately.
# The timer is enabled only if it succeeds.
systemctl start pharmacast-actualizar.service
systemctl enable --now pharmacast-actualizar.timer
systemctl status pharmacast-actualizar.timer --no-pager
printf '\nInstalado. Registros: sudo journalctl -u pharmacast-actualizar.service -n 80 --no-pager\n'
