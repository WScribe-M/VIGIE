@AGENTS.md

## Spécifique à Claude Code

- Jira : site `matheagaveriaux.atlassian.net`, projet `VIGIE`. Lire la story via l'API REST avant de coder ; ne changer son statut que si on le demande.
- Liens « bloque » via l'API : `inwardIssue` = le ticket qui bloque, `outwardIssue` = le ticket bloqué.
- Avant de pousser ou d'ouvrir une PR, lancer `npm run lint`, `npm run format:check` et `npm test`.
