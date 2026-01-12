import mongoose, { Schema, Document } from 'mongoose';

export interface IInstitution extends Document {
  name: string;
  institutionCode: string;
  isActive: boolean;
}

// Helper function to generate code from name
function generateCodeFromName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

const InstitutionSchema: Schema = new Schema({
  name: { type: String, required: true },
  institutionCode: { 
    type: String, 
    required: true, 
    unique: true,
    validate: {
      validator: function(v: string) {
        // Only allow alphanumeric characters and hyphens
        return /^[a-z0-9-]+$/.test(v);
      },
      message: 'Institution code must contain only lowercase letters, numbers, and hyphens'
    }
  },
  isActive: { type: Boolean, default: true },
});

// Pre-save hook to auto-generate code if not provided
InstitutionSchema.pre('save', function(next) {
  if (!this.institutionCode) {
    this.institutionCode = generateCodeFromName(this.name);
  }
  next();
});

export default mongoose.model<IInstitution>('Institution', InstitutionSchema);
