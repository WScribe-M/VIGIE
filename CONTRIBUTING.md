# Contribuer à VIGIE

Ce guide est la référence de l'équipe : comment on choisit une tâche, comment on code, comment on livre.
Le contexte métier et les décisions sont dans [docs/cadrage.md](docs/cadrage.md).

## 1. Choisir une story (Kanban)

Backlog et tableau : [Jira — projet VIGIE](https://matheagaveriaux.atlassian.net/jira/software/projects/VIGIE/boards/1)

1. Prendre **la première story en partant du haut** dont tous les tickets « **est bloqué par** » sont **Terminés** (section _Tickets liés_ du ticket).
2. Se l'**assigner** et la passer **En cours**.
3. **Une seule story en cours par personne.** On termine avant d'en commencer une autre.
4. Lire la description en entier : récit utilisateur, **critères d'acceptation**, notes techniques.

Priorités : `Must` (indispensable) → `Should` (prévu) → `Could` (si le temps le permet).
En cas de manque de temps, on abandonne dans cet ordre : satisfaction (VIGIE-25), présence (VIGIE-17), « en train d'écrire… » (VIGIE-13).

## 2. Git

**La clé du ticket est partout** : c'est ce qui relie le code au ticket dans Jira.

```bash
git checkout main && git pull
git checkout -b VIGIE-12-socket-auth          # VIGIE-<n>-description-courte
git commit -m "VIGIE-12 Middleware JWT sur le handshake Socket.io"
git push -u origin VIGIE-12-socket-auth
```

- Une branche par story, toujours créée depuis un `main` à jour.
- Messages de commit en français, à l'impératif ou descriptifs, préfixés par la clé.
- `main` est protégée : **jamais de push direct**, uniquement des pull requests.

## 3. Pull request et relecture

1. Ouvrir la PR avec le titre `VIGIE-<n> Description`. Le modèle s'affiche : le remplir et cocher la DoD honnêtement.
2. Passer le ticket en **Revue en cours** dans Jira.
3. Une autre personne relit : critères d'acceptation, DoD, lisibilité, sécurité.
4. Après approbation, fusionner avec **« Squash and merge »**, supprimer la branche, puis passer le ticket en **Terminé**.

### Squash des commits

On fusionne **toujours** avec « Squash and merge » : tous les commits de la branche deviennent **un seul commit sur `main`**.

- `main` garde un historique lisible : un commit par story, facile à relire et à annuler si besoin.
- Le message du commit final est le **titre de la PR** (`VIGIE-12 Connexion Socket.io authentifiée et rooms`) : vérifier qu'il contient la clé du ticket avant de valider.
- Sur sa branche, on peut commiter autant qu'on veut (« wip », « correction relecture »…) : inutile de nettoyer l'historique soi-même, le squash s'en charge.
- Après un squash, la branche ne doit plus servir : on en recrée une nouvelle depuis `main` à jour pour la story suivante.

Relire vite fait partie du travail : une PR qui attend bloque peut-être d'autres stories.

## 4. Definition of Done

Une story est terminée seulement si :

- le code est relu par au moins une autre personne via une pull request ;
- la branche est fusionnée sur `main` et l'application démarre sans erreur ;
- tous les critères d'acceptation de la story sont vérifiés ;
- les règles critiques sont couvertes par des tests (matrice de priorité, prise en charge atomique, règles de visibilité) ;
- les droits sont contrôlés côté serveur, pas seulement dans l'interface ;
- aucun secret (mot de passe, clé, `.env`) n'est commité ;
- la fonctionnalité est démontrable avec les données du seed ;
- toute route ajoutée ou modifiée est décrite dans `server/docs/openapi.yaml` (visible sur `/api/docs`) ;
- le README est à jour si l'installation ou la configuration a changé.

## 5. Conventions de code

### Organisation du serveur

```
server/src/
  routes/        déclaration des routes Express, rien d'autre
  controllers/   lit la requête, appelle un service, renvoie la réponse HTTP
  services/      logique métier (priorité, SLA, transitions…), sans Express, testable seule
  middlewares/   authentification, contrôle des rôles, gestion des erreurs
  models/        modèles Mongoose et valeurs autorisées (constantes.js)
  config/        variables d'environnement, connexion à la base
  utils/         outils transverses (ErreurHttp)
```

Règle principale : **la logique métier va dans `services/`**. Un controller ne contient pas de règle métier, un service ne connaît pas `req` ni `res`.

### Nommage

- **Métier en français**, comme dans le cadrage : `demandeur`, `technicien`, `prioriteFinale`, `echeanceSla`, `calculerPriorite()`.
- Valeurs autorisées en **MAJUSCULES**, définies une seule fois dans `server/src/models/constantes.js` : `NOUVEAU`, `EN_COURS`, `CRITIQUE`… Ne jamais réécrire ces chaînes à la main ailleurs : importer la constante.
- Fichiers : modèles en `PascalCase.js` (`Ticket.js`), le reste en `camelCase.js` (`ticketService.js`), composants React en `PascalCase.jsx`.

### API

- Routes préfixées par `/api`, au pluriel : `GET /api/tickets`, `POST /api/tickets/:id/commentaires`.
- **Toute modification passe par l'API REST** (validation, droits, historique), puis le serveur émet l'événement Socket.io. Le client n'envoie par Socket.io que des événements sans effet durable (rejoindre un ticket, « en train d'écrire… »).
- Codes HTTP : `400` données invalides, `401` non connecté, `403` interdit, `404` introuvable, `409` conflit (ticket déjà pris, version périmée).
- Erreurs au format `{ "message": "…" }`. Ne jamais renvoyer une pile d'erreur ou un détail technique au client.
- Dans un service, signaler une erreur métier avec `throw new ErreurHttp(404, 'Ticket introuvable')` (`utils/ErreurHttp.js`) : le gestionnaire d'erreurs de `app.js` renvoie le bon code.
- **Déclarer chaque nouvelle route dans `ROUTES_PROTEGEES` (`app.js`)** : elle est alors protégée automatiquement, avec jeton obligatoire (401) et `LECTEUR` en lecture seule (403). Seules `/api/health`, `/api/auth/connexion` et la documentation `/api/docs` sont publiques ; une adresse inconnue répond 404.
- **Documenter chaque route dans `server/docs/openapi.yaml`**, dans la même PR. La documentation s'affiche sur `/api/docs` (Swagger UI) : bouton **Authorize** pour coller le jeton reçu à la connexion et tester les routes protégées. Réutiliser les éléments communs de `components` (`Erreur`, `NonAuthentifie`, `Interdit`, `Introuvable`). Le YAML ne peut pas importer `constantes.js` : recopier les valeurs autorisées à l'identique (un test vérifie les rôles ; en ajouter un pour chaque nouvelle liste).

