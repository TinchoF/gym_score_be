
import express from 'express';
import Gymnast from '../models/Gymnast';
import mongoose from 'mongoose';
import Tournament from '../models/Tournament';

const router = express.Router();

// Get all gymnasts with optional filters
router.get('/', async (req, res) => {
  try {
    const { level, category, group, populateTournament } = req.query;
    const filters: any = {};
    if (level) filters.level = level;
    if (category) filters.category = category;
    if (group) filters.group = group;

    let query = Gymnast.find(filters);
    if (populateTournament === 'true') {
      query = query.populate('tournament');
    }

    const gymnasts = await query;
    res.json(gymnasts);
  } catch (error) {
    console.log('ERROR', error)
    res.status(500).json({ error: 'Error fetching gymnasts' });
  }
});


router.post('/', async (req, res) => {
  try {
    // Extraer el campo 'tournament' y otros datos del cuerpo de la solicitud
    const { _id, tournamentId, ...gymnastData } = req.body;

    // Convertir 'tournament' a ObjectId si está presente
    if (tournamentId) {
      gymnastData.tournament = new mongoose.Types.ObjectId(tournamentId);
    }

    // Crear una nueva instancia del modelo con los datos del gimnasta
    const newGymnast = new Gymnast(gymnastData);

    await newGymnast.save();
    res.status(201).json(newGymnast);
  } catch (error) {
    console.log('Error al crear gimnasta:', error);
    res.status(400).json({ error: 'Error creando gimnasta' });
  }
});



// Update a gymnast
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validar que el ID del gimnasta es válido
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID de gimnasta no válido' });
    }

    // Crear un objeto de actualización a partir del cuerpo de la solicitud
    const updateData = { ...req.body };

    console.log('updateData.tournament ANTES', updateData.tournamentId)

    // Convertir 'tournament' a ObjectId si está presente en los datos de actualización
    if (updateData.tournamentId) {
      updateData.tournament = new mongoose.Types.ObjectId(updateData.tournamentId);
    }

    console.log('updateData.tournament DESPUES', updateData.tournament)

    // Actualizar el gimnasta con los datos proporcionados
    const updatedGymnast = await Gymnast.findByIdAndUpdate(id, updateData, { new: true });
    if (!updatedGymnast) {
      return res.status(404).json({ error: 'Gimnasta no encontrado' });
    }
    res.json(updatedGymnast);
  } catch (error) {
    console.error('Error al actualizar gimnasta:', error);
    res.status(500).json({ error: 'Error actualizando gimnasta' });
  }
});




// Delete a gymnast
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Gymnast.findByIdAndDelete(id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Error deleting gymnast' });
  }
});

export default router;
