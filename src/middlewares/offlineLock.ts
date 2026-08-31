import { Request, Response, NextFunction } from 'express';
import Institution from '../models/Institution';

/**
 * Modo Sede lock guard.
 *
 * While an institution is in Modo Sede (`offlineMode.active`), its data lives on a
 * laptop in the venue and the cloud copy must stay read-only for that institution's
 * users. This middleware rejects mutating requests from users scoped to a locked
 * institution.
 *
 * Not guarded here:
 *  - the local offline server itself (`OFFLINE_MODE=true`) — it must be able to write
 *  - GET/HEAD/OPTIONS
 *  - users without an institutionId (super-admin) — their writes are rare and
 *    deliberate; the `/api/offline/*` routes handle lock/unlock/sync explicitly
 *
 * Mount AFTER `authenticateToken` and AFTER `/api/offline` routes, BEFORE the
 * resource routers.
 */
export async function offlineLockGuard(req: Request, res: Response, next: NextFunction) {
  if (process.env.OFFLINE_MODE === 'true') return next();
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();

  const institutionId = (req as any).user?.institutionId;
  if (!institutionId) return next();

  try {
    const inst = await Institution.findById(institutionId).select('offlineMode').lean();
    if ((inst as any)?.offlineMode?.active) {
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
