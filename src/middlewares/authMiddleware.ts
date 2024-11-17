import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied' });
  }

  jwt.verify(token, process.env.JWT_SECRET || '', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    // Solución: Asegurar que TypeScript reconozca la propiedad `user`
    (req as any).user = user;

    next();
  });
};
