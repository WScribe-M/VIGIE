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

- **Barre latérale** : composant `Sidebar` (fait). Élément actif = page courante.
- **En-tête** (PageHeader, à construire) : fond Lin, filet bas `--color-neutral-200`. De gauche à droite :
  - sur une page de détail, un lien retour `arrow-left` 16 px + nom de la page parente, 14/400, écart 6 ;
  - selon l'écran : la présence (fiche Gestionnaire) ou « En direct · 4 collègues connectés » (Ma file),
    13/400 avec un point Pétrole de 8 px ;
  - un espace flexible ;
  - la recherche 360 × 40 (Client : « Rechercher une demande… » ; Gestionnaire : « Rechercher un ticket,
    une personne… » avec la touche « Ctrl K ») — absente sur Tous les tickets, Pilotage et État des services ;
  - la cloche (NotificationBell, 40 px) et l'avatar 40 px.
- **Titre de page** : `.text-display-lg` (30/38), un seul par écran, dans le contenu.

## Index

| #   | Écran                                                        | Rôles                                 | Captures                                  |
| --- | ------------------------------------------------------------ | ------------------------------------- | ----------------------------------------- |
| 01  | [Connexion](01-connexion.md)                                 | tous                                  | `01-connexion-*`                          |
| 02  | [Mes demandes](02-mes-demandes.md)                           | Client                                | `02-mes-demandes-*`                       |
| 03  | [Créer un ticket](03-creer-un-ticket.md)                     | Client                                | `03-creer-un-ticket-*`                    |
| 04  | [Créer un ticket pour un tiers](04-creer-pour-un-tiers.md)   | Gestionnaire, Administrateur          | `04-creer-un-ticket-pour-un-tiers`        |
| 05  | [Fiche ticket Client](05-fiche-ticket-client.md)             | Client                                | `05-fiche-ticket-client-*`                |
| 06  | [Fiche ticket Gestionnaire](06-fiche-ticket-gestionnaire.md) | Gestionnaire, Administrateur, Lecteur | `06-*`                                    |
| 07  | [Ma file](07-ma-file.md)                                     | Gestionnaire, Administrateur          | `07-ma-file-*`                            |
| 08  | [Tous les tickets](08-tous-les-tickets.md)                   | Gestionnaire, Administrateur, Lecteur | `08-tous-les-tickets-*`                   |
| 09  | [Pilotage](09-pilotage.md)                                   | Gestionnaire, Administrateur, Lecteur | `09-pilotage-*`                           |
| 10  | [État des services](10-etat-des-services.md)                 | tous                                  | `10-etat-des-services`                    |
| 11  | [Notifications](11-notifications.md)                         | tous                                  | `11-notifications`                        |
| 12  | [Administration](12-administration.md)                       | Administrateur                        | `12-*`                                    |
| 13  | [Erreurs 403 et 404](13-erreurs.md)                          | tous                                  | `13-403`, `13-404`                        |
| 14  | [Mobile 390 px](14-mobile.md)                                | Client                                | `14-mobile-*`                             |
| —   | [Parcours interactifs](parcours.md)                          | Client, Gestionnaire                  | `parcours-*`                              |
| —   | [Composants](composants.md)                                  | —                                     | `composants-03-*`, `identite-01-identite` |

## Données de démonstration

Awa Diallo et Léa Martin (Client) ; Mamadou Koné et Sophie Laurent (Gestionnaire) ; Karim Benali
(Administrateur) ; Claire Fontaine (Lecteur) ; tickets INC-1016 à INC-1028, novembre 2026. Le seed
(VIGIE-23) peut reprendre ces données pour que la démonstration ressemble aux captures.
