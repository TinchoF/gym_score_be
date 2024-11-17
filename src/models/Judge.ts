
import mongoose from 'mongoose';

const JudgeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  gender: { type: String, required: true },
  assignedGroups: [{ type: Number }],
});

export default mongoose.model('Judge', JudgeSchema);
