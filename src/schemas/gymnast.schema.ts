import { z } from 'zod';

// Enum for gender
export const GenderEnum = z.enum(['M', 'F']);

// Schema for apparatus levels (GAM)
export const ApparatusLevelSchema = z.object({
  apparatus: z.string().min(1, 'El aparato es requerido'),
  level: z.string().min(1, 'El nivel es requerido'),
});

// Schema for tournament enrollment
export const TournamentEnrollmentSchema = z.object({
  tournament: z.string().min(1, 'El ID del torneo es requerido'),
  payment: z.boolean().optional().default(false),
  turno: z.string().optional(),
});

// Create gymnast schema
export const createGymnastSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100, 'El nombre no puede exceder 100 caracteres'),
  gender: GenderEnum,
  birthDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Fecha de nacimiento inválida'
  }),
  level: z.string().min(1, 'El nivel es requerido'),
  apparatusLevels: z.array(ApparatusLevelSchema).optional(),
  group: z.number().int().min(0).optional(),
  tournaments: z.array(TournamentEnrollmentSchema).optional(),
  coach: z.string().max(100).optional(),
  club: z.string().max(100).optional(),
  institution: z.string().min(1, 'La institución es requerida'),
});

// Update gymnast schema (all fields optional except those that shouldn't change)
export const updateGymnastSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  gender: GenderEnum.optional(),
  birthDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Fecha de nacimiento inválida'
  }).optional(),
  level: z.string().min(1).optional(),
  apparatusLevels: z.array(ApparatusLevelSchema).optional(),
  group: z.number().int().min(0).optional(),
  tournaments: z.array(TournamentEnrollmentSchema).optional(),
  coach: z.string().max(100).optional(),
  club: z.string().max(100).optional(),
});

// Bulk update tournaments schema
export const bulkUpdateTournamentsSchema = z.object({
  gymnastIds: z.array(z.string().min(1)).min(1, 'Se requiere al menos un gimnasta'),
  tournament: z.string().min(1, 'El ID del torneo es requerido'),
  turno: z.string().optional(),
  payment: z.boolean().optional(),
});

// Bulk clear tournaments schema
export const bulkClearTournamentsSchema = z.object({
  gymnastIds: z.array(z.string().min(1)).min(1, 'Se requiere al menos un gimnasta'),
  tournament: z.string().optional(),
});

export type CreateGymnastInput = z.infer<typeof createGymnastSchema>;
export type UpdateGymnastInput = z.infer<typeof updateGymnastSchema>;
export type BulkUpdateTournamentsInput = z.infer<typeof bulkUpdateTournamentsSchema>;
export type BulkClearTournamentsInput = z.infer<typeof bulkClearTournamentsSchema>;
