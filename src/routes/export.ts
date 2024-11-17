import express from 'express';
import { exportToExcel } from '../utils/exportToExcel';
import Gymnast from '../models/Gymnast';
import Score from '../models/Score';
import Assignment from '../models/Assignment';

const router = express.Router();

// Export gymnasts to Excel
router.get('/gymnasts', async (req, res) => {
  try {
    const gymnasts = await Gymnast.find().lean();
    const filename = 'gymnasts.xlsx';
    exportToExcel(gymnasts, filename);
    res.download(filename, () => {
      require('fs').unlinkSync(filename); // Cleanup after download
    });
  } catch (error) {
    res.status(500).json({ error: 'Error exporting gymnasts' });
  }
});

// Export rankings to Excel
router.get('/rankings', async (req, res) => {
  try {
    const scores = await Score.find().populate<{ gymnast: { name: string } }>('gymnast').lean();
    const data = scores.map((score) => ({
      Gymnast: score.gymnast.name,
      Apparatus: score.apparatus,
      Deductions: score.deductions,
      FinalScore: score.finalScore,
    }));

    const filename = 'rankings.xlsx';
    exportToExcel(data, filename);
    res.download(filename, () => {
      require('fs').unlinkSync(filename); // Clean up file after download
    });
  } catch (error) {
    res.status(500).json({ error: 'Error exporting rankings' });
  }
});

// Export assignments to Excel
router.get('/assignments', async (req, res) => {
  try {
    const assignments = await Assignment.find().populate<{ judges: { name: string }[] }>('judges').lean();
    const data = assignments.map((assignment) => ({
      Group: assignment.group,
      Level: assignment.level,
      Category: assignment.category,
      Apparatus: assignment.apparatus,
      Schedule: assignment.schedule,
      Judges: assignment.judges.map((judge) => judge.name).join(', '),
    }));

    const filename = 'assignments.xlsx';
    exportToExcel(data, filename);
    res.download(filename, () => {
      require('fs').unlinkSync(filename); // Clean up file after download
    });
  } catch (error) {
    res.status(500).json({ error: 'Error exporting assignments' });
  }
});

export default router; // Aquí está el default export
