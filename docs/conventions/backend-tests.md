---
title: Règles tests backend
status: canonical
scope: backend/src/**/*.test.ts
runner: bun:test
---

# Règles tests backend — Aurore

À lire **avant** de créer ou modifier un fichier `*.test.ts` côté backend. Convention stabilisée 2026-05-22 après audit + 6 commits sur `main`. Lint pre-commit te rattrape si tu oublies.

---

## TL;DR — décision en 10 secondes

```
Mon test touche la DB ?
  ├── Non  → fichier pur, AUCUN import depuis tests/db-setup ou tests/helpers/createTestClient
  └── Oui  → import { setupDbTests } from '<rel>/db-setup'
            └── setupDbTests() en tête du fichier (hors describe)
            
Mon test fait du RLS / multi-rôle ?
  └── Vit dans backend/src/tests/integration/ avec son propre pool SQL
```

---

## 1. Default = pur. Pas d'import DB.

Un fichier de test démarre **pur**. Aucun import de :
- `tests/db-setup`
- `tests/helpers/createTestClient`
- `tests/helpers/createTestApp`
- `tests/db.test.config` (testDb)
- `tests/helpers/db-cleaner`
- `new SQL(` depuis 'bun'

Validation rapide qu'il est vraiment pur :

```bash
cd backend && DATABASE_URL=bogus://nope bun test mon-fichier.test.ts
```

Si la commande passe → pur. Si elle plante au boot → DB encore couplée, à débugger.

## 2. Test qui touche DB = opt-in explicite

En tête du fichier, hors de tout `describe` :

```ts
import { setupDbTests } from '<rel>/db-setup'

setupDbTests()
```

Effet : enregistre `beforeAll(ping DB)` + `beforeEach(cleanDatabase)` **scopés à ce fichier**. Les tests purs des autres fichiers ne paient rien.

**Pourquoi pas d'auto-detect** : preload bun:test global = clean sur 1559 tests même les 632 purs. C'était le bottleneck initial (baseline ~130 s). Opt-in scoped = pollueur paie.

## 3. Self-cleaner = pas de `setupDbTests`

Si ton fichier a besoin de créer un fixture spécifique avant chaque test :

```ts
let user: User
beforeEach(async () => {
  await cleanDatabase()
  user = await createTestUser(...)
})
```

NE PAS ajouter `setupDbTests()` en plus. Sinon :
- `setupDbTests` enregistre `beforeEach(clean)` global au fichier
- Bun:test les exécute dans l'ordre d'enregistrement
- ⇒ Si `setupDbTests()` est appelé APRÈS ton `beforeEach` local, le clean global wipe le `createTestUser` qui vient juste de se faire

9 fichiers historiques suivent ce pattern. Ne les recopie pas sans raison, et si tu copies, vérifie l'ordre des hooks.

Liste actuelle des self-cleaners (référence) :

```
features/auth/tests/auth.demo.test.ts
features/auto-tagging/tests/auto-tag-skip.test.ts
features/dermo-score/tests/dermo-score.service.test.ts
features/product-comparisons/tests/product-comparisons.service.test.ts
features/products/tests/products.test.ts
features/security/tests/security.service.test.ts
features/user-products/tests/purchases.test.ts
features/user-products/tests/user.products.test.ts
features/user-products/tests/public-reviews.test.ts
```

## 4. RLS / multi-rôle = `src/tests/integration/`

Tests qui ouvrent plusieurs connexions avec rôles distincts (`app`, `app_runtime`, contexte RLS spécifique) :
- Vivent dans `backend/src/tests/integration/`
- Créent leur propre pool `new SQL(APP_DATABASE_URL)`
- Clean strict par-test **obligatoire**
- Ne pas alléger l'isolation

Exemples : `admin-moderation-rls.test.ts`, `demo-rls.test.ts`, `rls-context.test.ts`.

## 5. Régressions classiques à éviter

Deux régressions classiques dans les tests DB :

| Violation | Cas |
|---|---|
| Test touche DB sans `setupDbTests` ni clean local | Symboles détectés : `testDb`, `createTestClient`, `createTestApp`, `cleanDatabase`, `new SQL(` |
| Test importe `setupDbTests` mais ne touche pas DB | Dead opt-in → soit retirer l'import, soit ajouter l'usage DB |

Critère par **symbole**, pas par chemin. Couvre les re-exports locaux (`auth-test.setup.ts`).

## 6. Note `createTestUser` (depuis commit `f26e9d02`)

`createTestUser` coûte ~1 ms en test (bcrypt cost=4 sous `NODE_ENV=test`), pas 71 ms (argon2id prod). Ne pas optimiser en bypassant `signup()` — la perf est déjà là, garder le flow réel `signup → hash → store → JWT`.

Production reste sur argon2id default, gate par `process.env.NODE_ENV === 'test'` dans `backend/src/features/auth/service.ts`.

---

## Interdits

- ❌ Snapshots backend (algo-derm évolue → faux positifs garantis). `toEqual` lisible > snapshot fragile.
- ❌ Renommage `*.unit.test.ts` / `*.db.test.ts`. Critère "import db-setup" suffit, grepable.
- ❌ `console.log` / `warn` / `debug` dev cruft dans les `.test.ts`. Sweep complet 2026-05-22 doit rester vert :
  ```bash
  rg 'console\.(log|warn|debug)' backend/src --type ts -g '*.test.ts'
  ```
- ❌ Affaiblir l'isolation des tests `integration/*` pour gagner 5 s.
- ❌ Mocker la DB. Tests backend tapent la vraie Postgres test (Docker), pas un mock.

---

## Commandes utiles

| Action | Commande |
|---|---|
| Tests backend full cycle | `just test-backend` |
| Tests backend sans relancer DB | `just test-dev "<pattern>"` |
| Watch mode | `just test-dev-watch "<pattern>"` |
| Bench wall-time | `just test-bench` (log dans `/tmp/aurore-backend-test.log`) |
| Compte `cleanDatabase` fires | `just test-clean-count` (baseline 903, ne doit pas monter) |

---

