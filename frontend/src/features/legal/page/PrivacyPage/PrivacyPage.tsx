import { Link } from '@tanstack/react-router'

import { DetailPageLayout } from '@/component/Layout/PageLayout/DetailPageLayout'
import { PageTitle } from '@/component/Typography/PageTitle/PageTitle'
import { SectionHeader } from '@/component/Typography/SectionHeader/SectionHeader'
import { ExternalLink } from '../../components/ExternalLink/ExternalLink'
import { PrivacyBlock } from '../../components/PrivacyBlock/PrivacyBlock'
import { PrivacyList } from '../../components/PrivacyList/PrivacyList'
import { PrivacySummaryCard } from '../../components/PrivacySummaryCard/PrivacySummaryCard'
import './PrivacyPage.css'

export function PrivacyPage() {
  return (
    <DetailPageLayout contentClassName="privacy-page__inner">
      <header className="privacy-header">
        <PageTitle
          title="Politique de confidentialité"
          subtitle="Aurore — Dernière mise à jour : 19 mai 2026"
        />
      </header>

      <section className="privacy-summary">
        <SectionHeader as="h2" variant="primary" title="En clair" />
        <p className="privacy-summary__intro">
          Votre vie privée compte. Voici l'essentiel en quelques lignes — la version juridique
          complète est disponible plus bas.
        </p>

        <div className="privacy-summary__grid">
          <PrivacySummaryCard icon="🔑" title="Compte">
            Email, pseudo, avatar — le minimum pour que votre espace existe. Base légale : exécution
            du contrat.
          </PrivacySummaryCard>

          <PrivacySummaryCard icon="📋" title="Vos données d'usage">
            Produits, tâches, profil de peau — c'est le cœur du service que vous avez demandé. Rien
            n'est partagé.
          </PrivacySummaryCard>

          <PrivacySummaryCard icon="🔒" title="Cloisonnement par utilisateur">
            PostgreSQL Row-Level Security : même en cas de faille applicative, vos données restent
            isolées des autres comptes au niveau de la base.
          </PrivacySummaryCard>

          <PrivacySummaryCard
            icon="🇪🇺"
            title={
              <>
                Tout reste en Europe <span aria-hidden="true">🇪🇺</span>
              </>
            }
          >
            Serveur Hostinger (Francfort, UE), emails transactionnels via Brevo (France). Aucune
            donnée ne quitte l'UE.
          </PrivacySummaryCard>

          <PrivacySummaryCard icon="🗑️" title="Suppression totale">
            Vous pouvez effacer l'intégralité de votre compte et de vos données à tout moment depuis
            votre profil.
          </PrivacySummaryCard>

          <PrivacySummaryCard icon="🚫" title="Ni pub, ni tracking">
            Aucune donnée publicitaire, aucun tracking comportemental, aucune revente à des tiers.
            Jamais.
          </PrivacySummaryCard>
        </div>
      </section>

      <details className="privacy-legal">
        <summary className="privacy-legal__trigger">Version juridique complète (RGPD)</summary>

        <div className="privacy-legal__content">
          <PrivacyBlock title="Qui sommes-nous ?">
            <p>
              Aurore est un outil personnel de suivi des soins cosmétiques, conçu pour les profils
              TDAH. Il est développé et exploité par <strong>Mathieu Schaff</strong>, responsable de
              traitement.
            </p>
            <p>
              Contact :{' '}
              <a href="mailto:contact@mathieu-schaff.eu" className="privacy-link">
                contact@mathieu-schaff.eu
              </a>
            </p>
          </PrivacyBlock>

          <PrivacyBlock title="Données collectées">
            <PrivacyList
              items={[
                {
                  label: 'Compte :',
                  body: (
                    <>
                      adresse email, nom d'utilisateur. Mot de passe stocké sous forme de condensat
                      (hachage Argon2, jamais en clair).
                    </>
                  ),
                },
                {
                  label: 'Usage :',
                  body: 'produits cosmétiques, tâches, notes personnelles, profil de peau.',
                },
                {
                  label: 'Connexion :',
                  body: 'tokens de session (cookies HttpOnly, Secure).',
                },
                {
                  label: 'Logs techniques :',
                  body: (
                    <>
                      méthode HTTP, chemin de la route, code de statut, temps de réponse.{' '}
                      <strong>
                        Aucun contenu de requête, email ou identifiant personnel n'est enregistré
                        dans les logs.
                      </strong>
                    </>
                  ),
                },
              ]}
            />
            <p>Nous ne collectons aucune donnée publicitaire ni de tracking comportemental.</p>
          </PrivacyBlock>

          <PrivacyBlock title="Bases légales du traitement">
            <p>
              Conformément à l'
              <ExternalLink href="https://gdpr-info.eu/art-6-gdpr/">article 6 du RGPD</ExternalLink>
              , chaque traitement de données personnelles doit reposer sur une base légale. Voici
              celles que nous appliquons :
            </p>
            <PrivacyList
              items={[
                {
                  label: 'Données de compte (email, username, avatar) :',
                  body: 'exécution du contrat (Art. 6(1)(b)) — nécessaires pour créer et gérer votre compte.',
                },
                {
                  label: "Données d'usage (produits, tâches, profil de peau) :",
                  body: 'exécution du contrat (Art. 6(1)(b)) — constituent le service que vous avez demandé.',
                },
                {
                  label: 'Emails de confirmation :',
                  body: 'exécution du contrat (Art. 6(1)(b)) — nécessaires pour vérifier votre adresse email.',
                },
                {
                  label: 'Logs techniques :',
                  body: 'intérêt légitime (Art. 6(1)(f)) — sécurité et stabilité du service. Les logs enregistrent uniquement des méta-données de requête (méthode, chemin, statut, durée) et ne contiennent aucune donnée personnelle.',
                },
              ]}
            />
            <p className="privacy-note">
              Le RGPD (Règlement Général sur la Protection des Données) est en vigueur depuis mai
              2018 dans toute l'Union européenne. Il garantit que vos données personnelles sont
              traitées de manière transparente, pour des finalités précises, et avec votre accord
              lorsque c'est nécessaire.
            </p>
          </PrivacyBlock>

          <PrivacyBlock title="Hébergement et partenaires">
            <p>
              Toutes vos données sont hébergées <strong>en Europe</strong>. Aucune donnée ne quitte
              l'Union européenne sans votre consentement explicite.
            </p>
            <PrivacyList
              items={[
                {
                  label: 'Serveur principal :',
                  body: 'VPS Hostinger (entreprise lituanienne, UE), datacenter de Francfort, Allemagne.',
                },
                {
                  label: 'Emails de confirmation :',
                  body: 'Brevo (anciennement Sendinblue), entreprise française. Seuls les emails de confirmation de compte et de réinitialisation de mot de passe sont envoyés — aucun email marketing.',
                },
                {
                  label: 'Google OAuth :',
                  body: "uniquement si vous choisissez la connexion via Google. Dans ce cas, Google reçoit votre demande d'authentification.",
                },
              ]}
            />
          </PrivacyBlock>

          <PrivacyBlock title="Cloisonnement et accès aux données">
            <p>
              Aurore est développée par une seule personne. Aucun accès de routine aux données
              utilisateur n'est prévu, y compris par le développeur.
            </p>
            <PrivacyList
              items={[
                {
                  label: 'Row-Level Security (PostgreSQL) :',
                  body: "le backend se connecte à la base avec un rôle restreint, soumis à des politiques de cloisonnement par utilisateur. Chaque requête est limitée au propriétaire de la donnée — une faille applicative ne permet pas de lire les données d'un autre compte.",
                },
                {
                  label: "Sur signalement d'un bug :",
                  body: 'si vous signalez un problème, votre accord explicite est demandé par email avant que je consulte votre ligne.',
                },
                {
                  label: "En cas d'incident technique urgent",
                  body: '(corruption, faille de sécurité, indisponibilité bloquante) : un accès administrateur reste possible pour diagnostiquer et corriger. Vous en êtes alors informé·e par email (date, raison, données consultées, action effectuée).',
                },
                {
                  label: 'Jamais',
                  body: "pour de la curiosité, de l'analyse d'usage ou de la veille produit.",
                },
              ]}
            />
          </PrivacyBlock>

          <PrivacyBlock title="Sauvegardes">
            <p>
              Une sauvegarde compressée de la base est générée quotidiennement et stockée sur le
              serveur d'hébergement, derrière les protections d'accès du VPS. Les sauvegardes de
              plus de 7 jours sont supprimées automatiquement. Lors d'une suppression de compte, vos
              données peuvent subsister jusqu'à 7 jours dans les sauvegardes avant disparition
              définitive.
            </p>
          </PrivacyBlock>

          <PrivacyBlock title="Durée de conservation">
            <p>
              Vos données sont conservées tant que votre compte est actif. À la suppression de votre
              compte, l'ensemble de vos données personnelles est définitivement supprimé de nos
              serveurs.
            </p>
          </PrivacyBlock>

          <PrivacyBlock title="Vos droits">
            <p>Conformément au RGPD, vous disposez des droits suivants :</p>
            <PrivacyList
              items={[
                {
                  label: 'Accès et rectification :',
                  body: 'consultez et modifiez vos informations depuis votre profil.',
                },
                {
                  label: 'Suppression :',
                  body: (
                    <>
                      supprimez intégralement votre compte et vos données depuis{' '}
                      <Link to="/profile" className="privacy-link">
                        Profil → Compte → Supprimer mon compte
                      </Link>
                      .
                    </>
                  ),
                },
                {
                  label: 'Portabilité :',
                  body: (
                    <>
                      téléchargez un export JSON complet de vos données depuis{' '}
                      <Link to="/profile" className="privacy-link">
                        Profil → Compte → Mes données
                      </Link>
                      .
                    </>
                  ),
                },
                {
                  label: 'Opposition :',
                  body: 'vous pouvez retirer votre consentement au traitement des données dermatologiques en vidant les champs de votre profil de peau depuis les paramètres.',
                },
              ]}
            />
          </PrivacyBlock>

          <PrivacyBlock title="Contact">
            <p>
              Pour toute question relative à vos données personnelles :{' '}
              <a href="mailto:contact@mathieu-schaff.eu" className="privacy-link">
                contact@mathieu-schaff.eu
              </a>
            </p>
          </PrivacyBlock>

          <PrivacyBlock title="Pour aller plus loin">
            <p>Sources officielles sur la protection des données personnelles :</p>
            <ul className="privacy-list">
              <li>
                <ExternalLink href="https://www.cnil.fr/fr/reglement-europeen-protection-donnees">
                  CNIL — Le règlement européen en 10 points
                </ExternalLink>{' '}
                — une introduction claire au RGPD par l'autorité française de protection des
                données.
              </li>
              <li>
                <ExternalLink href="https://www.cnil.fr/fr/reglement-europeen-protection-donnees/chapitre2">
                  CNIL — Chapitre II : Principes
                </ExternalLink>{' '}
                — les principes fondamentaux encadrant tout traitement de données.
              </li>
              <li>
                <ExternalLink href="https://gdpr-info.eu/art-6-gdpr/">
                  Article 6 RGPD — Licéité du traitement
                </ExternalLink>{' '}
                — le texte complet de l'article définissant les bases légales.
              </li>
              <li>
                <ExternalLink href="https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32016R0679">
                  Texte officiel du RGPD (EUR-Lex, version française)
                </ExternalLink>{' '}
                — le règlement complet publié au Journal officiel de l'UE.
              </li>
            </ul>
          </PrivacyBlock>
        </div>
      </details>
    </DetailPageLayout>
  )
}
