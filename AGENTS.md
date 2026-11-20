# Instructions pour les assistants IA

VIGIE est une application web de gestion d'incidents IT (mini projet M2, équipe junior, 7 jours).
Avant d'écrire du code, lire :

- [docs/cadrage.md](docs/cadrage.md) : besoin, rôles, fonctionnalités, architecture et **décisions prises** (section 9) ;
- [CONTRIBUTING.md](CONTRIBUTING.md) : workflow, conventions de code, Definition of Done ;
- pour toute interface : [docs/design-system.md](docs/design-system.md) (quel style à quel moment) et la fiche de l'écran, à retrouver soi-même par clé Jira, route ou nom dans l'index [docs/ecrans/README.md](docs/ecrans/README.md), puis ses captures.

Chaque tâche correspond à une story Jira `VIGIE-<n>` : respecter ses **critères d'acceptation**, sans ajouter de fonctionnalité hors de la story.

## Stack

React (Vite) en **JavaScript (JSX)** dans `client/`, avec `react-router`, `lucide-react` et la police Figtree ; Node.js 22 / Express 5 et Mongoose 9 dans `server/`, MongoDB, Socket.io, JWT, bcrypt. Modules ES (`import`), workspaces npm.

## Règles à respecter

- **Organisation du serveur** : `routes/` → `controllers/` → `services/`. La logique métier va dans `services/`, sans `req` ni `res`, pour être testable seule.
- **Métier en français** : `demandeur`, `technicien`, `prioriteFinale`, `echeanceSla`, `calculerPriorite()`.
- **Valeurs autorisées** (statuts, rôles, priorités, impacts, urgences, domaines, canaux) : importer depuis `server/src/models/constantes.js`, ne jamais les réécrire.
- **Sécurité** : droits et visibilité vérifiés côté serveur sur chaque route ; identité et rôle lus dans le JWT, jamais dans le corps de la requête ; mots de passe hachés avec bcrypt et jamais renvoyés ; aucun secret dans le code (tout passe par `.env`).
- **Toute modification passe par l'API REST**, puis le serveur émet l'événement Socket.io. Le client n'émet que des événements éphémères.
- **Historique** : tout changement de statut, d'assignation, de priorité ou de domaine ajoute une entrée dans `ticket.historique`.
- **Erreurs** : `400`, `401`, `403`, `404`, `409`, au format `{ "message": "…" }`, sans détail technique. Dans un service : `throw new ErreurHttp(status, message)` (`server/src/utils/ErreurHttp.js`).
- **Authentification** : déclarer chaque nouvelle route dans `ROUTES_PROTEGEES` (`server/src/app.js`), qui ajoute automatiquement le jeton obligatoire et la lecture seule du LECTEUR ; ajouter `autoriser(...roles)` (`server/src/middlewares/auth.js`) pour restreindre à des rôles. L'utilisateur connecté est dans `req.utilisateur = { id, role }`. Ne pas réécrire ces middlewares.
- **Documentation API** : décrire chaque route ajoutée ou modifiée dans `server/docs/openapi.yaml` (OpenAPI 3, affiché sur `/api/docs`), avec ses réponses d'erreur ; recopier les valeurs autorisées de `constantes.js` à l'identique.
- **Visibilité des tickets** : toujours passer par `filtreTicketsVisibles` et `peutVoirTicket` (`server/src/services/visibiliteService.js`).
- **Notes internes** : jamais renvoyées à un `CLIENT` par l'API, jamais émises vers lui par Socket.io (room `ticket:<id>:interne`).
- **Interface** : uniquement les tokens (`var(--…)`) et les classes de `client/src/styles/` ; aucune couleur codée en dur ; libellés via `libelles.js` ; réutiliser les composants de `client/src/composants/` ; chaque écran implémente les 5 états (normal, vide, chargement en squelettes, erreur, temps réel) et reprend les textes de sa fiche.
- **Requêtes MongoDB** : suivre la section « Requêtes MongoDB » de CONTRIBUTING.md (projection et `.lean()` sur les listes, tri sur `rangPriorite`, `rangPriorite` et `dateStatut` tenus à jour, état attendu dans le filtre des mises à jour, numéro via `numeroService`).
- **Tests** : `node:test`, fichiers `*.test.js` à côté du code. Tester en priorité les règles métier (matrice de priorité, SLA en heures ouvrées, transitions de statut, prise en charge atomique, visibilité, notes internes, délai de contestation de 15 jours).
- **Style** : le code doit passer `npm run lint` et `npm run format:check`. Commentaires en français, qui expliquent le pourquoi.
- **Git** : branche `VIGIE-<n>-description`, commits préfixés `VIGIE-<n>`, pull request obligatoire (pas de push sur `main`), fusion en « Squash and merge » (un commit par story, titre de la PR = message).

## Règles métier à ne pas réinventer

Elles sont détaillées dans `docs/cadrage.md` : matrice impact × urgence (9.1), SLA en heures ouvrées avec alerte à 75 % (9.2), affichage limité des suggestions de doublons (9.3), contraintes des pièces jointes (9.4), suivi de la prise en charge et panne collective (9.8), résolution structurée et tickets homogènes (9.9), schéma conçu à partir des requêtes (9.10), décisions sur le handoff de design (9.11). Ne pas improviser une autre règle : si un point n'est pas couvert, le signaler.

Quand une maquette contredit une règle métier, la règle l'emporte : la fiche d'écran le signale par ⚠ et donne le texte à utiliser.

Code pédagogique : privilégier une solution simple et lisible par une équipe junior plutôt qu'une abstraction.
