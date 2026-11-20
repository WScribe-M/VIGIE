import mongoose from 'mongoose';
import {
  CANAUX,
  CHAMPS_HISTORIQUE,
  DOMAINES,
  IMPACTS,
  NIVEAUX_ALERTE_SLA,
  PRIORITES,
  RANG_PRIORITE,
  STATUTS,
  URGENCES,
} from './constantes.js';

const { ObjectId } = mongoose.Schema.Types;

const commentaireSchema = new mongoose.Schema(
  {
    auteur: { type: ObjectId, ref: 'User', required: true },
    texte: { type: String, required: true, trim: true },
  },
  { timestamps: { createdAt: 'date', updatedAt: false } },
);

// Historique (timeline, VIGIE-9) : base du calcul des délais, de la suspension SLA et des
// statistiques (historiqueService). Il n'est pas modifiable : on ajoute des entrées ($push), on ne
// les change jamais. « immutable » fait ignorer par Mongoose toute modification d'une entrée déjà
// enregistrée, et aucune route ne permet d'en modifier ou d'en supprimer une.
const historiqueSchema = new mongoose.Schema(
  {
    auteur: { type: ObjectId, ref: 'User', required: true, immutable: true },
    champ: { type: String, enum: CHAMPS_HISTORIQUE, required: true, immutable: true },
    ancienneValeur: { type: mongoose.Schema.Types.Mixed, immutable: true },
    nouvelleValeur: { type: mongoose.Schema.Types.Mixed, immutable: true },
    motif: { type: String, immutable: true },
  },
  // createdAt (ici « date ») est immuable par défaut dans Mongoose
  { timestamps: { createdAt: 'date', updatedAt: false } },
);

const pieceJointeSchema = new mongoose.Schema(
  {
    nomOriginal: { type: String, required: true },
    nomStocke: { type: String, required: true }, // fichier renommé sur le disque (multer)
    typeMime: { type: String, required: true },
    taille: { type: Number, required: true },
  },
  { _id: true },
);

// Résolution structurée (cadrage 9.9, VIGIE-44) : obligatoire au passage à TERMINE
const resolutionSchema = new mongoose.Schema(
  {
    cause: { type: String, required: true, trim: true, maxlength: 500 },
    solution: { type: String, required: true, trim: true, maxlength: 500 },
    auteur: { type: ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
  },
  { _id: false },
);

const ticketSchema = new mongoose.Schema(
  {
    // Numéro lisible, affiché VIG-0042 (formaterNumero) : attribué à la création par le compteur
    numero: { type: Number, required: true, unique: true },
    titre: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },

    service: { type: ObjectId, ref: 'Service', required: true },
    domaine: { type: String, enum: DOMAINES, required: true },

    impact: { type: String, enum: IMPACTS, required: true },
    urgence: { type: String, enum: URGENCES, required: true },
    prioriteCalculee: { type: String, enum: PRIORITES, required: true },
    prioriteFinale: { type: String, enum: PRIORITES, required: true },
    // Copie numérique de prioriteFinale, pour trier (voir RANG_PRIORITE). Recalculée à la validation ;
    // une mise à jour directe (updateOne, findOneAndUpdate) doit modifier les deux champs ensemble.
    rangPriorite: { type: Number, min: 1, max: 4, required: true },

    statut: { type: String, enum: STATUTS, default: 'NOUVEAU' },
    // Entrée dans le statut actuel : base des relances (updatedAt change à chaque commentaire)
    dateStatut: { type: Date, default: Date.now },
    derniereRelance: { type: Date, default: null },
    echeanceSla: Date,
    niveauAlerteSla: { type: String, enum: NIVEAUX_ALERTE_SLA, default: 'AUCUNE' },
    // Délai de prise en charge sans relire l'historique (statistiques, VIGIE-41)
    datePriseEnCharge: { type: Date, default: null },
    // Jalon « Vu par le support » (cadrage 9.8) : première ouverture par un GESTIONNAIRE, posé une fois
    vuParSupportLe: { type: Date, default: null },
    // Remplie au passage à TERMINE ou ABANDONNE, remise à null à la réouverture
    dateCloture: { type: Date, default: null },
    nbReouvertures: { type: Number, default: 0 },

    demandeur: { type: ObjectId, ref: 'User', required: true },
    createur: { type: ObjectId, ref: 'User', required: true }, // différent du demandeur si créé pour un tiers
    canal: { type: String, enum: CANAUX, default: 'APPLICATION' },
    technicien: { type: ObjectId, ref: 'User', default: null },
    suiveurs: [{ type: ObjectId, ref: 'User' }],
    enCopie: [{ type: ObjectId, ref: 'User' }],
    doublonDe: { type: ObjectId, ref: 'Ticket', default: null },

    resolution: { type: resolutionSchema, default: null },
    satisfaction: { type: Number, min: 1, max: 5 },
    piecesJointes: [pieceJointeSchema],
    commentaires: [commentaireSchema],
    historique: [historiqueSchema],
  },
  {
    timestamps: true,
    // Refuse une écriture faite sur une version périmée du ticket
    optimisticConcurrency: true,
  },
);

ticketSchema.pre('validate', function () {
  if (this.prioriteFinale) {
    this.rangPriorite = RANG_PRIORITE[this.prioriteFinale];
  }
});

// Index choisis à partir des requêtes de l'application (cadrage 9.10).
// Ordre des champs : égalité, puis tri, puis intervalle.

// Recherche et suggestions de doublons, en français (racines des mots, mots vides ignorés)
ticketSchema.index({ titre: 'text', description: 'text' }, { default_language: 'french' });
// Visibilité d'un CLIENT : un $or n'utilise les index que si chacune de ses branches en a un
ticketSchema.index({ demandeur: 1 });
ticketSchema.index({ suiveurs: 1 });
ticketSchema.index({ enCopie: 1 });
// « À traiter » : tickets nouveaux, du plus prioritaire à l'échéance la plus proche
ticketSchema.index({ statut: 1, rangPriorite: -1, echeanceSla: 1 });
// Tâche SLA : tickets ouverts dont l'échéance approche
ticketSchema.index({ statut: 1, echeanceSla: 1 });
// « À traiter », section En attente du demandeur (VIGIE-31) et relances (VIGIE-21) : ancienneté de l’attente
ticketSchema.index({ statut: 1, dateStatut: 1 });
// Mes tickets en cours, triés par échéance ; charge par technicien
ticketSchema.index({ technicien: 1, statut: 1, echeanceSla: 1 });
// Panne collective : tickets récents d'un même service
ticketSchema.index({ service: 1, createdAt: -1 });

export const Ticket = mongoose.model('Ticket', ticketSchema);
