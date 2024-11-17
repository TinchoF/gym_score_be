
import mongoose from 'mongoose';

const JudgeSchema = new mongoose.Schema({
  name: { type: String, required: true },
});

export default mongoose.model('Judge', JudgeSchema);
