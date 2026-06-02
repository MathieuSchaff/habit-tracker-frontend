---
status: accepted
date: 2026-05-19
accepted: 2026-05-19
---

# Backups DB chiffrés par GPG asymétrique, sans fallback

Les sauvegardes prod produites par `just db-backup-prod` (cron 3h sur le VPS, sortie `./backups/backup_prod_*.sql.gz`) seront pipées dans `gpg --encrypt --recipient backup@aurore.local` avant écriture disque. La pub key vit sur le VPS (sous `infra/keys/aurore-backup.pub.asc`, versionnée). La priv key vit dans un seul emplacement : le password manager personnel. Aucun recipient de secours, aucun fallback symétrique, aucune copie offline papier/USB. Le compte PM est la racine de recovery.

## Why

Modèle de menace ciblé : un attaquant qui obtient un shell sur le VPS — ou qui aspire une image disque via le provider — récupère aujourd'hui l'intégralité des dumps en clair. Le seul rempart est l'accès VPS, ce qui est insuffisant avant mise en ligne publique et cohérent avec ce que `PRIVACY.md` §5.4 sous-entend déjà ("derrière les protections d'accès du VPS"). Le chiffrement at-rest du backup ferme cette surface : un dump volé reste illisible sans la priv key, qui n'a jamais touché le VPS.

Le choix asymétrique vs symétrique sépare le pouvoir d'écriture (cron sur le VPS) du pouvoir de lecture (poste local + PM). Une compromission VPS, même persistante, ne permet pas de déchiffrer les anciens backups exfiltrés. Un secret symétrique partagé entre cron et opérateur n'offre pas cette séparation : qui a la passphrase peut lire toute l'historique.

L'absence de recipient de secours est délibérée. Ajouter une seconde paire de clés (autre PM, autre device, paper backup) double le nombre de points où la priv key peut fuiter et double le rituel de gestion (rotation, révocation, audit). Pour un projet solo, le ratio cérémonie/risque ne le justifie pas tant que le PM lui-même est correctement sauvegardé par son propre mécanisme (sync cloud, master password). Le compte PM **est** la sauvegarde de la sauvegarde.

## Considered options

- **A. Symétrique (`gpg --symmetric`) avec passphrase partagée cron/opérateur.** Rejeté. Le cron a besoin de la passphrase pour chiffrer, donc la passphrase vit sur le VPS, donc une compromission VPS donne lecture de tous les backups passés et futurs. C'est le scénario exact qu'on essaie de fermer.
- **B. Asymétrique GPG, pub key VPS + priv key PM, pas de fallback.** **Choisi.** Sépare écriture/lecture, surface d'attaque minimale, rituel opérationnel quasi nul (cron silencieux, restore = `gpg --decrypt | gunzip | psql`). Le coût assumé : perte du compte PM ⇒ perte définitive des backups.
- **C. Asymétrique GPG avec recipient de secours (deuxième PM ou paper backup).** Rejeté. Double la surface à secrets sans réduire matériellement le risque dominant (perte de compte PM est un événement rare ; un second canal ajoute un risque de fuite et un rituel de rotation). À revisiter si Aurore devient multi-opérateur ou si la criticité business augmente.
- **D. Pas de chiffrement, externalisation vers stockage tiers chiffré côté serveur (B2/S3 SSE).** Rejeté pour cette session — orthogonal au modèle de menace VPS-leak (l'attaquant tape la source) et déplace le secret de chiffrement vers le provider, qui peut alors lire (ou être contraint de fournir) les backups.

## Consequences

- Le cron tourne en root (ou sous l'utilisateur déployeur) sur le VPS et n'a accès qu'à la pub key. Pas de prompt interactif : `gpg --batch --yes --trust-model always --recipient backup@aurore.local` est obligatoire. Le `--trust-model always` est sûr ici car la pub key vient de nous et est versionnée dans le repo.
- L'extension de fichier passe de `.sql.gz` à `.sql.gz.gpg`. Le `db-backup-clean` et toute consommatrice externe (si jamais ajoutée) doit refléter ce changement. La rétention 7 jours reste la même.
- Le restore prod devient un flux à deux étapes : `gpg --decrypt | gunzip | psql`. Documenté dans `runbook.md`. Le `db-restore` détecte l'extension automatiquement pour rester rétro-compatible avec un éventuel ancien `.sql.gz` qui traînerait pendant la fenêtre de transition.
- Le test de roundtrip vit dans `scripts/test-backup-roundtrip.sh` (génère une keypair jetable, dump/encrypt/decrypt/hash) et n'est pas branché en CI : il dépend de l'environnement GPG du host, l'injection d'une key jetable en CI ajoute plus de friction que la valeur. Le test reste exécutable à la main avant chaque mise en prod du flow backup.
- **Hors scope, à revisiter à 12 mois** : rotation de la GPG key (renouvellement, révocation, propagation aux backups existants), externalisation vers stockage tiers (B2/S3), chiffrement at-rest du filesystem VPS (LUKS). Ces trois axes sont orthogonaux à S4 et ne réduiront pas davantage le risque tant que le présent socle n'est pas en place.
- **Risque résiduel assumé** : perte du compte PM = perte définitive de la capacité de restore. Ce n'est pas une faille de sécurité (au contraire, c'est ce qu'on veut côté lecture) mais une faille de continuité. Acceptée parce que le PM a son propre modèle de durabilité (sync, master password mémorisé) et parce que le coût d'un mécanisme de recovery alternatif (paper backup, USB scellé) dépasse le bénéfice pour un projet solo.
