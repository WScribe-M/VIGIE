# Instructions pour les assistants IA

VIGIE est une application web de gestion d'incidents IT (mini projet M2, équipe junior, 7 jours).
Avant d'écrire du code, lire :

- [docs/cadrage.md](docs/cadrage.md) : besoin, rôles, fonctionnalités, architecture et **décisions prises** (section 9) ;
- [CONTRIBUTING.md](CONTRIBUTING.md) : workflow, conventions de code, Definition of Done.

Chaque tâche correspond à une story Jira `VIGIE-<n>` : respecter ses **critères d'acceptation**, sans ajouter de fonctionnalité hors de la story.

## Stack

React (Vite) dans `client/`, Node.js 22 / Express 5 et Mongoose 9 dans `server/`, MongoDB, Socket.io, JWT, bcrypt. Modules ES (`import`), workspaces npm.

## Règles à respecter

- **Organisation du serveur** : `routes/` → `controllers/` → `services/`. La logique métier va dans `services/`, sans `req` ni `res`, pour être testable seule.
- **Métier en français** : `demandeur`, `technicien`, `prioriteFinale`, `echeanceSla`, `calculerPriorite()`.
- **Valeurs autorisées** (statuts, rôles, priorités, impacts, urgences, domaines, canaux) : importer depuis `server/src/models/constantes.js`, ne jamais les réécrire.
- **Sécurité** : droits et visibilité vérifiés côté serveur sur chaque route ; identité et rôle lus dans le JWT, jamais dans le corps de la requête ; mots de passe hachés avec bcrypt et jamais renvoyés ; aucun secret dans le code (tout passe par `.env`).
- **Toute modification passe par l'API REST**, puis le serveur émet l'événement Socket.io. Le client n'émet que des événements éphémères.
- **Historique** : tout changement de statut, d'assignation, de priorité ou de domaine ajoute une entrée dans `ticket.historique`.
- **Erreurs** : `400`, `401`, `403`, `404`, `409`, au format `{ "message": "…" }`, sans détail technique.
- **Tests** : `node:test`, fichiers `*.test.js` à côté du code. Tester en priorité les règles métier (matrice de priorité, SLA en heures ouvrées, transitions de statut, prise en charge atomique, visibilité).
- **Style** : le code doit passer `npm run lint` et `npm run format:check`. Commentaires en français, qui expliquent le pourquoi.
- **Git** : branche `VIGIE-<n>-description`, commits préfixés `VIGIE-<n>`, pull request obligatoire (pas de push sur `main`).

## Règles métier à ne pas réinventer

Elles sont détaillées dans `docs/cadrage.md` : matrice impact × urgence (9.1), SLA en heures ouvrées avec alerte à 75 % (9.2), affichage limité des suggestions de doublons (9.3), contraintes des pièces jointes (9.4), suivi de la prise en charge et panne collective (9.8). Ne pas improviser une autre règle : si un point n'est pas couvert, le signaler.

Code pédagogique : privilégier une solution simple et lisible par une équipe junior plutôt qu'une abstraction.
