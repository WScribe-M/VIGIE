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

export const LIBELLES_DOMAINE = {
  RESEAU: 'Réseau',
  INFRASTRUCTURE: 'Infrastructure',
  APPLICATIF: 'Applicatif',
  BASE_DE_DONNEES: 'Base de données',
  A_QUALIFIER: 'À qualifier',
};

export const LIBELLES_CANAL = {
  APPLICATION: 'Application',
  TELEPHONE: 'Téléphone',
  EMAIL: 'E-mail',
  DIRECT: 'Sur place',
};
