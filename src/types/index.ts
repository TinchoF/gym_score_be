/**
 * Shared types for GymScore backend
 * Used across routes and middlewares for consistent typing
 */

import { Request } from 'express';
import { Types } from 'mongoose';

// User roles
export type UserRole = 'admin' | 'super-admin' | 'judge';

// Authenticated user attached to request
export interface AuthenticatedUser {
  _id: Types.ObjectId;
  role: UserRole;
  institutionId?: Types.ObjectId;
  username?: string;
  name?: string;
}

// Extend Express Request with user
export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

// Gender type
export type Gender = 'F' | 'M';

// Scoring methods
export type ScoringMethod = 'deductions' | 'start_value' | 'start_value_bonus' | 'fig_code';

// Apparatus types
export const GAF_APPARATUSES = ['Salto', 'Barras Asimétricas', 'Viga', 'Suelo'] as const;
export const GAM_APPARATUSES = ['Suelo', 'Arzones', 'Anillas', 'Salto', 'Paralelas', 'Barra'] as const;

export type GAFApparatus = typeof GAF_APPARATUSES[number];
export type GAMApparatus = typeof GAM_APPARATUSES[number];
export type Apparatus = GAFApparatus | GAMApparatus;

// Official CAG categories
export const GAF_CATEGORIES = ['Pulga', 'Pre-Mini', 'Mini', 'Pre-Infantil', 'Infantil', 'Juvenil', 'Mayor'] as const;
export const GAM_CATEGORIES = ['Pulga', 'Mini', 'Menores', 'Infantiles', 'Cadetes', 'Juveniles', 'Mayores', 'Senior'] as const;

export type GAFCategory = typeof GAF_CATEGORIES[number];
export type GAMCategory = typeof GAM_CATEGORIES[number];
export type Category = GAFCategory | GAMCategory;

// Common API response types
export interface ApiError {
  error: string;
}

export interface ApiSuccess<T = void> {
  message?: string;
  data?: T;
}

// Pagination params
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

// Helper type guard for authenticated requests
export function isAuthenticatedRequest(req: Request): req is AuthenticatedRequest {
  return 'user' in req && req.user !== undefined;
}
