import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Middleware para verificar el token
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied' });
  }

  jwt.verify(token, process.env.JWT_SECRET || '', async (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    const { id, role, institutionId } = decoded as { id: string; role: string; institutionId?: string };
    
    // Validar que el institutionId esté presente para roles que lo requieren
    if ((role === 'admin' || role === 'judge') && !institutionId) {
      return res.status(403).json({ error: 'Missing institution information' });
    }

    // Agregar información del usuario al request
    (req as any).user = { id, role, institutionId };
    next();
  });
};
