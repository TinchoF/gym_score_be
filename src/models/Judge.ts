
import mongoose from 'mongoose';

// Nueva estructura para asignación de aparatos por torneo y turno
interface ApparatusAssignment {
  tournament: mongoose.Types.ObjectId;
  turno: string;
  apparatus: string[];
  judgeType?: 'E' | 'D'; // Tipo de juez: E = Ejecución, D = Dificultad
}

const ApparatusAssignmentSchema = new mongoose.Schema({
  tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
  turno: { type: String, required: true },
  apparatus: { type: [String], required: true, default: [] },
  judgeType: { type: String, enum: ['E', 'D'], default: 'E' }, // Tipo de panel
}, { _id: false });

const JudgeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  apparatus: { type: [String], required: true, default: [] }, // Mantener por compatibilidad
  apparatusAssignments: { type: [ApparatusAssignmentSchema], required: false, default: [] },
  assignedGroups: { type: [Number], default: [] }, // Campo legacy
  password: { type: String, required: true },
  institution: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', required: true },
}, { strict: false });

export default mongoose.model('Judge', JudgeSchema);
