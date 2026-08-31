import mongoose, { Schema, Document } from 'mongoose';

export interface IOfflineMode {
  active: boolean;
  since?: Date;
  byUserId?: mongoose.Types.ObjectId;
  byUserName?: string;
  deviceLabel?: string;
  lastSyncAt?: Date;
}

export interface IInstitution extends Document {
  name: string;
  institutionCode: string;
  isActive: boolean;
  // "Modo Sede": while active, this institution is served offline from a laptop and
  // the online app is read-only for its users. See docs/MODO_SEDE.md.
  offlineMode: IOfflineMode;
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
  offlineMode: {
    active: { type: Boolean, default: false },
    since: { type: Date },
    byUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    byUserName: { type: String },
    deviceLabel: { type: String },
    lastSyncAt: { type: Date },
  },
}, { timestamps: true });

// Pre-save hook to auto-generate code if not provided
InstitutionSchema.pre('save', function(next) {
  if (!this.institutionCode) {
    this.institutionCode = generateCodeFromName(this.name);
  }
  next();
});

export default mongoose.model<IInstitution>('Institution', InstitutionSchema);
