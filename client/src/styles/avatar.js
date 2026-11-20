// Couleurs d'avatar : six paires fond / initiales (tokens --color-avatar-N-*).
// Un même identifiant donne toujours la même paire, pour reconnaître une personne d'un écran à l'autre.
const NOMBRE_DE_PAIRES = 6;

export function paireAvatar(identifiant) {
  const texte = String(identifiant ?? '');
  let somme = 0;
  for (const caractere of texte) somme += caractere.codePointAt(0);
  return (somme % NOMBRE_DE_PAIRES) + 1;
}

// `?? ''` et non une valeur par défaut : l'API renvoie souvent `null`, que les valeurs par défaut ne remplacent pas
export function initiales(prenom, nom) {
  return `${(prenom ?? '').trim().charAt(0)}${(nom ?? '').trim().charAt(0)}`.toUpperCase();
}
