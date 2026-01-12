/**
 * Audit Middleware
 * Automatically adds audit fields to create/update operations
 */

import { Request, Response, NextFunction } from 'express';

export interface AuditRequest extends Request {
  auditInfo?: {
    userId: string;
    userRole: string;
    institutionId: string;
  };
}

/**
 * Middleware that extracts audit information from JWT and attaches to request
 * Use this before routes that need audit tracking
 */
export const auditMiddleware = (
  req: AuditRequest,
  res: Response,
  next: NextFunction
) => {
  const user = (req as any).user;
  
  if (user) {
    req.auditInfo = {
      userId: user.id || user._id,
      userRole: user.role,
      institutionId: user.institutionId,
    };
  }
  
  next();
};

/**
 * Helper to add audit fields to a document before save
 */
export const addAuditFields = (
  data: any,
  req: AuditRequest,
  isCreate: boolean = false
) => {
  const auditInfo = req.auditInfo || (req as any).user;
  
  if (!auditInfo) return data;
  
  const now = new Date();
  
  if (isCreate) {
    data.createdBy = auditInfo.userId || auditInfo.id;
    data.createdAt = now;
  }
  
  data.updatedBy = auditInfo.userId || auditInfo.id;
  data.updatedAt = now;
  
  return data;
};

export default auditMiddleware;
