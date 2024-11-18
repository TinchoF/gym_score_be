import express from 'express';
import Score from '../models/Score';
import mongoose from 'mongoose';
import Gymnast from '../models/Gymnast';


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
    console.log(req.body)

    if (!mongoose.Types.ObjectId.isValid(gymnastId)) {
      return res.status(400).json({ error: 'ID no válido' });
    }
    // Verifica que gymnastId es un ObjectId válido
    const gymnastObjectId = new mongoose.Types.ObjectId(gymnastId);



    const gymnast = await Gymnast.findById(gymnastObjectId);
if (!gymnast) {
  return res.status(400).json({ error: 'Gymnast not found' });
}


    // Busca si existe el documento con la combinación de gymnastId, apparatus y tournament
    let score = await Score.findOne({ gymnast: gymnastObjectId, apparatus, tournament });

    if (score) {
      // Si el documento existe, lo actualizamos
      score.deductions = deductions;
      score.save();
    } else {
      // Si no existe, lo creamos
      score = await Score.create({
        gymnast: gymnastObjectId,
        apparatus,
        deductions,
        tournament,
      });
    }

    console.log('score', score);
    res.status(201).json(score);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Error submitting score' });
  }
});



export default router;
