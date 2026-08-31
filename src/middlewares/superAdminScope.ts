import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

/**
 * El super-admin no tiene institución propia. En la web app elige con qué
 * institución está trabajando (selector en el header) y eso viaja como
 * `x-institution-id`. Acá lo aplicamos: para el resto de las rutas, un super-admin
 * con esta cabecera se comporta como un admin de esa institución (los datos quedan
 * scopeados). El scoring y demás config global no dependen de esto.
 *
 * Montar DESPUÉS de authenticateToken y de `/api/offline`, ANTES del offlineLockGuard.
 */
export function superAdminScope(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (user?.role === 'super-admin') {
    const override = req.headers['x-institution-id'];
    if (typeof override === 'string' && mongoose.Types.ObjectId.isValid(override)) {
      user.institutionId = override;
    }
    // Diagnóstico: visible en el Network tab del browser.
    res.set('x-scope', String(user.institutionId || 'ninguna'));
  }
  next();
}
