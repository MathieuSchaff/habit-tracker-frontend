import { sql } from 'drizzle-orm'

import type { Transaction } from './index'

// Binds app.user_id for the lifetime of a drizzle transaction so RLS policies
// on tenant tables (habits, tasks, profiles, ...) allow inserts/reads.
// Use this INSIDE pre-identity paths (signup, createDemo, OAuth, email-confirm,
// password-reset) where the withRlsContext Hono middleware does not run.
// Authenticated request-scoped transactions should rely on withRlsContext instead.
export async function bindRlsContext(tx: Transaction, userId: string): Promise<void> {
  await tx.execute(sql`SELECT set_config('app.user_id', ${userId}, true)`)
}

//   Le problème

//   Signup / OAuth / demo creation → pas encore de JWT donc pas encore passé par withRlsContext. Mais ces chemins doivent
//    quand même :
//   - créer un user (OK, table users a probablement pas de policy tenant)
//   - créer un profile (RLS active, withCheck exige user_id = app.user_id)
//   - seed demo data (RLS active partout)

//   Sans contexte RLS → withCheck faux → INSERT refusé.

//   Le helper rls.ts

//   export async function bindRlsContext(tx: Transaction, userId: string): Promise<void> {
//     await tx.execute(sql`SELECT set_config('app.user_id', ${userId}, true)`)
//   }

//   Exactement la même ligne que dans withRlsContext. Extraite en helper pour être appelée manuellement là où le
//   middleware ne tourne pas.

//   Note : ne set PAS app.role. Implicite → current_setting('app.role', true) renvoie NULL → admin_bypass ne match pas →
//   on reste en mode user standard. Suffit pour signup.

//   Site d'appel (signup) — auth/service.ts:83-93

//   const user = await ctx.db.transaction(async (tx) => {
//     const user = await createUser(tx, {...})
//     // Set RLS context so the profiles insert passes WITH CHECK on app_runtime.
//     await bindRlsContext(tx, user.id)
//     await createProfile(tx, user.id)
//     return user
//   })

//   Flow :
//   1. Ouvre une TX manuellement (pas de middleware qui le fait).
//   2. createUser → INSERT dans users. Pas encore besoin du contexte.
//   3. Dès que l'user existe → bindRlsContext(tx, user.id) bind le GUC.
//   4. createProfile → INSERT dans profiles → withCheck passe car user_id = app.user_id.

//   Ordre critique : impossible de bind AVANT d'avoir un user.id (il est généré par l'INSERT). D'où la séquence INSERT
//   users → bind → INSERT profile.

//   Deuxième site — createDemo (ligne 248-261)

//   Même pattern, en plus large : le seedDemoData fait pleins d'INSERT dans tables RLS. Tous passent parce que
//   bindRlsContext tourne avant.

//   Troisième site — google.service.ts

//   OAuth Google. Même logique : user créé à la volée au premier login, puis profile.

//   Pourquoi ne pas plutôt faire passer le middleware

//   Possibilité théorique : ajouter withRlsContext même sur les routes publiques. Sauf qu'il lit c.get('userId') → pas
//   encore défini au moment du signup. Impossible sans changer sa logique.

//   Choix Aurore : helper manuel ciblé. Plus simple, responsabilités claires :
//   - middleware = route authentifiée
//   - helper = chemin pré-identité

//   Piège à éviter

//   Si un jour on ajoute une route pré-identité qui touche une table RLS sans appeler bindRlsContext → INSERT qui échoue
//   silencieusement avec new row violates row-level security policy.

//   Pas de garde-fou automatique. Convention à maintenir. Peut devenir un point de doc à renforcer (cf. étape 3.3).
// mais du coup d'où vient userId ici si y'a pas encore de userId ? Genre on a crée un compte ? On va utiliser bindRlsContext mai sdu coup y'a pas encor ed euser crée?

// on ne set pas app.role ? ca veut dire quoi du coup ? On est jamais en admin quoi ? le role admin est défini où d'ailleurs?
// pas dans les schémas des users, mais dans les transaction: lse role est par défaut admin a false ? ou bien c'est role = user ?
// je me demande ça car je comprends pas où on récupère le role admin.Je sais qu'il est dans le schéma users, mais après on le récupère dans la requete HTTP ? Ou bien c'est trop risqué et c'esxt le middleware qui gère ça? Garde ces questions pour plus tard on pourra voir plus tard.

// et pour le le bindRlsContext ok je comprens, mais au premier sign up ? On en met aucune règle sur la création de user c'est ça? Donc createUser a pas besoin de rls? On met des règle suniquemetn sur les autres type de transaction?

// Tu dis Pourquoi ne pas faire passer le middleware plutot ? possibilité ajouter withRlsContext meem sur les routes publiques sauf que middleware lit c.get("userId")

// oui pas défini au moment du signup. Quel serait l'autre logique? Un middleware qui check si userId est valide? Ou qui check sur quel route on est?  a voir plus tard j'imagine?
