# VIGIE — Dossier de cadrage

Version Markdown de `Cadrage2.docx`, **mise à jour avec les décisions prises depuis** (section 9).
En cas de différence avec le document Word, ce fichier fait foi.

## 1. Contexte et besoin

Les incidents informatiques sont aujourd'hui signalés de manière informelle (e-mails, téléphone, échanges directs) : pas de visibilité, aucun historique, des demandes perdues ou en doublon, une communication peu efficace entre les utilisateurs et la DSI.

Besoins :

- le client crée un ticket immédiatement après un incident ;
- la DSI reçoit les incidents en temps réel et les priorise ;
- chacun suit l'avancement d'une demande et échange au même endroit ;
- une même panne signalée par plusieurs personnes ne génère pas autant de tickets ;
- la priorité est fiable : si le demandeur la choisit librement, tout devient « haute » ;
- la DSI dispose d'indicateurs de pilotage (charge, délais, retards, satisfaction).

**Objectif** : centraliser, tracer et suivre chaque incident de bout en bout dans une application web unique, avec des échanges et des alertes en temps réel.

## 2. Parties prenantes et rôles

| Partie prenante      | Rôle applicatif | Besoin principal                                                                                                                  |
| -------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Utilisateur / client | `CLIENT`        | Déclarer vite un incident, suivre son avancement, échanger, donner son avis. Peut suivre le ticket d'un collègue (suiveur, copie) |
| Technicien support   | `GESTIONNAIRE`  | Être alerté en temps réel, voir qui est déjà sur un ticket, s'assigner, traiter, commenter, faire avancer le statut               |
| Responsable DSI      | `GESTIONNAIRE`  | Répartir la charge, requalifier les priorités, suivre les retards SLA et les statistiques (vue « Pilotage »)                      |
| Administrateur       | `ADMIN`         | Gérer les utilisateurs, les rôles et le catalogue de services                                                                     |
| Direction / audit    | `LECTEUR`       | Consulter tous les tickets et le tableau de bord en lecture seule                                                                 |

**Visibilité** : un `CLIENT` ne voit que les tickets qu'il a créés et ceux où il est suiveur ou en copie. Être suiveur ou en copie est une relation propre à un ticket, pas un rôle : lecture de ce ticket et notifications. Le `GESTIONNAIRE` voit tous les tickets ; le `LECTEUR` les voit tous sans pouvoir les modifier.

## 3. Fonctionnalités

### 3.1 Tickets

