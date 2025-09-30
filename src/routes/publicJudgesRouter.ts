import express from 'express';
import { getJudgesList } from './authController'; // Reutilizamos el controlador ya definido

const router = express.Router();

// Ruta pública para obtener la lista de nombres de jueces, filtrados por institución
router.get('/', async (req, res) => {
	try {
		const { institution } = req.query;
		const filter = institution ? { institution } : {};
		const Judge = require('../models/Judge').default;
		const judges = await Judge.find(filter, { name: 1, _id: 1 });
		res.json(judges);
	} catch (error) {
		res.status(500).json({ error: 'Error fetching judges list' });
	}
});

export default router;
