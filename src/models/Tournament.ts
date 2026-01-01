import mongoose from 'mongoose';

// Esquema para configuración específica de cada turno
const TurnoConfigSchema = new mongoose.Schema({
  turno: { type: String, required: true },
  groupCount: { type: Number, required: false, default: 4 },
  baseScore: { type: Number, required: false, default: 10 }, // Deprecated: El puntaje base ahora depende del nivel del gimnasta
}, { _id: false });

// Esquema para configurar método de puntuación por nivel
const LevelScoringConfigSchema = new mongoose.Schema({
  level: { type: String, required: true }, // e.g., "E1", "USAG 6", "AC2"
  scoringMethod: { 
    type: String, 
    enum: ['deductions', 'start_value', 'start_value_bonus', 'fig_code'], 
    default: 'deductions',
    required: true 
  },
  baseStartValue: { type: Number, required: false }, // Start value para métodos start_value y start_value_bonus
}, { _id: false });

const TournamentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  institution: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', required: true },
  groupCount: { type: Number, required: false, default: 0 }, // Deprecated - mantener por compatibilidad
  baseScore: { type: Number, required: false, default: 10 }, // Deprecated - mantener por compatibilidad con datos antiguos
  turnos: { type: [String], required: false, default: [] },
  turnoConfig: { type: [TurnoConfigSchema], required: false, default: [] },
  // Configuración de método de puntuación por nivel
  levelScoringConfig: { type: [LevelScoringConfigSchema], required: false, default: [] },
});

export default mongoose.model('Tournament', TournamentSchema);

