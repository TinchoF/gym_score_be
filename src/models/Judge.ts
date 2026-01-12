
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

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
  // Flag para indicar que la contraseña ya está hasheada (para migración)
  passwordHashed: { type: Boolean, default: false },
}, { strict: false });

// Pre-save hook para encriptar contraseñas
JudgeSchema.pre('save', async function(next) {
  // Solo hashear si la contraseña fue modificada y no está ya hasheada
  if (this.isModified('password') && !this.passwordHashed) {
    this.password = await bcrypt.hash(this.password, 10);
    this.passwordHashed = true;
  }
  next();
});

// Método para comparar contraseñas
JudgeSchema.methods.comparePassword = function(candidatePassword: string): boolean {
  // Si la contraseña no está hasheada (legacy), comparar directamente
  if (!this.passwordHashed) {
    return this.password === candidatePassword;
  }
  return bcrypt.compareSync(candidatePassword, this.password);
};

export default mongoose.model('Judge', JudgeSchema);

