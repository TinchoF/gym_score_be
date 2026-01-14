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
    const institutionId = (req as any).user.institutionId;
    const {name, turnoConfig } = req.body;
    
    // Verify that the tournament belongs to the user's institution
    const existingTournament = await Tournament.findById(req.params.id);
    if (!existingTournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    if (existingTournament.institution?.toString() !== institutionId?.toString()) {
      return res.status(403).json({ message: 'No tiene permiso para modificar este torneo' });
    }
    
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (turnoConfig !== undefined) updateData.turnoConfig = turnoConfig;
    
    const tournament = await Tournament.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    res.json(tournament);
  } catch (error) {
    console.error('Error updating tournament:', error);
    res.status(500).json({ message: 'Error updating tournament' });
  }
});

// Eliminar un torneo y actualizar gimnastas
router.delete('/:id', async (req, res) => {
  try {
    const institutionId = (req as any).user.institutionId;
    
    // Verificar que el torneo pertenece a la institución del usuario
    const existingTournament = await Tournament.findById(req.params.id);
    if (!existingTournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    if (existingTournament.institution?.toString() !== institutionId?.toString()) {
      return res.status(403).json({ message: 'No tiene permiso para eliminar este torneo' });
    }
    
    await Tournament.findByIdAndDelete(req.params.id);
    // Establecer el campo tournament en null para los gimnastas que tenían este torneo
    await Gymnast.updateMany(
      { tournament: existingTournament._id },
      { $set: { tournament: null } }
    );
    res.json({ message: 'Tournament deleted and gymnasts updated' });
  } catch (error) {
    console.error('Error deleting tournament:', error);
    res.status(500).json({ message: 'Error deleting tournament' });
  }
});

export default router;
