// Tipos de métodos de puntuación
export type ScoringMethod = 'deductions' | 'start_value' | 'fig_code';

// Interfaz para configuración de nivel
export interface LevelScoringConfig {
  level: string;
  scoringMethod: ScoringMethod;
  baseStartValue?: number;
}

// Configuración por defecto de niveles y sus métodos de puntuación
export const DEFAULT_LEVEL_SCORING: LevelScoringConfig[] = [
  // GAF - Nivel Escuela
  { level: 'E1', scoringMethod: 'deductions', baseStartValue: 10 },
  { level: 'E2', scoringMethod: 'deductions', baseStartValue: 10 },
  { level: 'E3', scoringMethod: 'deductions', baseStartValue: 10 },
  { level: 'Pulga', scoringMethod: 'deductions', baseStartValue: 10 },
  // GAF - USAG Obligatorios
  { level: 'USAG 1A', scoringMethod: 'deductions', baseStartValue: 10 },
  { level: 'USAG 1B', scoringMethod: 'deductions', baseStartValue: 10 },
  { level: 'USAG 2', scoringMethod: 'deductions', baseStartValue: 10 },
  { level: 'USAG 3', scoringMethod: 'deductions', baseStartValue: 10 },
  { level: 'USAG 4', scoringMethod: 'deductions', baseStartValue: 10 },
  { level: 'USAG 5', scoringMethod: 'deductions', baseStartValue: 10 },
  // GAF - USAG Opcionales (ahora usan start_value con hasBonuses)
  { level: 'USAG 6', scoringMethod: 'start_value', baseStartValue: 9.5 },
  { level: 'USAG 7', scoringMethod: 'start_value', baseStartValue: 9.5 },
  { level: 'USAG 8', scoringMethod: 'start_value', baseStartValue: 9.5 },
  { level: 'USAG 9', scoringMethod: 'start_value', baseStartValue: 9.7 },
  { level: 'USAG 10', scoringMethod: 'start_value', baseStartValue: 9.4 },
  // GAM - Niveles AC
  { level: 'AC0', scoringMethod: 'start_value', baseStartValue: 9.0 },
  { level: 'AC1', scoringMethod: 'start_value', baseStartValue: 9.2 },
  { level: 'AC2', scoringMethod: 'start_value', baseStartValue: 9.4 },
  { level: 'AC3', scoringMethod: 'start_value', baseStartValue: 9.6 },
  { level: 'AC4', scoringMethod: 'start_value', baseStartValue: 9.7 },
  { level: 'AC5', scoringMethod: 'start_value', baseStartValue: 10 },
  // Elite
  { level: 'Junior FIG', scoringMethod: 'fig_code' },
  { level: 'Senior FIG', scoringMethod: 'fig_code' },
  { level: 'Mayor FIG', scoringMethod: 'fig_code' },
];

/**
 * Obtener configuración de puntuación para un nivel
 */
export function getLevelScoringConfig(
  level: string, 
  customConfig?: LevelScoringConfig[]
): LevelScoringConfig {
  const allConfig = [...(customConfig || []), ...DEFAULT_LEVEL_SCORING];
  const found = allConfig.find(c => c.level === level);
  // Default a deductions si no se encuentra
  return found || { level, scoringMethod: 'deductions', baseStartValue: 10 };
}

/**
 * Calcula la deducción final promediando múltiples jueces según reglas FIG/CAG
 * - 1 juez: se usa directamente
 * - 2-3 jueces: promedio simple
 * - 4+ jueces: descarta extremos, promedia el resto
 */