```js
const ROUTES_PROTEGEES = {
  '/services': serviceRoutes, // → /api/services
};
```

- Pour restreindre une route à certains rôles, ajouter `autoriser` (`middlewares/auth.js`) :

```js
router.get('/', lister); // tout utilisateur connecté
router.post('/', autoriser('ADMIN'), creer); // ADMIN uniquement
```

`req.utilisateur = { id, role }` contient l'utilisateur connecté, lu dans le jeton.

- Pour les tickets, toujours appliquer les règles de `services/visibiliteService.js` : `filtreTicketsVisibles(utilisateur)` dans les recherches, `peutVoirTicket(utilisateur, ticket)` pour un ticket précis.

### Temps réel (Socket.io)

- Le serveur émet **après** l'enregistrement en base, avec `emettre(rooms, evenement, donnees)` (`server/src/socket/index.js`). Les noms de rooms viennent des fonctions du même fichier : `roomTicket(id)`, `roomUtilisateur(id)`, `ROOM_SUPPORT`, `ROOM_PILOTAGE`.

```js
emettre(roomTicket(ticket._id), 'commentaire:cree', commentaire);
emettre([ROOM_SUPPORT, ROOM_PILOTAGE], 'ticket:cree', resume);
```

- **Noms d'événements en français**, au format `objet:action` : `ticket:cree`, `ticket:modifie`, `commentaire:cree`, `notification:nouvelle`.
- Les rooms `user:<id>`, `support` et `pilotage` sont rejointes automatiquement à la connexion. La room d'un ticket se rejoint par `ticket:rejoindre` : le serveur vérifie le droit avec `peutVoirTicket`. Un utilisateur retiré des suiveurs reste dans la room jusqu'à sa déconnexion : la story qui retire un suiveur le fait sortir avec `io.in(roomUtilisateur(id)).socketsLeave(roomTicket(ticketId))`.
- Côté client, une seule connexion : `socket` (`client/src/tempsReel/socket.js`), ouverte et fermée par `AuthContext`. Une page s'abonne avec `socket.on` dans un `useEffect` et se désabonne avec `socket.off` au démontage. À l'événement `connect` (reconnexion), elle recharge ses données par l'API.

