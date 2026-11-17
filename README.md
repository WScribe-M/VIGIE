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

> À compléter au fil de l'initialisation (VIGIE-36).

1. Copier `.env.example` en `.env` et renseigner les valeurs.
2. Installer les dépendances : `npm install`.
3. Charger les données de démonstration : `npm run seed` (VIGIE-23).

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
