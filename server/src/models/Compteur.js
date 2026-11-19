import mongoose from 'mongoose';

// Compteurs de séquence (un document par séquence, ex. _id: 'tickets').
// MongoDB n'a pas d'auto-incrément : on incrémente atomiquement ce document avec $inc,
// ce qui garantit deux numéros différents même pour deux créations simultanées.
const compteurSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    valeur: { type: Number, default: 0 },
  },
  { versionKey: false },
);

export const Compteur = mongoose.model('Compteur', compteurSchema, 'compteurs');
