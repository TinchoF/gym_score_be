/**
 * Modo Sede — endpoints used only by the Electron app talking to its OWN local
 * server (localhost, inside OFFLINE_MODE). Not JWT-auth'd: gated by OFFLINE_MODE +
 * a shared secret the Electron main process passes when forking the backend.
 *
 * Mounted at /api/offline-local in the PUBLIC section of index.ts.
 * See docs/MODO_SEDE.md.
 */
import express, { Request, Response, NextFunction } from 'express';
import Institution from '../models/Institution';
import { importBundleToLocal, exportLocalSnapshot } from '../services/offlineSync';

const router = express.Router();
// El body-parser con límite alto se aplica en index.ts al montar este router.

router.use((req: Request, res: Response, next: NextFunction) => {
  if (process.env.OFFLINE_MODE !== 'true') {
    return res.status(404).json({ error: 'Not found' });
  }
  const secret = process.env.OFFLINE_LOCAL_SECRET;
  if (secret && req.headers['x-offline-secret'] !== secret) {
    return res.status(401).json({ error: 'Bad offline secret' });
  }
  next();
});

/** POST /api/offline-local/import — wipe + load a bundle into the local DB. */
router.post('/import', async (req, res) => {
  try {
    const bundle = req.body;
    if (!bundle?.meta?.institutionId) {
      return res.status(400).json({ error: 'Bundle inválido (falta meta.institutionId)' });
    }
    const result = await importBundleToLocal(bundle);
    return res.json({ ok: true, ...result });
  } catch (err: any) {
    console.error('[offline-local] import error:', err);
    return res.status(500).json({ error: err?.message || 'Error al importar el bundle' });
  }
});

/**
 * GET /api/offline-local/pending — instituciones cargadas localmente que todavía
 * están en Modo Sede (jornada sin sincronizar). Funciona sin internet.
 */
router.get('/pending', async (_req, res) => {
  try {
    const list = await Institution.find({ 'offlineMode.active': true })
      .select('name institutionCode offlineMode')
      .lean();
    return res.json(list);
  } catch (err: any) {
    console.error('[offline-local] pending error:', err);
    return res.status(500).json({ error: err?.message || 'Error' });
  }
});

/** GET /api/offline-local/export?institutionId=... — dump local state as a sync payload. */
router.get('/export', async (req, res) => {
  try {
    const institutionId = String(req.query.institutionId || '');
    if (!institutionId) return res.status(400).json({ error: 'institutionId es requerido' });
    const payload = await exportLocalSnapshot(institutionId);
    return res.json(payload);
  } catch (err: any) {
    console.error('[offline-local] export error:', err);
    return res.status(500).json({ error: err?.message || 'Error al exportar el estado local' });
  }
});

export default router;
