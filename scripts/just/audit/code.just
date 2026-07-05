# Static code-quality audit (no Docker / no DB): knip + biome + tsc + cycles + fallow + react-doctor.

# Audit code complet (knip + biome + tsc + cycles + fallow health/dupes + react-doctor). Rapports → .audit-out/
audit-code:
    #!/usr/bin/env bash
    set +e
    mkdir -p .audit-out
    printf "{{ CYAN }}=== knip (dead code/exports/deps) ==={{ NC }}\n"
    just knip 2>&1 | tee .audit-out/knip.txt
    printf "{{ CYAN }}=== biome (lint + unused locals) ==={{ NC }}\n"
    just lint 2>&1 | tee .audit-out/biome.txt
    printf "{{ CYAN }}=== tsc -b (types) ==={{ NC }}\n"
    bunx tsc -b --pretty false 2>&1 | tee .audit-out/tsc.txt
    printf "{{ CYAN }}=== madge (cycles) ==={{ NC }}\n"
    just cycles 2>&1 | tee .audit-out/cycles.txt
    printf "{{ CYAN }}=== fallow health (complexity/CRAP) ==={{ NC }}\n"
    npx fallow health 2>&1 | tee .audit-out/health.txt
    printf "{{ CYAN }}=== fallow dupes ==={{ NC }}\n"
    npx fallow dupes 2>&1 | tee .audit-out/dupes.txt
    printf "{{ CYAN }}=== react-doctor (React patterns/a11y/perf) ==={{ NC }}\n"
    # Version comes from frontend/package.json (react-doctor dependency) — no pin here.
    cd frontend && npx react-doctor --verbose --no-score 2>&1 | tee ../.audit-out/react-doctor.txt; cd ..
    printf "{{ GREEN }}Done. Rapports → .audit-out/{{ NC }}\n"
