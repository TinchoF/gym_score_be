import mongoose from 'mongoose';

// Schema for turno-specific configuration
const TurnoConfigSchema = new mongoose.Schema({
  turno: { type: String, required: true },
  groupCount: { type: Number, required: false, default: 4 },
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
  turnoConfig: { type: [TurnoConfigSchema], required: false, default: [] },
  // Configuration for scoring method by level
  levelScoringConfig: { type: [LevelScoringConfigSchema], required: false, default: [] },
});

export default mongoose.model('Tournament', TournamentSchema);

