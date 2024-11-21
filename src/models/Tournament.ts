import mongoose from 'mongoose';

const TournamentSchema = new mongoose.Schema({
  name: { type: String, required: true },
});

export default mongoose.model('Tournament', TournamentSchema);
