# infra/keys/

Clés publiques versionnées dans le repo. **Aucune clé privée ne doit jamais être committée ici** — c'est par construction (lecture-seule) mais à rappeler.

## `aurore-backup.pub.asc`

Clé publique GPG utilisée par `just db-backup-prod` pour chiffrer les dumps DB avant écriture disque sur le VPS. Importée sur le VPS au moment du déploiement initial.

- **Recipient** : `backup@aurore.local`
- **Algorithme** : RSA 4096
- **Expiration** : aucune (rotation manuelle si besoin)
- **Clé privée** : stockée **uniquement** dans le password manager personnel. Jamais sur le VPS, jamais sur disque local, jamais dans le repo.

Versionner la pub key est sûr : elle ne permet que de **chiffrer** vers ce recipient, pas de déchiffrer. La rendre lisible par tout cloneur du repo simplifie le bootstrap d'un nouveau VPS et n'ajoute aucune surface d'attaque.

## En cas de perte de la priv key

C'est un risque assumé. Conséquence : les backups existants chiffrés avec cette pub key deviennent définitivement illisibles. Procédure de récupération : générer une nouvelle keypair, remplacer `aurore-backup.pub.asc`, ré-importer sur le VPS, démarrer une nouvelle génération de backups. Les anciens dumps sont perdus.
