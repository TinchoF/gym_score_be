import mongoose from 'mongoose';

const GymnastSchema = new mongoose.Schema({
  name: { type: String, required: true },
  gender: { type: String, required: true },
  birthDate: { type: Date, required: true },
  level: { type: String, required: true },
  group: { type: Number, required: false },
  tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: false },
  competitionTime: { type: String, required: false },
  payment: { type: Boolean, required: false },
  coach: { type: String, required: false },
  institution: { type: String, required: false },
});

export default mongoose.model('Gymnast', GymnastSchema);
