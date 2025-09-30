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
    let institutionId;
    if (role === 'admin' || role === 'super-admin') {
      const admin = await Admin.findById(id);
      if (!admin) return res.status(403).json({ error: 'Admin not found' });
      institutionId = admin.institution;
    } else if (role === 'judge') {
      const judge = await Judge.findById(id);
      if (!judge) return res.status(403).json({ error: 'Judge not found' });
      institutionId = judge.institution;
    } else {
      return res.status(403).json({ error: 'Invalid role' });
    }
    (req as any).user = Object.assign({}, user as object, { institutionId });
    next();
  });
};
