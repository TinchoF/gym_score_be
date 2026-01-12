import express from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import Admin from '../models/Admin';
import Judge from '../models/Judge';
import Institution from '../models/Institution';
import { getJudgesList } from './authController';


const router = express.Router();

// Rate limiter para prevenir ataques de fuerza bruta
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 intentos por ventana por IP
  message: { error: 'Demasiados intentos de login. Por favor espere 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Ruta para login
router.post('/login', loginLimiter, async (req, res) => {
  const { username, password, role } = req.body;  // role puede ser 'admin' o 'judge'
  try {
    let user;
    if (role === 'admin' || role === 'super-admin') {
      // Buscar en los admins
      user = await Admin.findOne({ username, role });

      // Verificar si la contraseña es correcta (en el caso de los admins la contraseña está encriptada)
      if (!user || !user.comparePassword(password)) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    } else if (role === 'judge') {
      // Buscar en los jueces
      user = await Judge.findOne({ name: username });

      // Verificar si el juez existe y la contraseña es correcta
      if (!user || !user.comparePassword(password)) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    } else {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const institutionId = user.institution;

    // Verificar que la institución esté activa (solo para admin y judge, no super-admin)
    if (role !== 'super-admin' && institutionId) {
      const institution = await Institution.findById(institutionId);
      if (!institution || !institution.isActive) {
        return res.status(403).json({ error: 'Institución desactivada. Contacte al administrador.' });
      }
    }

    // Si todo es correcto, generar el token incluyendo institutionId
    const token = jwt.sign({ id: user._id, role, institutionId }, process.env.JWT_SECRET || '', {
      expiresIn: '24h',
    });

    res.json({ token });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Ruta para obtener la lista de jueces
router.get('/public-judges', getJudgesList);

export default router;
