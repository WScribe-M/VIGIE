import { ChartColumn, House, Inbox, Users } from 'lucide-react';

// Page d'accueil et menu selon le rôle (cadrage, section 3.2).
// C'est du confort d'affichage : les droits réels sont vérifiés par l'API.
// Chaque page porte son icône Lucide (barre latérale) : la renommer ne fait pas disparaître l'icône.
// Une page s'ajoute ici avec sa story, jamais avant d'exister (cadrage 9.11).
export const PAGES = {
  mesDemandes: { chemin: '/mes-demandes', libelle: 'Mes demandes', icone: House },
  maFile: { chemin: '/ma-file', libelle: 'Ma file', icone: Inbox },
  pilotage: { chemin: '/pilotage', libelle: 'Pilotage', icone: ChartColumn },
  // Page provisoire : le design la découpe en « Utilisateurs » (users) et « Services » (server)
  administration: { chemin: '/administration', libelle: 'Administration', icone: Users },
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
