@AGENTS.md

## Interface : quel style utiliser

Le design ne se lit **jamais** dans du HTML de maquette : il est dans le code et dans les fiches d'écran.

- Valeurs : `client/src/styles/tokens.css` · textes : `typographie.css` · libellés : `libelles.js` · icônes : `icones.js`.
- Composants : `client/src/composants/` (catalogue sur `/styleguide` avec `npm run dev`).
- Écran à construire : sa fiche dans `docs/ecrans/` (mise en page, textes exacts, 5 états) et ses captures.

Pour construire un écran :

1. Lire la fiche `docs/ecrans/NN-….md` et regarder ses captures.
2. Réutiliser les composants existants ; un composant absent se code d'après `docs/ecrans/composants.md`, puis s'ajoute à `/styleguide`.
3. N'utiliser que les tokens et les classes de typographie : aucune couleur codée en dur.
4. Implémenter les 5 états : normal, vide, chargement (squelettes), erreur, temps réel.
5. Reprendre les textes de la fiche à la lettre, en appliquant les corrections signalées par ⚠.

@docs/design-system.md

## Spécifique à Claude Code

- Jira : site `matheagaveriaux.atlassian.net`, projet `VIGIE`. Lire la story via l'API REST avant de coder ; ne changer son statut que si on le demande.
- Liens « bloque » via l'API : `inwardIssue` = le ticket qui bloque, `outwardIssue` = le ticket bloqué.
- Avant de pousser ou d'ouvrir une PR, lancer `npm run lint`, `npm run format:check` et `npm test`.
