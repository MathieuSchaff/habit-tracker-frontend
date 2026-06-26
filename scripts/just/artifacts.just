import '_vars.just'

# Gestion des artefacts générés (audits, coverage, e2e, bundle). Tous gitignored et
# régénérables — ne déplace rien, centralise juste la découverte + le nettoyage.
# `just clean` = volumes Docker, `just ts-clean` = types ; ceci couvre le reste.

# Liste les artefacts générés + leur taille (— si absent).
artifacts:
    #!/usr/bin/env bash
    set -uo pipefail
    cd {{justfile_directory()}}
    entries=(
        ".audit-out:audits code/db/products (recipes audit-*)"
        "backend/coverage:coverage backend (lcov)"
        "frontend/coverage:coverage frontend (vitest)"
        "frontend/test-results:e2e playwright (fails)"
        "frontend/playwright-report:e2e report"
        "frontend/blob-report:e2e blob"
        "frontend/stats.html:bundle treemap (visualizer)"
        "frontend/dist/analyze-data.md:bundle md (rolldown)"
        "backend/src/db/seed/output:data pipeline + images (consommé — voir artifacts-clean)"
    )
    printf "{{CYAN}}%-32s %7s  %s{{NC}}\n" "PATH" "SIZE" "QUOI"
    for e in "${entries[@]}"; do
        p="${e%%:*}"; desc="${e#*:}"
        if [ -e "$p" ]; then
            printf "%-32s %7s  %s\n" "$p" "$(du -sh "$p" 2>/dev/null | cut -f1)" "$desc"
        else
            printf "{{YELLOW}}%-32s %7s{{NC}}  %s\n" "$p" "—" "$desc"
        fi
    done

# Supprime tous les artefacts générés. Ne touche ni la DB ni les types (dist/*.d.ts),
# ni backend/src/db/seed/output (état consommé par catalog-canonicalize + working set images).
artifacts-clean:
    #!/usr/bin/env bash
    set -uo pipefail
    cd {{justfile_directory()}}
    paths=(.audit-out backend/coverage frontend/coverage frontend/test-results
        frontend/playwright-report frontend/blob-report frontend/.playwright
        frontend/stats.html frontend/dist/analyze-data.md)
    n=0
    for p in "${paths[@]}"; do
        if [ -e "$p" ]; then rm -rf "$p" && printf "{{GREEN}}✓ rm %s{{NC}}\n" "$p" && n=$((n+1)); fi
    done
    printf "{{GREEN}}%d artefact(s) supprimé(s).{{NC}}\n" "$n"

