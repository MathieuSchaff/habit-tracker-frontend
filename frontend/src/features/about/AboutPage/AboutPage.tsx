import {
  ArrowRight,
  BookOpen,
  Droplet,
  FlaskConical,
  Heart,
  MessageCircle,
  Scale,
  Sparkles,
} from 'lucide-react'
import type { ReactNode } from 'react'

import { ButtonLink } from '../../../component/Button/Button'
import './AboutPage.css'

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="aur-about__eyebrow">{children}</p>
}

function SectionHeader({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string
  title: ReactNode
  sub?: ReactNode
}) {
  return (
    <header className="aur-about-section__header">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="aur-about-section__title">{title}</h2>
      {sub ? <p className="aur-about-section__sub">{sub}</p> : null}
    </header>
  )
}

function AboutHero() {
  return (
    <section className="aur-about-hero" aria-labelledby="aur-about-hero-title">
      <div className="aur-about-hero__content">
        <Eyebrow>À propos d’Aurore</Eyebrow>

        <h1 className="aur-about-hero__title" id="aur-about-hero-title">
          Un endroit clair pour garder le fil de <em>ses décisions skincare.</em>
        </h1>

        <p className="aur-about-hero__lede">
          Aurore est né d’un problème très simple&nbsp;: trop d’informations dispersées. Des onglets
          ouverts, des listes INCI copiées dans des fichiers Markdown oubliés, des analyses IA
          perdues entre deux sessions. Aurore les relie à des produits et conserve les raisons
          derrière chaque choix.
        </p>

        <div className="aur-about-hero__signature">
          <span className="aur-about-hero__signature-rule" aria-hidden="true" />
          <span>Note d’intention · projet indépendant</span>
        </div>

        <div className="aur-about-hero__actions">
          <ButtonLink to="/products" size="md" variant="primary">
            Voir les produits
            <ArrowRight size={16} />
          </ButtonLink>
          <ButtonLink to="/collection" size="md" variant="outline">
            Ouvrir ma collection
          </ButtonLink>
        </div>
      </div>

      <div className="aur-about-hero__visual" aria-hidden="true">
        <article className="aur-about-note aur-about-note--ingredient">
          <span className="aur-about-note__kicker">Note formule · à suivre</span>
          <h3 className="aur-about-note__title">Niacinamide</h3>
          <p className="aur-about-note__body">
            Souvent utilisée pour l’hydratation et l’uniformité du teint.
          </p>
          <div className="aur-about-note__tags">
            <span className="aur-about-note__tag">hydratation</span>
            <span className="aur-about-note__tag">barrière</span>
            <span className="aur-about-note__tag">à contextualiser</span>
          </div>
        </article>

        <article className="aur-about-note aur-about-note--routine">
          <span className="aur-about-note__kicker">Décision · wishlist</span>
          <h3 className="aur-about-note__title">Sérum hydratant — A.</h3>
          <p className="aur-about-note__body">
            “Texture légère, fini propre. À comparer avant achat final.”
          </p>
        </article>

        <article className="aur-about-note aur-about-note--markdown">
          <span className="aur-about-note__kicker"># mes-notes</span>
          <p className="aur-about-note__body">
            {`- crème jour ok\n- vérifier alcool denat dans le tonique\n- comparer 2 sérums avant lundi`}
          </p>
        </article>
      </div>
    </section>
  )
}

function AboutStory() {
  return (
    <section className="aur-about-section" aria-labelledby="aur-about-story-title">
      <SectionHeader
        eyebrow="L’histoire"
        title={
          <span id="aur-about-story-title">
            Trop d’onglets, trop de notes, et l’impression de tout recommencer.
          </span>
        }
        sub="Aurore n’est pas un projet de start-up. C’est un outil que j’ai fini par construire parce que je n’en trouvais pas qui me convienne."
      />

      <div className="aur-about-story">
        <div className="aur-about-story__col">
          <p>
            Pendant des mois, j’ai sauté d’un site de marque à un autre. Je copiais les listes INCI
            dans des fichiers Markdown que j’oubliais le lendemain. Je collais des compositions dans
            des outils IA pour avoir un avis, puis je perdais ces analyses entre deux sessions.
          </p>
          <p>
            Mes notes étaient éparpillées, mes produits à moitié testés, mes ingrédients déjà
            recherchés <strong>dix fois</strong>. Je relisais des avis contradictoires sans pouvoir
            les remettre en contexte. Rien n’était centralisé.
          </p>
        </div>

        <div className="aur-about-story__col">
          <blockquote className="aur-about-story__pull">
            J’avais besoin d’un endroit pour&nbsp;: garder une trace, comprendre les formules,
            retrouver un produit, comparer plus facilement&nbsp;— et que ça reste à moi.
          </blockquote>
          <p style={{ marginTop: 'var(--space-6)' }}>
            Aurore est née de ce constat très simple. Pas pour vendre. Pas pour pousser à acheter.
            Pour <strong>tenir un fil</strong> entre ce qu’on a déjà compris et ce qu’on cherche
            encore.
          </p>
        </div>
      </div>
    </section>
  )
}

