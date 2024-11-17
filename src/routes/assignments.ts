
import express from 'express';
import Assignment from '../models/Assignment';
import Judge from '../models/Judge';

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

// Create an assignment
router.post('/', async (req, res) => {
  try {
    const { group, level, category, apparatus, schedule, judges } = req.body;

    // Verify judges exist
    const existingJudges = await Judge.find({ _id: { $in: judges } });
    if (existingJudges.length !== judges.length) {
      return res.status(400).json({ error: 'One or more judges not found' });
    }

    const newAssignment = new Assignment({
      group,
      level,
      category,
      apparatus,
      schedule,
      judges,
    });

    await newAssignment.save();
    res.status(201).json(newAssignment);
  } catch (error) {
    res.status(400).json({ error: 'Error creating assignment' });
  }
});

// Get unassigned combinatories
router.get('/unassigned', async (req, res) => {
  try {
    const unassigned = await Assignment.find({ judges: { $size: 0 } });
    res.json(unassigned);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching unassigned combinatories' });
  }
});

export default router;
