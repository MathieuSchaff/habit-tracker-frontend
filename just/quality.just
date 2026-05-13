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

# Global dead-code scan
fallow-scan:
    npx fallow dead-code --production --include-dupes --summary

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

# Check only test files
lint-tests:
    find . -type d \( -name node_modules -o -name dist -o -name .git -o -name .fallow \) -prune -o \( -name "*.test.ts" -o -name "*.spec.ts" -o -name "*.test.tsx" -o -name "*.spec.tsx" \) -print | xargs -r bunx biome check

# Fix only test files
lint-tests-fix:
    find . -type d \( -name node_modules -o -name dist -o -name .git -o -name .fallow \) -prune -o \( -name "*.test.ts" -o -name "*.spec.ts" -o -name "*.test.tsx" -o -name "*.spec.tsx" \) -print | xargs -r bunx biome check --write

# Format only test files
format-tests:
    find . -type d \( -name node_modules -o -name dist -o -name .git -o -name .fallow \) -prune -o \( -name "*.test.ts" -o -name "*.spec.ts" -o -name "*.test.tsx" -o -name "*.spec.tsx" \) -print | xargs -r bunx biome format --write
