import { z } from 'zod';
import { GAF_CATEGORIES, GAM_CATEGORIES } from '../types';

// Enum for gender
export const GenderEnum = z.enum(['M', 'F']);

const ALL_CATEGORIES = [...new Set([...GAF_CATEGORIES, ...GAM_CATEGORIES])] as [string, ...string[]];
const CategoryEnum = z.enum(ALL_CATEGORIES);

export function isCategoryValidForGender(category: string, gender: 'M' | 'F'): boolean {
  const validCategories: readonly string[] = gender === 'F' ? GAF_CATEGORIES : GAM_CATEGORIES;
  return validCategories.includes(category);
}

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
  group: z.number().int().min(0).nullable().optional(),
});

// Create gymnast schema
export const createGymnastSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100, 'El nombre no puede exceder 100 caracteres'),
  gender: GenderEnum,
  // Se requiere birthDate o category (validado abajo): birthDate permite calcular la
  // categoría automáticamente; category se usa cuando no se conoce la fecha de nacimiento.
  birthDate: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), {
    message: 'Fecha de nacimiento inválida'
  }),
  category: CategoryEnum.optional(),
  level: z.string().min(1, 'El nivel es requerido'),
  apparatusLevels: z.array(ApparatusLevelSchema).optional(),
  tournaments: z.array(TournamentEnrollmentSchema).optional(),
  coach: z.string().max(100).optional(),
  club: z.string().max(100).optional(),
  institution: z.string().min(1, 'La institución es requerida'),
}).superRefine((data, ctx) => {
  if (!data.birthDate && !data.category) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Debe indicar la fecha de nacimiento o la categoría',
      path: ['birthDate'],
    });
  }
  if (data.category && !data.birthDate && !isCategoryValidForGender(data.category, data.gender)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'La categoría no es válida para el género seleccionado',
      path: ['category'],
    });
  }
});

// Update gymnast schema (all fields optional except those that shouldn't change)
export const updateGymnastSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  gender: GenderEnum.optional(),
  birthDate: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), {
    message: 'Fecha de nacimiento inválida'
  }),
  category: CategoryEnum.optional(),
  level: z.string().min(1).optional(),
  apparatusLevels: z.array(ApparatusLevelSchema).optional(),
  tournaments: z.array(TournamentEnrollmentSchema).optional(),
  tournamentId: z.string().optional(),
  group: z.number().int().min(0).nullable().optional(),
  coach: z.string().max(100).optional(),
  club: z.string().max(100).optional(),
}).superRefine((data, ctx) => {
  // La consistencia con el estado ya persistido (ej. si se limpia birthDate sin mandar
  // category) se valida en la ruta, que conoce el registro existente.
  if (data.category && data.gender && !data.birthDate && !isCategoryValidForGender(data.category, data.gender)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'La categoría no es válida para el género seleccionado',
      path: ['category'],
    });
  }
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
