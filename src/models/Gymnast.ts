import mongoose from 'mongoose';

// Esquema para niveles por aparato (solo masculino GAM)
const ApparatusLevelSchema = new mongoose.Schema({
  apparatus: { type: String, required: true }, // "Suelo", "Arzones", "Anillas", "Salto", "Paralelas", "Barra"
  level: { type: String, required: true }, // "AC0", "AC1", "AC2", etc.
}, { _id: false });

// Esquema para inscripción a torneos (incluye pago y turno por torneo)
const TournamentEnrollmentSchema = new mongoose.Schema({
  tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
  payment: { type: Boolean, default: false },
  turno: { type: String, required: false },
}, { _id: false });

const GymnastSchema = new mongoose.Schema({
  name: { type: String, required: true },
  gender: { type: String, required: true },
  birthDate: { type: Date, required: true },
  level: { type: String, required: true }, // Nivel general (GAF) o nivel default (GAM)
  // Niveles por aparato para GAM (opcional)
  apparatusLevels: { type: [ApparatusLevelSchema], required: false, default: [] },
  group: { type: Number, required: false },
  // Multi-tournament support: array de inscripciones con pago y turno por torneo
  tournaments: { type: [TournamentEnrollmentSchema], default: [] },
  coach: { type: String, required: false },
  club: { type: String, required: false }, // Institución/club del gimnasta (texto libre)
  institution: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', required: true }, // Multi-tenancy
  // Audit fields
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: false },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: false },
}, { timestamps: true }); // Adds createdAt and updatedAt automatically

export default mongoose.model('Gymnast', GymnastSchema);

