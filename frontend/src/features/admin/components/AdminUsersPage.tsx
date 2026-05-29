import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'

import { Time } from '@/component/DataDisplay/Time/Time'
import { Input } from '@/component/Input/Input'
import { adminQueries } from '@/lib/queries/admin'
import { adminLabels, roleLabels, rolePillClass } from '../constants'

export function AdminUsersPage() {
  const { data } = useSuspenseQuery(adminQueries.users())
  const [search, setSearch] = useState('')

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return data.items
    return data.items.filter((u) => u.email.toLowerCase().includes(term))
  }, [data.items, search])

  return (
    <section>
      <header className="admin-page__header">
        <div>
          <h1 className="admin-page__title">Utilisateurs</h1>
          <p className="admin-page__lede">
            {data.items.length} compte(s) — 100 plus récents
            {search ? ` · ${filteredUsers.length} filtré(s)` : ''}
          </p>
        </div>
      </header>

      <div className="admin-search">
        <Input
          label="Rechercher par email"
          placeholder="alice@…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filteredUsers.length === 0 ? (
        <p className="admin-table__empty">
          {search ? adminLabels.emptyUsersFiltered : adminLabels.emptyUsers}
        </p>
      ) : (
        <table className="admin-table">
          <caption className="sr-only">Liste des utilisateurs</caption>
          <thead>
            <tr>
              <th>Email</th>
              <th>Rôle</th>
              <th>Vérifié</th>
              <th>Forçage privé</th>
              <th>Créé</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => (
              <tr key={u.id}>
                <td>
                  <Link
                    to="/admin/users/$userId"
                    params={{ userId: u.id }}
                    className="admin-table__row-link"
                  >
                    {u.email}
                  </Link>
                </td>
                <td>
                  <span className={rolePillClass(u.role)}>{roleLabels[u.role]}</span>
                </td>
                <td>{u.emailVerifiedAt ? 'Oui' : 'Non'}</td>
                <td>
                  {u.forcedPrivateByAdmin ? (
                    <span className="admin-pill admin-pill--banned">{adminLabels.pillForced}</span>
                  ) : (
                    <em>—</em>
                  )}
                </td>
                <td>
                  <Time iso={u.createdAt} style="short" />
                </td>
                <td>
                  <Link to="/admin/users/$userId" params={{ userId: u.id }}>
                    Détails
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
