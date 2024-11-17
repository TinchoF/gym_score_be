import mongoose from 'mongoose';

const ScoreSchema = new mongoose.Schema({
  gymnast: { type: mongoose.Schema.Types.ObjectId, ref: 'Gymnast', required: true },
  apparatus: { type: String, required: true },
  deductions: { type: Number, required: true, min: 0, max: 10 },
  finalScore: { type: Number, required: true, min: 0, max: 10 },
});

export default mongoose.model('Score', ScoreSchema);
