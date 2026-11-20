// Son d'alerte d'un nouveau ticket (VIGIE-11), généré par le navigateur (Web Audio) : pas de
// fichier audio à charger. Deux notes brèves, montantes, volume bas.
let contexte = null;

export function jouerSonAlerte() {
  try {
    contexte ??= new AudioContext();
    // Le navigateur suspend le son tant que l'utilisateur n'a pas interagi avec la page :
    // une fois connecté (il a cliqué sur « Se connecter »), resume() le réactive
    contexte.resume();
    const debut = contexte.currentTime;
    for (const [frequence, decalage] of [
      [660, 0],
      [880, 0.12],
    ]) {
      const oscillateur = contexte.createOscillator();
      const volume = contexte.createGain();
      oscillateur.frequency.value = frequence;
      volume.gain.setValueAtTime(0.08, debut + decalage);
      volume.gain.exponentialRampToValueAtTime(0.001, debut + decalage + 0.25);
      oscillateur.connect(volume).connect(contexte.destination);
      oscillateur.start(debut + decalage);
      oscillateur.stop(debut + decalage + 0.25);
    }
  } catch {
    // Pas de son possible (navigateur, politique de lecture) : le toast et le badge suffisent
  }
}
