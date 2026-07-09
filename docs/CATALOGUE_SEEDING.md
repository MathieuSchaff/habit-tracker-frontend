# Seed The Product Catalogue

This is the short guide for adding products to the catalogue.

Aurore has two seed paths:

- `just db-seed` updates the core seed: tags, ingredients, users, articles, certifications, and a few fixture products. It is idempotent and keeps user data.
- `just ingest-catalogue <lot.jsonl>` imports a product lot. Use this path for real catalogue products.

The committed development catalogue is `backend/src/db/snapshot/data.sql`. To rebuild a local dev DB from it, run `just db-snapshot-reset`.

## Add A Lot Locally

Start the dev stack first:

```bash
just dev
```

Prepare a JSONL file with one product per line. Each line must match the product create input used by the app.

The command runs inside the backend container, from `/app/backend`. If the host file is `backend/tmp/lots/products.jsonl`, pass `tmp/lots/products.jsonl`.

Run a dry-run first:

```bash
just ingest-catalogue path/to/products.jsonl
```

The dry-run validates products, checks duplicates, and writes a machine-readable plan here:

```text
backend/tmp/data-runs/<lot>-<timestamp>/plan.json
```

If the dry-run reports blockers, fix the lot and run it again. `ALLOW_PARTIAL=1` exists, but use it only when you deliberately accept skipping blocked rows.

Apply the lot to the dev catalogue:

```bash
WRITE=1 just catalogue-apply path/to/products.jsonl
```

`catalogue-apply` runs the product ingest, then the catalogue gate:

```bash
just catalogue-gate
```

The gate runs DB audits and CDN/image checks, then refreshes `backend/src/db/snapshot/data.sql`. If an audit fails, the snapshot is not refreshed.

## Useful Options

Use a specific catalogue owner:

```bash
SEED_OWNER_EMAIL=admin@example.com WRITE=1 just catalogue-apply path/to/products.jsonl
```

Apply classification overrides:

```bash
CLASSIFICATIONS=path/to/classifications.json WRITE=1 just catalogue-apply path/to/products.jsonl
```

Explicitly accept a partial lot:

```bash
ALLOW_PARTIAL=1 WRITE=1 just catalogue-apply path/to/products.jsonl
```

Each write appends a log:

```text
backend/tmp/data-runs/<lot>-<timestamp>/apply.jsonl
```

## Production Boundary

`catalogue-apply` is dev-only because it refreshes the dev snapshot. In production, run the catalogue ingest from the VPS:

```bash
just prod-ssh 'TARGET=prod WRITE=1 just ingest-catalogue path/to/products.jsonl'
```

Production writes ask for confirmation. From the laptop, `TARGET=prod` is refused unless the local Compose stack is really the production stack. This prevents writing to the wrong DB.

## Do Not Use

Do not use `just db-seed` for a large product import. It is the core fixture path.

Do not run `just db-snapshot` alone after importing products. Use `just catalogue-gate` or `WRITE=1 just catalogue-apply ...` so audits run before the snapshot changes.

Do not treat external image URLs as done. `catalogue-gate` includes `audit-cdn`, so the catalogue is not snapshotted with broken or non-CDN images.
