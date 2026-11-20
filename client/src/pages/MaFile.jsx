import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Clock,
  Inbox,
  LoaderCircle,
  MessageCircleQuestionMark,
  Users,
  WifiOff,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { appelerApi } from '../api.js';
import { Button } from '../composants/Button.jsx';
import { EmptyState, ErrorState, Skeleton } from '../composants/Etats.jsx';
import { PageHeader } from '../composants/PageHeader.jsx';
import { PriorityBadge } from '../composants/PriorityBadge.jsx';
import { SlaBadge } from '../composants/SlaBadge.jsx';
import { Tabs } from '../composants/Tabs.jsx';
import { ICONES_STATUT, IconeService, TRAIT_ICONE } from '../styles/icones.js';
import { LIBELLES_PRIORITE } from '../styles/libelles.js';
import { socket } from '../tempsReel/socket.js';
import { formaterDuree, formaterDureeOuvree } from '../utils/dates.js';
import styles from './MaFile.module.css';

// « À traiter » du technicien (VIGIE-31, docs/ecrans/07-ma-file.md) : ce qu'il faut traiter maintenant.
// Les données viennent de GET /api/tickets/ma-file ; la page se recharge à chaque ticket créé ou
// modifié (room support), l'API restant la source de vérité.
// VIGIE-50 : une partie de la file à la fois, par onglets, plutôt que trois tableaux empilés.

// L'étiquette « Nouveau · à l'instant » reste une minute sur une ligne arrivée en direct
const DUREE_NOUVEAU = 60 * 1000;

// Un onglet par partie de la file. `parametre` est sa valeur dans l'adresse (?onglet=…) : on
// retrouve ainsi l'onglet quitté en revenant d'une fiche ticket. L'icône est celle du statut que
// contient l'onglet, puisqu'il n'y a pas de colonne Statut.
const ONGLETS = [
  {
    cle: 'aPrendre',
    parametre: 'a-prendre',
    titre: 'À prendre',
    icone: ICONES_STATUT.NOUVEAU,
    colonneSla: 'Échéance',
    vide: {
      icone: Inbox,
      titre: 'Aucun ticket à prendre',
      texte: 'Bonne nouvelle : la file est vide. Les nouveaux tickets apparaîtront ici en direct.',
    },
  },
  {
    cle: 'enCours',
    parametre: 'en-cours',
    titre: 'Mes tickets en cours',
    icone: ICONES_STATUT.EN_COURS,
    colonneSla: 'Résolution',
    vide: {
      icone: LoaderCircle,
      titre: 'Aucun ticket en cours',
      texte: 'Prenez un ticket dans l’onglet À prendre.',
    },
  },
  {
    cle: 'enAttente',
    parametre: 'en-attente',
    titre: 'En attente du demandeur',
    icone: ICONES_STATUT.EN_ATTENTE_DEMANDEUR,
    colonneSla: 'Ancienneté',
    vide: { icone: MessageCircleQuestionMark, titre: 'Aucun ticket en attente du demandeur' },
  },
];

// Texte du badge SLA : « reste 28 min », « de 3 h » (en retard), « depuis 4 j » (suspendu)
function detailSla(sla, minutesParJour) {
  if (!sla) return undefined;
  if (sla.niveau === 'SUSPENDU') return `depuis ${formaterDuree(sla.minutes)}`;
  const duree = formaterDureeOuvree(sla.minutes, minutesParJour);
  return sla.niveau === 'EN_RETARD' ? `de ${duree}` : `reste ${duree}`;
}

// Texte visible, court et direct (décision du 20/11) : « Reste 2 h », « Retard de 3 h »,
// « Depuis 4 j ». Le niveau se voit à la couleur, au fond et à l'icône ; le libellé complet
// (« Échéance proche · reste 25 min ») reste lu par les lecteurs d'écran et en infobulle.
function texteSla(sla, minutesParJour) {
  if (sla.niveau === 'SUSPENDU') return `Depuis ${formaterDuree(sla.minutes)}`;
  const duree = formaterDureeOuvree(sla.minutes, minutesParJour);
  return sla.niveau === 'EN_RETARD' ? `Retard de ${duree}` : `Reste ${duree}`;
}

