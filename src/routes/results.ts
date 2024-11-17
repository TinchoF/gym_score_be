import express from 'express';
import Score from '../models/Score';


const router = express.Router();

// Get results by group
router.get('/group/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const results = await Score.find({ group: groupId }).populate('gymnast');
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching results' });
  }
});

// Submit scores
router.post('/', async (req, res) => {
  try {
    const { gymnastId, apparatus, deductions } = req.body;
    const initialScore = 10;
    const finalScore = initialScore - deductions;

    const score = new Score({
      gymnast: gymnastId,
      apparatus,
      deductions,
      finalScore,
    });

    await score.save();
    res.status(201).json(score);
  } catch (error) {
    res.status(400).json({ error: 'Error submitting score' });
  }
});

// Calculate rankings
router.get('/rankings/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const scores = await Score.find({ group: groupId }).populate('gymnast');

    const totals: { [key: string]: number } = scores.reduce((acc, score) => {
      const gymnastId = score.gymnast._id.toString(); // Convertir ObjectId a string
      const finalScore = typeof score.finalScore === 'number' ? score.finalScore : 0; // Asegurar número
      acc[gymnastId] = (acc[gymnastId] || 0) + finalScore; // Sumar al acumulador
      return acc;
    }, {});

    const rankings = Object.entries(totals)
      .map(([gymnastId, totalScore]) => ({
        gymnastId,
        totalScore,
      }))
      .sort((a, b) => b.totalScore - a.totalScore);

    res.json(rankings);
  } catch (error) {
    res.status(500).json({ error: 'Error calculating rankings' });
  }
});

export default router;
