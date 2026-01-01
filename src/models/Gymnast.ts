import mongoose from 'mongoose';

// Esquema para niveles por aparato (solo masculino GAM)
const ApparatusLevelSchema = new mongoose.Schema({
  apparatus: { type: String, required: true }, // "Suelo", "Arzones", "Anillas", "Salto", "Paralelas", "Barra"
  level: { type: String, required: true }, // "AC0", "AC1", "AC2", etc.
}, { _id: false });

const GymnastSchema = new mongoose.Schema({
  name: { type: String, required: true },
  gender: { type: String, required: true },
  birthDate: { type: Date, required: true },
  level: { type: String, required: true }, // Nivel general (GAF) o nivel default (GAM)
  // Niveles por aparato para GAM (opcional)
  apparatusLevels: { type: [ApparatusLevelSchema], required: false, default: [] },
  group: { type: Number, required: false },
  tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: false },
  turno: { type: String, required: false },
  payment: { type: Boolean, required: false },
  coach: { type: String, required: false },
  club: { type: String, required: false }, // Institución/club del gimnasta (texto libre)
  institution: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', required: true }, // Multi-tenancy
});

export default mongoose.model('Gymnast', GymnastSchema);

