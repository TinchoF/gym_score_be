import mongoose from 'mongoose';

// Esquema para configuración específica de cada turno
const TurnoConfigSchema = new mongoose.Schema({
  turno: { type: String, required: true },
  groupCount: { type: Number, required: false, default: 0 },
  baseScore: { type: Number, required: false, default: 10 },
}, { _id: false });

const TournamentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  institution: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', required: true },
  groupCount: { type: Number, required: false, default: 0 }, // Deprecated - mantener por compatibilidad
  baseScore: { type: Number, required: false, default: 10 }, // Deprecated - mantener por compatibilidad
  turnos: { type: [String], required: false, default: [] },
  turnoConfig: { type: [TurnoConfigSchema], required: false, default: [] }, // Nueva configuración por turno
});

export default mongoose.model('Tournament', TournamentSchema);
