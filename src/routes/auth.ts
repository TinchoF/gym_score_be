import express from 'express';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin';  // Asegúrate de que la ruta sea correcta
import Judge from '../models/Judge';  // Asegúrate de que la ruta sea correcta
import { getJudgesList } from './authController';


const router = express.Router();

// Ruta para login
router.post('/login', async (req, res) => {
  console.log('Log in')
  const { username, password, role } = req.body;  // role puede ser 'admin' o 'judge'
  console.log('req.body', req.body)
  const all = await Admin.find();
  console.log('all users from DB', all)
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

      // Verificar si el juez existe
      if (!user || user.password !== password) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    } else {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Si todo es correcto, generar el token incluyendo institutionId
    const institutionId = user.institution;
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