- **Création** : titre, **description guidée** (que se passe-t-il ? depuis quand ? quel message d'erreur ?), service, pièces jointes, personnes en copie, et deux questions guidées à la place d'une priorité libre : **impact** et **urgence**.
- **Statuts** (un sens unique chacun, pour des compteurs fiables) :

| Statut                 | Sens                                                             |
| ---------------------- | ---------------------------------------------------------------- |
| `NOUVEAU`              | Pas encore pris en charge                                        |
| `EN_COURS`             | Un gestionnaire travaille dessus                                 |
| `EN_ATTENTE_DEMANDEUR` | On attend une réponse du demandeur ; **SLA suspendu**            |
| `TERMINE`              | Solution apportée ; le demandeur peut contester pendant 15 jours |
| `ABANDONNE`            | Annulé ou doublon                                                |

- **Catalogue de services** : le client choisit un service dans son vocabulaire (VPN, Messagerie, ERP, Imprimante, Poste de travail, « Autre / je ne sais pas »). Chaque service est lié par l'admin à un domaine technique (réseau, infrastructure, applicatif, base de données) : le domaine est déduit. Le technicien peut le corriger (tracé). « Autre » déclenche une qualification manuelle. Une seule équipe support.
- **Priorité calculée** : déduite de l'impact et de l'urgence (matrice, section 9.1). Le gestionnaire peut la requalifier ; c'est tracé.
- **Un seul technicien par ticket** : il s'assigne depuis « Ma file » ou le responsable DSI le lui attribue. La prise en charge est **atomique**.
- **Doublons** : à la saisie du titre, suggestions de tickets ouverts similaires et bouton « Je suis aussi concerné » (rattache comme suiveur). Le gestionnaire peut marquer un ticket comme doublon d'un autre : il passe `ABANDONNE` avec un lien, et son demandeur devient suiveur du ticket principal.
- **Réouverture** : après `TERMINE`, le demandeur peut contester pendant **15 jours**. Motif obligatoire, retour `EN_COURS` chez le même technicien, notifié, tracé, SLA recalculé, compteur de réouvertures incrémenté. Passé ce délai, le bouton « Contester » n'est plus proposé et le client crée un nouveau ticket ; le ticket n'est pas verrouillé et le technicien peut toujours le rouvrir, avec un motif.
- **Résolution** : au passage à `TERMINE`, le technicien renseigne obligatoirement la **cause** et la **solution** (section 9.9).
- **Relances sans action automatique** : aucun ticket n'est jamais verrouillé, clôturé ou abandonné automatiquement. Relance après 3 jours (paramétrable) : réponse attendue (`EN_ATTENTE_DEMANDEUR`) ou invitation à confirmer, contester ou noter (`TERMINE`). Le technicien décide seul d'abandonner, avec un motif.
- **Ticket pour le compte d'un tiers** : le technicien crée le ticket au nom d'un utilisateur, avec le canal d'origine (téléphone, e-mail, en direct). Le tiers devient le demandeur ; le technicien reste tracé comme créateur.
- **Commentaires** visibles par le demandeur et la DSI.
- **Historique (timeline)** : qui a modifié quoi et quand (statut, assignation, priorité, domaine). Il alimente les temps de résolution, la suspension du SLA et les statistiques.

### 3.2 Vues par rôle (compteurs mis à jour en direct)

- **« Mes demandes »** (`CLIENT`) : mes tickets par statut, ceux où je suis suiveur, ceux qui attendent ma réponse, ceux terminés que je peux contester ou noter.
- **« Ma file »** (technicien) : nouveaux tickets à prendre, mes tickets en cours triés par échéance et priorité, ceux proches du SLA ou en retard, ceux en attente du demandeur avec l'ancienneté de l'attente.
- **« Pilotage »** (responsable DSI, `LECTEUR`) : incidents par statut, retards, charge par technicien, répartition par priorité et domaine, délais, satisfaction.

Liste des tickets : tri (échéance, priorité, statut), recherche (ticket, service), filtres, pagination.

**Statistiques** (Aggregation Pipelines) : temps moyen de prise en charge et de résolution par domaine ; top des services ; répartition par domaine et priorité ; évolution hebdomadaire ; charge par gestionnaire ; taux de retard, de requalification et de réouverture ; répartition par canal ; doublons évités ; note moyenne de satisfaction.

### 3.3 Temps réel (Socket.io)

Notification instantanée d'un nouveau ticket (badge et son), commentaires en direct et « en train d'écrire… », présence sur un ticket, mise à jour live des trois vues.

### 3.4 Délais et qualité

- **SLA** : échéance déduite de la priorité, calculée à l'ouverture, suspendue en `EN_ATTENTE_DEMANDEUR`, recalculée en cas de requalification ou de réouverture. Le client ne saisit aucun délai. Détails en section 9.2.
- **Satisfaction** : note de 1 à 5, facultative, proposée au passage à `TERMINE`.

### 3.5 Connexion et rôles

Authentification JWT pour le MVP, quatre rôles globaux : `ADMIN`, `GESTIONNAIRE`, `CLIENT`, `LECTEUR`. Évolution prévue, hors périmètre : IAM centralisé via OIDC.

## 4. Architecture

- **Full Stack JavaScript** : React.js → API REST Node.js/Express → MongoDB via Mongoose.
- **Collections** : `users`, `services` (nom, domaine), `tickets` (service, domaine, impact, urgence, priorité calculée et finale, échéance SLA, suiveurs, copie, `doublonDe`, pièces jointes, commentaires, historique, index textuel sur titre et description), `notifications` (destinataire, type, ticket, lu, date).
- **SLA** : tâche planifiée côté serveur qui calcule le niveau d'alerte et le diffuse via Socket.io.
- **Concurrence** : prise en charge par `findOneAndUpdate` conditionnel (« pas encore assigné ») ; le second technicien reçoit `409` « Déjà pris par… ». Les autres écritures utilisent le contrôle de version de Mongoose. La présence est une aide visuelle, pas un verrou.
- **Données de démonstration** : `npm run seed` génère environ 300 tickets sur 6 mois, un historique cohérent et un compte par rôle.
- **Montée en charge (réflexion)** : replica set MongoDB, sharding si besoin, clustering Node.js avec adaptateur Redis pour Socket.io.

## 5. Temps réel : conception Socket.io

- **Authentification** : le JWT est transmis dans le handshake ; un middleware le vérifie, ainsi que le compte (actif, rôle inchangé), sinon la connexion est refusée. Identité et rôle lus dans le jeton. Le serveur ferme la connexion à l'expiration du jeton ; le client renouvelle son jeton avant (`POST /api/auth/renouveler`) et se reconnecte avec le nouveau.
- **Rooms** (droits vérifiés côté serveur) :

| Room          | Accès                                                       | Événements                                                          |
| ------------- | ----------------------------------------------------------- | ------------------------------------------------------------------- |
| `user:<id>`   | La personne concernée (automatique)                         | Notifications personnelles, alerte SLA                              |
| `ticket:<id>` | Demandeur, suiveurs, en copie, GESTIONNAIRE, LECTEUR, ADMIN | Commentaire, « en train d'écrire… », présence, changement de statut |
| `support`     | GESTIONNAIRE, ADMIN                                         | Nouveau ticket (badge et son), mise à jour de « Ma file »           |
| `pilotage`    | GESTIONNAIRE, LECTEUR, ADMIN                                | Compteurs et retards                                                |

- **Persistance** : chaque notification est d'abord enregistrée en base, puis émise. À la (re)connexion, le client récupère les non lues par l'API. Les événements éphémères ne sont pas conservés.
- **Source de vérité** : l'API REST. Après une coupure, le client se resynchronise par l'API.

## 6. Méthode

- **Kanban** (les sprints ont été abandonnés : 7 jours de projet). Backlog trié par priorité et dépendances, une story en cours par personne. Voir [CONTRIBUTING.md](../CONTRIBUTING.md).
- **MoSCoW** : `Must`, `Should`, `Could`, `Won't`.
- **Story points** : suite de Fibonacci de 0 à 13 ; une story estimée à 13 est redécoupée.
- **Dépendances** : liens « bloque » dans Jira.

## 7. Hors périmètre (Won't)

OIDC / IAM externe, SLA avancés, multi-équipes, assignation automatique par compétence, jours fériés dans le calcul SLA, scan antivirus des pièces jointes, assistant IA de résolution (RAG, section 9.9).

## 8. Ordre d'abandon en cas de manque de temps

1. Satisfaction (VIGIE-25)
2. Présence (VIGIE-17)
3. « En train d'écrire… » (VIGIE-13)

## 9. Décisions prises depuis le cadrage

### 9.1 Matrice impact × urgence (VIGIE-5)

Impact : moi seul (`FAIBLE`) / mon équipe (`MOYEN`) / toute l'entreprise (`FORT`).
Urgence : je peux continuer (`FAIBLE`) / mode dégradé (`MOYENNE`) / je suis bloqué (`HAUTE`).

| Impact \ Urgence | Faible  | Moyenne | Haute    |
| ---------------- | ------- | ------- | -------- |
| **Fort**         | Moyenne | Haute   | Critique |
| **Moyen**        | Basse   | Moyenne | Haute    |
| **Faible**       | Basse   | Basse   | Moyenne  |

### 9.2 SLA (VIGIE-20)

- Délais : **Critique 4 h, Haute 1 jour, Moyenne 3 jours, Basse 5 jours**.
- Comptés en **heures ouvrées** : du lundi au vendredi, de 9 h à 18 h. Jours fériés hors périmètre.
- Alerte **orange à 75 %** du délai écoulé, **rouge à 100 %** (Critique : orange à 3 h).
- Suspendu en `EN_ATTENTE_DEMANDEUR`.
- Horaires et seuil paramétrables (`SLA_WORK_DAYS`, `SLA_WORK_START`, `SLA_WORK_END`, `SLA_WARNING_RATIO`).

### 9.3 Suggestions de doublons (VIGIE-15)

Une suggestion affiche uniquement le **titre, le service, le statut et la date d'ouverture** : jamais la description, le demandeur, les commentaires ni les pièces jointes. Après « Je suis aussi concerné », le client devient suiveur et voit le ticket complet. Le formulaire invite à ne pas mettre de données personnelles dans le titre.
Plan B si les titres sont jugés trop sensibles : service, statut, date et nombre de personnes concernées.

### 9.4 Pièces jointes (VIGIE-35)

- Passées de `Could` (lot 4) à **`Should`** : une capture d'écran évite des allers-retours qui suspendent le SLA.
- Types : png, jpg, pdf, txt, log, csv, docx, xlsx. **5 Mo par fichier, 5 fichiers par ticket.**
- Type vérifié côté serveur (extension et type MIME).
- Fichiers renommés et stockés sur le disque (multer), jamais dans MongoDB (limite de 16 Mo par document).
- Les personnes en copie restent en `Could` (VIGIE-28) et réutilisent la liste des suiveurs.

### 9.5 Sécurité et e-mails

- **bcrypt obligatoire**, coût de 10 à 12 (VIGIE-2).
- **Mailtrap** en développement et pour la démo ; configuration SMTP par variables d'environnement (VIGIE-22).

### 9.6 Ajouts au backlog

- **VIGIE-36** Initialisation du projet.
- **VIGIE-37** Administration des utilisateurs et des rôles (`Should`) : seul le catalogue était couvert.
- **VIGIE-38** Préparation de la soutenance.
- **VIGIE-39** Guide de contribution et documentation.

### 9.7 Choix techniques

- Monorepo `client/` (React + Vite) et `server/` (Express) avec workspaces npm.
- Organisation du serveur : `routes/`, `controllers/`, `services/`, `middlewares/`, `models/`, `config/`.
- Tests avec `node:test`.

### 9.8 Suivi de la prise en charge et panne collective (VIGIE-41, VIGIE-42)

Deux fonctionnalités `Could` (lot 4), ajoutées pour répondre plus finement à deux besoins de la section 1.

**Suivi de la prise en charge (VIGIE-41)** : « chacun suit l'avancement d'une demande ». Un statut `NOUVEAU` qui dure ne dit rien au client, qui relance alors par téléphone ou par e-mail : exactement ce que VIGIE doit remplacer.

- Sur un ticket `NOUVEAU`, le demandeur et les suiveurs voient leur **position dans la file** : un simple nombre, dans l'ordre de « Ma file » (`prioriteFinale` décroissante, puis `echeanceSla` croissante). Aucune information sur les autres tickets n'est exposée.
- **Estimation de prise en charge** en fourchette : 25e à 75e percentile du délai de prise en charge (en heures ouvrées) des tickets de même priorité sur **90 jours**. Rien n'est affiché sous **10 tickets** comparables. C'est une estimation, pas un engagement : l'engagement reste l'échéance SLA.
- **Jalons** : Reçu → Vu par le support → Pris en charge → En cours → Terminé. « Vu par le support » est posé une seule fois, à la première ouverture par un `GESTIONNAIRE`.
- Mise à jour en direct quand la file change.

**Panne collective (VIGIE-42)** : « une même panne signalée par plusieurs personnes ne génère pas autant de tickets ». Complète VIGIE-15 (doublons par titre) par une détection par service et par volume, avant même la saisie du titre.

- Panne probable : au moins **5 tickets** ouverts sur un même service en **30 minutes** (`PANNE_SEUIL_TICKETS`, `PANNE_FENETRE_MINUTES`). Le service « Autre / je ne sais pas » est exclu.
- Bandeau dans le formulaire de création avec « Je suis aussi concerné » (suiveur du ticket le plus ancien de la rafale). Il n'affiche que le **service, l'heure de début et le nombre de personnes concernées** et ne bloque pas la création d'un ticket.
- Alerte en direct des gestionnaires (room `support`) ; les rattachements comptent dans les doublons évités.

Les seuils (5 tickets en 30 min, 90 jours, 10 tickets minimum) sont des valeurs de départ, à ajuster avec les données du seed.

### 9.9 Tickets homogènes et résolution structurée, pour un futur RAG (VIGIE-44)

Conseil du formateur : construire tous les tickets de la même façon, pour pouvoir un jour faire du **RAG** (_Retrieval-Augmented Generation_). À l'arrivée d'un incident, on retrouve les tickets passés les plus proches, et une IA s'appuie sur leur résolution pour proposer une solution. Un RAG n'est utile que si les données retrouvées sont propres et comparables.

Déjà en place : schéma imposé par Mongoose, service choisi dans un catalogue, domaine, impact, urgence et priorité en valeurs fixes, historique tracé avec les mêmes champs.

Décisions :

- **Résolution structurée** (VIGIE-44, `Should`) : au passage à `TERMINE`, **cause** et **solution** obligatoires (texte court, 500 caractères au plus), stockées dans un sous-document `resolution` du ticket. Non demandées pour `ABANDONNE`. À la réouverture, la résolution précédente reste dans l'historique et la clôture suivante la redemande.
- **Description guidée** (VIGIE-3) : trois questions plutôt qu'un champ libre (que se passe-t-il ? depuis quand ? quel message d'erreur ?).
- **Pas de données personnelles** dans le texte libre (titre, description, cause, solution) : le formulaire le rappelle. Ces textes pourraient un jour être envoyés à une IA (RGPD).
- **Seed** (VIGIE-23) : causes et solutions réalistes pour les tickets terminés.

