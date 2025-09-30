import mongoose from 'mongoose';

const TournamentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  institution: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', required: true },
});

export default mongoose.model('Tournament', TournamentSchema);
