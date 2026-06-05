#!/usr/bin/env bash
# Pull (offsite) des backups chiffrés prod depuis le VPS vers ce poste.
#
# Modèle PULL : c'est le poste qui tire par SSH. Le VPS n'a aucun accès
# au store offsite → un VPS compromis ne peut ni lire (GPG asymétrique)
# ni effacer cette copie. Le script ne déchiffre rien : les .gpg restent
# chiffrés de bout en bout (la priv key vit dans le password manager).
#
# Le VPS purge à 7 jours (db-backup-clean) ; ce poste ACCUMULE (pas de
# --delete) → l'offsite garde un historique plus long que la source.
#
# Usage:
#   AURORE_VPS=user@host scripts/pull-backups.sh
#   AURORE_VPS=user@host AURORE_REMOTE_DIR=/srv/aurore/backups \
#     AURORE_LOCAL_DIR=~/aurore-backups scripts/pull-backups.sh
#
# Prérequis : accès SSH par clé au VPS (cf. runbook § Offsite pull).

set -euo pipefail

VPS="${AURORE_VPS:-}"
REMOTE_DIR="${AURORE_REMOTE_DIR:-aurore/backups}"
LOCAL_DIR="${AURORE_LOCAL_DIR:-$HOME/aurore-backups}"

if [ -z "$VPS" ]; then
    echo "✗ AURORE_VPS non défini (ex: AURORE_VPS=deploy@vps.example)" >&2
    exit 2
fi

mkdir -p "$LOCAL_DIR"

echo "→ Pull $VPS:$REMOTE_DIR/backup_prod_*.sql.gz.gpg → $LOCAL_DIR"
# --ignore-existing : .gpg immuables, pas de re-transfert. include/exclude :
# ne tire que les backups prod chiffrés, rien d'autre du dossier distant.
rsync -a --ignore-existing \
    --include='backup_prod_*.sql.gz.gpg' --exclude='*' \
    "$VPS:$REMOTE_DIR/" "$LOCAL_DIR/"

count=$(find "$LOCAL_DIR" -maxdepth 1 -name 'backup_prod_*.sql.gz.gpg' | wc -l)
latest=$(ls -1t "$LOCAL_DIR"/backup_prod_*.sql.gz.gpg 2>/dev/null | head -1 || true)
echo "✓ Offsite à jour — $count backup(s) en local ($LOCAL_DIR)"
[ -n "$latest" ] && echo "  dernier : $(basename "$latest")"
