import mongoose from 'mongoose';

const AssignmentSchema = new mongoose.Schema({
  gender: { type: String, required: true },
  group: { type: Number, required: true },
  level: { type: String, required: true },
  category: { type: String, required: true },
  apparatus: { type: String, required: true },
  schedule: { type: String, required: true },
  judges: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Judge' }],
});

export default mongoose.model('Assignment', AssignmentSchema);
