import express from 'express';
import { exportGymnastToExcel } from '../utils/exportToExcel';
import Gymnast from '../models/Gymnast';


const router = express.Router();

// Export gymnasts to Excel
router.get('/gymnasts', async (req, res) => {
  try {
    const gymnasts = await Gymnast.find().populate('tournament').lean(); // Popular el torneo
    const filename = 'gymnasts.xlsx';

    exportGymnastToExcel(gymnasts, filename); // Generar el archivo Excel
    res.download(filename, () => {
      require('fs').unlinkSync(filename); // Limpiar el archivo después de la descarga
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error exporting gymnasts' });
  }
});

export default router; // Aquí está el default export
