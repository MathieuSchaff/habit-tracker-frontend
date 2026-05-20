#!/usr/bin/env bash
# Roundtrip GPG | gzip pour valider le flow de backup chiffré.
#
# Génère une keypair jetable dans un GNUPGHOME temporaire (n'altère pas
# le keyring de l'utilisateur), crée un fichier d'entrée, le passe par
# le même pipeline que `just db-backup` côté prod, le déchiffre, et
# compare les hashes. Détruit ensuite tout le matériel cryptographique.
#
# Usage:
#   scripts/test-backup-roundtrip.sh              # fixture synthétique 1 MiB
#   scripts/test-backup-roundtrip.sh path/to/file # n'importe quel fichier
#
# Ce test n'est PAS branché en CI : il exerce le pipeline GPG du host,
# pas du code applicatif. À ré-exécuter à la main avant toute mise en
# prod du flow backup ou modification de `db-backup`.

set -euo pipefail

INPUT="${1:-}"
GNUPGHOME_TMP="$(mktemp -d -t aurore-gpg-roundtrip.XXXXXX)"
WORKDIR="$(mktemp -d -t aurore-backup-roundtrip.XXXXXX)"
RECIPIENT="roundtrip-test@aurore.local"

cleanup() {
    rm -rf "$GNUPGHOME_TMP" "$WORKDIR"
}
trap cleanup EXIT

export GNUPGHOME="$GNUPGHOME_TMP"
chmod 700 "$GNUPGHOME_TMP"

echo "→ Génération keypair jetable ($RECIPIENT)..."
gpg --batch --quiet --gen-key <<EOF
%no-protection
Key-Type: RSA
Key-Length: 2048
Name-Real: Aurore Roundtrip Test
Name-Email: $RECIPIENT
Expire-Date: 1d
%commit
EOF

if [ -z "$INPUT" ]; then
    INPUT="$WORKDIR/fixture.sql"
    echo "→ Génération fixture synthétique 1 MiB..."
    head -c 1048576 /dev/urandom | base64 > "$INPUT"
fi

ENCRYPTED="$WORKDIR/dump.sql.gz.gpg"
DECRYPTED="$WORKDIR/dump.sql"

echo "→ Encrypt: gzip | gpg --encrypt --recipient $RECIPIENT"
gzip -c "$INPUT" \
    | gpg --batch --yes --trust-model always \
          --encrypt --recipient "$RECIPIENT" \
          --output "$ENCRYPTED"
[ -s "$ENCRYPTED" ] || { echo "FAIL: chiffré vide"; exit 1; }

echo "→ Decrypt: gpg --decrypt | gunzip"
gpg --batch --quiet --decrypt "$ENCRYPTED" | gunzip > "$DECRYPTED"

HASH_IN=$(sha256sum "$INPUT"      | awk '{print $1}')
HASH_OUT=$(sha256sum "$DECRYPTED" | awk '{print $1}')

if [ "$HASH_IN" = "$HASH_OUT" ]; then
    echo "✓ Roundtrip OK — sha256 $HASH_IN"
    echo "  taille entrée   : $(stat -c %s "$INPUT") octets"
    echo "  taille chiffrée : $(stat -c %s "$ENCRYPTED") octets"
    exit 0
else
    echo "✗ FAIL — hash divergent"
    echo "  in : $HASH_IN"
    echo "  out: $HASH_OUT"
    exit 1
fi
