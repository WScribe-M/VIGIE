import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.MONGODB_URI ??= 'mongodb://localhost:27017/vigie-test';
process.env.JWT_SECRET ??= 'secret-de-test';

const { calculerEcheance, minutesOuvreesEntre, niveauSla } =
  await import('../../src/services/slaService.js');

// Horaires du cadrage (9.2) : du lundi au vendredi, de 9 h à 18 h (en minutes depuis minuit)
const HORAIRES = { jours: [1, 2, 3, 4, 5], debut: 9 * 60, fin: 18 * 60, seuilAlerte: 0.75 };

// Dates en heure locale. Le 20/11/2026 est un vendredi, le 23/11/2026 un lundi.
const le = (jour, heure, minute = 0) => new Date(2026, 10, jour, heure, minute);
const echeance = (debut, priorite) => calculerEcheance(debut, priorite, HORAIRES);

describe('calculerEcheance (SLA en heures ouvrées, cadrage 9.2)', () => {
  it('Critique (4 h) dans la journée', () => {
    assert.deepEqual(echeance(le(20, 10), 'CRITIQUE'), le(20, 14));
  });

  it('Critique ouvert le vendredi à 17 h : 1 h vendredi, 3 h lundi', () => {
    assert.deepEqual(echeance(le(20, 17), 'CRITIQUE'), le(23, 12));
  });

  it('Haute = un jour ouvré (9 h), pas 24 heures', () => {
    assert.deepEqual(echeance(le(20, 10), 'HAUTE'), le(23, 10));
  });

  it('Moyenne = 3 jours ouvrés', () => {
    assert.deepEqual(echeance(le(23, 9), 'MOYENNE'), le(25, 18));
  });

  it('Basse = 5 jours ouvrés', () => {
    assert.deepEqual(echeance(le(23, 9), 'BASSE'), le(27, 18));
  });

  it('un ticket ouvert le week-end démarre le lundi à 9 h', () => {
    assert.deepEqual(echeance(le(21, 15), 'CRITIQUE'), le(23, 13));
  });

  it('un ticket ouvert avant l’ouverture démarre à 9 h', () => {
    assert.deepEqual(echeance(le(23, 7), 'CRITIQUE'), le(23, 13));
  });

  it('un ticket ouvert après la fermeture démarre le lendemain à 9 h', () => {
    assert.deepEqual(echeance(le(23, 19, 30), 'CRITIQUE'), le(24, 13));
  });

  it('suit des horaires configurés autrement (samedi travaillé)', () => {
    const samedi = { ...HORAIRES, jours: [1, 2, 3, 4, 5, 6] };
    assert.deepEqual(calculerEcheance(le(21, 10), 'CRITIQUE', samedi), le(21, 14));
  });

  it('signale une configuration sans jour ouvré au lieu de boucler', () => {
    assert.throws(() => calculerEcheance(le(20, 10), 'CRITIQUE', { ...HORAIRES, jours: [] }));
  });
});

describe('minutesOuvreesEntre', () => {
  const minutes = (debut, fin) => minutesOuvreesEntre(debut, fin, HORAIRES);

  it('compte les minutes dans la journée', () => {
    assert.equal(minutes(le(20, 10), le(20, 14, 30)), 270);
  });

  it('ne compte ni la nuit, ni le week-end', () => {
    assert.equal(minutes(le(20, 17), le(23, 10)), 120); // vendredi 17 h → lundi 10 h
  });

  it('ignore les heures avant l’ouverture et après la fermeture', () => {
    assert.equal(minutes(le(23, 7), le(23, 20)), 540);
  });

  it('vaut 0 si la fin est avant le début', () => {
    assert.equal(minutes(le(23, 12), le(23, 10)), 0);
  });
});

describe('niveauSla (affichage, cadrage 9.2)', () => {
  const ticket = (champs) => ({ statut: 'EN_COURS', prioriteFinale: 'CRITIQUE', ...champs });
  const niveau = (champs, maintenant) => niveauSla(ticket(champs), maintenant, HORAIRES);

  it('dans les temps tant que moins de 75 % du délai est écoulé', () => {
    // Critique : 4 h ; à 10 h pour une échéance à 14 h, il reste 240 min
    assert.deepEqual(niveau({ echeanceSla: le(23, 14) }, le(23, 10)), {
      niveau: 'DANS_LES_TEMPS',
      minutes: 240,
    });
  });

  it('échéance proche à partir de 75 % du délai écoulé (reste 1 h sur 4 h)', () => {
    assert.deepEqual(niveau({ echeanceSla: le(23, 14) }, le(23, 13)), {
      niveau: 'ECHEANCE_PROCHE',
      minutes: 60,
    });
    assert.equal(niveau({ echeanceSla: le(23, 14) }, le(23, 12, 59)).niveau, 'DANS_LES_TEMPS');
  });

  it('en retard après l’échéance, retard compté en heures ouvrées', () => {
    // Échéance vendredi 17 h, lundi 10 h : 1 h vendredi + 1 h lundi
    assert.deepEqual(niveau({ echeanceSla: le(20, 17) }, le(23, 10)), {
      niveau: 'EN_RETARD',
      minutes: 120,
    });
  });

  it('suspendu en attente du demandeur, depuis le début de l’attente (calendaire)', () => {
    const attente = {
      statut: 'EN_ATTENTE_DEMANDEUR',
      dateStatut: le(20, 10),
      echeanceSla: le(20, 12),
    };
    assert.deepEqual(niveau(attente, le(21, 10)), { niveau: 'SUSPENDU', minutes: 24 * 60 });
  });

  it('rien pour un ticket clos', () => {
    assert.equal(niveau({ statut: 'TERMINE', echeanceSla: le(20, 12) }, le(23, 10)), null);
    assert.equal(niveau({ statut: 'ABANDONNE', echeanceSla: le(20, 12) }, le(23, 10)), null);
  });

  it('le seuil suit la priorité : Basse (5 jours) est « proche » à moins de 1,25 jour', () => {
    const basse = { prioriteFinale: 'BASSE', echeanceSla: le(27, 18) }; // vendredi 18 h
    assert.equal(niveau(basse, le(27, 9)).niveau, 'ECHEANCE_PROCHE'); // reste 9 h ≤ 11,25 h
    assert.equal(niveau(basse, le(26, 9)).niveau, 'DANS_LES_TEMPS'); // reste 18 h
  });
});
