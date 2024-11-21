import express from 'express';
import Tournament from '../models/Tournament';
import Gymnast from '../models/Gymnast';

const router = express.Router();

// Obtener todos los torneos
router.get('/', async (req, res) => {
  try {
    const tournaments = await Tournament.find();
    res.json(tournaments);
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    res.status(500).json({ message: 'Error fetching tournaments' });
  }
});

// Crear un nuevo torneo
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    const newTournament = new Tournament({ name });
    await newTournament.save();
    res.status(201).json(newTournament);
  } catch (error) {
    console.error('Error creating tournament:', error);
    res.status(500).json({ message: 'Error creating tournament' });
  }
});

// Actualizar un torneo
router.put('/:id', async (req, res) => {
  try {
    const { name } = req.body;
    const tournament = await Tournament.findByIdAndUpdate(
      req.params.id,
      { name },
      { new: true }
    );
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    res.json(tournament);
  } catch (error) {
    console.error('Error updating tournament:', error);
    res.status(500).json({ message: 'Error updating tournament' });
  }
});

// Eliminar un torneo y actualizar gimnastas
router.delete('/:id', async (req, res) => {
  try {
    const tournament = await Tournament.findByIdAndDelete(req.params.id);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    // Establecer el campo tournament en null para los gimnastas que tenían este torneo
    await Gymnast.updateMany(
      { tournament: tournament._id },
      { $set: { tournament: null } }
    );
    res.json({ message: 'Tournament deleted and gymnasts updated' });
  } catch (error) {
    console.error('Error deleting tournament:', error);
    res.status(500).json({ message: 'Error deleting tournament' });
  }
});

export default router;