Hors périmètre : le RAG lui-même (vecteurs d'embedding, MongoDB Atlas Vector Search, appel à une IA). Il est présenté comme évolution dans le dossier technique : les vecteurs pourraient être stockés dans la collection `tickets`, sans nouvelle base.

### 9.10 Schéma conçu à partir des requêtes (VIGIE-45)

En MongoDB, on modélise pour les requêtes : chaque requête de l'application (écran, story, fréquence, filtre, tri) a été confrontée au schéma. Décisions validées en équipe :

- **Tri par priorité** sur un champ numérique `rangPriorite` (1 à 4), recalculé depuis `prioriteFinale` : le texte se triait par ordre alphabétique.
- **Numéro lisible** `numero`, affiché VIG-0042, attribué par un compteur atomique (collection `compteurs`) ; la recherche « par ticket » l'accepte.
- **Champs de suivi** : `dateStatut` (entrée dans le statut actuel) et `derniereRelance` pour les relances, `datePriseEnCharge` pour les statistiques et l'estimation, `niveauAlerteSla` (`AUCUNE`, `ORANGE`, `ROUGE`) pour n'alerter qu'au changement de niveau.
- **`dateCloture`** : remplie au passage à `TERMINE` ou `ABANDONNE`, remise à `null` à la réouverture ; le délai de contestation de 15 jours part de la dernière clôture. Le temps de résolution des statistiques ne compte que les tickets `TERMINE`.
- **Index** : `suiveurs` et `enCopie` (sinon le filtre de visibilité d'un `CLIENT` parcourt toute la collection), « Ma file » `{statut, rangPriorite, echeanceSla}`, tâche SLA `{statut, echeanceSla}`, tickets d'un technicien `{technicien, statut, echeanceSla}`, panne collective `{service, createdAt}`, index textuel **en français**.
- **Notifications** lues supprimées après 90 jours (index TTL partiel) ; les non lues sont conservées.
- Critères de VIGIE-4 liés au ticket (correction du domaine, « Autre » signalé dans « Ma file », file unique) reportés sur VIGIE-3. Gestionnaire : tickets similaires affichés sur la fiche (VIGIE-16).
- Seuils de départ confirmés : 5 tickets en 30 minutes (VIGIE-42), 90 jours d'historique et 10 tickets minimum (VIGIE-41), 500 caractères pour la cause et la solution (VIGIE-44).
