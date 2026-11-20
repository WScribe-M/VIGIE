// Appels à l'API : ajoute le jeton et transforme les erreurs en exceptions lisibles
const CLE_JETON = 'vigie.jeton';

export const jetonStocke = {
  lire: () => localStorage.getItem(CLE_JETON),
  ecrire: (jeton) => localStorage.setItem(CLE_JETON, jeton),
  effacer: () => localStorage.removeItem(CLE_JETON),
};

// Millisecondes restantes avant l'expiration du jeton (champ exp du JWT).
// Le client lit cette date pour savoir quand renouveler ; il ne vérifie rien : c'est le serveur
// qui contrôle la signature.
export function tempsRestantJeton(jeton) {
  try {
    const contenu = JSON.parse(atob(jeton.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return contenu.exp * 1000 - Date.now();
  } catch {
    return 0;
  }
}

export class ErreurApi extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function appelerApi(chemin, { methode = 'GET', corps } = {}) {
  const entetes = { 'Content-Type': 'application/json' };
  const jeton = jetonStocke.lire();
  if (jeton) {
    entetes.Authorization = `Bearer ${jeton}`;
  }

  const reponse = await fetch(`/api${chemin}`, {
    method: methode,
    headers: entetes,
    body: corps === undefined ? undefined : JSON.stringify(corps),
  });
  const donnees = await reponse.json().catch(() => ({}));

  if (!reponse.ok) {
    throw new ErreurApi(reponse.status, donnees.message ?? 'Erreur inattendue');
  }
  return donnees;
}
