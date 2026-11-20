import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';
import { TRAIT_ICONE } from '../styles/icones.js';
import { Avatar } from './Avatar.jsx';
import { NotificationBell } from './NotificationBell.jsx';
import styles from './PageHeader.module.css';

/**
 * En-tête des écrans connectés (docs/ecrans/README.md, gabarit commun) : lien retour sur une page de
 * détail, puis la cloche des notifications (VIGIE-11) et l'avatar à droite. La recherche
 * s'ajoutera avec VIGIE-6 : pas d'élément qui ne mène nulle part.
 *
 * @param retour { chemin, libelle } : « ← Mes demandes »
 * @param gauche contenu propre à l'écran, à gauche (« En direct » dans « À traiter »)
 */
export function PageHeader({ retour, gauche }) {
  const { utilisateur } = useAuth();

  return (
    <header className={styles.entete}>
      {retour && (
        <Link to={retour.chemin} className={styles.retour}>
          <ArrowLeft size={16} strokeWidth={TRAIT_ICONE} aria-hidden="true" />
          {retour.libelle}
        </Link>
      )}
      {gauche}
      <span className={styles.espace} />
      <NotificationBell />
      {utilisateur && (
        <Avatar id={utilisateur.id} prenom={utilisateur.prenom} nom={utilisateur.nom} taille={40} />
      )}
    </header>
  );
}
