import { Request, Response } from 'express';
import Judge from '../models/Judge'; // Ruta a tu modelo Judge

// Endpoint para obtener la lista de jueces
export const getJudgesList = async (req: Request, res: Response) => {
  try {
    // Proyección para devolver solo el campo 'name'
    const judges = await Judge.find({}, { name: 1, _id: 0 }); // Devuelve solo 'name' y omite '_id'
    res.json(judges); // Retorna la lista de jueces con solo sus nombres
  } catch (error) {
    console.error('Error fetching judges list:', error);
    res.status(500).json({ error: 'Error fetching judges list' });
  }
};
