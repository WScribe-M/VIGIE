import mongoose from 'mongoose';
import { TYPES_NOTIFICATION } from './constantes.js';

// Enregistrée en base avant d'être émise par Socket.io : rien n'est perdu hors ligne
const notificationSchema = new mongoose.Schema(
  {
    destinataire: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: TYPES_NOTIFICATION, required: true },
    ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket' },
    lu: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'date', updatedAt: false } },
);

notificationSchema.index({ destinataire: 1, lu: 1, date: -1 });
// Les notifications lues sont supprimées par MongoDB après 90 jours ; les non lues sont gardées
notificationSchema.index(
  { date: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60, partialFilterExpression: { lu: true } },
);

export const Notification = mongoose.model('Notification', notificationSchema);