// Décision du 20/11 : ni « Prendre en charge » ni bouton « Ouvrir » dans la liste. Toute la ligne
// ouvre le ticket ; on s'assigne depuis la fiche, après l'avoir lu. Le titre reste un vrai lien :
// c'est lui qu'on atteint au clavier (Tab, Entrée) et que lit le lecteur d'écran.
function Ligne({ ligne, minutesParJour, nouveau }) {
  const navigate = useNavigate();
  const enRetard = ligne.sla?.niveau === 'EN_RETARD';
  return (
    <tr
      className={`${styles.ligneCliquable} ${enRetard ? styles.enRetard : ''} ${nouveau ? styles.surbrillance : ''}`}
      onClick={() => navigate(`/tickets/${ligne._id}`)}
    >
      <td className={`${styles.numero} chiffres`}>{ligne.reference}</td>
      <td>
        <div className={styles.cellTitre}>
          <IconeService nom={ligne.service?.nom} size={16} className={styles.iconeService} />
          <div className={styles.textesTitre}>
            <Link to={`/tickets/${ligne._id}`} className={styles.titre} title={ligne.titre}>
              {ligne.titre}
            </Link>
            <span className={styles.meta}>
              {ligne.concernes > 1 && (
                <span className={styles.concernes}>
                  <Users size={13} strokeWidth={TRAIT_ICONE} aria-hidden="true" />
                  {ligne.concernes} concernés
                </span>
              )}
              {/* Critère VIGIE-31 : les tickets « Autre / je ne sais pas » sont à qualifier */}
              {ligne.domaine === 'A_QUALIFIER' && (
                <span className={styles.aQualifier}>À qualifier</span>
              )}
              {nouveau && <span className={styles.nouveau}>Nouveau · à l’instant</span>}
            </span>
          </div>
        </div>
      </td>
      <td>
        <PriorityBadge priorite={ligne.prioriteFinale} />
      </td>
      <td>
        {ligne.sla && (
          <SlaBadge
            niveau={ligne.sla.niveau}
            detail={detailSla(ligne.sla, minutesParJour)}
            texte={texteSla(ligne.sla, minutesParJour)}
          />
        )}
      </td>
      <td className={styles.demandeur}>
        {ligne.demandeur && `${ligne.demandeur.prenom} ${ligne.demandeur.nom}`}
      </td>
    </tr>
  );
}

// Tri par colonne (décision du 20/11, comme Zendesk ou Jira Service Management) : un clic sur
// l'en-tête trie, un deuxième inverse le sens, un troisième revient à l'ordre par défaut de l'API.
// Un seul critère à la fois. Le tri se fait ici, sur les lignes déjà chargées (50 au plus).
const RANG_PRIORITE = Object.fromEntries(Object.keys(LIBELLES_PRIORITE).map((p, i) => [p, i]));
const COLONNES_TRIABLES = {
  numero: { valeur: (l) => l.numero, premierSens: 'asc' },
  titre: { valeur: (l) => l.titre.toLowerCase(), premierSens: 'asc' },
  // Critique d'abord au premier clic
  priorite: { valeur: (l) => RANG_PRIORITE[l.prioriteFinale], premierSens: 'desc' },
  // Échéance la plus proche, ou attente la plus ancienne, d'abord
  sla: {
    valeur: (l) => new Date(l.statut === 'EN_ATTENTE_DEMANDEUR' ? l.dateStatut : l.echeanceSla),
    premierSens: 'asc',
  },
  demandeur: {
    valeur: (l) => `${l.demandeur?.nom ?? ''} ${l.demandeur?.prenom ?? ''}`.toLowerCase(),
    premierSens: 'asc',
  },
};

