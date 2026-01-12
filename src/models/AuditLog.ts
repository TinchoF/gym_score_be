/**
 * Audit Log Model and Middleware
 * Logs critical actions for accountability
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  action: string;
  entityType: 'gymnast' | 'judge' | 'admin' | 'tournament' | 'institution' | 'score';
  entityId: mongoose.Types.ObjectId;
  performedBy: mongoose.Types.ObjectId;
  performedByRole: 'admin' | 'super-admin' | 'judge';
  institution?: mongoose.Types.ObjectId;
  details?: Record<string, any>;
  ipAddress?: string;
  createdAt: Date;
}

const AuditLogSchema: Schema = new Schema({
  action: { 
    type: String, 
    required: true,
    enum: ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'ACTIVATE', 'DEACTIVATE']
  },
  entityType: { 
    type: String, 
    required: true,
    enum: ['gymnast', 'judge', 'admin', 'tournament', 'institution', 'score']
  },
  entityId: { type: Schema.Types.ObjectId, required: true },
  performedBy: { type: Schema.Types.ObjectId, required: true },
  performedByRole: { 
    type: String, 
    required: true,
    enum: ['admin', 'super-admin', 'judge']
  },
  institution: { type: Schema.Types.ObjectId, ref: 'Institution' },
  details: { type: Schema.Types.Mixed },
  ipAddress: { type: String },
  createdAt: { type: Date, default: Date.now },
});

// Index for efficient queries
AuditLogSchema.index({ institution: 1, createdAt: -1 });
AuditLogSchema.index({ performedBy: 1, createdAt: -1 });
AuditLogSchema.index({ entityType: 1, entityId: 1 });

export default mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
