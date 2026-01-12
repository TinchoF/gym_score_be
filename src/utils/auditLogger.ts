/**
 * Audit Log Utility
 * Helper function to log audit events
 */

import AuditLog from '../models/AuditLog';
import { Types } from 'mongoose';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'ACTIVATE' | 'DEACTIVATE';
export type EntityType = 'gymnast' | 'judge' | 'admin' | 'tournament' | 'institution' | 'score';

interface AuditLogParams {
  action: AuditAction;
  entityType: EntityType;
  entityId: Types.ObjectId | string;
  performedBy: Types.ObjectId | string;
  performedByRole: 'admin' | 'super-admin' | 'judge';
  institution?: Types.ObjectId | string;
  details?: Record<string, any>;
  ipAddress?: string;
}

/**
 * Log an audit event
 */
export async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    await AuditLog.create({
      action: params.action,
      entityType: params.entityType,
      entityId: new Types.ObjectId(params.entityId),
      performedBy: new Types.ObjectId(params.performedBy),
      performedByRole: params.performedByRole,
      institution: params.institution ? new Types.ObjectId(params.institution) : undefined,
      details: params.details,
      ipAddress: params.ipAddress,
    });
  } catch (error) {
    // Don't throw - audit logging should not break the main operation
    console.error('Error logging audit event:', error);
  }
}

/**
 * Get audit logs for an entity
 */
export async function getEntityAuditLogs(
  entityType: EntityType,
  entityId: Types.ObjectId | string,
  limit: number = 50
) {
  return AuditLog.find({
    entityType,
    entityId: new Types.ObjectId(entityId),
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

/**
 * Get audit logs for an institution
 */
export async function getInstitutionAuditLogs(
  institutionId: Types.ObjectId | string,
  limit: number = 100
) {
  return AuditLog.find({
    institution: new Types.ObjectId(institutionId),
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

/**
 * Get audit logs by user
 */
export async function getUserAuditLogs(
  userId: Types.ObjectId | string,
  limit: number = 50
) {
  return AuditLog.find({
    performedBy: new Types.ObjectId(userId),
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}
