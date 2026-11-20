// Matrice impact × urgence (cadrage 9.1, VIGIE-5). La priorité n'est jamais saisie par le
// demandeur : il répond à deux questions, le serveur en déduit la priorité.
// Lignes : impact (qui est touché ?). Colonnes : urgence (peut-on continuer à travailler ?).
const MATRICE = {
  FORT: { FAIBLE: 'MOYENNE', MOYENNE: 'HAUTE', HAUTE: 'CRITIQUE' },
  MOYEN: { FAIBLE: 'BASSE', MOYENNE: 'MOYENNE', HAUTE: 'HAUTE' },
  FAIBLE: { FAIBLE: 'BASSE', MOYENNE: 'BASSE', HAUTE: 'MOYENNE' },
};

// Impact et urgence doivent avoir été validés (IMPACTS et URGENCES de constantes.js)
export function calculerPriorite(impact, urgence) {
  return MATRICE[impact][urgence];
}
