/**
 * Modo Sede — offline bundle / sync / lock endpoints.
 * Mounted at /api/offline, after authenticateToken and BEFORE the offlineLockGuard.
 * See docs/MODO_SEDE.md.
 */
import express, { Request, Response, NextFunction } from 'express';
import Institution from '../models/Institution';
import Admin from '../models/Admin';
import { buildInstitutionBundle, applyInstitutionSync } from '../services/offlineSync';

const router = express.Router();
// Nota: el body-parser con límite alto se aplica en index.ts al montar este router
// (tiene que correr ANTES del express.json() global de 100kb).

/** super-admin, or an admin belonging to the target institution */
async function requireInstitutionAccess(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  const institutionId = req.params.id;
  if (user.role === 'super-admin') return next();
  if (user.role === 'admin' && String(user.institutionId) === String(institutionId)) return next();
  return res.status(403).json({ error: 'No tiene permiso sobre esta institución' });
}

/**
 * POST /api/offline/institutions/:id/lock
 * Body: { deviceLabel?: string, force?: boolean }
 * Puts the institution into Modo Sede. Needs internet (this is the cloud API).
 */
router.post('/institutions/:id/lock', requireInstitutionAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { deviceLabel, force } = req.body ?? {};
    const institution = await Institution.findById(id).select('offlineMode name');
    if (!institution) return res.status(404).json({ error: 'Institución no encontrada' });

    if ((institution as any).offlineMode?.active && !force) {
      return res.status(409).json({
        error: 'La institución ya está en Modo Sede. Usá force para reemplazar el candado.',
        code: 'ALREADY_LOCKED',
        offlineMode: (institution as any).offlineMode,
      });
    }

    const user = (req as any).user;
    const admin = await Admin.findById(user.id).select('username').lean();

    (institution as any).offlineMode = {
      active: true,
      since: new Date(),
      byUserId: user.id,
      byUserName: (admin as any)?.username,
      deviceLabel: deviceLabel || undefined,
      lastSyncAt: undefined,
    };
    await institution.save();

    return res.json({ ok: true, offlineMode: (institution as any).offlineMode });
  } catch (err) {
    console.error('[offline] lock error:', err);
    return res.status(500).json({ error: 'Error al bloquear la institución' });
  }
});

/**
 * POST /api/offline/institutions/:id/unlock
 * Clears the lock without touching data (a.k.a. "forzar desbloqueo").
 */
router.post('/institutions/:id/unlock', requireInstitutionAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const institution = await Institution.findById(id).select('offlineMode');
    if (!institution) return res.status(404).json({ error: 'Institución no encontrada' });

    (institution as any).offlineMode = {
      ...((institution as any).offlineMode?.toObject?.() ?? (institution as any).offlineMode ?? {}),
      active: false,
    };
    await institution.save();

    return res.json({ ok: true, offlineMode: (institution as any).offlineMode });
  } catch (err) {
    console.error('[offline] unlock error:', err);
    return res.status(500).json({ error: 'Error al desbloquear la institución' });
  }
});

/**
 * GET /api/offline/institutions/:id/bundle
 * Returns the full self-contained snapshot for offline serving.
 * Does NOT lock — locking is a separate explicit action.
 */
router.get('/institutions/:id/bundle', requireInstitutionAccess, async (req, res) => {
  try {
    const bundle = await buildInstitutionBundle(req.params.id);
    return res.json(bundle);
  } catch (err: any) {
    console.error('[offline] bundle error:', err);
    if (err?.message === 'Institución no encontrada') {
      return res.status(404).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Error al generar el bundle' });
  }
});

/**
 * POST /api/offline/institutions/:id/sync
 * Body: SyncPayload + { finalize?: boolean }
 * Upserts the laptop snapshot back into the cloud. Deletions are reported, not applied.
 */
router.post('/institutions/:id/sync', requireInstitutionAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { finalize, ...payload } = req.body ?? {};

    const institution = await Institution.findById(id).select('offlineMode');
    if (!institution) return res.status(404).json({ error: 'Institución no encontrada' });
    if (!(institution as any).offlineMode?.active) {
      return res.status(409).json({
        error: 'La institución no está en Modo Sede. Bloqueala antes de sincronizar.',
        code: 'NOT_LOCKED',
      });
    }

    const result = await applyInstitutionSync(id, payload, { finalize: !!finalize });

    if (!result.ok) {
      return res.status(409).json({
        error: 'Se detectaron cambios en la nube posteriores al bundle. Revisá la divergencia antes de sincronizar.',
        code: 'DIVERGENCE',
        ...result,
      });
    }

    return res.json({ ...result, finalized: !!finalize });
  } catch (err: any) {
    console.error('[offline] sync error:', err);
    return res.status(500).json({ error: err?.message || 'Error al sincronizar' });
  }
});

export default router;
