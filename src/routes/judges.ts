import express from 'express';
import Judge from '../models/Judge';
import mongoose from 'mongoose';

const router = express.Router();

// Get all judges
router.get('/', async (req, res) => {
  try {
    const judges = await Judge.find();
    res.json(judges);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching judges' });
  }
});


// Create a judge
router.post('/', async (req, res) => {
  try {
    const newJudge = new Judge(req.body);
    await newJudge.save();
    res.status(201).json(newJudge);
  } catch (error) {
    res.status(400).json({ error: 'Error creating judge' });
  }
});

// Update a judge by ID
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;  // Obtener el ID de la URL
    const updatedData = req.body; // Obtener los nuevos datos del cuerpo de la solicitud

    // Validar si el ID es válido
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID no válido' });
    }

    // Buscar y actualizar el juez
    const updatedJudge = await Judge.findByIdAndUpdate(id, updatedData, { new: true });

    // Verificar si el juez fue encontrado y actualizado
    if (!updatedJudge) {
      return res.status(404).json({ error: 'Juez no encontrado' });
    }

    // Responder con el juez actualizado
    res.json(updatedJudge);
  } catch (error) {
    console.error('Error al actualizar juez:', error);
    res.status(500).json({ error: 'Error actualizando juez' });
  }
});

export default router;
