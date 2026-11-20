// Libellés affichés, à la lettre (handoff de design). Les clés sont les valeurs stockées
// par l'API (server/src/models/constantes.js) : ne jamais afficher la valeur brute.

export const LIBELLES_STATUT = {
  NOUVEAU: 'Nouveau',
  EN_COURS: 'En cours',
  EN_ATTENTE_DEMANDEUR: 'En attente du demandeur',
  TERMINE: 'Terminé',
  ABANDONNE: 'Abandonné',
};

export const LIBELLES_PRIORITE = {
  BASSE: 'Basse',
  MOYENNE: 'Moyenne',
  HAUTE: 'Haute',
  CRITIQUE: 'Critique',
};

// Niveau d'alerte SLA (cadrage 9.2) : < 75 % du délai, ≥ 75 %, ≥ 100 %, statut EN_ATTENTE_DEMANDEUR.
// Le serveur devra calculer et renvoyer ces mêmes clés.
export const LIBELLES_SLA = {
  DANS_LES_TEMPS: 'Dans les temps',
  ECHEANCE_PROCHE: 'Échéance proche',
  EN_RETARD: 'En retard',
  SUSPENDU: 'Suspendu',
};

export const LIBELLES_ROLE = {
  CLIENT: 'Client',
  GESTIONNAIRE: 'Gestionnaire',
  ADMIN: 'Administrateur',
  LECTEUR: 'Lecteur',
};

// Questions guidées de la création : la priorité n'est jamais choisie, elle est calculée
export const LIBELLES_IMPACT = {
  FAIBLE: 'Moi seul',
  MOYEN: 'Mon équipe',
  FORT: 'Toute l’entreprise',
};

export const LIBELLES_URGENCE = {
  FAIBLE: 'Je peux continuer',
  MOYENNE: 'Mode dégradé',
  HAUTE: 'Je suis bloqué',
};

// Phrase d'aide sous chaque réponse (cartes de choix, docs/ecrans/composants.md)
export const DESCRIPTIONS_IMPACT = {
  FAIBLE: 'Mon poste ou mon compte uniquement.',
  MOYEN: 'Plusieurs collègues de mon service.',
  FORT: 'Plusieurs services ou sites.',
};

export const DESCRIPTIONS_URGENCE = {
  FAIBLE: 'Gênant, mais je travaille normalement.',
  MOYENNE: 'Je travaille, plus lentement ou autrement.',
  HAUTE: 'Impossible de faire mon travail.',
};

export const LIBELLES_DOMAINE = {
  RESEAU: 'Réseau',
  INFRASTRUCTURE: 'Infrastructure',
  APPLICATIF: 'Applicatif',
  BASE_DE_DONNEES: 'Base de données',
  A_QUALIFIER: 'À qualifier',
};

// « Vigie » : ticket créé par le demandeur lui-même dans l'application (09 Pilotage)
export const LIBELLES_CANAL = {
  APPLICATION: 'Vigie',
  TELEPHONE: 'Téléphone',
  EMAIL: 'E-mail',
  DIRECT: 'Sur place',
};
