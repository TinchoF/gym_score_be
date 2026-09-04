import express from 'express';
import { exportGymnastToExcel } from '../utils/exportToExcel';
import Gymnast from '../models/Gymnast';
import { resolveCategory } from '../utils/categoryCalculator';


const router = express.Router();

// Export gymnasts to Excel
router.get('/gymnasts', async (req, res) => {
  try {
    // Scopeado a la institución del usuario (req.user.institutionId ya resuelve el
    // override del super-admin vía header) — sin esto se exportaban gimnastas de
    // TODAS las instituciones a cualquier admin autenticado.
    const institutionId = (req as any).user.institutionId;
    const gymnasts = await Gymnast.find({ institution: institutionId }).populate('tournament').lean(); // Popular el torneo
    const enrichedGymnasts = gymnasts.map((gymnast) => ({
      ...gymnast,
      category: resolveCategory(gymnast as any),
    }));
    const filename = 'gymnasts.xlsx';

    exportGymnastToExcel(enrichedGymnasts, filename); // Generar el archivo Excel
    res.download(filename, () => {
      require('fs').unlinkSync(filename); // Limpiar el archivo después de la descarga
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error exporting gymnasts' });
  }
});

export default router; // Aquí está el default export
