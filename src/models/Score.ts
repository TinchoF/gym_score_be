import mongoose from 'mongoose';

const ScoreSchema = new mongoose.Schema({
  gymnast: { type: mongoose.Schema.Types.ObjectId, ref: 'Gymnast', required: true },
  apparatus: { type: String, required: true },
  tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: false },
  deductions: { type: Number, required: true, min: 0, max: 10 },
  institution: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', required: true },
});

export default mongoose.model('Score', ScoreSchema);
