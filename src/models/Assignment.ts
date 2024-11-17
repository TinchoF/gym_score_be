import mongoose from 'mongoose';

const AssignmentSchema = new mongoose.Schema({
  group: { type: Number, required: true },
  level: { type: String, required: true },
  category: { type: String, required: true },
  apparatus: { type: String, required: true },
  schedule: { type: String, required: true },
  judges: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Judge' }],
});

export default mongoose.model('Assignment', AssignmentSchema);
