# Politique de confidentialité

Dernière mise à jour : 19 mai 2026

Cette page explique quelles données Aurore collecte, pourquoi elles sont utilisées, et comment elles sont protégées.

Aurore est une application de recherche skincare. Elle sert à garder une trace de vos produits, ingrédients, notes et décisions personnelles.

Aurore ne vend pas vos données.
Aurore n’utilise pas vos données pour de la publicité.
Aurore n’utilise pas de tracking marketing.

---

## 1. Données collectées

Aurore collecte uniquement les données nécessaires au fonctionnement de l’application.

### Compte utilisateur

Lors de la création d’un compte, Aurore peut collecter :

- votre adresse email ;
- votre identifiant Google, si vous utilisez la connexion avec Google ;
- votre mot de passe, uniquement sous forme sécurisée et chiffrée avec Argon2.

Le mot de passe original n’est jamais stocké.

### Données liées à l’utilisation de l’application

Aurore peut enregistrer :

- les produits que vous ajoutez ;
- vos notes personnelles ;
- vos tags ;
- vos états de décision, par exemple `Wishlist`, `En cours`, `Saint Graal` ou `À éviter` ;
- les informations liées à vos recherches skincare.

### Données liées au profil de peau

Si vous les remplissez, Aurore peut aussi enregistrer :

- votre type de peau ;
- votre score de Fitzpatrick ;
- vos préoccupations cutanées ;
- vos notes privées.

Ces informations peuvent être considérées comme des données sensibles liées à la santé. Elles ne sont utilisées que pour faire fonctionner les fonctionnalités skincare de l’application.

---

## 2. Pourquoi ces données sont utilisées

Vos données sont utilisées pour :

- créer et sécuriser votre compte ;
- vous connecter à l’application ;
- sauvegarder vos produits, notes et décisions ;
- vous permettre de retrouver votre historique de recherche ;
- adapter certaines informations à votre profil skincare ;
- assurer la sécurité de l’application.

Aurore ne fait pas d’analyse publicitaire, de télémétrie marketing ou de revente de données.

---

## 3. Cookies

Aurore utilise seulement des cookies nécessaires au fonctionnement de l’application.

### `refresh_token`

Ce cookie permet de maintenir votre session ouverte de manière sécurisée.

Il est configuré en `HttpOnly`, `Secure` et `SameSite=Lax`.

Il ne peut pas être lu par le code JavaScript de la page.

### `aurore_session`

Ce cookie indique simplement à l’application qu’une session existe.

Il contient seulement la valeur `1`.

Il ne contient jamais le token de connexion.

### `google_oauth_state` et `google_code_verifier`

Ces cookies sont utilisés temporairement pendant la connexion avec Google.

Ils servent à sécuriser le processus de connexion OAuth.

---

## 4. Conservation et suppression des données

Vos données sont conservées tant que votre compte existe.

Vous pouvez supprimer votre compte depuis les paramètres de l’application.

Quand vous supprimez votre compte, vos données personnelles sont supprimées de la base de données :

- profil ;
- produits ;
- notes ;
- préférences ;
- historique lié à votre compte.

Cette suppression est définitive.

Certaines données peuvent rester jusqu’à 7 jours dans les sauvegardes automatiques avant d’être supprimées définitivement.

---

## 5. Accès aux données

Vos données ne sont pas vendues et ne sont pas partagées à des fins commerciales.

Aurore est développée par une seule personne. Il n’y a pas d’accès régulier aux données des utilisateurs.

Un accès direct à la base de données peut être nécessaire uniquement dans des cas précis :

- si vous signalez un bug qui concerne votre compte ;
- si vous donnez votre accord pour vérifier une donnée liée au problème ;
- en cas d’incident urgent, par exemple une faille de sécurité, une corruption de données ou une panne bloquante.

Dans ce dernier cas, vous serez informé par email si vos données ont dû être consultées.

---

## 6. Protection technique des données

Aurore utilise plusieurs protections techniques :

- mots de passe sécurisés avec Argon2 ;
- sessions protégées par tokens ;
- cookies sécurisés ;
- validation des données envoyées à l’API ;
- séparation des rôles en base de données ;
- Row-Level Security dans PostgreSQL ;
- sauvegardes chiffrées ;
- logs limités.

Les logs de production ne contiennent pas le contenu de vos requêtes, votre email ou vos données personnelles.

Ils enregistrent seulement des informations techniques comme :

- la route appelée ;
- le code de réponse ;
- le temps de réponse.

---

## 7. Sauvegardes

Une sauvegarde complète de la base de données est générée chaque jour.

Les sauvegardes sont :

- compressées ;
- chiffrées avec une clé GPG ;
- conservées sur le serveur d’hébergement ;
- supprimées automatiquement après 7 jours.

La clé privée utilisée pour déchiffrer les sauvegardes n’est pas présente sur le serveur.

---

## 8. Services utilisés

Aurore utilise quelques services techniques nécessaires au fonctionnement de l’application.

### OVH

Hébergement du serveur, de la base de données et des sauvegardes.

Localisation : Strasbourg, France, Union européenne.

### Brevo

Envoi des emails transactionnels :

- vérification d’adresse email ;
- réinitialisation de mot de passe ;
- notifications liées au compte.

Aucun email marketing n’est envoyé.

### Google

Utilisé uniquement si vous choisissez de vous connecter avec Google.

---

## 9. Vos droits

Conformément au RGPD, vous pouvez :

- consulter vos données ;
- modifier vos données ;
- supprimer votre compte ;
- télécharger vos données ;
- retirer certaines informations de votre profil.

Vous pouvez le faire directement depuis l’application.

L’export de vos données est disponible au format JSON depuis :

`Profil → Compte → Mes données → Télécharger mes données`

Pour protéger l’infrastructure, l’export est limité à une fois toutes les 5 minutes.

Vous pouvez aussi retirer les informations dermatologiques en vidant les champs de votre profil de peau.

---

## 10. Sécurité

Aurore met en place des mesures techniques pour réduire les risques :

- accès non autorisé ;
- vol de session ;
- fuite de mot de passe ;
- accès aux données d’un autre utilisateur ;
- perte accidentelle de données.

Aucune application ne peut garantir un risque zéro, mais Aurore est conçue pour limiter les accès inutiles et protéger les données utilisateur autant que possible.
