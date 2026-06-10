import '_vars.just'

# Check code with Biome
lint:
    bunx biome check .

# Fix lint issues
lint-fix:
    bunx biome check --write .

# Format code with Biome
format:
    bunx biome format --write .

# Audit changed files vs main (new issues only)
fallow:
    npx fallow audit --format compact

# Find duplications
fallow-dupes:
    npx fallow dupes

# Analyze cyclomatic/cognitive complexity
fallow-health:
    npx fallow health

# Save audit baseline (reset after big cleanup)
fallow-baseline:
    npx fallow dead-code --save-baseline .fallow/audit-dead-code.json --quiet
    npx fallow health --save-baseline .fallow/audit-health.json --quiet
    npx fallow dupes --save-baseline .fallow/audit-dupes.json --quiet

# Dead-code scan via knip (re-export aware, fewer false positives than fallow). DATABASE_URL stub avoids drizzle.config.ts load error (knip only parses imports).
knip:
    DATABASE_URL=postgres://x bunx knip --reporter compact

# Strict mode: also reports unlisted deps, types-only, etc.
knip-strict:
    DATABASE_URL=postgres://x bunx knip --strict --reporter compact

# Cycles d'imports
cycles:
    bunx madge --circular --extensions ts,tsx --exclude '(dist|node_modules)/' backend/src frontend/src shared/src

# Fuzzy-pick a recipe and run it (needs fzf)
choose:
    @just --summary | tr ' ' '\n' | fzf --preview 'just --show {}' | xargs -r just

react-doctor:
    cd frontend && npx --yes react-doctor@0.4.0 --diff false --verbose --no-score 2>&1 | tee ../.audit-out/react-doctor.txt; cd ..

# Audit code complet (knip + biome + tsc + cycles + fallow health/dupes + react-doctor). Rapports → .audit-out/
audit-code:
    #!/usr/bin/env bash
    set +e
    mkdir -p .audit-out
    printf "{{ CYAN }}=== knip (dead code/exports/deps) ==={{ NC }}\n"
    DATABASE_URL=postgres://x bunx knip --reporter compact 2>&1 | tee .audit-out/knip.txt
    printf "{{ CYAN }}=== biome (lint + unused locals) ==={{ NC }}\n"
    bunx biome check . 2>&1 | tee .audit-out/biome.txt
    printf "{{ CYAN }}=== tsc -b (types) ==={{ NC }}\n"
    bunx tsc -b --pretty false 2>&1 | tee .audit-out/tsc.txt
    printf "{{ CYAN }}=== madge (cycles) ==={{ NC }}\n"
    bunx madge --circular --extensions ts,tsx --exclude '(dist|node_modules)/' backend/src frontend/src shared/src 2>&1 | tee .audit-out/cycles.txt
    printf "{{ CYAN }}=== fallow health (complexity/CRAP) ==={{ NC }}\n"
    npx fallow health 2>&1 | tee .audit-out/health.txt
    printf "{{ CYAN }}=== fallow dupes ==={{ NC }}\n"
    npx fallow dupes 2>&1 | tee .audit-out/dupes.txt
    printf "{{ CYAN }}=== react-doctor (React patterns/a11y/perf) ==={{ NC }}\n"
    cd frontend && npx --yes react-doctor@0.4.0 --diff false --verbose --no-score 2>&1 | tee ../.audit-out/react-doctor.txt; cd ..
    printf "{{ GREEN }}Done. Rapports → .audit-out/{{ NC }}\n"

# Test prod CSP against prod build, locally, no Docker (builds dist, serves w/ nginx CSP, headless chromium, fails on violation). Test-only.
test-csp:
    cd frontend && bunx vite build && bun e2e/csp/check.ts

# Check only test files
lint-tests:
    find . -type d \( -name node_modules -o -name dist -o -name .git -o -name .fallow \) -prune -o \( -name "*.test.ts" -o -name "*.spec.ts" -o -name "*.test.tsx" -o -name "*.spec.tsx" \) -print | xargs -r bunx biome check

# Fix only test files
lint-tests-fix:
    find . -type d \( -name node_modules -o -name dist -o -name .git -o -name .fallow \) -prune -o \( -name "*.test.ts" -o -name "*.spec.ts" -o -name "*.test.tsx" -o -name "*.spec.tsx" \) -print | xargs -r bunx biome check --write

# Format only test files
format-tests:
    find . -type d \( -name node_modules -o -name dist -o -name .git -o -name .fallow \) -prune -o \( -name "*.test.ts" -o -name "*.spec.ts" -o -name "*.test.tsx" -o -name "*.spec.tsx" \) -print | xargs -r bunx biome format --write
