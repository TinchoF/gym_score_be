
import mongoose from 'mongoose';

const JudgeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  apparatus: { type: [String], required: true, default: [] },
  password: { type: String, required: true },
  institution: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', required: true },
});

export default mongoose.model('Judge', JudgeSchema);
