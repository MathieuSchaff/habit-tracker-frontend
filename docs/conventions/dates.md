# Convention dates

Toutes les dates qui traversent une frontière (DB ↔ backend, backend ↔ API,
API ↔ frontend) sont des **strings ISO 8601 UTC**. Aucun objet `Date` JS ne
voyage hors d'un site d'usage local.

> Si tu te poses la question "Date ou string ?" : c'est string.

---

## 1. Pourquoi cette règle

- Un `Date` JS perd toute info de timezone une fois sérialisé en JSON, puis
  est reconstruit en timezone locale au parsing. Source d'1 bug par an.
- Drizzle en mode par défaut renvoie tantôt `Date`, tantôt string selon le
  driver et la colonne — code défensif `instanceof Date` partout sinon.
- ISO 8601 UTC est lexicographiquement triable → `compareInstant` = string
  compare, zéro allocation `Date` dans les hot lists.
- Une seule représentation = une seule règle à connaître.

---

## 2. Couches

### 2.1 DB (Drizzle)

Toutes les colonnes `timestamp` et `date` déclarent `mode: 'string'`.

```typescript
// timestamp avec timezone (audit, instants)
createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
  .notNull()
  .defaultNow()

updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
  .notNull()
  .defaultNow()
  .$onUpdate(() => new Date().toISOString())

// date pur (calendar dates : achats, snooze)
purchasedAt: date('purchased_at', { mode: 'string' }).notNull()
```

- `timestamptz` revient en ISO 8601 UTC (`"2026-05-07T14:23:10.000Z"`).
- `date` revient en `"YYYY-MM-DD"` (pas de timezone — c'est une date
  calendaire, pas un instant).
- `.$onUpdate(() => new Date().toISOString())` plutôt que `new Date()` :
  mode `string` n'accepte pas un objet `Date`.

### 2.2 Schémas Zod (`shared/`)

Toutes les dates utilisent `z.iso.datetime()`. Pas de `z.date()`, pas de
`z.coerce.date()`, pas de `z.string().regex(/^\d{4}-\d{2}-\d{2}$/)`.

```typescript
// Instants (audit timestamps, doneAt, publishedAt, etc.)
createdAt: z.iso.datetime()
publishedAt: z.iso.datetime().nullable()

// Calendar dates (purchasedAt, openedAt, snoozedUntil, etc.)
// Sur le wire = ISO datetime UTC à minuit (`"2026-05-07T00:00:00.000Z"`).
purchasedAt: z.iso.datetime()
snoozedUntil: z.iso.datetime().nullable().optional()
```

Une calendar date voyage en plein ISO datetime UTC pour rester homogène —
le backend tronque à `YYYY-MM-DD` à la frontière (cf. §2.3).

### 2.3 Backend services

Pour les colonnes `date` (calendar dates), conversion à la frontière du
service via `backend/src/utils/dates.ts` :

```typescript
import { calendarToInstant, instantToCalendar } from '../../utils/dates'

// Read (DB → API) : YYYY-MM-DD → ISO datetime UTC
function toApiPurchase(row: PurchaseRow): Purchase {
  return {
    ...row,
    purchasedAt: calendarToInstant(row.purchasedAt),
    openedAt: row.openedAt ? calendarToInstant(row.openedAt) : null,
    // ...
  }
}

// Write (API → DB) : ISO datetime UTC → YYYY-MM-DD
await db.insert(purchases).values({
  purchasedAt: instantToCalendar(input.purchasedAt),
})
```

Pour les comparaisons chronologiques en JS, **ne pas** utiliser le compare
string direct sur des valeurs venant du driver PG : le format peut différer
(`"2026-05-07 14:23:10+00"` vs `"2026-05-07T14:23:10.000Z"`). Utiliser
`Date.parse()` pour obtenir un timestamp numérique :

```typescript
const graceCutoffMs = Date.now() - 24 * 60 * 60 * 1000
if (Date.parse(user.createdAt) < graceCutoffMs) {
  return err('grace_expired')
}
```

Helpers backend (`backend/src/utils/dates.ts`) :

