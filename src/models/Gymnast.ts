
import mongoose from 'mongoose';

const GymnastSchema = new mongoose.Schema({
  name: { type: String, required: true },
  gender: { type: String, required: true },
  birthDate: { type: Date, required: true },
  level: { type: String, required: true },
  category: { type: String, required: true },
  group: { type: Number, required: true },
  competitionTime: { type: String, required: true },
  payment: { type: Boolean, required: true },
  coach: { type: String, required: true },
  institution: { type: String, required: true },
});

export default mongoose.model('Gymnast', GymnastSchema);
