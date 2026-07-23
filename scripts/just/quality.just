import '_vars.just'

# Check code with Biome
lint:
    bunx biome check .

# Fix lint issues
lint-fix:
    bunx biome check --write .

# Save audit baseline (reset after big cleanup)
fallow-baseline:
    npx fallow dead-code --save-baseline .fallow/audit-dead-code.json --quiet
    npx fallow health --save-baseline .fallow/audit-health.json --quiet
    npx fallow dupes --save-baseline .fallow/audit-dupes.json --quiet

# Dead-code scan via knip (re-export aware, fewer false positives than fallow). DATABASE_URL stub avoids drizzle.config.ts load error (knip only parses imports). Pass "--strict" to also report unlisted deps, types-only, etc.
knip flags="":
    DATABASE_URL=postgres://x bunx knip {{flags}} --reporter compact

# Import cycles. Seed blog data excluded: index↔article-data barrels are static-data cycles, not real coupling.
cycles:
    bunx madge --circular --extensions ts,tsx --exclude '(dist|node_modules|db/seed/data)/' backend/src frontend/src shared/src

# Test prod CSP against prod build, locally, no Docker (builds dist, serves w/ nginx CSP, headless chromium, fails on violation). Test-only.
test-csp:
    cd frontend && VITE_API_URL=http://localhost:3000 bunx vite build && bun e2e/csp/check.ts

# Test auth boot convergence against the production SSR build, locally, no Docker.
# VITE_API_URL points at the check's mock proxy so server-side fetches cannot
# silently reach a live dev backend on 3000.
test-auth-ssr:
    cd frontend && VITE_API_URL=http://127.0.0.1:4190 bunx vite build && bun e2e/auth-ssr/check.ts

# Regenerate the OpenAPI spec from the backend AppType (static ts-morph analysis, no runtime). Serve it via the dev API at /api/docs.
docs:
    cd backend && bunx @rcmade/hono-docs generate --config ./hono-docs.ts