| Helper | Usage |
|--------|-------|
| `nowISO()` | timestamp ISO maintenant (UTC) |
| `todayCalendarUTC()` | `"YYYY-MM-DD"` aujourd'hui (UTC) |
| `instantToCalendar(iso)` | extraction de la portion date UTC |
| `calendarToInstant(yyyymmdd)` | promotion à minuit UTC |
| `normalizeInstant(value)` | force un timestamptz Drizzle vers ISO 8601 UTC |

> ⚠️ **Bun.sql gotcha** : pour les colonnes `timestamptz`, Bun.sql renvoie le
> format PG (`"2026-05-07 06:42:48.729+00"`, espace + `+00` au lieu de `T...Z`).
> Drizzle en `mode: 'string'` passe la valeur telle quelle. `new Date(...)` JS
> parse les deux formats donc le frontend ne voit rien, mais la chaîne sur le
> wire n'est pas du strict ISO 8601. Tous les mappers `toApi*` appellent
> `normalizeInstant` sur les `timestamptz` lus. Les mappers avec `devAssertSchema`
> (purchases, tasks, blog) valident aussi en dev/test.
> Les endpoints sans mapper de forme (users, ingredients) normalisent sans
> `devAssertSchema` — pas de schéma Zod `UserPublic`, et `ingredientResponseSchema`
> a des nullabilités qui ne correspondent pas exactement au schéma DB.

### 2.5 Validation runtime (paranoia mode)

`backend/src/utils/dev-validate.ts` expose `devAssertSchema(schema, value, ctx)` :

- en `NODE_ENV=production` → no-op, retourne la valeur telle quelle
- en dev/test → `safeParse` et throw si la forme dérive (avec log structuré)

Branché sur les boundary mappers calendar dates (`toApiPurchase`,
`toApiTask`) — points où la conversion `date` ↔ instant est la plus
sujette aux erreurs.

```typescript
function toApiPurchase(row: PurchaseRow): Purchase {
  const mapped: Purchase = { /* … */ }
  return devAssertSchema(purchaseSchema, mapped, 'toApiPurchase')
}
```

### 2.4 Frontend

Helpers `frontend/src/lib/dates.ts` :

| Helper | Usage |
|--------|-------|
| `formatInstant(iso, style)` | affichage locale FR forcée — styles `'short' \| 'medium' \| 'long' \| 'monthYear'`. **À n'utiliser que quand l'interpolation impose une string** (template literal, attribut HTML). Sinon préférer `<Time>` (cf. §2.4.1). |
| `formatRelative(iso)` | "il y a 3 jours" / "demain" / "dans 2 heures" via `Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' })` natif (zéro dépendance — date-fns retiré du frontend). `numeric: 'auto'` donne "hier"/"la semaine dernière" quand c'est plus naturel. Idem — préférer `<Time relative>` côté JSX. |
| `compareInstant(a, b)` | tri chronologique (string compare) |
| `toDateInputValue(iso)` | extraction `YYYY-MM-DD` pour `<input type="date">` |
| `fromDateInputValue(yyyymmdd)` | conversion vers ISO datetime UTC avant POST |
| `todayDateInputValue()` | `YYYY-MM-DD` aujourd'hui |
| `nowInstant()` | ISO datetime UTC maintenant. À utiliser pour tout write côté composant (`finishedAt: nowInstant()`) plutôt que `new Date().toISOString()`. |
| `parseDatetimeLocalAsUTC(value)` | reinterprète une valeur `<input type="datetime-local">` (tz-naive) en UTC sans appliquer la tz du navigateur — évite le bug où le ban d'un admin en Asie expirait 9 h plus tard que prévu. |

