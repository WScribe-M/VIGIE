// Page d'accueil et menu selon le rôle (cadrage, section 3.2).
// C'est du confort d'affichage : les droits réels sont vérifiés par l'API.
export const PAGES = {
  mesDemandes: { chemin: '/mes-demandes', libelle: 'Mes demandes' },
  maFile: { chemin: '/ma-file', libelle: 'Ma file' },
  pilotage: { chemin: '/pilotage', libelle: 'Pilotage' },
  administration: { chemin: '/administration', libelle: 'Administration' },
};

export const MENU_PAR_ROLE = {
  CLIENT: [PAGES.mesDemandes],
  GESTIONNAIRE: [PAGES.maFile, PAGES.pilotage],
  LECTEUR: [PAGES.pilotage],
  ADMIN: [PAGES.administration, PAGES.pilotage],
};

export function accueilDuRole(role) {
  return MENU_PAR_ROLE[role]?.[0].chemin ?? '/connexion';
}
