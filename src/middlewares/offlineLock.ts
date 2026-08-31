import { Request, Response, NextFunction } from 'express';
import Institution from '../models/Institution';

/**
 * Guarda de Modo Sede — funciona en los dos sentidos:
 *
 *  - **En la nube:** rechaza escrituras de una institución que ESTÁ en Modo Sede
 *    (su data vive en la laptop de la sede; la copia online queda read-only).
 *
 *  - **En el servidor local (`OFFLINE_MODE=true`):** rechaza escrituras de una
 *    institución que NO está en Modo Sede en esta laptop. Así, si por lo que sea
 *    quedó data de otra institución en la DB local, nadie puede editarla desde la
 *    sede y generar cambios que después se pierden. La única "memoria de confianza"
 *    es lo que se importó la última vez con internet.
 *
 * No se guarda: GET/HEAD/OPTIONS, usuarios sin institutionId (super-admin), y las
 * rutas `/api/offline*` (montadas antes de este middleware).
 */
export async function offlineLockGuard(req: Request, res: Response, next: NextFunction) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();

  const institutionId = (req as any).user?.institutionId;
  if (!institutionId) return next();

  try {
    const inst = await Institution.findById(institutionId).select('offlineMode').lean();
    const active = !!(inst as any)?.offlineMode?.active;

    if (process.env.OFFLINE_MODE === 'true') {
      if (!active) {
        return res.status(423).json({
          error: 'Esta institución no está en Modo Sede en esta laptop. No se puede editar acá.',
          code: 'NOT_IN_OFFLINE_MODE',
        });
      }
      return next();
    }

    if (active) {
      return res.status(423).json({
        error: 'Institución en Modo Sede: la edición online está deshabilitada hasta sincronizar los datos de la jornada.',
        code: 'INSTITUTION_OFFLINE_LOCKED',
        offlineMode: (inst as any).offlineMode,
      });
    }
    return next();
  } catch (err) {
    return next(err);
  }
}
