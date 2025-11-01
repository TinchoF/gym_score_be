import mongoose from 'mongoose';

const ScoreSchema = new mongoose.Schema({
  gymnast: { type: mongoose.Schema.Types.ObjectId, ref: 'Gymnast', required: true },
  apparatus: { type: String, required: true },
  tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: false },
  judge: { type: mongoose.Schema.Types.ObjectId, ref: 'Judge', required: true },
  deductions: { type: Number, required: true, min: 0, max: 10 },
  institution: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', required: true },
});

// Ensure a single score per judge/gymnast/apparatus/tournament/institution
ScoreSchema.index({ judge: 1, gymnast: 1, apparatus: 1, tournament: 1, institution: 1 }, { unique: true, sparse: true });

export default mongoose.model('Score', ScoreSchema);
