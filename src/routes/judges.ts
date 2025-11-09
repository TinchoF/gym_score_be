import express from 'express';
import Judge from '../models/Judge';
import mongoose from 'mongoose';
import { getJudgesList } from './authController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = express.Router();
router.use(authenticateToken);

// Get all judges
router.get('/', async (req, res) => {
  try {
    const institutionId = (req as any).user.institutionId;
    const judges = await Judge.find({ institution: institutionId }).lean();
    
    console.log('Fetching judges for institution:', institutionId);
    console.log('Number of judges found:', judges.length);
    if (judges.length > 0) {
      console.log('First judge:', JSON.stringify(judges[0], null, 2));
    }
    
    // Ensure apparatusAssignments field exists for all judges
    const judgesWithAssignments = judges.map(judge => ({
      ...judge,
      apparatusAssignments: judge.apparatusAssignments || []
    }));
    
    res.json(judgesWithAssignments);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching judges' });
  }
});


// Create a judge
router.post('/', async (req, res) => {
  try {
    const institutionId = (req as any).user.institutionId;
    const newJudge = new Judge({ ...req.body, institution: institutionId });
    await newJudge.save();
    res.status(201).json(newJudge);
  } catch (error) {
    res.status(400).json({ error: 'Error creating judge' });
  }
});

// Update a judge by ID
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    console.log('Updating judge:', id);
    console.log('Updated data:', JSON.stringify(updatedData, null, 2));

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID no válido' });
    }

    // Usar findByIdAndUpdate con runValidators y returnDocument para asegurar que se aplique el schema
    const updatedJudge = await Judge.findByIdAndUpdate(
      id, 
      { $set: updatedData },
      { 
        new: true,
        runValidators: true,
        strict: false  // Permitir actualización de campos que no estaban en el documento original
      }
    );

    console.log('Judge after update:', JSON.stringify(updatedJudge, null, 2));

    if (!updatedJudge) {
      return res.status(404).json({ error: 'Juez no encontrado' });
    }

    res.json(updatedJudge);
  } catch (error) {
    console.error('Error al actualizar juez:', error);
    res.status(500).json({ error: 'Error actualizando juez' });
  }
});

// Get judges by tournament and turno
router.get('/by-tournament-turno', async (req, res) => {
  try {
    const { tournamentId, turno } = req.query;
    const institutionId = (req as any).user.institutionId;
    
    if (!tournamentId || !turno) {
      return res.status(400).json({ error: 'tournamentId y turno son requeridos' });
    }

    // Obtener todos los jueces de la institución
    const judges = await Judge.find({ institution: institutionId });
    
    // Filtrar jueces que tienen asignaciones para este torneo y turno
    const filteredJudges = judges.map(judge => {
      const assignment = judge.apparatusAssignments?.find(
        (a: any) => a.tournament.toString() === tournamentId && a.turno === turno
      );
      
      return {
        _id: judge._id,
        name: judge.name,
        password: judge.password,
        apparatus: assignment ? assignment.apparatus : [],
        institution: judge.institution,
      };
    });

    res.json(filteredJudges);
  } catch (error) {
    console.error('Error fetching judges by tournament and turno:', error);
    res.status(500).json({ error: 'Error fetching judges' });
  }
});

export default router;