# Ouvre un artefact (interactif). Sans arg → menu fzf/select. Avec arg → match
# (stats|analyze|coverage|audit ou fragment de chemin). Les rapports bundle sont
# régénérés s'ils manquent ou si leurs entrées ont changé depuis leur génération.
artifacts-open ARG="":
    #!/usr/bin/env bash
    set -uo pipefail
    cd {{justfile_directory()}}
    keys=(stats analyze coverage audit)
    label() { case "$1" in
        stats)    echo "bundle treemap       → frontend/stats.html           [build ANALYZE]" ;;
        analyze)  echo "bundle report (LLM)  → frontend/dist/analyze-data.md  [build ANALYZE]" ;;
        coverage) echo "frontend coverage    → frontend/coverage/            [vitest]" ;;
        audit)    echo "code audits          → .audit-out/                   [lent]" ;;
    esac; }
    files() { case "$1" in
        stats)    echo frontend/stats.html ;;
        analyze)  echo frontend/dist/analyze-data.md ;;
        coverage) echo frontend/coverage/index.html frontend/coverage/lcov-report/index.html ;;
        audit)    echo .audit-out ;;
    esac; }
    gen() { case "$1" in
        stats|analyze) echo "just ts-build && cd frontend && ANALYZE=1 bunx vite build" ;;
        coverage)      echo "just test-frontend-coverage" ;;
        audit)         echo "just audit-code" ;;
    esac; }
    has_output() { for c in $(files "$1"); do [ -e "$c" ] && return 0; done; return 1; }
    bundle_is_stale() {
        outputs=(frontend/stats.html frontend/dist/analyze-data.md)
        inputs=(frontend/src frontend/public shared/src
            frontend/index.html frontend/vite.config.ts frontend/postcss.config.js
            frontend/package.json frontend/tsconfig.json frontend/tsconfig.app.json
            frontend/tsconfig.node.json shared/package.json shared/tsconfig.json
            package.json tsconfig.json bun.lock)
        for output in "${outputs[@]}"; do [ -f "$output" ] || return 0; done
        for output in "${outputs[@]}"; do
            if find "${inputs[@]}" -type f -newer "$output" -print -quit 2>/dev/null | grep -q .; then
                return 0
            fi
        done
        return 1
    }
    generate() {
        key_to_generate="$1"
        reason="$2"
        printf "{{YELLOW}}%s %s → génération : %s{{NC}}\n" "$key_to_generate" "$reason" "$(gen "$key_to_generate")"
        ( eval "$(gen "$key_to_generate")" ) || { printf "{{RED}}génération échouée.{{NC}}\n"; exit 1; }
    }

    # Pick the key: explicit arg (exact key or path fragment), else interactive.
    key=""
    if [ -n "{{ARG}}" ]; then
        for k in "${keys[@]}"; do
            if [ "$k" = "{{ARG}}" ] || files "$k" | grep -qiF -- "{{ARG}}"; then key="$k"; break; fi
        done
        [ -z "$key" ] && { printf "{{RED}}'%s' inconnu. Clés : %s{{NC}}\n" "{{ARG}}" "${keys[*]}"; exit 2; }
    elif command -v fzf >/dev/null 2>&1; then
        line=$(for k in "${keys[@]}"; do printf '%s\t%s\n' "$k" "$(label "$k")"; done \
            | fzf --delimiter='\t' --with-nth=2 --prompt='Ouvrir > ' --height=40% --reverse)
        [ -z "$line" ] && exit 0
        key="${line%%$'\t'*}"
    else
        printf "{{CYAN}}Ouvrir quoi ?{{NC}}\n"; PS3="> "
        labels=(); for k in "${keys[@]}"; do labels+=("$(label "$k")"); done
        select _ in "${labels[@]}"; do
            [ -n "${REPLY:-}" ] && [ "$REPLY" -ge 1 ] 2>/dev/null && [ "$REPLY" -le "${#keys[@]}" ] && { key="${keys[$((REPLY-1))]}"; break; }
        done
        [ -z "$key" ] && exit 0
    fi

    # Generation runs in a subshell so its `cd frontend` does not leak into the
    # freshness checks or artifact opening.
    # xdg-open on .md is unreliable (lands in a plain editor, no render). Route markdown to a
    # md-aware opener: explicit $VISUAL/$EDITOR first, then glow (rendered), then zed.
    open_path() {
        case "$1" in
            *.md)
                if   [ -n "${VISUAL:-}" ]; then $VISUAL "$1"
                elif [ -n "${EDITOR:-}" ]; then $EDITOR "$1"
                elif command -v glow >/dev/null 2>&1; then glow -p -- "$1"
                elif command -v zed  >/dev/null 2>&1; then zed "$1"
                else xdg-open "$1" >/dev/null 2>&1 & fi ;;
            *) xdg-open "$1" >/dev/null 2>&1 & ;;
        esac
    }
    open_first() { for c in $(files "$1"); do [ -e "$c" ] && { printf "{{GREEN}}↗ %s{{NC}}\n" "$c"; open_path "$c"; return 0; }; done; return 1; }
    case "$key" in
        stats|analyze)
            if bundle_is_stale; then
                generate "$key" "(absent ou périmé)"
            else
                printf "{{GREEN}}✓ rapports bundle à jour{{NC}}\n"
            fi
            ;;
        *)
            has_output "$key" || generate "$key" "(absent)"
            ;;
    esac
    if ! open_first "$key"; then
        printf "{{RED}}%s introuvable après génération.{{NC}}\n" "$key"
        exit 1
    fi
