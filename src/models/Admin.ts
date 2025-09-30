import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const AdminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  institution: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', required: function() { return this.role !== 'super-admin'; } },
  role: { type: String, enum: ['admin', 'super-admin'], default: 'admin', required: true },
});

// Método para comparar las contraseñas
AdminSchema.methods.comparePassword = function (candidatePassword: string) {
  return bcrypt.compareSync(candidatePassword, this.password);
};

export default mongoose.model('Admin', AdminSchema);
