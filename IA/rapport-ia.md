# 4. Rapport d'utilisation de l'IA

> Brouillon à compléter par l'équipe, en particulier la partie de Zaid (section 1.2) et la conclusion.
> Le journal complet des prompts est dans [prompts.md](prompts.md).

## 4.1 Outils utilisés

### 4.1.1 Mathéa — Claude Code (Anthropic)

Assistant en ligne de commande, utilisé dans le terminal sur le dépôt du projet. Il peut lire et modifier les fichiers, lancer des commandes (tests, lint, build, git) et appeler des API.

| Usage              | Détail                                                                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Gestion de projet  | Création et mise à jour du backlog Jira via l'API REST (epics, stories, descriptions, story points, dépendances, sprints puis passage en Kanban) |
| Analyse du cadrage | Lecture de `Cadrage2.docx`, transformation du tableau de priorisation en backlog, repérage des points ambigus                                    |
| Documentation      | `CONTRIBUTING.md`, `docs/cadrage.md` (cadrage à jour des décisions), `AGENTS.md`, modèle de pull request, Definition of Done                     |
| Développement      | Initialisation du projet (VIGIE-36), authentification et rôles (VIGIE-2), tests unitaires                                                        |
| Outillage          | Dépôt GitHub (protection de `main`), liaison GitHub ↔ Jira, enregistrement automatique des prompts (hook)                                        |

Fichiers de contexte donnés à l'IA : `AGENTS.md` et `CLAUDE.md`, qui imposent les conventions du projet à chaque session.

### 4.1.2 Zaid — ChatGPT (OpenAI), connecté à Jira et GitHub

> À compléter par Zaid : version et offre utilisées, connecteurs, usage (stories traitées), prompts principaux.

Prompt de départ fourni pour VIGIE-4 : voir section 4.2.6.

## 4.2 Principaux prompts

Les prompts sont reproduits tels qu'envoyés (fautes de frappe comprises). Le résultat est résumé.

### 4.2.1 Transformer le cadrage en backlog

> « "C:\Users\mathe\...\Cadrage2.docx" » (après avoir proposé de remplir le backlog)

**Résultat** : 4 epics (un par lot) et 24 stories créés dans Jira, avec le besoin métier de chaque ligne du tableau MoSCoW et une étiquette `Must` / `Should` / `Could`.

### 4.2.2 Enrichir les stories

> « revois les description »