function trier(lignes, tri) {
  if (!tri) return lignes;
  const { valeur } = COLONNES_TRIABLES[tri.colonne];
  const signe = tri.sens === 'asc' ? 1 : -1;
  return [...lignes].sort((a, b) => {
    const va = valeur(a);
    const vb = valeur(b);
    if (va < vb) return -signe;
    if (va > vb) return signe;
    return 0;
  });
}

// Clic sur un en-tête : premier sens, puis sens inverse, puis ordre par défaut (null)
function triSuivant(tri, colonne) {
  const { premierSens } = COLONNES_TRIABLES[colonne];
  if (tri?.colonne !== colonne) return { colonne, sens: premierSens };
  if (tri.sens === premierSens) return { colonne, sens: premierSens === 'asc' ? 'desc' : 'asc' };
  return null;
}

function EnteteTriable({ colonne, libelle, tri, onTrier }) {
  const actif = tri?.colonne === colonne;
  const Icone = !actif ? ArrowUpDown : tri.sens === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th
      scope="col"
      aria-sort={actif ? (tri.sens === 'asc' ? 'ascending' : 'descending') : undefined}
    >
      <button
        type="button"
        className={`${styles.boutonTri} ${actif ? styles.triActif : ''}`}
        onClick={() => onTrier(colonne)}
        title={`Trier par ${libelle}`}
      >
        {libelle}
        <Icone size={13} strokeWidth={TRAIT_ICONE} aria-hidden="true" />
      </button>
    </th>
  );
}

