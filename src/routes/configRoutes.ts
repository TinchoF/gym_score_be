import express from 'express';
import Config from '../models/Config';

const router = express.Router();

// Obtener configuración actual
router.get('/', async (req, res) => {
  try {
    const config = await Config.findOne();
    if (!config) {
      // Si no existe configuración, crear una por defecto
      const newConfig = new Config({
        baseScore: 10,
        tournaments: [],
        groupCount: 0,
      });
      await newConfig.save();
      return res.json(newConfig);
    }
    res.json(config);
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ message: 'Error fetching config' });
  }
});

// Actualizar configuración
router.put('/', async (req, res) => {
  try {
    const { baseScore, tournaments, groupCount } = req.body;
    const config = await Config.findOneAndUpdate(
      {},
      { baseScore, tournaments, groupCount },
      { new: true, upsert: true } // Si no existe, crea uno nuevo
    );
    res.json(config);
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({ message: 'Error updating config' });
  }
});

export default router;
