---
status: accepted
date: 2026-07-22
accepted: 2026-07-22
---

# DB snapshots are plain-text git blobs, not LFS

The repo carries two committed pg_dump snapshots: `backend/src/db/snapshot/data.sql` (full data-only dump, dev source of truth, reloaded by `db-snapshot-load` and the e2e seed) and `backend/src/db/snapshot/catalogue.sql` (catalogue-only tables, consumed by `db-catalogue-load` for prod seeding). Both were marked `filter=lfs` in `.gitattributes`, but HEAD held `catalogue.sql` as an LFS pointer and `data.sql` as a raw 38 MB blob. We will drop LFS for both files and commit them as ordinary text, with a deterministic dump pipeline.

## Why

Measurements on this repo, 2026-07-22:

- Git delta-packs the SQL dumps extremely well: 14 historical versions of `data.sql` (110 MB raw) occupy **14.8 MB packed** (~1 MB per version; `.git/objects` totals 44 MB). LFS stores every version whole, with no delta: `.git/lfs` held **2.0 GB** for the same kind of content.
- The repo is jj-colocated, and jj does not run git clean/smudge filters. Any commit created through jj that touches an LFS-tracked file commits the raw content, silently un-LFS-ing it. History proves this is not hypothetical: `git lfs ls-files --all` shows `data.sql` alternating between LFS pointer and raw blob across its 13 commits, plus committed `.jjconflict-*` paths. An LFS rule we cannot enforce is worse than no rule.
- LFS carried permanent friction: phantom "M" status for both files in `git status`/`jj status` (jj never smudges — `catalogue.sql` sat in the working tree as a 133-byte pointer), manual `git lfs push` required before any push to avoid GH008, `lfs: true` required in CI checkouts, and GitHub LFS storage/bandwidth quota on every clone.
- The only remaining nondeterminism in the dump is the random `\restrict <token>` guard pg_dump 18 emits (no timestamps). Normalizing the token to a fixed value makes an unchanged database produce a byte-identical file, so `just db-snapshot` with no real data change adds zero objects to git.

## Considered options

- **A. Migrate `data.sql` into LFS to match `catalogue.sql`.** Rejected: jj bypasses the clean filter, so the file would silently revert to a raw blob on the next jj working-copy snapshot — exactly what history shows already happened. Also 130× worse storage than git deltas for this content.
- **B. Plain text in git for both, deterministic dump.** **Chosen.** Cost is ~1 MB packed per real data change and zero for no-op re-dumps. Diffs show which rows changed. Snapshots stay versioned in lockstep with schema migrations, work offline, and need no extra infra. Kills the phantom status, GH008, CI `lfs: true`, and the LFS quota in one move. No history rewrite (old LFS objects stay referenced by old commits; `git lfs migrate` would force-push and rehash jj commits for a ~15 MB gain).
- **C. Snapshot outside git (object storage / release assets).** Rejected: e2e seeding, the CI drift job, and `db-catalogue-load` all consume the committed file; external storage adds an upload/download pipeline, auth, and an indirect snapshot↔migration link for no measured gain while files stay far under GitHub's 100 MB blob limit.
- **D. Compressed or binary dump formats (`.sql.gz`, `pg_dump -Fc`).** Rejected: compression destroys git's delta chain, recreating the LFS problem (every version stored near-whole) while also losing readable diffs.

## Consequences

- `.gitattributes` loses both `filter=lfs` rules; both snapshots are committed as normal text blobs (materialize `catalogue.sql` from its LFS object first).
- `db-snapshot` and `db-catalogue-snapshot` pipe the dump through a token normalizer (`\restrict`/`\unrestrict` rewritten to a fixed token — kept, not stripped, so the psql anti-injection guard still applies).
- `git lfs prune` reclaims ~2 GB locally. Remote LFS objects are kept: historical commits still reference them.
- The CI drift job no longer needs `lfs: true` once a de-LFS'd commit is on `main`.
- The jj+LFS discipline (manual `git lfs push`, phantom-diff workarounds) becomes obsolete for these files.
- Watch item: if either snapshot approaches GitHub's 100 MB blob limit (warning at 50 MB; currently ~38 MB), revisit option C.
