// Public origin of the deployed app, no trailing slash. Frontend canonicals/OG
// URLs and the backend sitemap <loc> entries must agree, and both point at
// production even from dev/preview builds so no environment self-canonicalizes
// to a non-prod origin. robots.txt hardcodes the same origin (static asset).
export const SITE_URL = 'https://aurore-app.fr'
