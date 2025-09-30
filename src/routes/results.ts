import express from 'express';
import Score from '../models/Score';
import mongoose from 'mongoose';
import Gymnast from '../models/Gymnast';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = express.Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const { apparatus, group, tournament } = req.query;

  // Construir el objeto de filtro basado en los parámetros de consulta
  const institutionId = (req as any).user.institutionId;
  const filter: any = { institution: institutionId };

    if (apparatus) {
      filter.apparatus = apparatus;
    }

    if (tournament) {
      const mongoose = require('mongoose');
      if (mongoose.Types.ObjectId.isValid(tournament)) {
        filter.tournament = new mongoose.Types.ObjectId(tournament); // Conversión correcta
      } else {
        return res.status(400).json({ error: 'Parámetro de torneo inválido' });
      }
    }

    // Construir el pipeline de agregación
    const pipeline = [
      { $match: filter },
      {
        $lookup: {
          from: 'gymnasts', // Asegúrate de que coincide con el nombre real de tu colección
          localField: 'gymnast',
          foreignField: '_id',
          as: 'gymnast',
        },
      },
      { $unwind: '$gymnast' },
    ];

    if (group) {
      const groupNumber = Number(group);
      if (!isNaN(groupNumber)) {
        pipeline.push({
          $match: { 'gymnast.group': groupNumber },
        });
      } else {
        return res.status(400).json({ error: 'Parámetro de grupo inválido' });
      }
    }

    // Opcionalmente, popular detalles del torneo
    pipeline.push({
      $lookup: {
        from: 'tournaments',
        localField: 'tournament',
        foreignField: '_id',
        as: 'tournament',
      },
    });
    pipeline.push({ $unwind: '$tournament' });

    // Ejecutar el pipeline de agregación
    const results = await Score.aggregate(pipeline);

    res.json(results);
  } catch (error) {
    console.error('Error al obtener las puntuaciones:', error);
    res.status(500).json({ error: 'Error al obtener los resultados' });
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


    const institutionId = (req as any).user.institutionId;
    // Busca si existe el documento con la combinación de gymnastId, apparatus y tournament y institution
    let score = await Score.findOne({ gymnast: gymnastObjectId, apparatus, tournament, institution: institutionId });

    if (score) {
      // Si el documento existe, lo actualizamos
      score.deductions = deductions;
      await score.save();
    } else {
      // Si no existe, lo creamos
      score = await Score.create({
        gymnast: gymnastObjectId,
        apparatus,
        deductions,
        tournament,
        institution: institutionId,
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
