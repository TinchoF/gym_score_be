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

    console.log('[DEBUG] GET /api/scores - institutionId:', institutionId);
    console.log('[DEBUG] Query params:', { apparatus, group, tournament });

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

    console.log('[DEBUG] Raw scores found:', rawScores.length);
    
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
      // Incluir todos los campos de puntuación
      grouped[key].judgeScores.push({ 
        judge: s.judge, 
        deductions: s.deductions,
        startValue: s.startValue,
        difficultyBonus: s.difficultyBonus,
        dScore: s.dScore,
        judgeType: s.judgeType,
        scoringMethod: s.scoringMethod,
        level: s.level,
        _id: s.judge, 
        scoreId: s._id 
      });
    });

    console.log('[DEBUG] Grouped scores:', Object.keys(grouped).length);

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

    console.log('[DEBUG] Results to send:', results.length);
    res.json(results);
  } catch (error) {
    console.error('Error al obtener las puntuaciones:', error);
    res.status(500).json({ error: 'Error al obtener los resultados' });
  }
});





// Submit scores
router.post('/', async (req, res) => {
  try {
    const { 
      gymnastId, 
      judge, 
      apparatus, 
      tournament,
      // Campos de puntuación según método
      deductions,
      startValue,
      difficultyBonus,
      dScore,
      judgeType, // 'E' o 'D'
      scoringMethod,
      level,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(gymnastId)) {
      return res.status(400).json({ error: 'ID no válido' });
    }

    // Verifica que gymnastId es un ObjectId válido
    const gymnastObjectId = new mongoose.Types.ObjectId(gymnastId);

    const gymnast = await Gymnast.findById(gymnastObjectId);
    if (!gymnast) {
      return res.status(400).json({ error: 'Gymnast not found' });
    }

    // Obtener el turno del gimnasta
    const turno = gymnast.turno;

    const institutionId = (req as any).user.institutionId;

    // Validar y castear el judge a ObjectId
    if (!judge) {
      return res.status(400).json({ error: 'Judge is required' });
    }
    if (!mongoose.Types.ObjectId.isValid(judge)) {
      return res.status(400).json({ error: 'Judge ID inválido' });
    }
    const judgeObjectId = new mongoose.Types.ObjectId(judge);

    // Buscar el score existente (usando judgeObjectId)
    let score = await Score.findOne({ 
      gymnast: gymnastObjectId, 
      apparatus, 
      tournament, 
      turno, 
      institution: institutionId, 
      judge: judgeObjectId 
    });

    // Determinar si hay datos para guardar (cualquier campo de puntuación con valor)
    // Importante: 0 es un valor válido (puntaje perfecto), solo null/undefined borran.
    const hasScoreData = (deductions !== undefined && deductions !== null) ||
                         (dScore !== undefined && dScore !== null) ||
                         (difficultyBonus !== undefined && difficultyBonus !== null);

    // Si no hay datos de puntuación, eliminar el registro existente (si existe)
    if (!hasScoreData) {
      if (score) {
        await Score.deleteOne({ _id: score._id });
        
        // Emitir evento de WebSocket cuando el puntaje se elimina
        const io = req.app.get('socketio');
        io.emit('scoreUpdated', { 
          _id: score._id,
          gymnast: gymnastObjectId,
          apparatus,
          tournament,
          turno: score.turno,
          institution: institutionId,
          judge: judgeObjectId,
          deleted: true 
        });
        
        return res.status(200).json({ message: 'Score deleted successfully', deleted: true });
      } else {
        // No hay nada que eliminar
        return res.status(200).json({ message: 'No score to delete' });
      }
    }

    // Preparar datos de puntuación
    const scoreData: any = {
      gymnast: gymnastObjectId,
      apparatus,
      tournament,
      turno,
      institution: institutionId,
      judge: judgeObjectId,
    };

    // Agregar campos según lo que se envíe
    if (deductions !== undefined && deductions !== null) {
      scoreData.deductions = deductions;
    }
    if (startValue !== undefined && startValue !== null) {
      scoreData.startValue = startValue;
    }
    if (difficultyBonus !== undefined && difficultyBonus !== null) {
      scoreData.difficultyBonus = difficultyBonus;
    }
    if (dScore !== undefined && dScore !== null) {
      scoreData.dScore = dScore;
    }
    if (judgeType) {
      scoreData.judgeType = judgeType;
    }
    if (scoringMethod) {
      scoreData.scoringMethod = scoringMethod;
    }
    if (level) {
      scoreData.level = level;
    }

    // Actualizar o crear el registro
    if (score) {
      // Actualizar campos existentes
      if (deductions !== undefined) score.deductions = deductions;
      if (startValue !== undefined) score.startValue = startValue;
      if (difficultyBonus !== undefined) score.difficultyBonus = difficultyBonus;
      if (dScore !== undefined) score.dScore = dScore;
      if (judgeType) score.judgeType = judgeType;
      await score.save();
    } else {
      score = await Score.create(scoreData);
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
