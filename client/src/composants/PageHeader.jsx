import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';
import { TRAIT_ICONE } from '../styles/icones.js';
import { Avatar } from './Avatar.jsx';
import styles from './PageHeader.module.css';

/**
 * En-tête des écrans connectés (docs/ecrans/README.md, gabarit commun) : lien retour sur une page de
 * détail, puis l'avatar à droite. La recherche et la cloche s'ajouteront avec leurs stories
 * (VIGIE-6, notifications) : pas d'élément qui ne mène nulle part.
 *
 * @param retour { chemin, libelle } : « ← Mes demandes »
 */
export function PageHeader({ retour }) {
  const { utilisateur } = useAuth();

  return (
    <header className={styles.entete}>
      {retour && (
        <Link to={retour.chemin} className={styles.retour}>
          <ArrowLeft size={16} strokeWidth={TRAIT_ICONE} aria-hidden="true" />
          {retour.libelle}
        </Link>
      )}
      <span className={styles.espace} />
      {utilisateur && (
        <Avatar id={utilisateur.id} prenom={utilisateur.prenom} nom={utilisateur.nom} taille={40} />
      )}
    </header>
  );
}
