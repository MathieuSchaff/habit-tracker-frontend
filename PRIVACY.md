# Politique de Confidentialité

Dernière mise à jour : 19 mai 2026

Cette Politique de Confidentialité décrit comment **Aurore** (l'application) collecte, utilise et protège vos données personnelles conformément au Règlement Général sur la Protection des Données (RGPD).

---

## 1. Données collectées

Nous collectons les informations suivantes pour assurer le bon fonctionnement de l'application :

### Données d'identification
*   **Email :** Utilisé pour la création de compte, la connexion et la vérification de sécurité.
*   **Identifiant Google (si applicable) :** Si vous choisissez la connexion via Google (OAuth).
*   **Mot de passe :** Stocké de manière sécurisée sous forme de condensat (hash) via Argon2.

### Données de Profil et d'Usage
*   **Profil Public :** Nom d'utilisateur, biographie, liens (visibles par les autres utilisateurs si vous le choisissez).
*   **Données d'Usage :** Vos tâches, produits utilisés, journaux de bord (logs) et tags associés.

### Données Sensibles (Dermatologiques)
*   **Profil de peau :** Type de peau, score de Fitzpatrick, préoccupations cutanées et notes privées.
*   **Note :** Ces données sont considérées comme des données de santé. Elles ne sont traitées qu'avec votre consentement explicite pour vous fournir des recommandations personnalisées.

---

## 2. Finalités du traitement

Vos données sont traitées pour les raisons suivantes :
1.  **Gestion du compte :** Authentification et sécurisation de votre accès.
2.  **Personnalisation :** Adaptation des conseils et du suivi en fonction de votre profil dermatologique.

Aucun traitement à des fins d'analyse d'usage, de télémétrie ou de publicité n'est effectué.

---

## 3. Utilisation des Cookies

L'application utilise uniquement des cookies **strictement nécessaires** au fonctionnement technique et à la sécurité. Aucun cookie de pistage publicitaire n'est utilisé.

*   `refresh_token` : Permet de maintenir votre session active de manière sécurisée (HttpOnly, Secure).
*   `google_oauth_state` / `google_code_verifier` : Utilisés temporairement lors de la connexion via Google pour prévenir les attaques de type CSRF.

---

## 4. Conservation et Suppression des données

*   **Compte actif :** Les données sont conservées tant que le compte est actif.
*   **Suppression définitive :** Lorsque vous choisissez de supprimer votre compte via les paramètres de l'application, **l'intégralité de vos données personnelles est immédiatement et définitivement effacée** de nos bases de données (profil, historique de produits, logs) via les contraintes de cascade PostgreSQL. Cette action est irréversible.

---

## 5. Accès aux données

Vos données ne sont jamais vendues ni partagées à des fins commerciales. Aurore est développée par une seule personne et aucun accès de routine n'est prévu, y compris par le développeur.

### 5.1 Cloisonnement technique

*   Le backend se connecte à la base avec un rôle PostgreSQL (`app_runtime`) soumis à des politiques **Row-Level Security**. Chaque requête applicative est restreinte au propriétaire de la donnée : même une faille dans le code ne permet pas de lire les données d'un autre utilisateur.
*   Un rôle administrateur distinct existe pour les migrations et la maintenance — il n'est jamais utilisé pour servir des requêtes utilisateur.

### 5.2 Accès du développeur aux données brutes

L'accès direct à la base (qui contourne RLS) est possible techniquement. Il est encadré par les règles suivantes :

*   **Sur signalement d'un bug vous concernant** — je vous demande votre accord explicite (par email) avant de consulter la ligne concernée.
*   **En cas d'incident urgent sans signalement** (corruption de données, faille de sécurité, indisponibilité bloquante) — je peux accéder aux données pour diagnostiquer et corriger. **Vous êtes alors prévenu·e par email** avec : la date, la raison de l'accès, les données consultées et ce qui a été fait.
*   **Jamais** pour de la curiosité, de l'analyse d'usage ou de la veille produit.

### 5.3 Journaux applicatifs (logs)

Les logs de production enregistrent uniquement : méthode HTTP, chemin de la route, code de statut, temps de réponse. **Aucun contenu de requête, email ou identifiant personnel n'est écrit dans les logs.** En cas d'erreur, la pile d'exécution est enregistrée avec le chemin de la route uniquement.

### 5.4 Sauvegardes

*   Une sauvegarde complète de la base est générée quotidiennement (compressée, puis chiffrée par clé GPG asymétrique) et stockée sur le serveur d'hébergement. La clé privée n'est jamais présente sur le serveur : même un accès non autorisé au VPS ne permet pas de déchiffrer les sauvegardes.
*   Les sauvegardes de plus de 7 jours sont automatiquement supprimées.
*   Lors d'une suppression de compte, vos données peuvent subsister jusqu'à 7 jours dans les sauvegardes avant disparition définitive.

### 5.5 Sous-traitants techniques

*   **Hostinger** (VPS, Francfort, UE) — stockage de la base de données et des sauvegardes.
*   **Brevo** (entreprise française, UE) — envoi des emails transactionnels (vérification d'email, réinitialisation de mot de passe). Seuls votre adresse email et le contenu du message transitent par ce service. Aucun email marketing.
*   **Google** — uniquement si vous choisissez la connexion via Google OAuth.

---

## 6. Vos Droits (RGPD) et Autonomie

Conformément au RGPD, vous disposez d'un contrôle total sur vos données directement depuis l'interface de l'application, sans avoir à nous contacter :

*   **Droit d'accès et de rectification :** Vous pouvez consulter et modifier toutes vos informations personnelles (email, profil, préférences) directement dans vos paramètres.
*   **Droit à l'effacement :** Vous pouvez déclencher la suppression totale de votre compte et de vos données à tout moment via le bouton "Supprimer mon compte".
*   **Droit à la portabilité :** Vous pouvez télécharger l'intégralité de vos données au format JSON depuis **Profil → Compte → Mes données → « Télécharger mes données »**. L'export est limité à une fois toutes les 5 minutes pour protéger l'infrastructure.
*   **Droit d'opposition :** Vous pouvez retirer votre consentement au traitement des données dermatologiques en vidant les champs de votre profil de peau depuis les paramètres.

---

## 7. Sécurité

Nous mettons en œuvre des mesures techniques et organisationnelles (chiffrement, tokens JWT, cookies sécurisés) pour protéger vos données contre tout accès non autorisé ou perte accidentelle.
