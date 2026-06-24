import type { BanScope, CreateBanInput, UpdateRoleInput } from '@aurore/shared'

import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'

import { Button } from '@/component/Button/Button'
import { Time } from '@/component/DataDisplay/Time/Time'
import { FormMessage } from '@/component/Feedback/ui/FormMessage/FormMessage'
import { Input } from '@/component/Input/Input'
import { Select } from '@/component/Input/Select/Select'
import { Textarea } from '@/component/Input/Textarea/Textarea'
import { Toggle } from '@/component/Input/Toggle/Toggle'
import { useConfirm } from '@/features/admin/useConfirm'
import { useAnnounce } from '@/hooks/useAnnounce'
import { parseDatetimeLocalAsUTC } from '@/lib/dates'
import {
  adminQueries,
  useCreateBan,
  useDemoteToUser,
  useLiftBan,
  useModerateProfileVisibility,
} from '@/lib/queries/admin'
import { useAuthStore } from '@/store/auth'
import { adminLabels, getAdminErrorMessage, roleLabels } from '../constants'
import { useSuccessFeedback } from '../useSuccessFeedback'

const routeApi = getRouteApi('/admin/users_/$userId')

const SCOPE_OPTIONS: ReadonlyArray<{ value: BanScope; label: string }> = [
  { value: 'global', label: 'Global (toutes les actions)' },
  { value: 'product_create', label: 'Création de produits' },
  { value: 'product_edit', label: 'Édition de produits' },
  { value: 'ingredient_edit', label: 'Édition d’ingrédients' },
  { value: 'discussion_post', label: 'Publication dans les discussions' },
  { value: 'review_publish', label: 'Publication d’avis' },
]

// Falls back to the raw value so the confirm dialog never shows a bare enum.
const scopeLabel = (s: BanScope) => SCOPE_OPTIONS.find((o) => o.value === s)?.label ?? s

export function AdminUserDetailPage() {
  const { userId } = routeApi.useParams()
  // Account header + force-private are admin-only. A contributor gets content-only (no PII).
  // users() returns 403 for contributors, so gate the fetch (ADR-0006 S4).
  const isAdmin = useAuthStore((s) => s.role === 'admin')
  const usersQuery = useQuery({ ...adminQueries.users(), enabled: isAdmin })
  const bansQuery = useSuspenseQuery(adminQueries.userBans(userId))

  const user = useMemo(
    () => (isAdmin ? usersQuery.data?.items.find((u) => u.id === userId) : undefined),
    [isAdmin, usersQuery.data, userId]
  )

  if (isAdmin && !user) {
    return (
      <section>
        <p className="admin-table__empty">{adminLabels.userNotFound}</p>
        <Link to="/admin/users">← Liste des utilisateurs</Link>
      </section>
    )
  }

  return (
    <section>
      {isAdmin && user ? (
        <header className="admin-page__header">
          <div>
            <h1 className="admin-page__title">{user.email}</h1>
            <p className="admin-page__lede">
              {roleLabels[user.role]} —{' '}
              {user.emailVerifiedAt ? 'email vérifié' : 'email non vérifié'} — créé{' '}
              <Time iso={user.createdAt} relative />
            </p>
          </div>
          <Link to="/admin/users" className="admin-table__row-link">
            ← Liste
          </Link>
        </header>
      ) : (
        <header className="admin-page__header">
          <div>
            <h1 className="admin-page__title">Publications en pause</h1>
            <p className="admin-page__lede">
              Mettre en pause ou réactiver les publications de cet utilisateur.
            </p>
          </div>
          <Link to="/admin/reports" className="admin-table__row-link">
            ← Signalements
          </Link>
        </header>
      )}

      <CreateBanCard userId={userId} isAdmin={isAdmin} />
      <BansListCard userId={userId} bans={bansQuery.data} isAdmin={isAdmin} />
      {isAdmin && user && (
        <ProfileVisibilityCard userId={userId} initialForced={user.forcedPrivateByAdmin} />
      )}
      {isAdmin && user?.role === 'contributor' && <RoleCard userId={userId} />}
    </section>
  )
}

