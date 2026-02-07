import mongoose from 'mongoose';

const ScoreSchema = new mongoose.Schema({
  gymnast: { type: mongoose.Schema.Types.ObjectId, ref: 'Gymnast', required: true },
  apparatus: { type: String, required: true },
  tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: false },
  turno: { type: String, required: false }, // Added to match index definition
  judge: { type: mongoose.Schema.Types.ObjectId, ref: 'Judge', required: true },
  institution: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', required: true },
  
  // Campo existente para deducciones de ejecución (E-Score)
  deductions: { type: Number, required: false, min: 0, max: 10 },
  
  // Nuevos campos para métodos de puntuación avanzados
  startValue: { type: Number, required: false, min: 0 }, // Start Value base (para start_value y start_value_bonus)
  difficultyBonus: { type: Number, required: false, min: 0 }, // Bonificación por dificultad
  dScore: { type: Number, required: false, min: 0 }, // D-Score para fig_code (sin límite máximo)
  neutralDeduction: { type: Number, required: false, min: 0, max: 10 }, // Deducción neutral (opcional)
  
  // Tipo de juez (E = Ejecución, D = Dificultad)
  judgeType: { type: String, enum: ['E', 'D'], default: 'E' },

  // Metadatos de la configuración utilizada al momento de puntuar
  scoringMethod: { type: String, enum: ['deductions', 'start_value', 'start_value_bonus', 'fig_code'], required: false },
  level: { type: String, required: false }, // Nombre del nivel usado para este aparato
});

// Ensure a single score per judge/gymnast/apparatus/tournament/turno/institution
ScoreSchema.index({ judge: 1, gymnast: 1, apparatus: 1, tournament: 1, turno: 1, institution: 1 }, { unique: true, sparse: true });

export default mongoose.model('Score', ScoreSchema);

