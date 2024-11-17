
import express from 'express';
import Gymnast from '../models/Gymnast';

const router = express.Router();

// Get all gymnasts with optional filters
router.get('/', async (req, res) => {
  try {
    const { level, category, group } = req.query;
    const filters: any = {};
    if (level) filters.level = level;
    if (category) filters.category = category;
    if (group) filters.group = group;

    const gymnasts = await Gymnast.find(filters);
    res.json(gymnasts);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching gymnasts' });
  }
});

// Create a gymnast
router.post('/', async (req, res) => {
  try {
    const newGymnast = new Gymnast(req.body);
    await newGymnast.save();
    res.status(201).json(newGymnast);
  } catch (error) {
    res.status(400).json({ error: 'Error creating gymnast' });
  }
});

// Update a gymnast
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedGymnast = await Gymnast.findByIdAndUpdate(id, req.body, { new: true });
    res.json(updatedGymnast);
  } catch (error) {
    res.status(400).json({ error: 'Error updating gymnast' });
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