// Shown only for a contributor target; role can be granted again later.
function RoleCard({ userId }: { userId: string }) {
  const demote = useDemoteToUser(userId)
  const announce = useAnnounce()
  const { confirm, dialog } = useConfirm()
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleDemote() {
    setError(null)
    const ok = await confirm({
      title: 'Rétrograder ce modérateur ?',
      message:
        'Ses droits de modération sont retirés et le compte redevient un utilisateur. Réversible : un rôle pourra lui être accordé à nouveau.',
      confirmLabel: 'Rétrograder',
      variant: 'danger',
    })
    if (!ok) return
    const body: UpdateRoleInput = { role: 'user' }
    if (reason.trim().length > 0) body.reason = reason.trim()
    // The card unmounts on success (contributor gone) = silent for a screen reader;
    // announce before it goes. No toast — the announcement carries the confirmation.
    demote.mutate(body, {
      onSuccess: () => announce('Modérateur rétrogradé'),
      onError: (err) => setError(getAdminErrorMessage(err)),
    })
  }

  return (
    <div className="admin-card">
      <h2 className="admin-card__title">Rôle</h2>
      <p className="admin-page__lede">
        Retirer les droits de modération de ce compte. Action réversible.
      </p>
      <div className="admin-card__field">
        <Input
          label="Raison (optionnel)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
        />
      </div>
      <div aria-live="polite" aria-atomic="true">
        {error && <FormMessage variant="error">{error}</FormMessage>}
      </div>
      <div className="admin-form__actions">
        <Button loading={demote.isPending} onClick={handleDemote}>
          Rétrograder en utilisateur
        </Button>
      </div>
      {dialog}
    </div>
  )
}

function CreateBanCard({ userId, isAdmin }: { userId: string; isAdmin: boolean }) {
  const createBan = useCreateBan(userId)
  const { confirm, dialog } = useConfirm()
  // 'global' (account lockout) is admin-only; contributors pause content scopes only.
  const scopeOptions = useMemo(
    () => (isAdmin ? SCOPE_OPTIONS : SCOPE_OPTIONS.filter((o) => o.value !== 'global')),
    [isAdmin]
  )
  const [scope, setScope] = useState<BanScope>(isAdmin ? 'global' : 'review_publish')
  const [reason, setReason] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { success, setSuccess } = useSuccessFeedback()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const body: CreateBanInput = { scope }
    if (reason.trim().length > 0) body.reason = reason.trim()
    if (expiresAt) {
      body.expiresAt = parseDatetimeLocalAsUTC(expiresAt)
    }
    const ok = await confirm({
      title: 'Mettre en pause ?',
      message: `Portée : ${scopeLabel(scope)}. L’accès est suspendu immédiatement — réversible.`,
      confirmLabel: 'Mettre en pause',
      variant: 'danger',
    })
    if (!ok) return
    createBan.mutate(body, {
      onSuccess: () => {
        setReason('')
        setExpiresAt('')
        setSuccess('Mise en pause appliquée.')
      },
      onError: (err) => setError(getAdminErrorMessage(err)),
    })
  }

  return (
    <div className="admin-card">
      <h2 className="admin-card__title">Mettre en pause</h2>
      <form onSubmit={handleSubmit}>
        <div className="admin-form__grid">
          <Select<BanScope>
            label="Portée"
            options={scopeOptions}
            value={scope}
            onValueChange={(v) => v && setScope(v)}
          />
          <Input
            label="Expire le (optionnel)"
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
          <div className="admin-form__field-wide">
            <Textarea
              label="Raison (optionnel)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              maxLength={500}
            />
          </div>
        </div>
        <div aria-live="polite" aria-atomic="true">
          {error && <FormMessage variant="error">{error}</FormMessage>}
          {success && <FormMessage variant="success">{success}</FormMessage>}
        </div>
        <div className="admin-form__actions">
          <Button type="submit" loading={createBan.isPending}>
            Mettre en pause
          </Button>
        </div>
      </form>
      {dialog}
    </div>
  )
}

type Ban = {
  id: string
  scope: BanScope
  reason: string | null
  expiresAt: string | null
  createdAt: string
  bannedBy: string
}

