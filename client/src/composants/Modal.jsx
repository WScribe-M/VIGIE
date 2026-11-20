import { useEffect, useRef } from 'react';
import styles from './Modal.module.css';

/**
 * Fenêtre modale (docs/ecrans/composants.md, Modal) sur l'élément natif <dialog> : le navigateur
 * piège le focus, ferme avec Échap et rend le focus au bouton qui l'a ouverte.
 *
 * @param ouverte  affichée ou non
 * @param titre    « Terminer le ticket »
 * @param onFermer appelée par Échap ou « Annuler »
 * @param actions  boutons, à droite (Secondaire puis action principale)
 */
export function Modal({ ouverte, titre, onFermer, actions, children }) {
  const refDialogue = useRef(null);

  useEffect(() => {
    const dialogue = refDialogue.current;
    if (ouverte && !dialogue.open) dialogue.showModal();
    if (!ouverte && dialogue.open) dialogue.close();
  }, [ouverte]);

  return (
    <dialog
      ref={refDialogue}
      className={styles.modale}
      aria-labelledby="titre-modale"
      // Échap : on laisse React décider de la fermeture pour garder l'état synchronisé
      onCancel={(event) => {
        event.preventDefault();
        onFermer();
      }}
    >
      <h2 id="titre-modale" className={styles.titre}>
        {titre}
      </h2>
      <div className={styles.contenu}>{children}</div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </dialog>
  );
}