**Résultat** : chaque story reçoit un récit utilisateur, des critères d'acceptation, des notes techniques et une section « À préciser ». L'IA a relevé 4 points que le cadrage ne tranchait pas (matrice impact × urgence, affichage des doublons, seuil d'alerte SLA, contraintes des pièces jointes). **Ces décisions ont été prises par l'équipe**, puis reportées dans les tickets.

### 4.2.3 Estimer et redécouper

> « mets le nombre de story points aussi, nous sommes développeurs junior »
> « non les story points on fonctionne de 0 à 13 pas plus stp et si c'est 13 redécoupe les US »

**Résultat** : estimation en suite de Fibonacci, puis découpage des 3 stories à 13 points en 9 stories plus petites.

### 4.2.4 Adapter la méthode au délai

> « on a 7 jours à peu près » / « sinon on enlève la méthode scrum et on prend kanban? »

**Résultat** : l'IA a signalé que 135 points en 7 jours n'étaient pas réalistes, proposé un MVP (les `Must`) et argumenté le passage en Kanban (pas de cérémonies de sprint, limite de travail en cours). Sprints supprimés, backlog trié par priorité et dépendances.

### 4.2.5 Partager le contexte avec un coéquipier sans Claude Code

> « ok zaid n'a pas claude code, comment pouvons nou slui donner tout le contexte du projet etc pour qu'il respecte notre façon de dev ? »

**Résultat** : les règles ont été écrites dans le dépôt (`CONTRIBUTING.md`, `docs/cadrage.md`, `AGENTS.md`) plutôt que gardées dans une conversation. Elles sont versionnées et relues en pull request comme le code.

### 4.2.6 Rédiger un prompt pour un autre assistant

> « donnes moi un bon prompt pour lui histoire qu'il puisse commencer sur la jira 4 de la meilleure des façons »

**Résultat** : un prompt en 5 étapes pour ChatGPT : lire le contexte (Jira, `AGENTS.md`, modèles), reformuler et poser des questions, **proposer un plan et attendre une validation**, coder fichier par fichier, préparer la pull request. Il signale les dépendances (middleware d'authentification de VIGIE-2) et interdit à l'IA de modifier Jira ou de pousser du code.

### 4.2.7 Développer une story

> « j'ai passé la VIGIE 36 à en cours vasy developpe » / « on peut passer au dev de la VIGIE-2 »

**Résultat** : code, tests, vérification de bout en bout et pull request respectant la Definition of Done. Chaque pull request a été relue et fusionnée par un membre de l'équipe.

## 4.3 Analyse critique des résultats obtenus

### Ce qui a bien fonctionné

- **Gain de temps sur les tâches répétitives** : saisir 30 stories détaillées dans Jira, avec dépendances et estimations, aurait pris plusieurs heures à la main.
- **Repérage des manques** : l'IA a trouvé des besoins absents du backlog (gestion des utilisateurs par l'admin, initialisation du projet, préparation de la soutenance) et des ambiguïtés du cadrage.
- **Vérification systématique** : chaque développement a été accompagné de tests (17 tests unitaires pour VIGIE-2) et d'un test de bout en bout sur une base temporaire.
- **Respect des conventions** : grâce à `AGENTS.md`, le code produit suit les règles de l'équipe (organisation des dossiers, nommage, sécurité).

### Erreurs de l'IA et comment elles ont été détectées

| Erreur                                                                                          | Détection                                                                          | Correction                                   |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------- |
| Les 32 liens de dépendance Jira créés **à l'envers** (paramètres de l'API inversés)             | En calculant les stories débloquées : le résultat était incohérent                 | Liens supprimés et recréés, sens vérifié     |
| Ordre d'abandon des fonctionnalités **mal recopié** (présence placée avant la satisfaction)     | Relecture par l'équipe, en comparant avec le cadrage                               | Tickets corrigés                             |
| Classement du backlog **partiellement appliqué** par l'API Jira                                 | Vérification automatique de l'ordre après l'opération                              | Reclassement ticket par ticket               |
| Un test unitaire **mal écrit** (il testait une copie de la requête)                             | Le test échouait alors que le code était correct                                   | Test corrigé                                 |
| Test de bout en bout lancé **sur le mauvais serveur** (port déjà occupé par une autre instance) | Réponse vide inattendue, analyse des journaux                                      | Test relancé sur un port libre               |
| Informations **non vérifiables** sur les connecteurs ChatGPT (sources : articles de blog)       | L'IA l'a signalé elle-même ; l'option n'était pas disponible avec l'offre utilisée | Méthode de repli (copier-coller du contexte) |

**Enseignement** : l'IA se trompe surtout sur les détails techniques (sens d'un paramètre, échappement de caractères) et quand elle recopie une information sans la revérifier. Ses erreurs ont été trouvées parce que **chaque action était suivie d'une vérification** (relecture de l'état dans Jira, tests, relecture humaine). Sans ces vérifications, les dépendances inversées seraient restées dans le projet.

### Décisions laissées à l'équipe

L'IA a proposé, l'équipe a décidé : matrice de priorité, seuils SLA, passage des pièces jointes en `Should`, passage en Kanban, découpage des stories. Quand l'IA a pris une décision par défaut (pas d'inscription libre, jeton stocké dans `localStorage`), elle l'a signalée explicitement pour validation.

### Limites et risques

- **Compréhension du code** : le code généré doit être compris par l'équipe pour la soutenance et la maintenance. D'où la relecture obligatoire en pull request par un autre membre.
- **Interface non testée par l'IA** : elle n'a pas pu piloter un navigateur ; l'affichage a été vérifié par l'équipe.
- **Dépendance à l'outil** : sur un projet de 7 jours, le risque est de livrer plus que ce que l'équipe maîtrise. Le découpage en petites stories et la Definition of Done limitent ce risque.
- **Confidentialité** : aucun secret n'a été transmis dans les prompts. Le jeton Jira est resté dans une variable d'environnement, jamais dans la conversation.

## 4.4 Conclusion

> À rédiger par l'équipe : bilan personnel, ce que vous referiez ou feriez autrement.
