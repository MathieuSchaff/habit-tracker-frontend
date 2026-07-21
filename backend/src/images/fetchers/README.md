# Image fetchers

Brand-specific packshot fetchers (throwaway scrapers). The `*.ts` files are
gitignored on purpose: they break whenever a brand site changes, and their
output lives on the CDN. Run manually: `bun run src/images/fetchers/<brand>.ts <brand>`.
