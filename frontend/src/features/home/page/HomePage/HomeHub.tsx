import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  BookOpen,
  FlaskConical,
  GitCompare,
  Layers,
  ListChecks,
  Package,
  Users,
} from 'lucide-react'
import { Suspense } from 'react'

import { ButtonLink } from '@/component/Button/Button'
import { Spinner } from '@/component/Feedback/ui/Spinner/Spinner'
import { SKIN_CONCERN_LABELS } from '@/constants/skin'
import { statusLabels } from '@/features/collection/constants'
import { ShelfPulse } from '@/features/profile/components/ShelfPulse/ShelfPulse'
import { SkinProfileRead } from '@/features/profile/components/SkinProfileRead/SkinProfileRead'
import { formatInstant } from '@/lib/dates'
import { privacySettingsQueries, profileQueries } from '@/lib/queries/profile'
import { taskQueries } from '@/lib/queries/tasks'
import { type UserProduct, userProductQueries } from '@/lib/queries/user-products'
import { useAuthStore } from '@/store/auth'
import { getSentimentLabel } from '@/utils/sentimentMap'
import type { DoorwayItem } from '../../components/DoorwayGrid/DoorwayCard'
import { DoorwayGrid } from '../../components/DoorwayGrid/DoorwayGrid'
import { HeroShell } from '../../components/Hero/HeroShell'
import { AuroreBrandMark } from '../../components/primitives/AuroreBrandMark'
import { Container, SectionHead } from '../../components/sections/Section'
import { lastTouched } from '../../lib/lastTouched'
import './HomeHub.css'

// "La dernière fois, vous avez classé X en « En stock »[ · J'adore]."
// avoided never exposes sentiment (collection taxonomy masks it).
function repriseLine(item: UserProduct): string {
  const status = statusLabels[item.status].label
  const sentiment = item.status === 'avoided' ? null : getSentimentLabel(item.sentiment)
  const tail = sentiment ? ` · ${sentiment}` : ''
  return `La dernière fois, vous avez classé ${item.product.name} en « ${status} »${tail}.`
}