function AboutPain() {
  const items = [
    {
      head: 'Trop d’onglets, jamais le bon.',
      sub: 'On rouvre la même fiche produit pour la quatrième fois.',
    },
    {
      head: 'Des avis contradictoires.',
      sub: 'Et aucun moyen de les ranger à côté de la composition.',
    },
    {
      head: 'Des produits qui se ressemblent.',
      sub: 'Trois sérums, trois INCI, et toujours la même question : lequel ?',
    },
    {
      head: 'Du jargon INCI.',
      sub: 'On finit par sauter les passages qu’on ne comprend pas.',
    },
    {
      head: 'Pas de mémoire personnelle.',
      sub: 'Aucun historique de ce qu’on a déjà testé, aimé, abandonné.',
    },
    {
      head: 'Comparer reste pénible.',
      sub: 'Deux fenêtres côte à côte, et l’œil qui zigzague.',
    },
  ]

  return (
    <section className="aur-about-section" aria-labelledby="aur-about-pain-title">
      <SectionHeader
        eyebrow="Ce qu’Aurore veut résoudre"
        title={<span id="aur-about-pain-title">La charge mentale, pas le marketing.</span>}
        sub="Aurore part des frictions concrètes de la recherche produit et aide à ne plus perdre le raisonnement qui mène à une décision."
      />

      <div className="aur-about-pain">
        <div className="aur-about-pain__visual" aria-hidden="true">
          <div className="aur-about-pain__tab aur-about-pain__tab--1">niacinamide-uses.html</div>
          <div className="aur-about-pain__tab aur-about-pain__tab--2">marqueA-serum-hydra…</div>
          <div className="aur-about-pain__tab aur-about-pain__tab--3">inci-decoder.org</div>
          <div className="aur-about-pain__tab aur-about-pain__tab--4">reddit /skincareaddi…</div>
          <div className="aur-about-pain__tab aur-about-pain__tab--5">test-tonique-marqueB</div>
          <div className="aur-about-pain__tab aur-about-pain__tab--6">comparatif-cremes.md</div>
          <div className="aur-about-pain__tab aur-about-pain__tab--7">inci de la crème jour</div>
          <div className="aur-about-pain__tab aur-about-pain__tab--8">chat — analyse formule</div>
          <div className="aur-about-pain__tab aur-about-pain__tab--9">avis sérum vit. C</div>
          <div className="aur-about-pain__sticky">
            ⚠ vérifier alcool denat dans le tonique B avant lundi
          </div>
        </div>

        <ol role="list" className="aur-about-pain__list">
          {items.map((item, i) => (
            <li className="aur-about-pain__item" key={item.head}>
              <span className="aur-about-pain__num">{String(i + 1).padStart(2, '0')}</span>
              <div className="aur-about-pain__text">
                {item.head}
                <small>{item.sub}</small>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

const enables = [
  {
    icon: <Heart size={16} strokeWidth={1.75} />,
    title: 'Garder vos candidats produit',
    desc: 'Wishlist · En cours · Saint Graal · À éviter. Les états sont explicites et retrouvables.',
  },
  {
    icon: <BookOpen size={16} strokeWidth={1.75} />,
    title: 'Retrouver vos notes',
    desc: 'Ressentis, contexte d’usage et raisons de décision — rangés à côté du produit.',
  },
  {
    icon: <Droplet size={16} strokeWidth={1.75} />,
    title: 'Lire les formules sans bruit',
    desc: 'Les ingrédients servent à expliquer un produit candidat, pas à imposer un verdict.',
  },
  {
    icon: <Scale size={16} strokeWidth={1.75} />,
    title: 'Comparer pour trancher',
    desc: 'Mettre deux candidats côte à côte, puis documenter ce qui fait pencher la décision.',
  },
  {
    icon: <Sparkles size={16} strokeWidth={1.75} />,
    title: 'Filtrer selon vos contraintes',
    desc: 'Objectifs et sensibilités personnels, pour décider selon votre contexte, pas une moyenne marketing.',
  },
  {
    icon: <MessageCircle size={16} strokeWidth={1.75} />,
    title: 'Partager des retours utiles',
    desc: 'Discussions et articles centrés sur des décisions produit explicites, pas du bruit social.',
  },
]

function AboutEnables() {
  return (
    <section className="aur-about-section" aria-labelledby="aur-about-enables-title">
      <SectionHeader
        eyebrow="Ce qu’Aurore vous permet"
        title={
          <span id="aur-about-enables-title">Une mémoire de décision, produit par produit.</span>
        }
        sub="Six gestes simples qui remplacent les onglets éparpillés et évitent de refaire la même recherche."
      />

      <div className="aur-about-enables">
        {enables.map((cell) => (
          <article className="aur-about-enables__cell" key={cell.title}>
            <span className="aur-about-enables__icon" aria-hidden="true">
              {cell.icon}
            </span>
            <h3 className="aur-about-enables__title">{cell.title}</h3>
            <p className="aur-about-enables__desc">{cell.desc}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

const principles = [
  {
    title: 'De l’information, pas du marketing.',
    desc: 'Les ingrédients en clair, sans habillage de marque. Vous voyez ce qu’il y a dans le flacon, pas ce qu’on veut vous faire croire.',
  },
  {
    title: 'Comprendre avant d’acheter.',
    desc: 'Aurore ne pousse pas à consommer plus. L’outil aide à choisir — ou à ne pas choisir, ce qui est tout aussi valide.',
  },
  {
    title: 'Une chose à la fois.',
    desc: 'Pas de tableau de bord saturé. Une fiche, une question, une réponse. Le reste attend que vous soyez prêt·e.',
  },
  {
    title: 'Aucune recommandation sponsorisée.',
    desc: 'Aucune marque ne paie pour apparaître. Aucun lien d’affiliation déguisé. Le classement reflète vos critères, pas un partenariat.',
  },
  {
    title: 'Aucune promesse médicale.',
    desc: 'Aurore n’est pas un dermatologue. L’outil informe sur les formules, il ne diagnostique rien et ne remplace aucun avis professionnel.',
  },
  {
    title: 'Vos données restent à vous.',
    desc: 'Vos produits, vos notes, votre profil — vous pouvez les exporter et tout supprimer. Rien ne part vers un annonceur.',
  },
  {
    title: 'Réduire la charge mentale.',
    desc: 'L’outil est pensé pour les cerveaux qui se perdent vite. Lecture aérée, navigation prévisible, peu de bruit.',
  },
]

function AboutPrinciples() {
  return (
    <section className="aur-about-section" aria-labelledby="aur-about-principles-title">
      <SectionHeader
        eyebrow="Les principes du projet"
        title={
          <span id="aur-about-principles-title">
            Sept lignes directrices, qu’on respecte ou qu’on retire.
          </span>
        }
        sub="Pas une charte affichée pour rassurer — un cadre concret, qu’on peut vérifier dans l’interface."
      />

      <ol role="list" className="aur-about-principles">
        {principles.map((p) => (
          <li className="aur-about-principle" key={p.title}>
            <div>
              <h3 className="aur-about-principle__title">{p.title}</h3>
              <p className="aur-about-principle__desc">{p.desc}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

const notList: { head: string; sub: string }[] = [
  {
    head: 'Une application médicale.',
    sub: 'Aucun diagnostic, aucune ordonnance, aucune promesse de résultat.',
  },
  {
    head: 'Un outil de diagnostic dermatologique.',
    sub: 'Les avis d’un·e professionnel·le restent irremplaçables.',
  },
  {
    head: 'Une marketplace.',
    sub: 'On ne vend rien. On ne prend aucune commission.',
  },
  {
    head: 'Une plateforme d’affiliation déguisée.',
    sub: 'Aucun lien sponsorisé, ni dans les fiches, ni dans les articles.',
  },
  {
    head: 'Une appli qui pousse à acheter plus.',
    sub: 'Pas de notification “votre prochain produit”, pas de scoring qui culpabilise.',
  },
  {
    head: 'Un réseau social bruyant.',
    sub: 'Les discussions existent — mais elles servent les fiches, pas le temps d’écran.',
  },
  {
    head: 'Une app à badges et à streaks.',
    sub: 'La skincare n’est pas un jeu, et oublier une routine n’est pas un échec.',
  },
]

function AboutNot() {
  return (
    <section className="aur-about-not" aria-labelledby="aur-about-not-title">
      <h2 className="aur-about-not__title" id="aur-about-not-title">
        Ce qu’Aurore <em>n’est pas.</em>
      </h2>
      <ul role="list" className="aur-about-not__list">
        {notList.map((it) => (
          <li className="aur-about-not__item" key={it.head}>
            <span className="aur-about-not__cross" aria-hidden="true">
              ✕
            </span>
            <span>
              <strong>{it.head}</strong>
              <br />
              {it.sub}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function AboutCollab() {
  return (
    <section className="aur-about-section" aria-labelledby="aur-about-collab-title">
      <SectionHeader
        eyebrow="La dimension collaborative"
        title={
          <span id="aur-about-collab-title">Une base sérieuse, écrite à plusieurs mains.</span>
        }
      />

      <div className="aur-about-collab">
        <div className="aur-about-collab__body">
          <p>
            Une fiche d’ingrédient devient meilleure quand plusieurs personnes l’ont relue. Une
            fiche produit gagne à être corrigée quand un INCI change. Un article tient mieux quand
            il s’appuie sur des retours réels.
          </p>
          <p>
            Aurore est conçu pour cela&nbsp;: laisser la communauté enrichir les fiches, partager
            des analyses, signaler des erreurs — sans jamais transformer ça en jeu de réputation.
          </p>

          <ul role="list" className="aur-about-collab__list">
            <li>Fiches d’ingrédient</li>
            <li>Fiches produit</li>
            <li>Articles longs</li>
            <li>Avis contextualisés</li>
            <li>Discussions</li>
            <li>Retours d’expérience</li>
            <li>Corrections d’INCI</li>
            <li>Améliorations continues</li>
          </ul>
        </div>

        <article className="aur-about-inci" aria-label="Aperçu d’une fiche ingrédient">
          <div className="aur-about-inci__header">
            <div>
              <h3 className="aur-about-inci__name">Bakuchiol</h3>
              <span className="aur-about-inci__inci-name">Psoralea Corylifolia Seed Extract</span>
            </div>
            <span className="aur-about-inci__badge">À contextualiser</span>
          </div>
          <div className="aur-about-inci__rows">
            <div className="aur-about-inci__row">
              <span className="aur-about-inci__label">Famille</span>
              <span className="aur-about-inci__value">Actif végétal</span>
            </div>
            <div className="aur-about-inci__row">
              <span className="aur-about-inci__label">Fonctions</span>
              <div className="aur-about-inci__tags">
                <span className="aur-about-note__tag">anti-âge</span>
                <span className="aur-about-note__tag">antioxydant</span>
                <span className="aur-about-note__tag">apaisant</span>
              </div>
            </div>
            <div className="aur-about-inci__row">
              <span className="aur-about-inci__label">Profil</span>
              <span className="aur-about-inci__value">
                Utilisé par certaines personnes comme alternative au rétinol. À adapter selon
                tolérance personnelle et reste de la formule.
              </span>
            </div>
            <div className="aur-about-inci__row">
              <span className="aur-about-inci__label">À noter</span>
              <span className="aur-about-inci__value">
                Stabilité correcte à la lumière. Vérifier la concentration dans la formule finale.
              </span>
            </div>
          </div>
        </article>
      </div>
    </section>
  )
}

function AboutCta() {
  return (
    <section className="aur-about-cta" aria-labelledby="aur-about-cta-title">
      <Eyebrow>Commencer</Eyebrow>
      <h2 className="aur-about-cta__title" id="aur-about-cta-title">
        Reprendre le fil, <em>une fiche à la fois.</em>
      </h2>
      <p className="aur-about-cta__sub">
        Pas besoin de tout faire d’un coup. Ajoutez un produit, choisissez un état (Wishlist · En
        cours · Saint Graal · À éviter), notez pourquoi. Le reste suivra.
      </p>
      <div className="aur-about-cta__actions">
        <ButtonLink to="/collection" size="lg" variant="primary">
          Commencer ma collection
          <ArrowRight size={16} />
        </ButtonLink>
        <ButtonLink to="/products" size="lg" variant="outline">
          Parcourir les produits
        </ButtonLink>
        <ButtonLink to="/ingredients" size="lg" variant="ghost">
          <FlaskConical size={16} />
          Explorer les ingrédients
        </ButtonLink>
      </div>
    </section>
  )
}

export function AboutPage() {
  return (
    <main className="aur-about">
      <div className="aur-about__inner">
        <AboutHero />
        <AboutStory />
        <AboutPain />
        <AboutEnables />
        <AboutPrinciples />
        <AboutNot />
        <AboutCollab />
        <AboutCta />
      </div>
    </main>
  )
}
