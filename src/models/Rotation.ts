import mongoose from 'mongoose';

const RotationSchema = new mongoose.Schema({
  gymnast: { type: mongoose.Schema.Types.ObjectId, ref: 'Gymnast', required: true },
  apparatus: { type: String, required: true },
  tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: false },
  order: { type: Number, required: true},
});

export default mongoose.model('Rotation', RotationSchema);