function BansListCard({
  userId,
  bans,
  isAdmin,
}: {
  userId: string
  bans: Ban[]
  isAdmin: boolean
}) {
  const liftBan = useLiftBan(userId)
  const { confirm, dialog } = useConfirm()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const { success, setSuccess } = useSuccessFeedback()

  async function handleLift(banId: string, scope: BanScope) {
    const ok = await confirm({
      title: 'Lever la pause ?',
      message: `Portée : ${scopeLabel(scope)}. L’accès est restauré immédiatement.`,
      confirmLabel: 'Lever',
    })
    if (!ok) return
    setPendingId(banId)
    liftBan.mutate(banId, {
      onSuccess: () => setSuccess('Pause levée.'),
      onSettled: () => setPendingId(null),
    })
  }

  return (
    <div className="admin-card">
      <h2 className="admin-card__title">Pauses en cours et historique</h2>
      <div aria-live="polite" aria-atomic="true">
        {success && <FormMessage variant="success">{success}</FormMessage>}
      </div>
      {bans.length === 0 ? (
        <p className="admin-table__empty">{adminLabels.emptyBans}</p>
      ) : (
        <table className="admin-table">
          <caption className="sr-only">Pauses (actives et historique)</caption>
          <thead>
            <tr>
              <th>Scope</th>
              <th>Raison</th>
              <th>Expire</th>
              <th>Créé</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bans.map((b) => (
              <tr key={b.id}>
                <td>
                  <span className="admin-pill admin-pill--banned">{b.scope}</span>
                </td>
                <td>{b.reason ?? <em>—</em>}</td>
                <td>{b.expiresAt ? <Time iso={b.expiresAt} relative /> : 'Permanent'}</td>
                <td>
                  <Time iso={b.createdAt} relative />
                </td>
                <td>
                  {/* 'global' lift is admin-only; RLS filters it from a contributor's list. */}
                  {isAdmin || b.scope !== 'global' ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      loading={pendingId === b.id && liftBan.isPending}
                      onClick={() => handleLift(b.id, b.scope)}
                    >
                      Lever
                    </Button>
                  ) : (
                    <em>—</em>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {dialog}
    </div>
  )
}

function ProfileVisibilityCard({
  userId,
  initialForced,
}: {
  userId: string
  initialForced: boolean
}) {
  const moderate = useModerateProfileVisibility(userId)
  const { confirm, dialog } = useConfirm()
  const [forced, setForced] = useState(initialForced)
  const [reason, setReason] = useState('')
  const { success, setSuccess } = useSuccessFeedback()

  async function apply(next: boolean) {
    const ok = await confirm({
      title: next ? 'Forcer ce profil en privé ?' : 'Lever le forçage privé ?',
      message: next
        ? 'Le profil sera invisible et ses reviews publiques cachées. Action à utiliser après une modération individuelle insuffisante.'
        : 'Le profil retrouvera la visibilité décidée par son auteur.',
      confirmLabel: next ? 'Forcer privé' : 'Lever',
      variant: next ? 'danger' : 'default',
    })
    if (!ok) return
    moderate.mutate(
      {
        forcedPrivate: next,
        reason: next && reason.trim().length > 0 ? reason.trim() : undefined,
      },
      {
        onSuccess: (data) => {
          setForced(data.forcedPrivateByAdmin)
          setSuccess(next ? 'Profil forcé en privé.' : 'Forçage levé.')
        },
      }
    )
  }

  return (
    <div className="admin-card">
      <h2 className="admin-card__title">Visibilité du profil</h2>
      <p className="admin-page__lede">
        Action exceptionnelle. À utiliser uniquement quand la modération par-ligne (review,
        discussion) ne suffit plus.
      </p>
      <div className="admin-card__field">
        <Toggle
          label="Forcer privé (admin override)"
          hint="Le toggle utilisateur est ignoré tant que le forçage est actif."
          checked={forced}
          disabled={moderate.isPending}
          onChange={(next) => apply(next)}
        />
      </div>
      <div className="admin-card__field">
        <Input
          label="Raison (optionnel)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
        />
      </div>
      <div aria-live="polite" aria-atomic="true">
        {success && <FormMessage variant="success">{success}</FormMessage>}
      </div>
      {dialog}
    </div>
  )
}
