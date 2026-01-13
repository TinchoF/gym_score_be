import Score from '../models/Score';
import Judge from '../models/Judge';
import Gymnast from '../models/Gymnast';
import mongoose from 'mongoose';
import { calculateFinalDeductions } from '../utils/scoreCalculator';
import logger from '../utils/logger';

export interface ScoreFilter {
  apparatus?: string;
  group?: string | number;
  tournament?: string;
  institutionId: string;
}

export interface GroupedScore {
  _id: string;
  gymnast: any;
  apparatus: string;
  tournament: any;
  institution: string;
  judgeScores: any[];
}

export class ScoreService {
  /**
   * Build aggregation pipeline for score queries
   */
  private buildScorePipeline(filter: any, group?: number): any[] {
    const pipeline: any[] = [
      { $match: filter },
      {
        $lookup: {
          from: 'gymnasts',
          localField: 'gymnast',
          foreignField: '_id',
          as: 'gymnast',
        },
      },
      { $unwind: '$gymnast' },
    ];

    if (group) {
      pipeline.push({
        $match: { 'gymnast.group': group },
      });
    }

    // Populate tournament details
    pipeline.push({
      $lookup: {
        from: 'tournaments',
        localField: 'tournament',
        foreignField: '_id',
        as: 'tournament',
      },
    });
    pipeline.push({ $unwind: '$tournament' });

    // Populate judge details
    pipeline.push({
      $lookup: {
        from: 'judges',
        localField: 'judge',
        foreignField: '_id',
        as: 'judge',
      },
    });
    pipeline.push({ $unwind: '$judge' });

    return pipeline;
  }

  /**
   * Group raw scores by gymnast + apparatus + tournament
   */
  private groupScores(rawScores: any[]): Record<string, GroupedScore> {
    const grouped: Record<string, any> = {};
    
    rawScores.forEach((s: any) => {
      const key = `${s.gymnast._id}_${s.apparatus}_${s.tournament._id}`;
      if (!grouped[key]) {
        grouped[key] = {
          _id: key,
          gymnast: s.gymnast,
          apparatus: s.apparatus,
          tournament: s.tournament,
          institution: s.institution,
          judgeScores: [],
        };
      }
      
      grouped[key].judgeScores.push({ 
        judge: s.judge, 
        deductions: s.deductions,
        startValue: s.startValue,
        difficultyBonus: s.difficultyBonus,
        dScore: s.dScore,
        judgeType: s.judgeType,
        scoringMethod: s.scoringMethod,
        level: s.level,
        _id: s.judge?._id || s.judge,
        scoreId: s._id 
      });
    });

    return grouped;
  }

  /**
   * Calculate expected judges count for a given gymnast/apparatus/tournament
   */
  private calculateExpectedJudges(
    judgesMap: Map<string, any>,
    tournament: any,
    turno: string,
    apparatus: string
  ): number {
    let count = 0;
    
    judgesMap.forEach((judge) => {
      const hasAssignment = judge.apparatusAssignments?.some((a: any) => 
        String(a.tournament) === String(tournament?._id || tournament) &&
        String(a.turno) === String(turno) &&
        (Array.isArray(a.apparatus) ? a.apparatus.includes(apparatus) : a.apparatus === apparatus)
      );
      
      if (hasAssignment) count++;
    });

    return count;
  }

  /**
   * Get scores with filters and calculate results
   */
  async getScoresWithFilters(
    filters: ScoreFilter,
    requestUser?: { role?: string; id?: string }
  ): Promise<any[]> {
    try {
      const { apparatus, group, tournament, institutionId } = filters;
      const filter: any = { institution: institutionId };

      logger.debug('ScoreService.getScoresWithFilters - filters:', filters);

      if (apparatus) {
        filter.apparatus = apparatus;
      }

      if (tournament) {
        if (mongoose.Types.ObjectId.isValid(tournament)) {
          filter.tournament = new mongoose.Types.ObjectId(tournament);
        } else {
          throw new Error('Invalid tournament parameter');
        }
      }

      const groupNumber = group ? Number(group) : undefined;
      if (group && isNaN(groupNumber!)) {
        throw new Error('Invalid group parameter');
      }

      // Build and execute aggregation pipeline
      const pipeline = this.buildScorePipeline(filter, groupNumber);
      const rawScores = await Score.aggregate(pipeline);

      logger.debug('Raw scores found:', rawScores.length);

      // Group scores
      const grouped = this.groupScores(rawScores);

      logger.debug('Grouped scores:', Object.keys(grouped).length);

      // Fetch all judges once and create a Map for O(1) lookups
      const allJudges = await Judge.find({ institution: institutionId }).lean();
      const judgesMap = new Map(allJudges.map(j => [String(j._id), j]));

      const requestRole = requestUser?.role;
      const requestUserId = requestUser?.id;

      // Calculate results
      const results = Object.values(grouped).map((g: any) => {
        const deductions = g.judgeScores.map((js: any) => js.deductions);
        const final = calculateFinalDeductions(deductions);

        const completedJudges = g.judgeScores
          .filter((js: any) => {
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

        const expectedJudgesCount = this.calculateExpectedJudges(
          judgesMap,
          g.tournament,
          g.gymnast?.turno,
          g.apparatus
        );

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

        // Filter results based on user role
        if (requestRole === 'judge') {
          const myEntry = g.judgeScores.find((js: any) => 
            String(js.judge?._id || js.judge) === String(requestUserId)
          );
          return {
            ...baseResult,
            myScore: myEntry ? myEntry.deductions : null,
            myDScore: myEntry ? myEntry.dScore : null,
            myBonus: myEntry ? myEntry.difficultyBonus : null,
            judgeScores: undefined
          };
        }

        return baseResult;
      });

      logger.debug('Results calculated:', results.length);
      return results;
    } catch (error) {
      logger.error('Error in ScoreService.getScoresWithFilters:', error);
      throw error;
    }
  }

  /**
   * Submit a new score
   */
  async submitScore(scoreData: any, judgeId: string, institutionId: string): Promise<any> {
    try {
      logger.debug('ScoreService.submitScore - data:', scoreData);

      const newScore = new Score({
        ...scoreData,
        judge: judgeId,
        institution: institutionId,
      });

      const savedScore = await newScore.save();
      logger.debug('Score saved:', savedScore._id);

      return savedScore;
    } catch (error) {
      logger.error('Error in ScoreService.submitScore:', error);
      throw error;
    }
  }
}

export default new ScoreService();
