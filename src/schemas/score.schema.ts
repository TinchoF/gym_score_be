import { z } from 'zod';

// Enum for scoring methods
export const ScoringMethodEnum = z.enum(['deductions', 'start_value', 'start_value_bonus', 'fig_code']);

// Enum for judge types
export const JudgeTypeEnum = z.enum(['E', 'D']);

// Submit score schema
export const submitScoreSchema = z.object({
  gymnastId: z.string().min(1, 'El ID del gimnasta es requerido'),
  judge: z.string().min(1, 'El ID del juez es requerido'),
  apparatus: z.string().min(1, 'El aparato es requerido'),
  tournament: z.string().min(1, 'El ID del torneo es requerido'),
  
  // Score fields - at least one should be provided
  deductions: z.number().min(0).max(10).nullable().optional(),
  startValue: z.number().min(0).nullable().optional(),
  difficultyBonus: z.number().min(0).nullable().optional(),
  dScore: z.number().min(0).nullable().optional(),
  
  // Metadata
  judgeType: JudgeTypeEnum.optional(),
  scoringMethod: ScoringMethodEnum.optional(),
  level: z.string().optional(),
}).refine(
  (data) => {
    // At least one score field should be provided or all should be null/undefined (for deletion)
    return data.deductions !== undefined || 
           data.startValue !== undefined || 
           data.difficultyBonus !== undefined || 
           data.dScore !== undefined;
  },
  {
    message: 'Al menos un campo de puntuación debe ser proporcionado',
  }
);

// Query scores schema
export const queryScoresSchema = z.object({
  apparatus: z.string().optional(),
  group: z.string().optional(),
  tournament: z.string().optional(),
});

export type SubmitScoreInput = z.infer<typeof submitScoreSchema>;
export type QueryScoresInput = z.infer<typeof queryScoresSchema>;
