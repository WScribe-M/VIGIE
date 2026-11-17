import mongoose from 'mongoose';
import { ROLES } from './constantes.js';

const userSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true, trim: true },
    prenom: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Haché avec bcrypt, jamais renvoyé par défaut dans les requêtes
    motDePasse: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'CLIENT' },
    actif: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const User = mongoose.model('User', userSchema);
