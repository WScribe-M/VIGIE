import { LogOut } from 'lucide-react';
import { Fragment } from 'react';
import { NavLink } from 'react-router';
import { TAILLE_ICONE, TRAIT_ICONE } from '../styles/icones.js';
import { LIBELLES_ROLE } from '../styles/libelles.js';
import { Avatar } from './Avatar.jsx';
import { Logo } from './Logo.jsx';
import styles from './Sidebar.module.css';

/**
 * Barre latérale par rôle (docs/ecrans/composants.md, capture composants-03-barre-laterale-et-en-tete).
 * @param entrees     [{ chemin, libelle, icone, compteur?, etiquette?, section?, actif? }] (voir PAGES, roles.js)
 *                    `icone` est un composant Lucide.
 *                    `section` ouvre un groupe (« Administration »), `etiquette` ajoute « Lecture seule »,
 *                    `actif` force l'état actif (page /styleguide) ; sinon, la route courante décide.
 * @param utilisateur { id, prenom, nom, role }
 */
export function Sidebar({ entrees, utilisateur, onDeconnexion }) {
  return (
    <nav className={styles.barre} aria-label="Navigation principale">
      <Logo className={styles.logo} />

      {entrees.map((entree) => {
        const Icone = entree.icone;
        return (
          <Fragment key={entree.chemin}>
            {entree.section && <span className={styles.section}>{entree.section}</span>}
            <NavLink
              to={entree.chemin}
              className={({ isActive }) =>
                `${styles.entree} ${(entree.actif ?? isActive) ? styles.actif : ''}`
              }
            >
              {Icone && (
                <Icone
                  className={styles.icone}
                  size={TAILLE_ICONE.navigation}
                  strokeWidth={TRAIT_ICONE}
                  aria-hidden="true"
                />
              )}
              <span className={styles.libelle}>{entree.libelle}</span>
              {entree.compteur > 0 && <span className={styles.compteur}>{entree.compteur}</span>}
              {entree.etiquette && <span className={styles.etiquette}>{entree.etiquette}</span>}
            </NavLink>
          </Fragment>
        );
      })}

      <span className={styles.espace} />

      <div className={styles.pied}>
        <Avatar
          id={utilisateur.id}
          prenom={utilisateur.prenom}
          nom={utilisateur.nom}
          paire={utilisateur.paire}
          taille={36}
        />
        <div className={styles.identite}>
          <span className={styles.nom}>
            {utilisateur.prenom} {utilisateur.nom}
          </span>
          <span className={styles.role}>{LIBELLES_ROLE[utilisateur.role]}</span>
        </div>
        <button
          type="button"
          className={styles.deconnexion}
          onClick={onDeconnexion}
          aria-label="Se déconnecter"
          title="Se déconnecter"
        >
          <LogOut size={18} strokeWidth={TRAIT_ICONE} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
