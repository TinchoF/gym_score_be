
import express from 'express';
import Judge from '../models/Judge';

const router = express.Router();

// Get all judges
router.get('/', async (req, res) => {
  try {
    const judges = await Judge.find();
    res.json(judges);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching judges' });
  }
});

// Create a judge
router.post('/', async (req, res) => {
  try {
    const newJudge = new Judge(req.body);
    await newJudge.save();
    res.status(201).json(newJudge);
  } catch (error) {
    res.status(400).json({ error: 'Error creating judge' });
  }
});

export default router;
