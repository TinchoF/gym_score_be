import express from 'express';
import Score from '../models/Score';
import mongoose from 'mongoose';
import Gymnast from '../models/Gymnast';


const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { apparatus, group, tournament } = req.query;

    if (!apparatus && !group && !tournament) {
      const results = await Score.find();
      return res.json(results);
    }

    // Build the filter object based on query parameters
    const filter:any = {};

    if (apparatus) {
      filter.apparatus = apparatus;
    }

    if (group) {
      // Assuming 'group' is stored as a number in the database
      const groupNumber = Number(group);
      if (!isNaN(groupNumber)) {
        filter.group = groupNumber;
      } else {
        return res.status(400).json({ error: 'Invalid group parameter' });
      }
    }

    if (tournament) {
      // Assuming 'tournament' is stored as a reference (ObjectId) in the database
      // Validate if 'tournament' is a valid ObjectId
      const mongoose = require('mongoose');
      if (mongoose.Types.ObjectId.isValid(tournament)) {
        filter.tournament = tournament;
      } else {
        return res.status(400).json({ error: 'Invalid tournament parameter' });
      }
    }

    // Optional: Implement additional filtering or sorting as needed
    // For example, you might want to sort scores by apparatus or gymnast

    const results = await Score.find(filter)
      .populate('gymnast') // Populate if you have references and need detailed gymnast info
      .populate('tournament') // Similarly, populate tournament details if necessary
      .exec();

    res.json(results);
  } catch (error) {
    console.error('Error fetching scores:', error);
    res.status(500).json({ error: 'Error fetching results' });
  }
});

// Submit scores
router.post('/', async (req, res) => {
  try {
    const { gymnastId, apparatus, deductions, tournament } = req.body;
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

    // Emitir evento de WebSocket cuando el puntaje se actualiza o crea
    const io = req.app.get('socketio');  // Acceder a la instancia de socket.io
    io.emit('scoreUpdated', score);  // Emitir el evento 'scoreUpdated' a todos los clientes


    res.status(201).json(score);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Error submitting score' });
  }
});



export default router;
