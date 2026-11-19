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
npm run db           # seulement si MongoDB n'est pas installé : nécessite Docker Desktop lancé
npm run dev          # lance l'API (port 3000) et le client (port 5173)
```

MongoDB : **soit** installé en local (service Windows, port 27017), **soit** via Docker (`npm run db`), pas les deux : ils utiliseraient le même port.

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
| `npm test`       | tests du serveur (`node:test`)                                |

## Structure

```
client/              React (Vite) — appels /api relayés vers l'API en développement
server/
  src/config/        variables d'environnement et connexion MongoDB
  src/routes/        déclaration des routes Express
  src/controllers/   requête → service → réponse HTTP
  src/services/      logique métier, testable sans Express
  src/middlewares/   authentification, rôles, erreurs
  src/utils/         outils transverses (ErreurHttp)
  src/models/        modèles Mongoose : User, Service, Ticket, Notification
  src/app.js         application Express (routes, erreurs)
  src/index.js       démarrage : connexion à la base puis écoute
```

## Documentation

- [docs/cadrage.md](docs/cadrage.md) : besoin, rôles, fonctionnalités, architecture et décisions prises.
- [CONTRIBUTING.md](CONTRIBUTING.md) : **à lire avant de coder** — workflow Jira/Kanban, convention Git, pull requests, Definition of Done, conventions de code.
- [AGENTS.md](AGENTS.md) : instructions à donner à un assistant IA.
- Backlog et tableau Kanban : [Jira — projet VIGIE](https://matheagaveriaux.atlassian.net/jira/software/projects/VIGIE/boards/1)
