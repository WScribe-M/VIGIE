// Règles de visibilité des tickets (cadrage, section 2) :
// - GESTIONNAIRE, ADMIN et LECTEUR voient tous les tickets ;
// - un CLIENT voit ceux dont il est le demandeur, le suiveur ou une personne en copie.
// On se base sur le demandeur et non sur le créateur : pour un ticket créé par un technicien
// au nom d'un utilisateur (VIGIE-14), c'est l'utilisateur qui doit le voir.

const ROLES_VOYANT_TOUT = ['GESTIONNAIRE', 'ADMIN', 'LECTEUR'];

// Filtre MongoDB à ajouter à toute recherche de tickets
export function filtreTicketsVisibles(utilisateur) {
  if (ROLES_VOYANT_TOUT.includes(utilisateur.role)) {
    return {};
  }
  return {
    $or: [{ demandeur: utilisateur.id }, { suiveurs: utilisateur.id }, { enCopie: utilisateur.id }],
  };
}

// Pour un ticket déjà chargé (lecture d'un ticket, accès à une room Socket.io)
export function peutVoirTicket(utilisateur, ticket) {
  if (ROLES_VOYANT_TOUT.includes(utilisateur.role)) {
    return true;
  }
  const id = String(utilisateur.id);
  const contient = (liste = []) =>
    liste.some((personne) => String(personne._id ?? personne) === id);
  return (
    String(ticket.demandeur?._id ?? ticket.demandeur) === id ||
    contient(ticket.suiveurs) ||
    contient(ticket.enCopie)
  );
}
