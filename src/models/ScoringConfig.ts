import mongoose, { Document, Schema } from 'mongoose';

export interface IScoringConfig extends Document {
  level: string;
  scoringMethod: 'deductions' | 'start_value' | 'start_value_bonus' | 'fig_code';
  baseStartValue?: number;
  hasBonuses: boolean;
  description?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ScoringConfigSchema = new Schema<IScoringConfig>({
  level: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true 
  },
  scoringMethod: { 
    type: String, 
    required: true,
    enum: ['deductions', 'start_value', 'start_value_bonus', 'fig_code']
  },
  baseStartValue: { 
    type: Number, 
    required: false 
  },
  hasBonuses: { 
    type: Boolean, 
    required: true,
    default: false 
  },
  description: { 
    type: String, 
    required: false 
  },
  active: { 
    type: Boolean, 
    required: true,
    default: true 
  }
}, { 
  timestamps: true 
});

// Index for faster queries
ScoringConfigSchema.index({ level: 1 });
ScoringConfigSchema.index({ active: 1 });

export default mongoose.model<IScoringConfig>('ScoringConfig', ScoringConfigSchema);
