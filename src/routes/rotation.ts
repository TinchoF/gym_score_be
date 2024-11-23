import express from 'express';
import Rotation from '../models/Rotation';
import mongoose from 'mongoose';

const router = express.Router();

// Crear o actualizar rotación
router.post('/', async (req, res) => {
  try {
    const { gymnastId, tournamentId, apparatus, order } = req.body;

    // Validar parámetros requeridos
    if (!gymnastId || !tournamentId || !apparatus) {
      return res.status(400).json({ error: 'Faltan parámetros: gymnastId, tournamentId, apparatus o order' });
    }

    // Validar ObjectIds
    if (!mongoose.Types.ObjectId.isValid(gymnastId) || !mongoose.Types.ObjectId.isValid(tournamentId)) {
      return res.status(400).json({ error: 'gymnastId o tournamentId no válidos' });
    }

    // Buscar si ya existe una rotación para este gimnasta, aparato y torneo
    const existingRotation = await Rotation.findOne({
      gymnast: gymnastId,
      tournament: tournamentId,
      apparatus,
    });

    if (existingRotation) {
      // Si ya existe, actualizar el orden
      existingRotation.order = order;
      await existingRotation.save();
      return res.json({ message: 'Rotación actualizada', rotation: existingRotation });
    }

    // Si no existe, crear una nueva rotación
    const newRotation = new Rotation({
      gymnast: new mongoose.Types.ObjectId(gymnastId),
      tournament: new mongoose.Types.ObjectId(tournamentId),
      apparatus,
      order,
    });

    await newRotation.save();
    res.status(201).json({ message: 'Rotación creada', rotation: newRotation });
  } catch (error) {
    console.error('Error al guardar rotación:', error);
    res.status(500).json({ error: 'Error al guardar la rotación' });
  }
});

export default router;
