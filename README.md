# VIGIE

Application web de gestion d'incidents IT : déclaration, qualification, suivi et pilotage des incidents de bout en bout, avec des échanges et des alertes en temps réel.

Mini projet M2 — LaManu.

## Stack

- **Front** : React.js
- **API** : Node.js / Express (REST)
- **Base de données** : MongoDB via Mongoose
- **Temps réel** : Socket.io
- **Authentification** : JWT, mots de passe hachés avec bcrypt

## Installation

Prérequis : **Node.js 22** ou plus, et **MongoDB** (installé en local, ou via Docker avec `npm run db`).

```bash
npm install          # installe le client et le serveur (workspaces npm)
cp .env.example .env # puis renseigner les valeurs, en particulier JWT_SECRET
npm run db           # optionnel : lance MongoDB dans Docker
npm run dev          # lance l'API (port 3000) et le client (port 5173)
```

Ouvrir http://localhost:5173 : la page affiche l'état de l'API et de la base de données.

Données de démonstration : `npm run seed` (à venir, VIGIE-23).

### Scripts

| Commande         | Rôle                                                          |
| ---------------- | ------------------------------------------------------------- |
| `npm run dev`    | API et client en mode développement, rechargement automatique |
| `npm run db`     | MongoDB dans Docker (`docker-compose.yml`)                    |
| `npm run build`  | build de production du client                                 |
| `npm start`      | démarre l'API                                                 |
| `npm run lint`   | ESLint sur tout le projet                                     |
| `npm run format` | formate le code avec Prettier                                 |

## Structure

```
client/              React (Vite) — appels /api relayés vers l'API en développement
server/
  src/config/        variables d'environnement et connexion MongoDB
  src/models/        modèles Mongoose : User, Service, Ticket, Notification
  src/app.js         application Express (routes, erreurs)
  src/index.js       démarrage : connexion à la base puis écoute
```

## Organisation du travail

Backlog et tableau Kanban : [Jira — projet VIGIE](https://matheagaveriaux.atlassian.net/jira/software/projects/VIGIE/boards/1)

### Convention Git

Chaque branche, commit et pull request contient la **clé du ticket Jira**, pour que le code apparaisse dans le ticket.

```
Branche : VIGIE-12-socket-auth
Commit  : VIGIE-12 middleware JWT sur le handshake Socket.io
PR      : VIGIE-12 Connexion Socket.io authentifiée et rooms
```

- `main` est protégée : on fusionne uniquement par pull request, après au moins une relecture.
- Une branche par story ; on part toujours d'un `main` à jour.

### Definition of Done

Une story passe dans « Terminé » seulement si :

- le code est relu par au moins une autre personne via une pull request ;
- la branche est fusionnée sur `main` et l'application démarre sans erreur ;
- tous les critères d'acceptation de la story sont vérifiés ;
- les règles critiques sont couvertes par des tests (matrice de priorité, prise en charge atomique, règles de visibilité) ;
- les droits sont contrôlés côté serveur, pas seulement dans l'interface ;
- aucun secret (mot de passe, clé, `.env`) n'est commité ;
- la fonctionnalité est démontrable avec les données du seed ;
- le README est à jour si l'installation ou la configuration a changé.
