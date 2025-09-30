import mongoose, { Schema, Document } from 'mongoose';

export interface IInstitution extends Document {
  name: string;
  // Puedes agregar más campos si lo necesitas
}

const InstitutionSchema: Schema = new Schema({
  name: { type: String, required: true },
});

export default mongoose.model<IInstitution>('Institution', InstitutionSchema);