// Tableau de l'onglet actif. Le tri vient de la page : chaque onglet garde le sien quand on en change.
function TableauOnglet({ onglet, lignes, tri, onTrier, minutesParJour, nouveaux }) {
  if (!lignes.length) {
    const { icone, titre, texte } = onglet.vide;
    return <EmptyState icone={icone} titre={titre} texte={texte} />;
  }
  const lignesTriees = trier(lignes, tri);
  const entete = (colonne, libelle) => (
    <EnteteTriable colonne={colonne} libelle={libelle} tri={tri} onTrier={onTrier} />
  );
  return (
    <div className={`${styles.carte} ${styles.defilement}`}>
      <table className={styles.tableau}>
        <thead>
          <tr>
            {entete('numero', 'N°')}
            {entete('titre', 'Titre')}
            {/* Pas de colonne Statut (décision du 20/11) : l'onglet le dit déjà */}
            {entete('priorite', 'Priorité')}
            {entete('sla', onglet.colonneSla)}
            {entete('demandeur', 'Demandeur')}
          </tr>
        </thead>
        <tbody>
          {lignesTriees.map((ligne) => (
            <Ligne
              key={ligne._id}
              ligne={ligne}
              minutesParJour={minutesParJour}
              nouveau={nouveaux.has(ligne._id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Carte KPI. Avec `onOuvrir`, la carte est un bouton qui ouvre l'onglet correspondant (VIGIE-50)
function Kpi({ libelle, icone: Icone, valeur, detail, alerte, onOuvrir }) {
  const Balise = onOuvrir ? 'button' : 'div';
  return (
    <Balise
      type={onOuvrir ? 'button' : undefined}
      onClick={onOuvrir}
      className={`${styles.kpi} ${alerte ? styles.kpiAlerte : ''} ${onOuvrir ? styles.kpiBouton : ''}`}
    >
      <span className={styles.kpiLibelle}>
        {libelle}
        <Icone size={18} strokeWidth={TRAIT_ICONE} aria-hidden="true" />
      </span>
      <span className={`${styles.kpiValeur} chiffres`}>{valeur}</span>
      {detail && <span className={styles.kpiDetail}>{detail}</span>}
    </Balise>
  );
}

function Chargement() {
  return (
    <div className={styles.carte} aria-busy="true" aria-label="Chargement de la file">
      {[1, 2, 3, 4].map((n) => (
        <div key={n} className={styles.ligneSquelette}>
          <Skeleton largeur={56} hauteur={10} />
          <Skeleton largeur="50%" hauteur={12} />
          <Skeleton largeur={80} hauteur={24} rond />
        </div>
      ))}
    </div>
  );
}

const heureMinute = (date) =>
  date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

export function MaFile() {
  const [file, setFile] = useState(null);
  const [erreur, setErreur] = useState(false);
  const [majLe, setMajLe] = useState(null);
  // Coupure du temps réel après une première connexion. Au chargement, « pas encore connecté »
  // n'est pas une coupure : le bandeau ne s'affiche qu'après un vrai « disconnect ».
  const [coupe, setCoupe] = useState(false);
  const [nouveaux, setNouveaux] = useState(new Set());
  const idsConnus = useRef(null);
  // Onglet lu dans l'adresse ; « À prendre » par défaut ou si la valeur est inconnue
  const [parametres, setParametres] = useSearchParams();
  const onglet = ONGLETS.find((o) => o.parametre === parametres.get('onglet')) ?? ONGLETS[0];
  // Un tri par onglet, gardé quand on change d'onglet (null = ordre de l'API)
  const [tris, setTris] = useState({ aPrendre: null, enCours: null, enAttente: null });
  // Nouveau ticket arrivé dans « À prendre » : signalé sur l'onglet tant qu'on ne l'a pas ouvert
  const [nouveauAPrendre, setNouveauAPrendre] = useState(false);

  function ouvrirOnglet(cle) {
    // Le signal concerne « À prendre » : il s'éteint quand on y entre, ou quand on en sort (on y
    // a alors déjà vu la ligne surlignée)
    if (cle === 'aPrendre' || onglet.cle === 'aPrendre') setNouveauAPrendre(false);
    const { parametre } = ONGLETS.find((o) => o.cle === cle);
    // replace : changer d'onglet n'ajoute pas d'étape à « Retour »
    setParametres(cle === 'aPrendre' ? {} : { onglet: parametre }, { replace: true });
  }

  // Les états ne changent que dans la réponse de l'API, jamais directement dans l'effet
  const charger = useCallback(() => {
    appelerApi('/tickets/ma-file')
      .then((reponse) => {
        // Lignes « À prendre » apparues depuis le chargement précédent : surlignées (fiche 07)
        const ids = reponse.aPrendre.map((ligne) => ligne._id);
        if (idsConnus.current) {
          const arrivees = ids.filter((id) => !idsConnus.current.has(id));
          if (arrivees.length) {
            setNouveauAPrendre(true);
            setNouveaux((actuels) => new Set([...actuels, ...arrivees]));
            setTimeout(() => {
              setNouveaux(
                (actuels) => new Set([...actuels].filter((id) => !arrivees.includes(id))),
              );
            }, DUREE_NOUVEAU);
          }
        }
        idsConnus.current = new Set(ids);
        setFile(reponse);
        setErreur(false);
        setMajLe(new Date());
      })
      .catch(() => setErreur(true));
  }, []);

  useEffect(() => {
    charger();
    const surConnexion = () => {
      setCoupe(false);
      charger(); // après une coupure, on se resynchronise par l'API
    };
    const surDeconnexion = () => setCoupe(true);
    socket.on('ticket:cree', charger);
    socket.on('ticket:modifie', charger);
    socket.on('connect', surConnexion);
    socket.on('disconnect', surDeconnexion);
    return () => {
      socket.off('ticket:cree', charger);
      socket.off('ticket:modifie', charger);
      socket.off('connect', surConnexion);
      socket.off('disconnect', surDeconnexion);
    };
  }, [charger]);

  let contenu;
  if (erreur && !file) {
    contenu = (
      <ErrorState
        titre="Impossible de charger la file"
        texte="Le serveur ne répond pas. Réessayez dans un instant."
        onReessayer={charger}
      />
    );
  } else if (!file) {
    contenu = <Chargement />;
  } else {
    const { compteurs, minutesParJour } = file;
    const alertes = compteurs.enRetard + compteurs.echeanceProche;
    // Le point ne s'affiche que si l'on regarde un autre onglet
    const signal = nouveauAPrendre && onglet.cle !== 'aPrendre';
    contenu = (
      <>
        {/* Les cartes qui correspondent à un onglet l'ouvrent. « Alertes SLA » compte des tickets
            de deux onglets (À prendre et Mes tickets en cours) : elle reste une information. */}
        <div className={styles.kpis}>
          <Kpi
            libelle="À prendre"
            icone={Inbox}
            valeur={compteurs.aPrendre}
            detail={
              compteurs.aPrendreCritiques
                ? `dont ${compteurs.aPrendreCritiques} Critique`
                : undefined
            }
            onOuvrir={() => ouvrirOnglet('aPrendre')}
          />
          <Kpi
            libelle="Mes tickets en cours"
            icone={LoaderCircle}
            valeur={compteurs.enCours}
            onOuvrir={() => ouvrirOnglet('enCours')}
          />
          <Kpi
            libelle="Alertes SLA"
            icone={Clock}
            valeur={alertes}
            alerte={alertes > 0}
            detail={`${compteurs.enRetard} en retard · ${compteurs.echeanceProche} échéance proche`}
          />
          <Kpi
            libelle="En attente du demandeur"
            icone={MessageCircleQuestionMark}
            valeur={compteurs.enAttente}
            detail={
              compteurs.attenteLaPlusAncienne !== null
                ? `le plus ancien : depuis ${formaterDuree(compteurs.attenteLaPlusAncienne)}`
                : undefined
            }
            onOuvrir={() => ouvrirOnglet('enAttente')}
          />
        </div>

        <Tabs
          libelle="Parties de la file"
          onglets={ONGLETS.map((o) => ({
            valeur: o.cle,
            libelle: o.titre,
            icone: o.icone,
            compteur: compteurs[o.cle],
            signal: o.cle === 'aPrendre' && signal,
            texteSignal: 'nouveau ticket',
          }))}
          valeur={onglet.cle}
          onChange={ouvrirOnglet}
        >
          <TableauOnglet
            onglet={onglet}
            lignes={file[onglet.cle]}
            tri={tris[onglet.cle]}
            onTrier={(colonne) =>
              setTris({ ...tris, [onglet.cle]: triSuivant(tris[onglet.cle], colonne) })
            }
            minutesParJour={minutesParJour}
            nouveaux={nouveaux}
          />
        </Tabs>
      </>
    );
  }

  return (
    <>
      {/* Pas d'indicateur « En direct » (décision du 20/11) : seul le bandeau de coupure s'affiche */}
      <PageHeader />
      <div className={styles.page}>
        {/* Décision du 20/11 : une seule densité (« Confort », lignes de 52 px), pas de sélecteur */}
        {/* Ni sous-titre ni description de section (décision du 20/11) */}
        <h1 className={`text-display-lg ${styles.titrePage}`}>À traiter</h1>

        {/* Temps réel coupé : la liste reste affichée avec son heure (fiche 07, état erreur) */}
        {coupe && file && (
          <div className={styles.coupure} role="status">
            <WifiOff size={18} strokeWidth={TRAIT_ICONE} aria-hidden="true" />
            <span>
              <strong>Mises à jour en direct interrompues</strong> · La liste affichée date de{' '}
              {majLe && heureMinute(majLe)}. Nouvelle tentative automatique…
            </span>
            <Button variante="secondaire" taille="sm" onClick={() => socket.connect()}>
              Réessayer maintenant
            </Button>
          </div>
        )}

        {contenu}
      </div>
    </>
  );
}
