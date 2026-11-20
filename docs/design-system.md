# VIGIE — Guide du design system

Ce guide dit **quel style utiliser à quel moment**. Les valeurs elles-mêmes vivent dans le code : on ne les
recopie jamais à la main.

## Où sont les références

| Besoin                                              | Référence                                                                          |
| --------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Couleurs, espacements, rayons, ombres, durées       | `client/src/styles/tokens.css`                                                     |
| Styles globaux (police, fond, focus, animations)    | `client/src/styles/base.css`                                                       |
| Tailles de texte                                    | `client/src/styles/typographie.css`                                                |
| Libellés affichés (statuts, priorités, SLA, rôles…) | `client/src/styles/libelles.js`                                                    |
| Icônes Lucide par valeur métier                     | `client/src/styles/icones.js`                                                      |
| Couleur d'avatar d'une personne                     | `client/src/styles/avatar.js`                                                      |
| Composants prêts à l'emploi                         | `client/src/composants/` — catalogue visible sur **`/styleguide`** (`npm run dev`) |
| Mise en page, textes et états de chaque écran       | [docs/ecrans/](ecrans/README.md) : une fiche et des captures par écran             |
| Composants pas encore codés                         | [docs/ecrans/composants.md](ecrans/composants.md)                                  |
| Règles métier (et leurs corrections des maquettes)  | [cadrage.md](cadrage.md), sections 3, 5 et 9                                       |

## Quel style à quel moment

| Situation                                         | À utiliser                                                                                                    |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Titre de page (un seul par écran)                 | `<h1 className="text-display-lg">`                                                                            |
| Titre de section, de modale                       | `.text-heading-lg`                                                                                            |
| Titre de carte                                    | `.text-heading-md`                                                                                            |
| Titre de ticket dans une liste                    | `.text-heading-sm`                                                                                            |
| Description, commentaire                          | `.text-body-lg`                                                                                               |
| Texte courant, cellule de tableau                 | `.text-body-md` (taille par défaut)                                                                           |
| Métadonnées (n°, auteur, date)                    | `.text-body-sm` + `.texte-secondaire`                                                                         |
| Libellé de champ                                  | `.text-label`, **au-dessus** du champ                                                                         |
| Chiffre clé                                       | `.text-numeric-xl`                                                                                            |
| Nombres alignés (tableaux, compteurs, dates)      | `.chiffres` (`tabular-nums`)                                                                                  |
| Action principale (une seule par écran)           | `<Button>` (variante `primaire`)                                                                              |
| Action secondaire, « Annuler »                    | `<Button variante="secondaire">`                                                                              |
| Lien d'action discret (« Voir tout », « Ouvrir ») | `<Button variante="tertiaire">`                                                                               |
| Action destructive                                | `<Button variante="danger">`, toujours confirmée par une modale                                               |
| Action en cours                                   | `<Button chargement="Création…">` — jamais de spinner isolé                                                   |
| Bouton icône seule (recherche, cloche, « … »)     | `<IconButton icone={…} libelle="…" />`                                                                        |
| Statut d'un ticket                                | `<StatusBadge statut="EN_COURS" />` (24 en liste, 28 en en-tête de fiche)                                     |
| Priorité                                          | `<PriorityBadge priorite="HAUTE" />`                                                                          |
| Délai (SLA)                                       | `<SlaBadge niveau="ECHEANCE_PROCHE" detail="reste 25 min" />` ; `court` sur carte et mobile                   |
| Ligne de tableau en retard                        | liseré gauche 3 px `var(--color-sla-retard-fg)`                                                               |
| Ligne arrivée en direct                           | `animation: vigie-surbrillance var(--duration-highlight) var(--ease-out)`                                     |
| Personne                                          | `<Avatar id prenom nom taille={24 \| 32 \| 36 \| 40} />` ; sans nom = « Non assigné »                         |
| Navigation                                        | `<Sidebar>` (déjà dans `MiseEnPage`) : une entrée par page du rôle                                            |
| Chargement d'un contenu                           | squelettes (`--color-neutral-100` + `vigie-reflet`)                                                           |
| Liste vide, erreur                                | EmptyState / ErrorState : icône 32, un message, **une** action                                                |
| Fond de page / carte / bordure                    | `--color-neutral-50` / `--color-neutral-0` / `--color-neutral-200`                                            |
| Texte principal / secondaire / désactivé          | `--color-neutral-900` / `--color-neutral-600` / `--color-neutral-500`                                         |
| Succès, information, avertissement, erreur        | `--color-feedback-{success,info,warning,danger}-{fg,bg}`                                                      |
| Graphique                                         | `--color-chart-1` à `-6` ; graphique « par statut » : couleurs de statut                                      |
| Focus clavier                                     | automatique (`base.css`) ; sur fond blanc `--shadow-focus-on-surface`, dans un tableau `--shadow-focus-inset` |

Une couleur ou une mesure manque ? On l'ajoute d'abord dans `tokens.css` (avec la valeur des captures ou des
fiches), puis on l'utilise. Un nouveau composant ? On le construit d'après
[composants.md](ecrans/composants.md), puis on l'ajoute à `/styleguide`.

## Règles

- **Icônes** : `lucide-react`, toujours `strokeWidth={TRAIT_ICONE}` (1,75) ; 16 px dans les tableaux, 20 px dans
  la navigation, 32 px dans les états vides ; les badges suivent leur hauteur (14 / 15 / 16 px). Jamais dans un
  cercle coloré, jamais seules pour porter un état.
- **Mouvement** : uniquement pour signaler un changement ; durées `--duration-*`, courbe `--ease-out` ;
  `prefers-reduced-motion` est géré dans `base.css`.
- **Formats** (`Intl`, `fr-FR`, espaces insécables) : « 17 nov. 2026, 10:24 » · « Aujourd’hui, 10:24 » ·
  « il y a 5 min » · « reste 2 h » · « en retard de 3 h » · « depuis 4 j » · « 4,6/5 » · « 12 % » · « 1 h 45 ».
- **Accessibilité** : contrastes AA ; aucune information portée par la couleur seule (forme + icône + libellé) ;
  focus toujours visible ; cartes de choix en `role="radio"` ; toasts `aria-live="polite"` (critique :
  `assertive`) ; modales avec focus piégé et Échap ; cibles ≥ 44 px sur mobile ; titres tronqués avec infobulle.
- **Écrans** : chaque écran implémente **5 états** — normal, vide, chargement, erreur, temps réel.
- **Textes** : ceux des fiches d'écran, à la lettre. Quand une maquette contredit une règle métier, la fiche le
  signale par ⚠ et donne le texte à utiliser.

## Interdits

- Une couleur codée en dur dans un composant (`#…`, `rgb(…)`) : uniquement `var(--…)`.
- Une autre police que Figtree.
- Une icône sans `strokeWidth` 1,75, ou dans un cercle coloré.
- Une information portée uniquement par la couleur.
- Du bleu générique ou un bouclier : la marque est le Pétrole sur Lin ; le bleu est réservé au statut En cours.
- Un spinner isolé : squelettes pour un contenu, `chargement` pour un bouton.
- Une valeur métier affichée brute (`EN_ATTENTE_DEMANDEUR`, `ADMIN`) : passer par `libelles.js`.
- Une priorité choisie par l'utilisateur, un compteur de notifications rouge, une ombre grise.
- Modifier le logo : ni déformation, ni couleur d'état, ni autre police, ni effet (voir [composants.md](ecrans/composants.md)).