export function HomeHub() {
  const role = useAuthStore((s) => s.role)

  const { data: me } = useQuery(profileQueries.me())
  const { data: dermo } = useQuery(profileQueries.dermo())
  const { data: list } = useQuery(userProductQueries.list())
  const { data: todayTasks } = useQuery(taskQueries.today())
  const { data: privacy } = useQuery(privacySettingsQueries.get())

  const username = me?.username ?? null
  const recent = lastTouched(list)
  const memberSince = me?.createdAt ? formatInstant(me.createdAt, 'monthYear') : null
  const firstConcern = dermo?.skinConcerns?.[0]
  const concernLabel = firstConcern ? SKIN_CONCERN_LABELS[firstConcern] : null

  const heroSubtitle = recent
    ? repriseLine(recent)
    : 'Vos produits, vos notes et les raisons de chaque choix, au même endroit.'

  const tasksLine =
    todayTasks === undefined
      ? 'Vos gestes du jour, au calme.'
      : todayTasks.length === 0
        ? "Rien de prévu aujourd'hui. Tout est calme."
        : `${todayTasks.length} geste${todayTasks.length > 1 ? 's' : ''} prévu${todayTasks.length > 1 ? 's' : ''} aujourd'hui.`

  const cards: DoorwayItem[] = [
    {
      id: 'collection',
      icon: <Layers size={20} aria-hidden="true" />,
      title: 'Ma collection',
      line: recent
        ? `Dernier ajout : ${recent.product.brand} — ${recent.product.name}.`
        : "Aucun produit pour l'instant. Ajoutez-en un premier.",
      to: '/collection',
      cta: recent ? 'Ouvrir ma collection' : 'Ajouter un produit',
    },
    {
      id: 'products',
      icon: <Package size={20} aria-hidden="true" />,
      title: 'Explorer les produits',
      line: concernLabel
        ? `Parcourez le catalogue — des pistes autour de : ${concernLabel}.`
        : 'Parcourez le catalogue et lisez les formules calmement.',
      to: '/products',
      cta: 'Parcourir',
    },
    {
      id: 'tasks',
      icon: <ListChecks size={20} aria-hidden="true" />,
      title: 'Ma routine du jour',
      line: tasksLine,
      to: '/tasks',
      cta: 'Voir mes tâches',
    },
    {
      id: 'people',
      icon: <Users size={20} aria-hidden="true" />,
      title: 'Des gens comme vous',
      line: privacy?.discoverable
        ? 'Des personnes à la peau proche de la vôtre.'
        : 'Activez la découverte pour voir des profils proches.',
      to: '/profile',
      cta: privacy?.discoverable ? 'Découvrir' : 'Activer la découverte',
    },
  ]

  const skinReady = dermo !== undefined
  const hasSkin = Boolean(
    dermo &&
      ((dermo.skinTypes?.length ?? 0) > 0 ||
        dermo.fitzpatrickType ||
        (dermo.skinConcerns?.length ?? 0) > 0)
  )
  const isStaff = role === 'admin' || role === 'contributor'

  return (
    <>
      <HeroShell
        badge="Bon retour"
        title={
          username ? (
            <>
              Reprenons où vous en étiez, <em>{username}</em>.
            </>
          ) : (
            <>Reprenons où vous en étiez.</>
          )
        }
        subtitle={heroSubtitle}
        primary={{ label: 'Ouvrir ma collection', to: '/collection' }}
        secondary={{ label: "La philosophie d'Aurore", to: '/about' }}
        meta={memberSince ? [`Membre depuis ${memberSince}`] : undefined}
      >
        <div className="aur-hub-aside">
          <div className="aur-hub-aside__sheet" aria-hidden="true" />
          <div className="aur-hub-aside__mark">
            <AuroreBrandMark size={96} />
            <p className="aur-hub-aside__caption">Votre espace, sans bruit.</p>
          </div>
        </div>
      </HeroShell>

      <section className="aur-section">
        <Container>
          <SectionHead
            num="01"
            eyebrow="Votre peau"
            title={
              <>
                Votre portrait, <em>en un coup d'œil</em>.
              </>
            }
          />
          <div className="aur-hub-skin">
            {!skinReady ? (
              <p className="aur-hub-skin__loading">Chargement de votre portrait…</p>
            ) : hasSkin && dermo ? (
              <>
                <SkinProfileRead dermo={{ ...dermo, privateNotes: null }} />
                <p className="aur-hub-skin__note">
                  Ces repères guident la lecture des formules, jamais un diagnostic.
                </p>
                <ButtonLink variant="outline" to="/profile">
                  Voir mon profil
                </ButtonLink>
              </>
            ) : (
              <div className="aur-hub-skin__empty">
                <p className="aur-hub-skin__empty-text">
                  Renseignez votre type de peau et vos problématiques pour qu'Aurore lise les
                  formules avec votre contexte.
                </p>
                <ButtonLink variant="primary" to="/profile">
                  Compléter mon profil
                </ButtonLink>
              </div>
            )}
          </div>
        </Container>
      </section>

      <section className="aur-section aur-section--sunken">
        <Container>
          <SectionHead num="02" eyebrow="Où aller" title={<>Vos portes d'entrée.</>} />
          <DoorwayGrid cards={cards} />
          <nav className="aur-hub-links" aria-label="Raccourcis">
            <Link to="/collection/motifs">Mes motifs</Link>
            <span aria-hidden="true">·</span>
            <Link to="/collection/achats">Mes achats</Link>
            <span aria-hidden="true">·</span>
            <Link to="/products/compare">Comparer</Link>
          </nav>
        </Container>
      </section>

      <section className="aur-section">
        <Container className="aur-hub-shelf">
          <Suspense fallback={<Spinner />}>
            <ShelfPulse />
          </Suspense>
        </Container>
      </section>

      <section className="aur-section aur-section--sunken">
        <Container>
          <SectionHead
            num="03"
            eyebrow="Comprendre"
            title={
              <>
                Lire une formule, <em>sans bruit</em>.
              </>
            }
            lede="Aurore explique ce qu'un ingrédient fait — sans note, sans verdict, sans peur. Prenez le temps de comprendre, à votre rythme."
          />
          <div className="aur-hub-learn">
            <ButtonLink variant="outline" to="/ingredients">
              <FlaskConical size={16} aria-hidden="true" /> Lire les ingrédients
            </ButtonLink>
            <ButtonLink variant="outline" to="/blog">
              <BookOpen size={16} aria-hidden="true" /> Le journal Aurore
            </ButtonLink>
            <ButtonLink variant="ghost" to="/products/compare">
              <GitCompare size={16} aria-hidden="true" /> Comparer deux produits
            </ButtonLink>
          </div>
        </Container>
      </section>

      <section className="aur-section aur-hub-reorient">
        <Container>
          <AuroreBrandMark size={40} />
          <p className="aur-hub-reorient__line">
            Aurore vous aide à comprendre une formule et à retenir vos choix — jamais à vous juger.
          </p>
          <nav className="aur-hub-reorient__links" aria-label="Se repérer">
            <Link to="/about">Notre approche</Link>
            <span aria-hidden="true">·</span>
            <Link to="/profile">Mon profil</Link>
            <span aria-hidden="true">·</span>
            <Link to="/privacy">Confidentialité</Link>
            {isStaff && (
              <>
                <span aria-hidden="true">·</span>
                <Link to="/admin">Espace admin</Link>
              </>
            )}
          </nav>
        </Container>
      </section>
    </>
  )
}
