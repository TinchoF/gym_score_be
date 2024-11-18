import express from 'express';
import Assignment from '../models/Assignment';
import Judge from '../models/Judge';
import mongoose from 'mongoose';
import { ObjectId } from 'mongoose'; 

const router = express.Router();

// Get all assignments
router.get('/', async (req, res) => {
  try {
    const assignments = await Assignment.find();
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching assignments' });
  }
});

// Obtener asignaciones de un juez específico
router.get('/judge/:judgeId', async (req, res) => {
  try {
    const { judgeId } = req.params;

    // Validar que el judgeId sea un ObjectId válido
    if (!mongoose.Types.ObjectId.isValid(judgeId)) {
      return res.status(400).json({ error: 'ID del juez no válido' });
    }

    // Buscar todas las asignaciones donde el juez esté involucrado
    const assignments = await Assignment.find({ judges: new mongoose.Types.ObjectId(judgeId) });

    res.status(200).json(assignments);
  } catch (error) {
    console.error('Error fetching assignments for judge:', error);
    res.status(500).json({ error: 'Error fetching assignments for judge' });
  }
});


// Eliminar un juez de una asignación
router.delete('/:assignmentId', async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { judgeId } = req.query;  // Obtener judgeId de la query string

    if (!mongoose.Types.ObjectId.isValid(judgeId as string)) {
      return res.status(400).json({ error: 'ID no válido' });
    }


    // Convertir judgeId en un ObjectId válido
    const judgeObjectId =  new mongoose.Types.ObjectId(judgeId as string);

    // Encontrar la asignación que contiene el juez
    const assignment = await Assignment.findById(assignmentId);

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Verificar si el juez está en la asignación
    const judgeIndex = assignment.judges.indexOf(judgeObjectId);
    if (judgeIndex === -1) {
      return res.status(400).json({ error: 'Judge not assigned to this assignment' });
    }

    // Eliminar el juez del array de jueces
    assignment.judges.splice(judgeIndex, 1);
    await assignment.save();

    res.status(200).json(assignment);  // Devolver la asignación actualizada
  } catch (error) {
    console.error('Error removing judge:', error);
    res.status(500).json({ error: 'Error removing judge' });
  }
});

// Create or update an assignment
router.post('/', async (req, res) => {
  try {
    const { gender, group, level, category, apparatus, schedule, judges, tournament } = req.body;

    // Verify judges exist
    const existingJudges = await Judge.find({ _id: { $in: judges } });
    if (existingJudges.length !== judges.length) {
      return res.status(400).json({ error: 'One or more judges not found' });
    }

    // Check if assignment with the same combination of level, category, apparatus, and schedule already exists
    let existingAssignment = await Assignment.findOne({
      gender,
      level,
      category,
      apparatus,
      schedule,
      tournament,
    });

    if (existingAssignment) {
      // If the assignment exists but doesn't contain the judge, add the judge to the array
      const judgeExistsInAssignment = existingAssignment.judges.includes(judges[0]); // Assuming only one judge is being added
      if (!judgeExistsInAssignment) {
        existingAssignment.judges.push(judges[0]);
        await existingAssignment.save();
        return res.status(200).json(existingAssignment);
      } else {
        return res.status(400).json({ error: 'Judge already assigned to this combination' });
      }
    } else {
      // If no assignment exists, create a new one
      const newAssignment = new Assignment({
        gender,
        group,
        level,
        category,
        apparatus,
        schedule,
        judges,
        tournament,
      });

      await newAssignment.save();
      return res.status(201).json(newAssignment);
    }
  } catch (error) {
    console.log(error);
    res.status(400).json({ error: 'Error creating or updating assignment' });
  }
});

export default router;
