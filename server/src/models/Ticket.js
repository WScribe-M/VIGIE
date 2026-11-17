import mongoose from 'mongoose';
import { CANAUX, DOMAINES, IMPACTS, PRIORITES, STATUTS, URGENCES } from './constantes.js';

const { ObjectId } = mongoose.Schema.Types;

const commentaireSchema = new mongoose.Schema(
  {
    auteur: { type: ObjectId, ref: 'User', required: true },
    texte: { type: String, required: true, trim: true },
  },
  { timestamps: { createdAt: 'date', updatedAt: false } },
);

// Historique (timeline) : base du calcul des délais, de la suspension SLA et des statistiques
const historiqueSchema = new mongoose.Schema(
  {
    auteur: { type: ObjectId, ref: 'User', required: true },
    champ: { type: String, required: true }, // statut, technicien, priorite, domaine…
    ancienneValeur: mongoose.Schema.Types.Mixed,
    nouvelleValeur: mongoose.Schema.Types.Mixed,
    motif: String,
  },
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

const ticketSchema = new mongoose.Schema(
  {
    titre: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },

    service: { type: ObjectId, ref: 'Service', required: true },
    domaine: { type: String, enum: DOMAINES, required: true },

    impact: { type: String, enum: IMPACTS, required: true },
    urgence: { type: String, enum: URGENCES, required: true },
    prioriteCalculee: { type: String, enum: PRIORITES, required: true },
    prioriteFinale: { type: String, enum: PRIORITES, required: true },

    statut: { type: String, enum: STATUTS, default: 'NOUVEAU' },
    echeanceSla: Date,
    dateCloture: Date,
    nbReouvertures: { type: Number, default: 0 },

    demandeur: { type: ObjectId, ref: 'User', required: true },
    createur: { type: ObjectId, ref: 'User', required: true }, // différent du demandeur si créé pour un tiers
    canal: { type: String, enum: CANAUX, default: 'APPLICATION' },
    technicien: { type: ObjectId, ref: 'User', default: null },
    suiveurs: [{ type: ObjectId, ref: 'User' }],
    enCopie: [{ type: ObjectId, ref: 'User' }],
    doublonDe: { type: ObjectId, ref: 'Ticket', default: null },

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

// Recherche textuelle pour la détection de doublons
ticketSchema.index({ titre: 'text', description: 'text' });
ticketSchema.index({ statut: 1, prioriteFinale: 1, echeanceSla: 1 });
ticketSchema.index({ demandeur: 1 });
ticketSchema.index({ technicien: 1, statut: 1 });

export const Ticket = mongoose.model('Ticket', ticketSchema);