Tri descendant (le plus récent d'abord) :
```typescript
items.sort((a, b) => compareInstant(b.createdAt, a.createdAt))
```

### 2.4.1 Composant `<Time>` — affichage canonique

**Toute date qui apparaît dans le DOM** passe par `frontend/src/component/DataDisplay/Time/Time.tsx`. Le composant émet un `<time dateTime={iso}>` (a11y / SEO gratuits) et délègue à `formatInstant`/`formatRelative`.

```tsx
import { Time } from '@/component/DataDisplay/Time/Time'

// Absolu — date complète localisée FR
<Time iso={user.createdAt} style="medium" />
// → <time dateTime="2026-05-22T...Z">22 mai 2026</time>

// Relatif + tooltip absolu
<Time iso={ban.createdAt} relative />
// → <time dateTime="..." title="22 mai 2026">il y a 3 heures</time>

// className optionnel
<Time iso={article.publishedAt} style="medium" className="blog-card__date" />
```

Styles : `'short' | 'medium' | 'long' | 'monthYear'` (défaut `'medium'`). En mode `relative`, le `style` contrôle le tooltip absolu (défaut `'long'`).

**Interdits côté composant** (catchés par lefthook) :
- `import ... from 'date-fns'` hors helpers (frontend n'en dépend plus ; backend = `utils/dates.ts` + `demo-seed.ts`)
- `new Intl.DateTimeFormat(...)` / `new Intl.RelativeTimeFormat(...)` hors `frontend/src/lib/dates.ts`
- `value.toLocaleDateString(...)`, `value.toLocaleString(...)` partout
- `<time dateTime={...}>...</time>` à la main — passer par `<Time>`
- `new Date().toISOString()` hors helpers/schema/seed — utiliser `nowISO()` (backend) ou `nowInstant()` (frontend)

Exceptions tolérées :
- `formatInstant` / `formatRelative` appelés en string (template literal, attribut `title` quand `<Time>` ne convient pas).
- `new Date().toISOString()` dans les fixtures `vi.mock` factories (pas d'imports possibles, contrainte du runtime).

---

## 3. Anti-patterns à éviter

| ❌ Anti-pattern | ✅ Remplacer par |
|---|---|
| `z.date()`, `z.coerce.date()` | `z.iso.datetime()` |
| `value.toISOString()` côté front sur une valeur d'API | `value` (déjà ISO) |
| `new Date(value).toLocaleDateString()` | `<Time iso={value} style="short" />` |
| `value.toLocaleDateString('fr-FR', { ... })` | `<Time iso={value} style="<style>" />` |
| `new Intl.DateTimeFormat('fr-FR', ...).format(new Date(iso))` | `<Time iso={iso} style="..." />` |
| `<time dateTime={iso}>{formatInstant(iso, style)}</time>` à la main | `<Time iso={iso} style="<style>" />` |
| `value.split('T')[0]` | `toDateInputValue(value)` |
| `new Date(a).getTime() - new Date(b).getTime()` (tri) | `compareInstant(a, b)` |
| `instanceof Date` (Drizzle row) | rien — c'est toujours une string |
| `value < new Date(...).toISOString()` (compare driver vs JS) | `Date.parse(value) < cutoffMs` |
| `.set({ updatedAt: new Date() })` Drizzle | `.set({ updatedAt: nowISO() })` |
| `new Date().toISOString()` dans un service backend | `nowISO()` (exempt : `$onUpdate` en schema, seed, scripts `audit/`) |
| `new Date().toISOString()` dans un composant frontend | `nowInstant()` |
| `new Date(datetimeLocalInput).toISOString()` (leak tz local) | `parseDatetimeLocalAsUTC(input)` |

---

## 4. Tests

Fixtures envoient des strings ISO :

```typescript
// ✅
createdAt: new Date().toISOString()
purchasedAt: '2026-03-22T00:00:00.000Z'

// ❌
createdAt: new Date()
purchasedAt: '2026-03-22'  // (sauf à passer par instantToCalendar avant Drizzle)
```

Assertions :

```typescript
// ✅
expect(typeof row.createdAt).toBe('string')
expect(row.purchasedAt).toBe('2026-03-22T00:00:00.000Z')
expect(Date.parse(row.expiresAt)).toBeGreaterThan(before)

// ❌
expect(row.createdAt).toBeInstanceOf(Date)
expect(row.createdAt.getTime()).toBeGreaterThan(...)
```

---

## 5. Références

- DB schemas : `backend/src/db/schema/**/*.ts`
- Helpers backend : `backend/src/utils/dates.ts`
- Helpers frontend : `frontend/src/lib/dates.ts`
- Composant affichage : `frontend/src/component/DataDisplay/Time/Time.tsx`
- Mappers boundary calendar dates : `backend/src/features/user-products/purchase.service.ts` (`toApiPurchase`), `backend/src/features/tasks/service.ts` (`toApiTask`)
- Schémas Zod : `shared/src/{purchases,tasks,profile,blog,ingredients,auth}/...`
