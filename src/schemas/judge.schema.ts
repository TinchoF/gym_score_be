import { z } from 'zod';

// Apparatus assignment schema
export const ApparatusAssignmentSchema = z.object({
  tournament: z.string().min(1, 'El ID del torneo es requerido'),
  turno: z.string().min(1, 'El turno es requerido'),
  apparatus: z.array(z.string()).min(1, 'Al menos un aparato es requerido'),
});

// Create judge schema
export const createJudgeSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100, 'El nombre no puede exceder 100 caracteres'),
  password: z.string().min(4, 'La contraseña debe tener al menos 4 caracteres'),
  apparatusAssignments: z.array(ApparatusAssignmentSchema).optional(),
  institution: z.string().min(1, 'La institución es requerida'),
});

// Update judge schema
export const updateJudgeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  password: z.string().min(4).optional(),
  apparatusAssignments: z.array(ApparatusAssignmentSchema).optional(),
});

export type CreateJudgeInput = z.infer<typeof createJudgeSchema>;
export type UpdateJudgeInput = z.infer<typeof updateJudgeSchema>;
