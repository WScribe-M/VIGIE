# VIGIE

Application web de gestion d'incidents IT : déclaration, qualification, suivi et pilotage des incidents de bout en bout, avec des échanges et des alertes en temps réel.

Mini projet M2 — LaManu.

## Identité et design

**Vigie** — « Un incident signalé une fois, suivi par tous. » On déclare une panne en moins d'une minute, on rejoint les incidents déjà signalés, on suit leur avancement en direct ; le support voit sa charge et ses retards.

Palette :

- **Pétrole** `#1F5C68` : marque et action principale ;
- **Lin** `#FAF6EF` : fond d'application, cartes en blanc, bordures Sable `#EAE2D6` ;
- **Encre brune** `#2A2420` : texte et barre latérale, texte secondaire Taupe `#6E645B` ;
- **Couleurs d'état** réservées aux statuts, priorités et délais, toujours avec une icône et un libellé.

Police unique **Figtree**, icônes **Lucide**. Les valeurs sont dans `client/src/styles/tokens.css` ; le guide [docs/design-system.md](docs/design-system.md) dit quel style utiliser à quel moment.

Voir les composants : `npm run dev`, puis http://localhost:5173/styleguide (en développement uniquement).
Voir les écrans à construire : [docs/ecrans/](docs/ecrans/README.md), une fiche et des captures par écran.

## Stack

- **Front** : React (Vite) en JavaScript (JSX), `react-router`, icônes `lucide-react`, police Figtree
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

Créer un compte (en attendant l'administration VIGIE-37 et le seed VIGIE-23) :

```bash
npm run utilisateur -- admin@vigie.local "MotDePasse123" ADMIN Prénom Nom
```

Rôles : `ADMIN`, `GESTIONNAIRE`, `CLIENT`, `LECTEUR`. Il n'y a pas d'inscription libre : les comptes sont créés par l'administrateur.

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

## Priorité et délai de résolution

Le demandeur ne choisit pas la priorité : le serveur la calcule à partir de l'impact et de l'urgence
(`calculerPriorite`, `server/src/services/prioriteService.js`, cadrage 9.1).

| Impact \ Urgence              | Faible (je peux continuer) | Moyenne (mode dégradé) | Haute (je suis bloqué) |
| ----------------------------- | -------------------------- | ---------------------- | ---------------------- |
| **Fort** (toute l'entreprise) | Moyenne                    | Haute                  | Critique               |
| **Moyen** (mon équipe)        | Basse                      | Moyenne                | Haute                  |
| **Faible** (moi seul)         | Basse                      | Basse                  | Moyenne                |

Délai de résolution (SLA), en heures ouvrées (du lundi au vendredi, de 9 h à 18 h) : Critique 4 h,
Haute 1 jour, Moyenne 3 jours, Basse 5 jours.

Un gestionnaire ou un administrateur peut **requalifier** la priorité (`PATCH /api/tickets/:id/priorite`),
avec un motif de 10 caractères minimum. Le ticket garde la priorité calculée et la priorité finale ;
l'échéance repart de la requalification avec le délai de la nouvelle priorité, et le changement est
tracé dans l'historique.

## Structure

```
client/              React (Vite) — appels /api relayés vers l'API en développement
  src/styles/        design system : tokens, base, typographie, libellés, icônes
  src/composants/    composants réutilisables (Button, badges, Sidebar…)
  src/pages/         écrans (et /styleguide en développement)
docs/                cadrage (métier), design-system (guide), ecrans (fiches et captures)
server/
  src/config/        variables d'environnement et connexion MongoDB
  src/routes/        déclaration des routes Express
  src/controllers/   requête → service → réponse HTTP
  src/services/      logique métier, testable sans Express
  src/middlewares/   authentification, rôles, erreurs
  src/utils/         outils transverses (ErreurHttp)
  src/models/        modèles Mongoose : User, Service, Ticket, Notification
  src/app.js         application Express (routes, erreurs)
  docs/openapi.yaml  documentation de l'API (OpenAPI), affichée sur /api/docs
  src/index.js       démarrage : connexion à la base puis écoute
  src/socket/        temps réel : authentification Socket.io et rooms
  tests/             tests node:test, même arborescence que src/
```

## Documentation

- [docs/cadrage.md](docs/cadrage.md) : besoin, rôles, fonctionnalités, architecture et décisions prises.
- [docs/design-system.md](docs/design-system.md) : quel style utiliser à quel moment.
- [docs/ecrans/](docs/ecrans/README.md) : fiche et captures de chaque écran, parcours, catalogue des composants.
- [CONTRIBUTING.md](CONTRIBUTING.md) : **à lire avant de coder** — workflow Jira/Kanban, convention Git, pull requests, Definition of Done, conventions de code.
- [AGENTS.md](AGENTS.md) : instructions à donner à un assistant IA.
- [IA/rapport-ia.md](IA/rapport-ia.md) : rapport d'utilisation de l'IA (dossier, partie 4).
- **Documentation de l'API** : http://localhost:3000/api/docs une fois l'API lancée (`npm run dev`), source dans [server/docs/openapi.yaml](server/docs/openapi.yaml).
- Backlog et tableau Kanban : [Jira — projet VIGIE](https://matheagaveriaux.atlassian.net/jira/software/projects/VIGIE/boards/1)
