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
    // Exclude password from response
    const judges = await Judge.find({ institution: institutionId })
      .select('-password -passwordHashed')
      .lean();
    
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

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID no válido' });
    }

    const judge = await Judge.findById(id);
    if (!judge) {
      return res.status(404).json({ error: 'Juez no encontrado' });
    }

    // Update fields (password if provided will trigger pre-save hook for hashing)
    Object.keys(updatedData).forEach(key => {
      if (key === 'password' && updatedData[key]) {
        // Reset passwordHashed so pre-save hook will hash the new password
        judge.passwordHashed = false;
      }
      (judge as any)[key] = updatedData[key];
    });

    await judge.save();
    
    // Return judge without password
    const responseJudge = judge.toObject();
    delete responseJudge.password;
    delete responseJudge.passwordHashed;

    res.json(responseJudge);
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
