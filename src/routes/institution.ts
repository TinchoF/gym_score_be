import express from 'express';
import Institution from '../models/Institution';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = express.Router();
// Listar instituciones (GET público)
router.get('/', async (req, res) => {
  try {
    const institutions = await Institution.find();
    res.json(institutions);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener las instituciones' });
  }
});

// Crear una institución
router.post('/', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'super-admin') {
      return res.status(403).json({ error: 'Solo el super-admin puede crear instituciones' });
    }
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }
    const institution = await Institution.create({ name });
    res.status(201).json(institution);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear la institución' });
  }
});

export default router;
