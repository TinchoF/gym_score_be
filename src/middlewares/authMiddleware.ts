import { Request, Response, NextFunction } from 'express';
import Admin from '../models/Admin';
import Judge from '../models/Judge';
import jwt from 'jsonwebtoken';

// Middleware para verificar el token
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied' });
  }

  jwt.verify(token, process.env.JWT_SECRET || '', async (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    const { id, role } = user as { id: string; role: string };

    if (role === 'admin') {
      // Buscar el admin en la base de datos usando el id
      const admin = await Admin.findById(id);
      if (!admin) return res.status(403).json({ error: 'Admin not found' });
    } else if (role === 'judge') {
      // Buscar el juez en la base de datos usando el id
      const judge = await Judge.findById(id);
      if (!judge) return res.status(403).json({ error: 'Judge not found' });
    } else {
      return res.status(403).json({ error: 'Invalid role' });
    }

    // Si todo es válido, continuar con la solicitud
    (req as any).user = user;
    next();
  });
};
