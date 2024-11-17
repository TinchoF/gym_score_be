import express from 'express';
import Score from '../models/Score';


const router = express.Router();

// Get results by group
router.get('/', async (req, res) => {
  try {
    const results = await Score.find();
    res.json(results);
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: 'Error fetching results' });
  }
});

// Submit scores
router.post('/', async (req, res) => {
  try {
    const { gymnastId, apparatus, deductions, tournament } = req.body;
    const initialScore = 10;
    const finalScore = initialScore - deductions;

    // Busca un documento existente basado en gymnast, apparatus y tournament
    const score = await Score.findOneAndUpdate(
      { gymnast: gymnastId, apparatus, tournament }, // Filtro para coincidencias
      { gymnast: gymnastId, apparatus, deductions, finalScore, tournament }, // Nuevos datos
      { upsert: true, new: true } // upsert: crea si no existe, new: devuelve el documento actualizado
    );

    res.status(201).json(score);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Error submitting score' });
  }
});


export default router;
