import express from 'express';
import { exportToExcel } from '../utils/exportToExcel';
import Gymnast from '../models/Gymnast';
import Score from '../models/Score';

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

export default router; // Aquí está el default export
