import mongoose, { Document, Schema } from 'mongoose';

export interface IScoringConfig extends Document {
  level: string;
  scoringMethod: 'deductions' | 'start_value' | 'start_value_bonus' | 'fig_code';
  baseStartValue?: number;
  hasBonuses: boolean;
  description?: string;
  active: boolean;
  gender: ('GAM' | 'GAF')[];
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
  },
  gender: {
    type: [String],
    required: true,
    enum: ['GAM', 'GAF'],
    default: ['GAM', 'GAF'],
    validate: {
      validator: function(v: string[]) {
        return v && v.length > 0 && v.length <= 2;
      },
      message: 'Gender array must contain 1 or 2 values'
    }
  }
}, { 
  timestamps: true 
});

// Index for faster queries
ScoringConfigSchema.index({ level: 1 });
ScoringConfigSchema.index({ active: 1 });
ScoringConfigSchema.index({ gender: 1 });

export default mongoose.model<IScoringConfig>('ScoringConfig', ScoringConfigSchema);
