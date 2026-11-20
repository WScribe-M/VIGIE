# Écrans de VIGIE

Une fiche par écran : c'est la référence pour construire une page à l'identique.
Chaque fiche donne la mise en page, les composants à utiliser, les **textes exacts**, les **5 états**
(normal, vide, chargement, erreur, temps réel) et renvoie à ses **captures** (`captures/`), qui font foi
pour le rendu visuel.

Les captures viennent du handoff de design du 17 nov. 2026. Les noms, tickets et horaires qu'on y voit
sont des **données de démonstration**. Seuls les textes d'interface listés dans les fiches sont à reprendre
mot pour mot.

## Méthode pour construire un écran

1. Ouvrir la fiche de l'écran et ses captures.
2. Réutiliser les composants existants de `client/src/composants/` (voir `/styleguide` en développement).
   Un composant absent se construit d'après [composants.md](composants.md), puis s'ajoute à `/styleguide`.
3. N'utiliser que les tokens de `client/src/styles/tokens.css` et les classes de `typographie.css`.
4. Implémenter les 5 états. Un état non dessiné se compose avec EmptyState, ErrorState et Skeleton.
5. Vérifier les textes, les libellés (`client/src/styles/libelles.js`) et les **corrections métier** signalées
   par ⚠ dans chaque fiche : quand la maquette contredit une règle métier, c'est la règle qui l'emporte.

## Gabarit commun des écrans connectés (bureau, 1440 px)

```
┌───────────┬──────────────────────────────────────────────────────────────┐
│           │ En-tête 64 px + filet 1 px Sable · marges 0 32 px · écart 12 │
│  Sidebar  ├──────────────────────────────────────────────────────────────┤
│  248 px   │ Contenu · marges 32 px · colonne flex, écart 24 px           │
│           │ largeur utile 1128 px = 12 colonnes de 72 px, gouttières 24  │
└───────────┴──────────────────────────────────────────────────────────────┘
```

- **Barre latérale** : composant `Sidebar` (fait). Élément actif = page courante. Entrées : celles de
  `client/src/auth/roles.js`, ajoutées story par story (jamais de lien vers une page qui n'existe pas). Sous
  768 px, elle devient une barre haute.
- **En-tête** (PageHeader, à construire) : fond Lin, filet bas `--color-neutral-200`. De gauche à droite :
  - sur une page de détail, un lien retour `arrow-left` 16 px + nom de la page parente, 14/400, écart 6 ;
  - selon l'écran : la présence (fiche Gestionnaire) (« En direct » retiré de « À traiter » le 20/11),
    13/400 avec un point Pétrole de 8 px ;
  - un espace flexible ;
  - la recherche 360 × 40 (Client : « Rechercher une demande… » ; Gestionnaire : « Rechercher un ticket,
    une personne… » avec la touche « Ctrl K ») — absente sur Tous les tickets, Pilotage et État des services ;
  - la cloche (NotificationBell, 40 px) et l'avatar 40 px.
- **Titre de page** : `.text-display-lg` (30/38), un seul par écran, dans le contenu.

## Index

**Trouver la fiche d'une story** : chercher sa clé Jira dans la colonne « Stories », sinon l'écran par sa
route ou son nom. Lire la fiche **avant de coder**, puis ses captures (`captures/`, avec l'outil de lecture
d'images). Une story d'interface absente du tableau : trouver l'écran concerné et **ajouter sa clé ici**.

| #   | Écran (fiche)                                                | Route                         | Stories                                                                                                                                                        | Rôles                                 |
| --- | ------------------------------------------------------------ | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| 01  | [Connexion](01-connexion.md)                                 | `/connexion`                  | VIGIE-2, VIGIE-49                                                                                                                                              | tous                                  |
| 02  | [Mes demandes](02-mes-demandes.md)                           | `/mes-demandes`               | VIGIE-18 (VIGIE-3 : liste minimale)                                                                                                                            | Client                                |
| 03  | [Créer un ticket](03-creer-un-ticket.md)                     | `/tickets/nouveau`            | VIGIE-3 (description guidée), VIGIE-15 (doublons), VIGIE-35 (pièces jointes), VIGIE-42                                                                         | Client                                |
| 04  | [Créer un ticket pour un tiers](04-creer-pour-un-tiers.md)   | `/tickets/nouveau` (proposée) | —                                                                                                                                                              | Gestionnaire, Administrateur          |
| 05  | [Fiche ticket Client](05-fiche-ticket-client.md)             | `/tickets/:id`                | VIGIE-3 (en-tête, informations), VIGIE-7 (fiche, frise), VIGIE-41 (suivi), VIGIE-25 (satisfaction), VIGIE-13                                                   | Client                                |
| 06  | [Fiche ticket Gestionnaire](06-fiche-ticket-gestionnaire.md) | `/tickets/:id`                | VIGIE-7 (actions, statut), VIGIE-17 (présence), VIGIE-13 (« en train d'écrire… »), VIGIE-44 (résolution), VIGIE-5 (requalification), VIGIE-47 (notes internes) | Gestionnaire, Administrateur, Lecteur |
| 07  | [À traiter](07-ma-file.md)                                   | `/ma-file`                    | VIGIE-31                                                                                                                                                       | Gestionnaire, Administrateur          |
| 08  | [Tous les tickets](08-tous-les-tickets.md)                   | `/tickets` (proposée)         | —                                                                                                                                                              | Gestionnaire, Administrateur, Lecteur |
| 09  | [Pilotage](09-pilotage.md)                                   | `/pilotage`                   | VIGIE-32                                                                                                                                                       | Gestionnaire, Administrateur, Lecteur |
| 10  | [État des services](10-etat-des-services.md)                 | `/services` (proposée)        | VIGIE-42 (panne collective)                                                                                                                                    | tous                                  |
| 11  | [Notifications](11-notifications.md)                         | panneau de l'en-tête          | VIGIE-11 (nouveau ticket : cloche, panneau, toast, son)                                                                                                        | tous                                  |
| 12  | [Administration](12-administration.md)                       | `/administration`             | VIGIE-37 (utilisateurs), VIGIE-4 (services)                                                                                                                    | Administrateur                        |
| 13  | [Erreurs 403 et 404](13-erreurs.md)                          | toute route                   | —                                                                                                                                                              | tous                                  |
| 14  | [Mobile 390 px](14-mobile.md)                                | mêmes routes                  | —                                                                                                                                                              | Client                                |
| —   | [Parcours interactifs](parcours.md)                          | —                             | —                                                                                                                                                              | Client, Gestionnaire                  |
| —   | [Composants](composants.md)                                  | `/styleguide` (développement) | —                                                                                                                                                              | —                                     |

## Données de démonstration

Awa Diallo et Léa Martin (Client) ; Mamadou Koné et Sophie Laurent (Gestionnaire) ; Karim Benali
(Administrateur) ; Claire Fontaine (Lecteur) ; tickets INC-1016 à INC-1028, novembre 2026. Le seed
(VIGIE-23) peut reprendre ces données pour que la démonstration ressemble aux captures.
