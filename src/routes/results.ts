import express from 'express';
import Score from '../models/Score';
import Judge from '../models/Judge';
import mongoose from 'mongoose';
import Gymnast from '../models/Gymnast';
import { authenticateToken } from '../middlewares/authMiddleware';
import { calculateFinalDeductions, calculateFinalScore } from '../utils/scoreCalculator';

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

    // Opcionalmente, popular detalles del juez
    pipeline.push({
      $lookup: {
        from: 'judges',
        localField: 'judge',
        foreignField: '_id',
        as: 'judge',
      },
    });
    pipeline.push({ $unwind: '$judge' });

    // Ejecutar el pipeline de agregación para recuperar todas las puntuaciones por juez
    const rawScores = await Score.aggregate(pipeline);

    console.log('[DEBUG] Raw scores found:', rawScores.length);
    
    // Agrupar por gimnasta + aparato + tournament y calcular el puntaje final
    const grouped: Record<string, any> = {};
    rawScores.forEach((s: any) => {
      const key = `${s.gymnast._id}_${s.apparatus}_${s.tournament._id}`;
      if (!grouped[key]) {
        grouped[key] = {
          _id: key, // Unique ID for the group (gymnast_apparatus)
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
        _id: s.judge?._id || s.judge, // Ensure we have the ID here
        scoreId: s._id 
      });
    });

    console.log('[DEBUG] Grouped scores:', Object.keys(grouped).length);

    // Fetch all judges once to calculate expectedJudgesCount
    const allJudges = await Judge.find({ institution: institutionId }).lean();

    const requestUser = (req as any).user || {};
    const requestRole = requestUser.role;
    const requestUserId = requestUser.id;

    const results = Object.values(grouped).map((g: any) => {
      const deductions = g.judgeScores.map((js: any) => js.deductions);
      const final = calculateFinalDeductions(deductions);

      const completedJudges = g.judgeScores
        .filter((js: any) => {
           // ALWAYS require deductions
           const hasDeductions = js.deductions !== undefined && js.deductions !== null;
           if (!hasDeductions) return false;
           
           if (js.scoringMethod === 'fig_code') {
               return typeof js.dScore === 'number' && js.dScore > 0;
           }
           if (js.scoringMethod === 'start_value_bonus') {
               return js.difficultyBonus !== undefined && js.difficultyBonus !== null;
           }
           return true; 
        })
        .map((js: any) => String(js.judge?._id || js.judge));

      const expectedJudgesCount = allJudges.filter((j: any) => 
        j.apparatusAssignments?.some((a: any) => 
          String(a.tournament) === String(g.tournament?._id || g.tournament) &&
          String(a.turno) === String(g.gymnast?.turno) &&
          (Array.isArray(a.apparatus) ? a.apparatus.includes(g.apparatus) : a.apparatus === g.apparatus)
        )
      ).length;

      // Build the response object
      const baseResult = {
        _id: g._id,
        gymnast: g.gymnast,
        apparatus: g.apparatus,
        tournament: g.tournament,
        institution: g.institution,
        finalDeduction: final,
        completedJudges,
        expectedJudgesCount,
        judgeScores: g.judgeScores,
        scoringMethod: g.judgeScores[0]?.scoringMethod,
        level: g.judgeScores[0]?.level
      };

      if (requestRole === 'judge') {
        const myEntry = g.judgeScores.find((js: any) => String(js.judge?._id || js.judge) === String(requestUserId));
        return {
          ...baseResult,
          myScore: myEntry ? myEntry.deductions : null,
          myDScore: myEntry ? myEntry.dScore : null,
          myBonus: myEntry ? myEntry.difficultyBonus : null,
          judgeScores: undefined // Hide all judge scores from other judges
        };
      }

      return baseResult;
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

    console.log('[DEBUG_POST] Payload:', JSON.stringify(req.body));

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

    // Determinar si hay datos para guardar (cualquier campo de puntuación con valor)
    // Importante: 0 es un valor válido (puntaje perfecto), solo null/undefined borran.
    const hasScoreData = (deductions !== undefined && deductions !== null) ||
                         (dScore !== undefined && dScore !== null) ||
                         (difficultyBonus !== undefined && difficultyBonus !== null);

    // Definir el filtro de búsqueda (sin turno, que no está en el índice único)
    const filter = { 
      gymnast: gymnastObjectId, 
      apparatus, 
      tournament, 
      institution: institutionId, 
      judge: judgeObjectId 
    };

    // Si no hay datos de puntuación, eliminar el registro existente (si existe)
    if (!hasScoreData) {
      const deletedScore = await Score.findOneAndDelete(filter);
      
      if (deletedScore) {
        // Fetch all scores for this apparatus to emit aggregated data
        const allApparatusScores = await Score.find({
          gymnast: gymnastObjectId,
          apparatus: apparatus,
          tournament: tournament
        }).populate('gymnast').populate('tournament').populate('judge');

        // Aggregate scores
        const aggregated = {
          _id: `${gymnastObjectId}_${apparatus}_${tournament}`,
          gymnast: allApparatusScores.length > 0 ? (allApparatusScores[0] as any).gymnast : { _id: gymnastObjectId },
          apparatus,
          tournament: allApparatusScores.length > 0 ? (allApparatusScores[0] as any).tournament : { _id: tournament },
          institution: institutionId,
          scoringMethod: allApparatusScores.length > 0 ? (allApparatusScores[0] as any).scoringMethod : undefined,
          level: allApparatusScores.length > 0 ? (allApparatusScores[0] as any).level : undefined,
          judgeScores: allApparatusScores.map(js => ({
            judge: js.judge,
            deductions: js.deductions,
            startValue: js.startValue,
            difficultyBonus: js.difficultyBonus,
            dScore: js.dScore,
            judgeType: js.judgeType,
            scoringMethod: js.scoringMethod,
            _id: (js.judge as any)?._id || js.judge
          })),
          completedJudges: allApparatusScores
            .filter(js => {
                const hasDeductions = js.deductions !== undefined && js.deductions !== null;
                if (!hasDeductions) return false;
                if (js.scoringMethod === 'fig_code') return typeof js.dScore === 'number' && js.dScore > 0;
                if (js.scoringMethod === 'start_value_bonus') return js.difficultyBonus !== undefined && js.difficultyBonus !== null;
                return true;
            })
            .map(js => String((js.judge as any)?._id || js.judge))
        };

        const io = req.app.get('socketio');
        io.emit('scoreUpdated', aggregated);
        
        return res.status(200).json({ message: 'Score deleted successfully', deleted: true, aggregated });
      } else {
        return res.status(200).json({ message: 'No score to delete' });
      }
    }

    // Preparar datos de puntuación
    // IMPORTANTE: NO incluimos 'turno' porque no está en el índice único.
    // Incluirlo causaría errores de duplicate key si el turno difiere del registro existente.
    const scoreData: any = {
      gymnast: gymnastObjectId,
      apparatus,
      tournament,
      institution: institutionId,
      judge: judgeObjectId,
    };

    // Agregar campos según lo que se envíe
    // IMPORTANTE: Incluir null explícitamente para permitir borrado de campos
    if (deductions !== undefined) {
      scoreData.deductions = deductions;
    }
    if (startValue !== undefined) {
      scoreData.startValue = startValue;
    }
    if (difficultyBonus !== undefined) {
      scoreData.difficultyBonus = difficultyBonus;
    }
    if (dScore !== undefined) {
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

    // Actualizar o crear el registro ATÓMICAMENTE para evitar colisiones (race conditions)
    // Usamos findOneAndUpdate con upsert: true.
    // Reutilizamos el 'filter' definido arriba (mismo que para delete).
    
    console.log('[DEBUG_FILTER] Filter for findOneAndUpdate:', JSON.stringify({
      gymnast: gymnastObjectId.toString(),
      apparatus,
      tournament: tournament?.toString(),
      institution: institutionId?.toString(),
      judge: judgeObjectId.toString()
    }));
    console.log('[DEBUG_SCOREDATA] ScoreData to set:', JSON.stringify(scoreData));
    
    // Check what exists in DB
    const existingScore = await Score.findOne(filter);
    console.log('[DEBUG_EXISTING] Found existing score:', existingScore ? 'YES' : 'NO');
    if (existingScore) {
      console.log('[DEBUG_EXISTING] Existing score data:', JSON.stringify({
        _id: existingScore._id,
        gymnast: existingScore.gymnast,
        apparatus: existingScore.apparatus,
        tournament: existingScore.tournament,
        institution: existingScore.institution,
        judge: existingScore.judge,
        turno: (existingScore as any).turno
      }));
    }
    
    const updatedScore = await Score.findOneAndUpdate(
       filter, 
       { $set: scoreData }, // Seteamos TODO lo que construimos en scoreData.
       { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    );

    // NOTA: Como usamos upsert atomicamente, ya no hay duplicados.
    // if (score) ... await score.save() ... else create ... SE REEMPLAZA POR LO DE ARRIBA.

    // Fetch all scores for this apparatus to emit aggregated data
    const allApparatusScores = await Score.find({
      gymnast: gymnastObjectId,
      apparatus: apparatus,
      tournament: tournament
    }).populate('gymnast').populate('tournament').populate('judge');

    // Aggregate scores
    const aggregated = {
      _id: `${gymnastObjectId}_${apparatus}_${tournament}`,
      gymnast: allApparatusScores[0].gymnast,
      apparatus,
      tournament: allApparatusScores[0].tournament,
      institution: institutionId,
      scoringMethod: allApparatusScores[0].scoringMethod,
      level: allApparatusScores[0].level,
      judgeScores: allApparatusScores.map(js => ({
        judge: js.judge,
        deductions: js.deductions,
        startValue: js.startValue,
        difficultyBonus: js.difficultyBonus,
        dScore: js.dScore,
        judgeType: js.judgeType,
        scoringMethod: js.scoringMethod,
        _id: (js.judge as any)._id
      })),
      completedJudges: allApparatusScores
        .filter(js => {
            const hasDeductions = js.deductions !== undefined && js.deductions !== null;
            if (!hasDeductions) return false;
            if (js.scoringMethod === 'fig_code') return typeof js.dScore === 'number' && js.dScore > 0;
            if (js.scoringMethod === 'start_value_bonus') return js.difficultyBonus !== undefined && js.difficultyBonus !== null;
            return true;
        })
        .map(js => String((js.judge as any)._id))
    };

    // Calculate expectedJudgesCount for the emitted object too
    const allJudges = await Judge.find({ institution: institutionId }).lean();
    const expectedJudgesCount = allJudges.filter((j: any) => 
      j.apparatusAssignments?.some((a: any) => 
        String(a.tournament) === String(tournament) &&
        String(a.turno) === String((allApparatusScores[0]?.gymnast as any)?.turno) &&
        (Array.isArray(a.apparatus) ? a.apparatus.includes(apparatus) : a.apparatus === apparatus)
      )
    ).length;

    (aggregated as any).expectedJudgesCount = expectedJudgesCount;

    // Calculate final score if possible
    const allDeductions = allApparatusScores
      .filter(js => js.deductions !== undefined && js.deductions !== null)
      .map(js => js.deductions!);
    
    const allDifficultyBonuses = allApparatusScores
      .filter(js => js.difficultyBonus !== undefined && js.difficultyBonus !== null)
      .map(js => js.difficultyBonus!);

    const allDScores = allApparatusScores
      .filter(js => js.dScore !== undefined && js.dScore !== null)
      .map(js => js.dScore!);

    const method = allApparatusScores[0]?.scoringMethod || scoringMethod;
    const baseVal = allApparatusScores[0]?.startValue || startValue || 10;

    // Calculate ONLY if we have at least one valid score entry (which we should)
    const finalResult = calculateFinalScore(method, {
      baseScore: baseVal,
      startValue: baseVal,
      deductions: allDeductions,
      difficultyBonuses: allDifficultyBonuses,
      dScores: allDScores
    });

    if (finalResult) {
      (aggregated as any).finalScore = finalResult.finalScore;
      (aggregated as any).finalDeduction = finalResult.finalDeduction;
      (aggregated as any).difficultyBonus = finalResult.difficultyBonus;
      (aggregated as any).dScore = finalResult.dScore;
      
      // Also pass baseStartValue/startValue explicitely if needed by frontend
      (aggregated as any).baseStartValue = baseVal;
      (aggregated as any).startValue = baseVal;
    }

    const io = req.app.get('socketio');
    io.emit('scoreUpdated', aggregated);

    res.status(201).json(aggregated);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Error submitting score' });
  }
});



export default router;
