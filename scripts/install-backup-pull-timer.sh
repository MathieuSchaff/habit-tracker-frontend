#!/usr/bin/env bash
# Installe (SANS activer) le timer systemd user qui tire les backups chiffrés
# du VPS vers ce poste, 1×/jour à 04:00 (après le backup VPS de 3h), avec
# rattrapage si le PC était éteint à l'heure (Persistent). Modèle PULL :
# cf. scripts/pull-backups.sh.
#
# N'ACTIVE rien : écrit les units + un template d'env, puis affiche les
# étapes à faire une fois le VPS prêt. Idempotent (réécrit les units).
#
# Usage:
#   scripts/install-backup-pull-timer.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PULL_SCRIPT="$REPO_ROOT/scripts/pull-backups.sh"
CONF_DIR="${XDG_CONFIG_HOME:-$HOME/.config}"
UNIT_DIR="$CONF_DIR/systemd/user"
ENV_FILE="$CONF_DIR/aurore-backup-pull.env"

[ -x "$PULL_SCRIPT" ] || { echo "✗ $PULL_SCRIPT introuvable ou non exécutable" >&2; exit 1; }
mkdir -p "$UNIT_DIR"

cat > "$UNIT_DIR/aurore-backup-pull.service" <<EOF
[Unit]
Description=Aurore — pull offsite des backups chiffrés depuis le VPS
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
EnvironmentFile=$ENV_FILE
ExecStart=$PULL_SCRIPT
EOF

cat > "$UNIT_DIR/aurore-backup-pull.timer" <<EOF
[Unit]
Description=Aurore — pull offsite quotidien des backups (rattrapage si raté)

[Timer]
OnCalendar=*-*-* 04:00:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

if [ ! -f "$ENV_FILE" ]; then
    cat > "$ENV_FILE" <<EOF
# Accès SSH au VPS (user@host), puis: systemctl --user enable --now aurore-backup-pull.timer
AURORE_VPS=user@host
# AURORE_REMOTE_DIR=aurore/backups
# AURORE_LOCAL_DIR=$HOME/aurore-backups
EOF
    chmod 600 "$ENV_FILE"
    echo "→ Template env créé : $ENV_FILE"
fi

systemctl --user daemon-reload

echo "✓ Units installées (désactivées) :"
echo "    $UNIT_DIR/aurore-backup-pull.{service,timer}"
echo ""
echo "Une fois le VPS prêt :"
echo "  1. édite $ENV_FILE  → AURORE_VPS=ton_user@ton_vps"
echo "  2. teste à la main : AURORE_VPS=… $PULL_SCRIPT"
echo "  3. active          : systemctl --user enable --now aurore-backup-pull.timer"
echo "  4. (laptop souvent éteint) loginctl enable-linger $USER"
echo "  5. vérifie         : systemctl --user list-timers aurore-backup-pull.timer"
