# Static code-quality audit (no Docker / no DB): knip + biome + tsc + cycles + fallow + react-doctor.

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
