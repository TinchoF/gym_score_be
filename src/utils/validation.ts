/**
 * Zod Validation Schemas
 * Centralized input validation for all API endpoints
 */

import { z } from 'zod';
import mongoose from 'mongoose';

// Custom validator for MongoDB ObjectId
const mongoIdSchema = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: 'ID inválido de MongoDB',
});

// Tournament Enrollment Schema (for Gymnast)
export const tournamentEnrollmentSchema = z.object({
  tournament: mongoIdSchema,
  payment: z.boolean().default(false),
  turno: z.string().optional(),
});

// Gymnast Schemas
export const createGymnastSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  gender: z.enum(['F', 'M']),
  birthDate: z.string().datetime().or(z.date()),
  level: z.string().min(1, 'El nivel es requerido'),
  tournaments: z.array(tournamentEnrollmentSchema).optional().default([]),
  coach: z.string().optional(),
  club: z.string().optional(),
  institution: mongoIdSchema,
  // Legacy fields (converted to tournaments array internally)
  tournamentId: mongoIdSchema.optional(),
  turno: z.string().optional(),
  payment: z.boolean().optional(),
});

export const updateGymnastSchema = createGymnastSchema.partial().extend({
  _id: mongoIdSchema.optional(),
});

export const bulkUpdateTournamentsSchema = z.object({
  gymnastIds: z.array(mongoIdSchema).min(1, 'Debe seleccionar al menos un gimnasta'),
  tournament: mongoIdSchema,
  turno: z.string().optional(),
  payment: z.boolean().optional(),
});

// Tournament Schemas
export const tournamentConfigSchema = z.object({
  turno: z.string().min(1),
  capacity: z.number().int().positive().optional(),
});

export const createTournamentSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(200),
  date: z.string().datetime().or(z.date()),
  location: z.string().min(1).max(200),
  gender: z.enum(['F', 'M', 'both']).default('both'),
  active: z.boolean().default(true),
  turnoConfig: z.array(tournamentConfigSchema).optional(),
  institution: mongoIdSchema,
});

export const updateTournamentSchema = createTournamentSchema.partial().extend({
  _id: mongoIdSchema.optional(),
});

// Judge Schemas
export const createJudgeSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  specialty: z.string().optional(),
  email: z.string().email('Email inválido').optional(),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  institution: mongoIdSchema,
});

export const updateJudgeSchema = createJudgeSchema.partial().extend({
  _id: mongoIdSchema.optional(),
  password: z.string().min(6).optional(), // Password is optional on update
});

export const loginJudgeSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  password: z.string().min(1, 'La contraseña es requerida'),
  slug: z.string().optional(),
});

// Assignment Schemas
export const createAssignmentSchema = z.object({
  gender: z.enum(['GAM', 'GAF']),
  group: z.number().int().positive(),
  level: z.string().min(1),
  category: z.string().min(1),
  apparatus: z.string().min(1),
  schedule: z.string().min(1),
  judges: z.array(mongoIdSchema).min(1, 'Debe asignar al menos un juez'),
  tournament: mongoIdSchema,
});

export const updateAssignmentSchema = createAssignmentSchema.partial().extend({
  _id: mongoIdSchema.optional(),
});

// Score Schemas
export const createScoreSchema = z.object({
  gymnast: mongoIdSchema,
  apparatus: z.string().min(1),
  tournament: mongoIdSchema,
  deductions: z.number().min(0).max(20).optional(),
  startValue: z.number().min(0).max(10).optional(),
  difficultyBonus: z.number().min(0).max(10).optional(),
  dScore: z.number().min(0).max(10).optional(),
  scoringMethod: z.string().optional(),
  level: z.string().optional(),
  judgeType: z.enum(['E', 'D']).optional(),
});

export const updateScoreSchema = createScoreSchema.partial();

// Query Param Schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const gymnastsQuerySchema = z.object({
  level: z.string().optional(),
  group: z.coerce.number().int().positive().optional(),
  gender: z.enum(['F', 'M']).optional(),
  tournamentId: z.string().optional(), // Validated separately if present
  populateTournament: z.enum(['true', 'false']).optional(),
});

// Export types for TypeScript
export type CreateGymnastInput = z.infer<typeof createGymnastSchema>;
export type UpdateGymnastInput = z.infer<typeof updateGymnastSchema>;
export type CreateTournamentInput = z.infer<typeof createTournamentSchema>;
export type CreateJudgeInput = z.infer<typeof createJudgeSchema>;