### Requêtes MongoDB

Le schéma et les index ont été conçus à partir des requêtes de l'application (cadrage 9.10). Pour qu'ils servent :

- **Listes** : ne charger que les champs affichés, avec `.select(...)` et `.lean()`. Un ticket embarque commentaires et historique : sans projection, une liste transporte des documents entiers.
- **`populate`** : toujours limité aux champs utiles, par exemple `.populate('demandeur', 'nom prenom')`.
- **Trier par priorité sur `rangPriorite`**, jamais sur `prioriteFinale` : le texte se trie par ordre alphabétique (BASSE, CRITIQUE, HAUTE, MOYENNE).
- **Champs tenus à jour ensemble** : `prioriteFinale` avec `rangPriorite` (`RANG_PRIORITE` de `constantes.js`), et `statut` avec `dateStatut`. Avec `ticket.save()`, le rang est recalculé automatiquement ; avec `updateOne` ou `findOneAndUpdate`, il faut écrire les deux champs.
- **Transitions et modifications concurrentes** : `optimisticConcurrency` ne protège que `ticket.save()`. Avec `updateOne` ou `findOneAndUpdate`, mettre l'état attendu dans le filtre (`{ _id, statut: 'EN_COURS' }`) et renvoyer `409` si rien n'a été modifié.
- **Numéro de ticket** : attribué par `prochainNumeroTicket()` (`services/numeroService.js`), affiché avec `formaterNumero()` (VIG-0042), lu dans une recherche avec `lireNumero()`.
- Un nouvel index se déclare dans le schéma, avec un commentaire qui cite la requête qu'il sert. Au démarrage, `syncIndexes()` aligne la base : rien à faire à la main.

### Sécurité (non négociable)

- **Droits et visibilité vérifiés côté serveur**, à chaque route. Masquer un bouton dans l'interface ne protège rien.
- Identité et rôle lus **dans le jeton JWT**, jamais dans le corps de la requête.
- Mots de passe hachés avec **bcrypt** (coût `BCRYPT_COST`, 10 à 12), jamais renvoyés par l'API.
- Toute configuration passe par `.env` (modèle : `.env.example`). Le `.env` n'est jamais commité.
- Chaque changement de statut, d'assignation, de priorité ou de domaine ajoute une entrée dans `historique`.

### Tests

- Outil : le module natif `node:test` (aucune dépendance). Lancer : `npm test`.
- Fichiers `*.test.js` à côté du code testé, par exemple `services/priorite.test.js`.
- À tester en priorité : la matrice de priorité, le calcul SLA en heures ouvrées, les transitions de statut, la prise en charge atomique, les règles de visibilité.

### Style

- Prettier et ESLint décident : lancer `npm run format` et `npm run lint` avant de pousser.
- Commentaires en français, pour expliquer **pourquoi** (une règle du cadrage, un choix technique), pas ce que fait la ligne.

## 6. Utiliser un assistant IA

C'est autorisé, à condition de rester responsable du code produit : on le comprend, on le relit, on le teste.
Donner à l'assistant [AGENTS.md](AGENTS.md) et la description de la story Jira au début de la conversation.
