@AGENTS.md

## Interface : quel style utiliser

Le design ne se lit **jamais** dans du HTML de maquette : il est dans le code et dans les fiches d'écran.

- Valeurs : `client/src/styles/tokens.css` · textes : `typographie.css` · libellés : `libelles.js` · icônes : `icones.js`.
- Composants : `client/src/composants/` (catalogue sur `/styleguide` avec `npm run dev`).
- **Toute story qui touche une interface** : retrouver l'écran dans l'index ci-dessous (par clé Jira, route ou
  nom), lire sa fiche (`docs/ecrans/NN-….md`) puis ses captures (`docs/ecrans/captures/`) **avant de coder**,
  sans attendre qu'on la fournisse.

@docs/ecrans/README.md

@docs/design-system.md

## Spécifique à Claude Code

- Jira : site `matheagaveriaux.atlassian.net`, projet `VIGIE`. Lire la story via l'API REST avant de coder ; ne changer son statut que si on le demande.
- Liens « bloque » via l'API : `inwardIssue` = le ticket qui bloque, `outwardIssue` = le ticket bloqué.
- Avant de pousser ou d'ouvrir une PR, lancer `npm run lint`, `npm run format:check` et `npm test`.
