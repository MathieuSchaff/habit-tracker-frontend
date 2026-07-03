/* Non-sensitive boot hint cookie. Its presence means a refresh session may exist (never a token);
   lets the SPA skip the /auth/refresh probe for anonymous visitors. Kept zod-free and
   separate from ./index so boot code reading it doesn't pull the auth schemas (zod). */
export const SESSION_HINT_COOKIE = 'aurore_session'
