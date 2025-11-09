import express from 'express';
import Tournament from '../models/Tournament';
import Gymnast from '../models/Gymnast';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = express.Router();
router.use(authenticateToken);

// Obtener todos los torneos
router.get('/', async (req, res) => {
  try {
  const institutionId = (req as any).user.institutionId;
  const tournaments = await Tournament.find({ institution: institutionId });
    res.json(tournaments);
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    res.status(500).json({ message: 'Error fetching tournaments' });
  }
});

// Crear un nuevo torneo
router.post('/', async (req, res) => {
  try {
  const institutionId = (req as any).user.institutionId;
  const { name } = req.body;
  const newTournament = new Tournament({ name, institution: institutionId });
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
    const { name, groupCount, baseScore, turnos, turnoConfig } = req.body;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (groupCount !== undefined) updateData.groupCount = groupCount;
    if (baseScore !== undefined) updateData.baseScore = baseScore;
    if (turnos !== undefined) updateData.turnos = turnos;
    if (turnoConfig !== undefined) updateData.turnoConfig = turnoConfig;
    
    const tournament = await Tournament.findByIdAndUpdate(
      req.params.id,
      updateData,
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
