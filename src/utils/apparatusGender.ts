import { GAF_APPARATUSES, GAM_APPARATUSES, Gender } from '../types';

const GAF_SET = new Set<string>(GAF_APPARATUSES);
const GAM_SET = new Set<string>(GAM_APPARATUSES);

/**
 * Un aparato que solo existe en la lista de un género (p. ej. Paralelas, solo GAM)
 * implica ese filtro de género; uno compartido (Suelo, Salto) no restringe nada.
 * Única fuente de verdad para esta regla — usado tanto por /by-rotation (gimnastas a
 * calificar) como por /groups (qué grupos mostrar en el dropdown del juez), para que
 * nunca queden desincronizados.
 */
export function getGenderFilterForApparatus(apparatus?: string | null): Gender | undefined {
  if (!apparatus) return undefined;
  const inGAF = GAF_SET.has(apparatus);
  const inGAM = GAM_SET.has(apparatus);
  if (inGAM && !inGAF) return 'M';
  if (inGAF && !inGAM) return 'F';
  return undefined;
}
