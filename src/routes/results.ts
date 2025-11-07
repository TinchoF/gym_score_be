import express from 'express';
import Score from '../models/Score';
import mongoose from 'mongoose';
import Gymnast from '../models/Gymnast';
import { authenticateToken } from '../middlewares/authMiddleware';
import { calculateFinalDeductions } from '../utils/scoreCalculator';

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

    // Ejecutar el pipeline de agregación para recuperar todas las puntuaciones por juez
    const rawScores = await Score.aggregate(pipeline);

    // Agrupar por gimnasta + aparato + tournament y calcular el puntaje final
    const grouped: Record<string, any> = {};
    rawScores.forEach((s: any) => {
      const key = `${s.gymnast._id}_${s.apparatus}_${s.tournament._id}`;
      if (!grouped[key]) {
        grouped[key] = {
          gymnast: s.gymnast,
          apparatus: s.apparatus,
          tournament: s.tournament,
          institution: s.institution,
          judgeScores: [],
        };
      }
  // Use the judge id as _id to make it clear this id refers to the judge.
  grouped[key].judgeScores.push({ judge: s.judge, deductions: s.deductions, _id: s.judge, scoreId: s._id });
    });

    const requestUser = (req as any).user || {};
    const requestRole = requestUser.role;
    const requestUserId = requestUser.id;

    const results = Object.values(grouped).map((g: any) => {
      const deductions = g.judgeScores.map((js: any) => js.deductions);
      const final = calculateFinalDeductions(deductions);

      // Default response includes finalDeduction. For judges, only expose their own score.
      if (requestRole === 'judge') {
        const myEntry = g.judgeScores.find((js: any) => String(js.judge) === String(requestUserId));
        const myScore = myEntry ? myEntry.deductions : null;
        return {
          gymnast: g.gymnast,
          apparatus: g.apparatus,
          tournament: g.tournament,
          institution: g.institution,
          finalDeduction: final,
          myScore,
        };
      }

      // For admins/super-admin return full judgeScores for auditing
      return Object.assign({}, g, { finalDeduction: final });
    });

    res.json(results);
  } catch (error) {
    console.error('Error al obtener las puntuaciones:', error);
    res.status(500).json({ error: 'Error al obtener los resultados' });
  }
});





// Submit scores
router.post('/', async (req, res) => {
  try {
    const { gymnastId, judge, apparatus, deductions, tournament } = req.body;
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

    // Buscar el score existente
    let score = await Score.findOne({ gymnast: gymnastObjectId, apparatus, tournament, institution: institutionId, judge });

    // Si la deducción es 0, eliminar el registro existente (si existe)
    if (deductions === 0) {
      if (score) {
        await Score.deleteOne({ _id: score._id });
        
        // Emitir evento de WebSocket cuando el puntaje se elimina
        const io = req.app.get('socketio');
        io.emit('scoreUpdated', { 
          _id: score._id,
          gymnast: gymnastObjectId,
          apparatus,
          tournament,
          institution: institutionId,
          judge,
          deleted: true 
        });
        
        return res.status(200).json({ message: 'Score deleted successfully', deleted: true });
      } else {
        // No hay nada que eliminar
        return res.status(200).json({ message: 'No score to delete' });
      }
    }

    // Si la deducción es mayor que 0, actualizar o crear el registro
    if (score) {
      score.deductions = deductions;
      await score.save();
    } else {
      score = await Score.create({
        gymnast: gymnastObjectId,
        apparatus,
        deductions,
        tournament,
        institution: institutionId,
        judge,
      });
    }

    // Emitir evento de WebSocket cuando el puntaje se actualiza o crea
    const io = req.app.get('socketio');
    io.emit('scoreUpdated', score);

    res.status(201).json(score);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Error submitting score' });
  }
});



export default router;
