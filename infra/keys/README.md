# infra/keys/

Public keys tracked in the repository.

**No private key must ever be committed here.** This folder is meant to contain public, read-only keys only, but this rule is still worth repeating.

## `aurore-backup.pub.asc`

This is the public GPG key used by `just db-backup-prod` to encrypt database dumps before they are written to disk on the VPS.

The key is imported on the VPS during the initial deployment.

- **Recipient**: `backup@aurore.local`
- **Algorithm**: RSA 4096
- **Expiration**: none, manual rotation if needed
- **Private key**: stored **only** in the personal password manager. Never on the VPS, never on local disk, and never in the repository.

It is safe to version the public key. It can only be used to **encrypt** data for this recipient. It cannot decrypt anything.

Making this public key available to anyone who clones the repository makes it easier to bootstrap a new VPS, and it does not add a real attack surface.

## If the private key is lost

This is an accepted risk.

If the private key is lost, all existing backups encrypted with this public key become permanently unreadable.

Recovery procedure:

1. Generate a new GPG key pair.
2. Replace `aurore-backup.pub.asc` in the repository.
3. Import the new public key on the VPS.
4. Start creating new backups with the new key.

Old encrypted dumps are lost.