export function calculateFinalDeductions(deductions: number[]): number | null {
  if (!deductions || deductions.length === 0) return null;

  const n = deductions.length;
  if (n === 1) return deductions[0];

  // For 2 or 3 judges: simple average
  if (n === 2 || n === 3) {
    const sum = deductions.reduce((a, b) => a + b, 0);
    return +(sum / n).toFixed(3);
  }

  // For 4 or more: drop highest and lowest, average the rest
  if (n >= 4) {
    const sorted = deductions.slice().sort((a, b) => a - b);
    const middle = sorted.slice(1, -1);
    const sum = middle.reduce((a, b) => a + b, 0);
    return +(sum / middle.length).toFixed(3);
  }

  return null;
}

/**
 * Calcula el D-Score final (consenso de jueces D)
 * Normalmente 2 jueces D llegan a consenso, se usa el promedio
 */
export function calculateFinalDScore(dScores: number[]): number | null {
  if (!dScores || dScores.length === 0) return null;
  const sum = dScores.reduce((a, b) => a + b, 0);
  return +(sum / dScores.length).toFixed(3);
}

/**
 * Resultado del cálculo de puntuación final
 */
export interface FinalScoreResult {
  method: ScoringMethod;
  baseScore?: number;
  startValue?: number;
  difficultyBonus?: number;
  dScore?: number;
  eScore?: number;
  finalDeduction?: number;
  finalNeutralDeduction?: number;
  finalScore: number;
}

/**
 * Calcula la puntuación final según el método configurado
 */
export function calculateFinalScore(
  method: ScoringMethod,
  options: {
    baseScore?: number;
    startValue?: number;
    deductions?: number[];
    neutralDeductions?: number[];
    difficultyBonuses?: number[];
    dScores?: number[];
  }
): FinalScoreResult | null {
  const { baseScore = 10, startValue, deductions = [], neutralDeductions = [], difficultyBonuses = [], dScores = [] } = options;

  const finalDeduction = calculateFinalDeductions(deductions);
  const finalNeutralDeduction = calculateFinalDeductions(neutralDeductions) || 0; // Se calcula igual que las deducciones normales

  switch (method) {
    case 'deductions': {
      // Simple: baseScore - deducciones
      if (finalDeduction === null) return null;
      const finalScore = +(baseScore - finalDeduction - finalNeutralDeduction).toFixed(3);
      return {
        method,
        baseScore,
        finalDeduction,
        finalNeutralDeduction: finalNeutralDeduction > 0 ? finalNeutralDeduction : undefined,
        finalScore: Math.max(0, finalScore),
      };
    }

    case 'start_value': {
      // Start Value - deducciones, opcionalmente + bonificación si se proporciona
      if (finalDeduction === null || startValue === undefined) return null;
      const totalBonus = difficultyBonuses.reduce((a, b) => a + b, 0);
      const avgBonus = difficultyBonuses.length > 0 ? totalBonus / difficultyBonuses.length : 0;
      const finalScore = +(startValue + avgBonus - finalDeduction - finalNeutralDeduction).toFixed(3);
      return {
        method,
        startValue,
        difficultyBonus: avgBonus > 0 ? +avgBonus.toFixed(3) : undefined,
        finalDeduction,
        finalNeutralDeduction: finalNeutralDeduction > 0 ? finalNeutralDeduction : undefined,
        finalScore: Math.max(0, finalScore),
      };
    }

    case 'fig_code': {
      // D-Score + E-Score (10 - deducciones)
      const dScore = calculateFinalDScore(dScores);
      if (finalDeduction === null || dScore === null) return null;
      const eScore = +(10 - finalDeduction).toFixed(3);
      const finalScore = +(dScore + eScore - finalNeutralDeduction).toFixed(3);
      return {
        method,
        dScore,
        eScore,
        finalDeduction,
        finalNeutralDeduction: finalNeutralDeduction > 0 ? finalNeutralDeduction : undefined,
        finalScore: Math.max(0, finalScore),
      };
    }

    default:
      return null;
  }
}

export default { 
  calculateFinalDeductions, 
  calculateFinalDScore,
  calculateFinalScore,
  getLevelScoringConfig,
  DEFAULT_LEVEL_SCORING,
};

