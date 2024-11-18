import express from 'express';
import { getJudgesList } from './authController'; // Reutilizamos el controlador ya definido

const router = express.Router();

// Ruta pública para obtener la lista de nombres de jueces
router.get('/', getJudgesList);

export default router;
